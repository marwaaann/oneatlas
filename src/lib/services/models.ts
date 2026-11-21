import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import {
  decimalToNumber,
  modelSummarySelect,
  toModelSummary,
  type ModelDetail,
  type ModelSummary,
  type Paginated,
} from "../dto";
import { NotFoundError } from "../errors";
import type { ModelListQuery, ModelSort } from "../validation";

const DEFAULT_ORDER: Record<ModelSort, "asc" | "desc"> = {
  release: "desc",
  price: "asc",
  context: "desc",
  name: "asc",
  score: "desc",
};

function buildWhere(q: ModelListQuery): Prisma.ModelWhereInput {
  const and: Prisma.ModelWhereInput[] = [];

  if (q.q) {
    const contains = { contains: q.q, mode: "insensitive" as const };
    and.push({
      OR: [{ name: contains }, { slug: contains }, { description: contains }, { lab: { name: contains } }],
    });
  }
  if (q.lab.length) and.push({ lab: { slug: { in: q.lab } } });
  if (q.provider.length) and.push({ endpoints: { some: { provider: { slug: { in: q.provider } } } } });
  if (q.type.length) and.push({ type: { in: q.type } });
  if (q.capability.length) and.push({ capabilities: { hasEvery: q.capability } });
  if (q.modality.length) and.push({ inputModalities: { hasEvery: q.modality } });
  if (q.openWeights !== undefined) and.push({ openWeights: q.openWeights });
  if (q.minContext !== undefined) and.push({ contextWindow: { gte: q.minContext } });
  if (q.maxPrice !== undefined) and.push({ minInputPrice: { lte: q.maxPrice } });

  return and.length ? { AND: and } : {};
}

function buildOrderBy(sort: ModelSort, order: "asc" | "desc"): Prisma.ModelOrderByWithRelationInput[] {
  const tiebreak: Prisma.ModelOrderByWithRelationInput = { slug: "asc" }; // stable pagination
  switch (sort) {
    case "price":
      return [{ minInputPrice: { sort: order, nulls: "last" } }, { minOutputPrice: { sort: order, nulls: "last" } }, tiebreak];
    case "context":
      return [{ contextWindow: order }, tiebreak];
    case "name":
      return [{ name: order }, tiebreak];
    case "score":
      return [{ atlasScore: { sort: order, nulls: "last" } }, tiebreak];
    case "release":
    default:
      return [{ releaseDate: order }, tiebreak];
  }
}

export async function listModels(q: ModelListQuery): Promise<Paginated<ModelSummary>> {
  const where = buildWhere(q);
  const order = q.order ?? DEFAULT_ORDER[q.sort];
  const [total, rows] = await prisma.$transaction([
    prisma.model.count({ where }),
    prisma.model.findMany({
      where,
      orderBy: buildOrderBy(q.sort, order),
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      select: { ...modelSummarySelect, atlasScore: true },
    }),
  ]);
  return {
    items: rows.map((r) => toModelSummary(r, r.atlasScore)),
    page: q.page,
    pageSize: q.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
  };
}

export async function getModel(slug: string): Promise<ModelDetail> {
  const m = await prisma.model.findUnique({
    where: { slug },
    select: {
      ...modelSummarySelect,
      atlasScore: true,
      license: true,
      knowledgeCutoff: true,
      lab: { select: { slug: true, name: true, accentColor: true, type: true, website: true } },
      endpoints: {
        orderBy: [{ inputPrice: "asc" }, { outputPrice: "asc" }],
        include: { provider: { select: { slug: true, name: true, type: true, accentColor: true } } },
      },
      scores: {
        orderBy: { benchmark: { category: "asc" } },
        include: { benchmark: { select: { slug: true, name: true, category: true, maxScore: true } } },
      },
    },
  });
  if (!m) throw new NotFoundError(`Model "${slug}"`);

  const atlasRank =
    m.atlasScore === null ? null : (await prisma.model.count({ where: { atlasScore: { gt: m.atlasScore } } })) + 1;

  return {
    ...toModelSummary(m, m.atlasScore),
    lab: m.lab,
    license: m.license,
    knowledgeCutoff: m.knowledgeCutoff,
    atlasRank,
    endpoints: m.endpoints.map((e) => ({
      provider: e.provider,
      inputPrice: Number(e.inputPrice),
      outputPrice: Number(e.outputPrice),
      cachedInputPrice: decimalToNumber(e.cachedInputPrice),
      contextWindow: e.contextWindow,
      maxOutputTokens: e.maxOutputTokens,
      throughputTps: e.throughputTps,
      latencyMs: e.latencyMs,
      uptimePct: e.uptimePct,
    })),
    scores: m.scores.map((s) => ({ benchmark: s.benchmark, score: s.score })),
  };
}

/** Fetch several models for comparison, preserving the requested order. Unknown slugs are reported, not fatal. */
export async function compareModels(slugs: string[]) {
  const unique = [...new Set(slugs)];
  const details = await Promise.allSettled(unique.map((s) => getModel(s)));
  const models: ModelDetail[] = [];
  const missing: string[] = [];
  details.forEach((d, i) => {
    if (d.status === "fulfilled") models.push(d.value);
    else if (d.reason instanceof NotFoundError) missing.push(unique[i]);
    else throw d.reason;
  });
  const benchmarks = await prisma.benchmark.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: { slug: true, name: true, category: true, maxScore: true },
  });
  return { models, missing, benchmarks };
}

/** Models of the same type with the closest Atlas score — "you might also consider". */
export async function similarModels(model: ModelDetail, take = 4): Promise<ModelSummary[]> {
  const rows = await prisma.model.findMany({
    where: { type: model.type, slug: { not: model.slug }, atlasScore: { not: null } },
    select: { ...modelSummarySelect, atlasScore: true },
  });
  const target = model.atlasScore ?? 0;
  return rows
    .sort((a, b) => Math.abs((a.atlasScore ?? 0) - target) - Math.abs((b.atlasScore ?? 0) - target))
    .slice(0, take)
    .map((r) => toModelSummary(r, r.atlasScore));
}

/** Filter options with counts for the discovery sidebar. */
export async function getFacets() {
  const [labs, providers, types, caps, modalities, openWeights] = await Promise.all([
    prisma.lab.findMany({
      orderBy: { name: "asc" },
      select: { slug: true, name: true, _count: { select: { models: true } } },
    }),
    prisma.provider.findMany({
      orderBy: { name: "asc" },
      select: { slug: true, name: true, _count: { select: { endpoints: true } } },
    }),
    prisma.model.groupBy({ by: ["type"], _count: { _all: true }, orderBy: { type: "asc" } }),
    prisma.$queryRaw<{ value: string; count: bigint }[]>`
      SELECT unnest(capabilities)::text AS value, COUNT(*) AS count FROM "Model" GROUP BY 1 ORDER BY 2 DESC`,
    prisma.$queryRaw<{ value: string; count: bigint }[]>`
      SELECT unnest("inputModalities")::text AS value, COUNT(*) AS count FROM "Model" GROUP BY 1 ORDER BY 2 DESC`,
    prisma.model.count({ where: { openWeights: true } }),
  ]);
  return {
    labs: labs.map((l) => ({ value: l.slug, label: l.name, count: l._count.models })),
    providers: providers.map((p) => ({ value: p.slug, label: p.name, count: p._count.endpoints })),
    types: types.map((t) => ({ value: t.type, count: t._count._all })),
    capabilities: caps.map((c) => ({ value: c.value, count: Number(c.count) })),
    modalities: modalities.map((c) => ({ value: c.value, count: Number(c.count) })),
    openWeights,
  };
}
export type Facets = Awaited<ReturnType<typeof getFacets>>;
