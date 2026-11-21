import { z } from "zod";

/**
 * RAW ingestion shapes.
 *
 * Upstream sources (provider pricing pages, lab model cards, CSV exports…)
 * disagree on units and formats, so the raw schema is deliberately lenient:
 *  - prices may be per token, per 1K or per 1M tokens
 *  - context windows may be numbers or strings like "128k" / "1M"
 *  - enums are accepted case-insensitively with "-", "_" or " " separators
 * `normalize.ts` converts these into the canonical DB shape.
 */

const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be kebab-case (a-z, 0-9, -)");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "must be a #RRGGBB colour");
const url = z.string().url();
const tokenCount = z.union([z.number().int().positive(), z.string().min(1)]);
const nonNegative = z.number().nonnegative();

export const priceUnit = z.enum(["per_token", "per_1k", "per_1m"]);

export const rawPricing = z.object({
  unit: priceUnit.default("per_1m"),
  input: nonNegative,
  output: nonNegative,
  cachedInput: nonNegative.optional(),
});

export const rawLab = z.object({
  slug,
  name: z.string().min(1),
  type: z.string(),
  description: z.string().min(1),
  website: url,
  headquarters: z.string().min(1),
  foundedYear: z.number().int().min(1950).max(2100),
  accentColor: hex,
});

export const rawProvider = z.object({
  slug,
  name: z.string().min(1),
  type: z.string(),
  description: z.string().min(1),
  website: url,
  accentColor: hex,
});

export const rawBenchmark = z.object({
  slug,
  name: z.string().min(1),
  category: z.string(),
  description: z.string().min(1),
  url: url.optional(),
  higherIsBetter: z.boolean().default(true),
  maxScore: z.number().positive().default(100),
});

/** Per-provider endpoint. Omitted fields inherit from the model's reference values. */
export const rawEndpoint = z.object({
  pricing: rawPricing.optional(),
  contextWindow: tokenCount.optional(),
  maxOutputTokens: tokenCount.optional(),
  throughputTps: z.number().int().positive().optional(),
  latencyMs: z.number().int().positive().optional(),
  uptimePct: z.number().min(0).max(100).optional(),
});

export const rawModel = z.object({
  slug: slug.optional(), // derived from name when absent
  name: z.string().min(1),
  lab: slug,
  type: z.string(),
  description: z.string().min(1),
  releaseDate: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "invalid date"),
  contextWindow: tokenCount,
  maxOutputTokens: tokenCount.optional(),
  parameterCount: z.string().optional(),
  openWeights: z.boolean().default(false),
  license: z.string().optional(),
  knowledgeCutoff: z.string().optional(),
  input: z.array(z.string()).min(1),
  output: z.array(z.string()).min(1),
  capabilities: z.array(z.string()).default([]),
  /** Reference price (usually the lab's own list price). */
  pricing: rawPricing,
  /** providerSlug → overrides */
  endpoints: z.record(slug, rawEndpoint).refine((e) => Object.keys(e).length > 0, {
    message: "a model needs at least one provider endpoint",
  }),
  /** benchmarkSlug → score */
  scores: z.record(slug, z.number()).default({}),
});

export const ingestPayload = z.object({
  labs: z.array(rawLab).default([]),
  providers: z.array(rawProvider).default([]),
  benchmarks: z.array(rawBenchmark).default([]),
  models: z.array(rawModel).default([]),
});

export type RawLab = z.input<typeof rawLab>;
export type RawProvider = z.input<typeof rawProvider>;
export type RawBenchmark = z.input<typeof rawBenchmark>;
export type RawModel = z.input<typeof rawModel>;
export type IngestPayload = z.input<typeof ingestPayload>;
