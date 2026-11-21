import { prisma } from "../db";
import { modelSummarySelect, toModelSummary } from "../dto";
import { NotFoundError } from "../errors";

/** Drop bookkeeping columns from API payloads. */
function omitTimestamps<T extends { createdAt: Date; updatedAt: Date }>(row: T): Omit<T, "createdAt" | "updatedAt"> {
  const { createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = row; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
}

// ───────────────────────────── Labs ─────────────────────────────

export async function listLabs() {
  const labs = await prisma.lab.findMany({
    orderBy: { name: "asc" },
    include: {
      models: {
        orderBy: { releaseDate: "desc" },
        select: { slug: true, name: true, releaseDate: true, openWeights: true, atlasScore: true },
      },
    },
  });
  return labs.map(({ models, ...lab }) => ({
    ...lab,
    modelCount: models.length,
    openWeightsCount: models.filter((m) => m.openWeights).length,
    latestRelease: models[0] ? { slug: models[0].slug, name: models[0].name, releaseDate: models[0].releaseDate.toISOString() } : null,
    topScore: models.reduce<number | null>((max, m) => (m.atlasScore !== null && (max === null || m.atlasScore > max) ? m.atlasScore : max), null),
  }));
}

export async function getLab(slug: string) {
  const lab = await prisma.lab.findUnique({
    where: { slug },
    include: {
      models: {
        orderBy: { releaseDate: "desc" },
        select: { ...modelSummarySelect, atlasScore: true },
      },
    },
  });
  if (!lab) throw new NotFoundError(`Lab "${slug}"`);

  // Which providers serve this lab's models?
  const providers = await prisma.provider.findMany({
    where: { endpoints: { some: { model: { labId: lab.id } } } },
    orderBy: { name: "asc" },
    select: { slug: true, name: true, type: true, accentColor: true, _count: { select: { endpoints: { where: { model: { labId: lab.id } } } } } },
  });

  const { models, ...rest } = omitTimestamps(lab);
  return {
    ...rest,
    models: models.map((m) => toModelSummary(m, m.atlasScore)),
    providers: providers.map(({ _count, ...p }) => ({ ...p, modelCount: _count.endpoints })),
  };
}

// ───────────────────────────── Providers ─────────────────────────────

export async function listProviders() {
  const providers = await prisma.provider.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: {
      endpoints: {
        select: { inputPrice: true, throughputTps: true, model: { select: { labId: true, openWeights: true } } },
      },
    },
  });
  return providers.map((row) => {
    const { endpoints, ...p } = omitTimestamps(row);
    const tps = endpoints.map((e) => e.throughputTps).filter((x): x is number => x !== null).sort((a, b) => a - b);
    return {
      ...p,
      modelCount: endpoints.length,
      labCount: new Set(endpoints.map((e) => e.model.labId)).size,
      openWeightsCount: endpoints.filter((e) => e.model.openWeights).length,
      cheapestInput: endpoints.length ? Math.min(...endpoints.map((e) => Number(e.inputPrice))) : null,
      medianTps: tps.length ? tps[Math.floor(tps.length / 2)] : null,
    };
  });
}

export async function getProvider(slug: string) {
  const provider = await prisma.provider.findUnique({
    where: { slug },
    include: {
      endpoints: {
        orderBy: { model: { atlasScore: { sort: "desc", nulls: "last" } } },
        include: { model: { select: { ...modelSummarySelect, atlasScore: true } } },
      },
    },
  });
  if (!provider) throw new NotFoundError(`Provider "${slug}"`);
  const { endpoints, ...rest } = omitTimestamps(provider);
  return {
    ...rest,
    endpoints: endpoints.map((e) => ({
      model: toModelSummary(e.model, e.model.atlasScore),
      inputPrice: Number(e.inputPrice),
      outputPrice: Number(e.outputPrice),
      cachedInputPrice: e.cachedInputPrice === null ? null : Number(e.cachedInputPrice),
      contextWindow: e.contextWindow,
      throughputTps: e.throughputTps,
      latencyMs: e.latencyMs,
      uptimePct: e.uptimePct,
    })),
  };
}

// ───────────────────────────── Search & stats ─────────────────────────────

export async function globalSearch(q: string, limit = 6) {
  const contains = { contains: q, mode: "insensitive" as const };
  const [models, labs, providers] = await Promise.all([
    prisma.model.findMany({
      where: { OR: [{ name: contains }, { slug: contains }, { lab: { name: contains } }] },
      orderBy: [{ atlasScore: { sort: "desc", nulls: "last" } }, { releaseDate: "desc" }],
      take: limit,
      select: { slug: true, name: true, type: true, lab: { select: { name: true, accentColor: true } } },
    }),
    prisma.lab.findMany({
      where: { OR: [{ name: contains }, { slug: contains }] },
      take: limit,
      select: { slug: true, name: true, accentColor: true, _count: { select: { models: true } } },
    }),
    prisma.provider.findMany({
      where: { OR: [{ name: contains }, { slug: contains }] },
      take: limit,
      select: { slug: true, name: true, accentColor: true, type: true, _count: { select: { endpoints: true } } },
    }),
  ]);
  return {
    models,
    labs: labs.map(({ _count, ...l }) => ({ ...l, modelCount: _count.models })),
    providers: providers.map(({ _count, ...p }) => ({ ...p, modelCount: _count.endpoints })),
  };
}
export type SearchResults = Awaited<ReturnType<typeof globalSearch>>;

export async function getStats() {
  const [models, labs, providers, endpoints, benchmarks, openWeights] = await Promise.all([
    prisma.model.count(),
    prisma.lab.count(),
    prisma.provider.count(),
    prisma.modelEndpoint.count(),
    prisma.benchmark.count(),
    prisma.model.count({ where: { openWeights: true } }),
  ]);
  return { models, labs, providers, endpoints, benchmarks, openWeights };
}

export async function getHomeData() {
  const [stats, top, latest, cheapest] = await Promise.all([
    getStats(),
    prisma.model.findMany({
      where: { atlasScore: { not: null } },
      orderBy: { atlasScore: "desc" },
      take: 5,
      select: { ...modelSummarySelect, atlasScore: true },
    }),
    prisma.model.findMany({ orderBy: { releaseDate: "desc" }, take: 6, select: { ...modelSummarySelect, atlasScore: true } }),
    // Best value: strong models (Atlas ≥ 70) with the lowest input price
    prisma.model.findMany({
      where: { atlasScore: { gte: 70 }, minInputPrice: { gt: 0 } },
      orderBy: { minInputPrice: "asc" },
      take: 5,
      select: { ...modelSummarySelect, atlasScore: true },
    }),
  ]);
  const map = (xs: typeof top) => xs.map((m) => toModelSummary(m, m.atlasScore));
  return { stats, top: map(top), latest: map(latest), bestValue: map(cheapest) };
}
