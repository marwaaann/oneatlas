import { BenchmarkCategory, Capability, Modality, ModelType } from "@prisma/client";
import { z } from "zod";

/** Accepts "a,b" or ["a","b"] (repeated query params) → string[] */
const csv = <T extends z.ZodTypeAny>(item: T) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? [] : (Array.isArray(v) ? v : [v]).flatMap((s) => s.split(","))))
    .transform((xs) => xs.map((s) => s.trim()).filter(Boolean))
    // Zod 4's pipe() requires the item schema's *input* type to accept string; z.preprocess
    // (used by upperEnum) types its input as unknown. Type-only narrowing; runtime is unchanged.
    .pipe(z.array(item) as unknown as z.ZodType<z.output<T>[], string[]>);

const upperEnum = <E extends Record<string, string>>(e: E) =>
  z.preprocess((v) => (typeof v === "string" ? v.toUpperCase() : v), z.nativeEnum(e));

const bool = z
  .enum(["true", "false", "1", "0"])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === "true" || v === "1"));

export const MODEL_SORTS = ["release", "price", "context", "name", "score"] as const;
export type ModelSort = (typeof MODEL_SORTS)[number];

export const modelListQuery = z.object({
  q: z.string().trim().max(100).optional(),
  lab: csv(z.string()),
  provider: csv(z.string()),
  type: csv(upperEnum(ModelType)),
  capability: csv(upperEnum(Capability)),
  modality: csv(upperEnum(Modality)),
  openWeights: bool,
  minContext: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(), // max input $/1M
  sort: z.enum(MODEL_SORTS).default("release"),
  order: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ModelListQuery = z.infer<typeof modelListQuery>;

export const compareQuery = z.object({
  models: csv(z.string()).pipe(z.array(z.string()).max(4, "compare up to 4 models")),
});

export const rankingsQuery = z.object({
  benchmark: z.string().default("atlas"),
  category: upperEnum(BenchmarkCategory).optional(),
  type: upperEnum(ModelType).optional(),
  openWeights: bool,
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type RankingsQuery = z.infer<typeof rankingsQuery>;

export const searchQuery = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().min(1).max(20).default(6),
});

/** URLSearchParams / Next searchParams → plain object zod can parse (keeps repeated keys as arrays). */
export function paramsToObject(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  const entries =
    params instanceof URLSearchParams ? [...params.entries()] : Object.entries(params);
  for (const [k, v] of entries) {
    if (v === undefined || v === "") continue;
    const prev = out[k];
    if (prev === undefined) out[k] = v;
    else out[k] = ([] as string[]).concat(prev, v);
  }
  return out;
}
