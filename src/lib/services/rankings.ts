import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { modelSummarySelect, toModelSummary, type ModelSummary } from "../dto";
import { NotFoundError } from "../errors";
import type { RankingsQuery } from "../validation";
import { atlasIndex } from "./aggregates";

export interface LeaderboardRow {
  rank: number;
  model: ModelSummary;
  score: number;
  /** benchmarks that contributed (composite boards only) */
  coverage?: number;
}

export interface Leaderboard {
  mode: "composite" | "benchmark";
  title: string;
  description: string;
  maxScore: number;
  rows: LeaderboardRow[];
}

export async function listBenchmarks() {
  const rows = await prisma.benchmark.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: { _count: { select: { scores: true } } },
  });
  return rows.map(({ _count, ...b }) => ({ ...b, modelCount: _count.scores }));
}

/** Competition ranking: equal scores share a rank (1, 2, 2, 4). */
function rank<T extends { score: number }>(xs: T[]) {
  let prev: number | null = null;
  let r = 0;
  return xs.map((x, i) => {
    if (x.score !== prev) r = i + 1;
    prev = x.score;
    return { ...x, rank: r };
  });
}

export async function getLeaderboard(q: RankingsQuery): Promise<Leaderboard> {
  const modelWhere: Prisma.ModelWhereInput = {
    ...(q.type ? { type: q.type } : {}),
    ...(q.openWeights !== undefined ? { openWeights: q.openWeights } : {}),
  };

  // ── Single benchmark: straight ORDER BY on the indexed (benchmarkId, score) ──
  if (q.benchmark !== "atlas") {
    const benchmark = await prisma.benchmark.findUnique({ where: { slug: q.benchmark } });
    if (!benchmark) throw new NotFoundError(`Benchmark "${q.benchmark}"`);
    const scores = await prisma.benchmarkScore.findMany({
      where: { benchmarkId: benchmark.id, model: modelWhere },
      orderBy: { score: benchmark.higherIsBetter ? "desc" : "asc" },
      take: q.limit,
      include: { model: { select: { ...modelSummarySelect, atlasScore: true } } },
    });
    return {
      mode: "benchmark",
      title: benchmark.name,
      description: benchmark.description,
      maxScore: benchmark.maxScore,
      rows: rank(scores.map((s) => ({ model: toModelSummary(s.model, s.model.atlasScore), score: s.score }))),
    };
  }

  // ── Composite, overall: use the denormalized column ──
  if (!q.category) {
    const rows = await prisma.model.findMany({
      where: { ...modelWhere, atlasScore: { not: null } },
      orderBy: [{ atlasScore: "desc" }, { slug: "asc" }],
      take: q.limit,
      select: { ...modelSummarySelect, atlasScore: true, _count: { select: { scores: true } } },
    });
    return {
      mode: "composite",
      title: "Atlas Index",
      description: "Mean normalized score across every benchmark a model reports (minimum 3).",
      maxScore: 100,
      rows: rank(
        rows.map((r) => ({ model: toModelSummary(r, r.atlasScore), score: r.atlasScore!, coverage: r._count.scores })),
      ),
    };
  }

  // ── Composite within a category: aggregate on the fly ──
  // Category boards often have only 1–2 benchmarks, so the ≥3 rule is relaxed to "all of them".
  const benchmarks = await prisma.benchmark.findMany({ where: { category: q.category } });
  const scores = await prisma.benchmarkScore.findMany({
    where: { benchmarkId: { in: benchmarks.map((b) => b.id) }, model: modelWhere },
    select: { modelId: true, score: true, benchmark: { select: { maxScore: true } } },
  });
  const byModel = new Map<string, { score: number; maxScore: number }[]>();
  for (const s of scores) {
    const list = byModel.get(s.modelId) ?? [];
    list.push({ score: s.score, maxScore: s.benchmark.maxScore });
    byModel.set(s.modelId, list);
  }
  const need = Math.min(benchmarks.length, 3);
  const eligible = [...byModel.entries()]
    .filter(([, xs]) => xs.length >= need)
    .map(([id, xs]) => ({
      id,
      score: need < 3 ? Math.round((xs.reduce((a, x) => a + (x.score / x.maxScore) * 100, 0) / xs.length) * 10) / 10 : atlasIndex(xs)!,
      coverage: xs.length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, q.limit);

  const models = await prisma.model.findMany({
    where: { id: { in: eligible.map((e) => e.id) } },
    select: { ...modelSummarySelect, atlasScore: true },
  });
  const byId = new Map(models.map((m) => [m.id, m]));
  const label = q.category.charAt(0) + q.category.slice(1).toLowerCase();

  return {
    mode: "composite",
    title: `${label} index`,
    description: `Mean normalized score across ${benchmarks.map((b) => b.name).join(", ")}.`,
    maxScore: 100,
    rows: rank(
      eligible.map((e) => {
        const m = byId.get(e.id)!;
        return { model: toModelSummary(m, m.atlasScore), score: e.score, coverage: e.coverage };
      }),
    ),
  };
}
