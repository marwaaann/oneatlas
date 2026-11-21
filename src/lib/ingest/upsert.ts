import type { PrismaClient } from "@prisma/client";
import { recomputeModelAggregates } from "../services/aggregates";
import { enums, normalizePricing, parseTokenCount, slugify } from "./normalize";
import { ingestPayload, type IngestPayload } from "./schema";

export interface IngestSummary {
  labs: number;
  providers: number;
  benchmarks: number;
  models: number;
  endpoints: number;
  scores: number;
  errors: { item: string; message: string }[];
}

/**
 * Validate → normalize → upsert.
 *
 * Reference entities (labs, providers, benchmarks) are upserted first so models
 * can resolve them by slug. Each model is written in its own transaction:
 * one bad record is reported and skipped instead of aborting the whole batch,
 * and a model's endpoints, scores and denormalized prices always change together.
 *
 * Endpoints/scores present in the DB but absent from the payload are removed,
 * so re-ingesting a source is idempotent and reflects de-listings.
 */
export async function ingest(prisma: PrismaClient, input: IngestPayload): Promise<IngestSummary> {
  const data = ingestPayload.parse(input);
  const summary: IngestSummary = {
    labs: 0,
    providers: 0,
    benchmarks: 0,
    models: 0,
    endpoints: 0,
    scores: 0,
    errors: [],
  };

  for (const l of data.labs) {
    const row = { ...l, type: enums.labType(l.type, `labs.${l.slug}.type`) };
    await prisma.lab.upsert({ where: { slug: l.slug }, create: row, update: row });
    summary.labs++;
  }
  for (const p of data.providers) {
    const row = { ...p, type: enums.providerType(p.type, `providers.${p.slug}.type`) };
    await prisma.provider.upsert({ where: { slug: p.slug }, create: row, update: row });
    summary.providers++;
  }
  for (const b of data.benchmarks) {
    const row = { ...b, category: enums.benchmarkCategory(b.category, `benchmarks.${b.slug}.category`) };
    await prisma.benchmark.upsert({ where: { slug: b.slug }, create: row, update: row });
    summary.benchmarks++;
  }

  if (data.models.length === 0) return summary;

  // Slug → id lookups for the whole batch (avoids N+1 lookups per model).
  const [labs, providers, benchmarks] = await Promise.all([
    prisma.lab.findMany({ select: { id: true, slug: true } }),
    prisma.provider.findMany({ select: { id: true, slug: true } }),
    prisma.benchmark.findMany({ select: { id: true, slug: true, maxScore: true } }),
  ]);
  const labId = new Map(labs.map((x) => [x.slug, x.id]));
  const providerId = new Map(providers.map((x) => [x.slug, x.id]));
  const benchmarkBySlug = new Map(benchmarks.map((x) => [x.slug, x]));

  for (const m of data.models) {
    const slug = m.slug ?? slugify(m.name);
    const path = `models.${slug}`;
    try {
      const lab = labId.get(m.lab);
      if (!lab) throw new Error(`unknown lab "${m.lab}"`);

      const contextWindow = parseTokenCount(m.contextWindow, `${path}.contextWindow`);
      const maxOutputTokens =
        m.maxOutputTokens === undefined ? null : parseTokenCount(m.maxOutputTokens, `${path}.maxOutputTokens`);
      const reference = normalizePricing(m.pricing);

      const endpoints = Object.entries(m.endpoints).map(([pSlug, e]) => {
        const pid = providerId.get(pSlug);
        if (!pid) throw new Error(`unknown provider "${pSlug}"`);
        const price = e.pricing ? normalizePricing(e.pricing) : reference;
        return {
          providerId: pid,
          ...price,
          contextWindow: e.contextWindow ? parseTokenCount(e.contextWindow, `${path}.endpoints.${pSlug}`) : contextWindow,
          maxOutputTokens: e.maxOutputTokens
            ? parseTokenCount(e.maxOutputTokens, `${path}.endpoints.${pSlug}`)
            : maxOutputTokens,
          throughputTps: e.throughputTps ?? null,
          latencyMs: e.latencyMs ?? null,
          uptimePct: e.uptimePct ?? null,
        };
      });

      const scores = Object.entries(m.scores).map(([bSlug, score]) => {
        const b = benchmarkBySlug.get(bSlug);
        if (!b) throw new Error(`unknown benchmark "${bSlug}"`);
        if (score < 0 || score > b.maxScore) throw new Error(`score ${score} for ${bSlug} outside 0–${b.maxScore}`);
        return { benchmarkId: b.id, score };
      });

      const row = {
        slug,
        name: m.name,
        description: m.description,
        type: enums.modelType(m.type, `${path}.type`),
        releaseDate: new Date(m.releaseDate),
        contextWindow,
        maxOutputTokens,
        parameterCount: m.parameterCount ?? null,
        openWeights: m.openWeights,
        license: m.license ?? null,
        knowledgeCutoff: m.knowledgeCutoff ?? null,
        inputModalities: enums.modalities(m.input, `${path}.input`),
        outputModalities: enums.modalities(m.output, `${path}.output`),
        capabilities: enums.capabilities(m.capabilities, `${path}.capabilities`),
        lab: { connect: { id: lab } },
      };

      await prisma.$transaction(async (tx) => {
        const model = await tx.model.upsert({ where: { slug }, create: row, update: row });

        await tx.modelEndpoint.deleteMany({
          where: { modelId: model.id, providerId: { notIn: endpoints.map((e) => e.providerId) } },
        });
        for (const e of endpoints) {
          await tx.modelEndpoint.upsert({
            where: { modelId_providerId: { modelId: model.id, providerId: e.providerId } },
            create: { ...e, modelId: model.id },
            update: e,
          });
        }

        await tx.benchmarkScore.deleteMany({
          where: { modelId: model.id, benchmarkId: { notIn: scores.map((s) => s.benchmarkId) } },
        });
        for (const s of scores) {
          await tx.benchmarkScore.upsert({
            where: { modelId_benchmarkId: { modelId: model.id, benchmarkId: s.benchmarkId } },
            create: { ...s, modelId: model.id },
            update: { score: s.score },
          });
        }

        await recomputeModelAggregates(tx, model.id);
      });

      summary.models++;
      summary.endpoints += endpoints.length;
      summary.scores += scores.length;
    } catch (err) {
      summary.errors.push({ item: path, message: err instanceof Error ? err.message : String(err) });
    }
  }

  return summary;
}
