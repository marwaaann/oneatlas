import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

/** A model needs at least this many benchmark results to get a composite score. */
export const ATLAS_MIN_BENCHMARKS = 3;

/**
 * Atlas Index = mean of the model's benchmark scores, each normalized to
 * 0–100 by the benchmark's maxScore. Requiring ≥3 results stops a model with a
 * single easy benchmark from topping the board.
 */
export function atlasIndex(scores: { score: number; maxScore: number }[]): number | null {
  if (scores.length < ATLAS_MIN_BENCHMARKS) return null;
  const mean = scores.reduce((acc, s) => acc + (s.score / s.maxScore) * 100, 0) / scores.length;
  return Math.round(mean * 10) / 10;
}

/**
 * Keeps Model.minInputPrice / minOutputPrice / providerCount / atlasScore in
 * sync with its endpoints and scores. Called inside the same transaction that
 * mutates them, so the denormalized columns can never drift from source rows.
 */
export async function recomputeModelAggregates(tx: Tx, modelId: string) {
  const [price, scores] = await Promise.all([
    tx.modelEndpoint.aggregate({
      where: { modelId },
      _min: { inputPrice: true, outputPrice: true },
      _count: { _all: true },
    }),
    tx.benchmarkScore.findMany({
      where: { modelId },
      select: { score: true, benchmark: { select: { maxScore: true } } },
    }),
  ]);
  await tx.model.update({
    where: { id: modelId },
    data: {
      minInputPrice: price._min.inputPrice,
      minOutputPrice: price._min.outputPrice,
      providerCount: price._count._all,
      atlasScore: atlasIndex(scores.map((s) => ({ score: s.score, maxScore: s.benchmark.maxScore }))),
    },
  });
}

/**
 * Blended price per 1M tokens assuming a 3:1 input:output token ratio — the
 * convention most price/performance comparisons use for chat workloads.
 */
export function blendedPrice(input: number | null, output: number | null): number | null {
  if (input === null || output === null) return null;
  return (3 * input + output) / 4;
}
