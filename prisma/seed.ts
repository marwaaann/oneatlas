/**
 * Seed = run the sample dataset through the same ingestion pipeline the
 * POST /api/ingest endpoint uses (validate → normalize → upsert). Idempotent:
 * safe to re-run at any time.
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { ingest } from "../src/lib/ingest/upsert";
import type { RawModel } from "../src/lib/ingest/schema";
import { benchmarks, labs, providers } from "./data/reference";
import { models } from "./data/models";

/** Tiny deterministic PRNG (FNV-1a hash → mulberry32) so synthetic metrics are stable across seeds. */
function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Typical median output speed by host (tokens/sec) — rough public ballparks. */
const BASE_TPS: Record<string, number> = {
  cerebras: 1500, groq: 550, fireworks: 160, together: 120, deepinfra: 70,
  "aws-bedrock": 65, "azure-ai-foundry": 70, "google-vertex": 110,
};

/**
 * Performance metrics aren't in public model cards, so the seed synthesizes
 * plausible ones. Real deployments would ingest these from a probe service.
 */
function withSyntheticPerf(m: RawModel): RawModel {
  const endpoints = Object.fromEntries(
    Object.entries(m.endpoints).map(([provider, e]) => {
      const r = rng(`${m.name}:${provider}`);
      const isReasoning = m.type === "reasoning";
      const base = BASE_TPS[provider] ?? 90;
      return [
        provider,
        {
          throughputTps: Math.round(base * (0.7 + r() * 0.6) * (isReasoning ? 0.8 : 1)),
          latencyMs: Math.round((isReasoning ? 900 : 250) + r() * (isReasoning ? 4000 : 900)),
          uptimePct: Math.round((98.6 + r() * 1.39) * 100) / 100,
          ...e,
        },
      ];
    }),
  );
  return { ...m, endpoints };
}

async function main() {
  const t0 = Date.now();
  const summary = await ingest(prisma, {
    labs,
    providers,
    benchmarks,
    models: models.map(withSyntheticPerf),
  });
  console.log(`Seeded in ${Date.now() - t0}ms`, { ...summary, errors: summary.errors.length });
  if (summary.errors.length) {
    console.error(summary.errors);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
