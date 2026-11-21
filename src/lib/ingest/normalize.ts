import {
  BenchmarkCategory,
  Capability,
  LabType,
  Modality,
  ModelType,
  ProviderType,
} from "@prisma/client";
import type { z } from "zod";
import type { priceUnit, rawPricing } from "./schema";

export class NormalizationError extends Error {
  constructor(
    message: string,
    public readonly path: string,
  ) {
    super(`${path}: ${message}`);
    this.name = "NormalizationError";
  }
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\+/g, "-plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "128k" → 128000, "1M" → 1000000, "1,048,576" → 1048576, 8192 → 8192 */
export function parseTokenCount(value: number | string, path: string): number {
  if (typeof value === "number") return value;
  const m = value
    .trim()
    .replace(/,/g, "")
    .match(/^(\d+(?:\.\d+)?)\s*([kKmM])?$/);
  if (!m) throw new NormalizationError(`cannot parse token count "${value}"`, path);
  const n = Number(m[1]);
  const mult = m[2]?.toLowerCase() === "k" ? 1_000 : m[2]?.toLowerCase() === "m" ? 1_000_000 : 1;
  return Math.round(n * mult);
}

const UNIT_TO_PER_MILLION: Record<z.infer<typeof priceUnit>, number> = {
  per_token: 1_000_000,
  per_1k: 1_000,
  per_1m: 1,
};

/** Round to 4dp to match the Decimal(12,4) columns and kill float noise (0.15000000000000002). */
const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

export function normalizePricing(p: z.infer<typeof rawPricing>) {
  const f = UNIT_TO_PER_MILLION[p.unit];
  return {
    inputPrice: round4(p.input * f),
    outputPrice: round4(p.output * f),
    cachedInputPrice: p.cachedInput === undefined ? null : round4(p.cachedInput * f),
  };
}

/** Case/separator-insensitive enum lookup: "function-calling", "Function Calling" → FUNCTION_CALLING */
function toEnum<T extends Record<string, string>>(e: T, value: string, path: string): T[keyof T] {
  const key = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, string> = {
    TOOLS: "FUNCTION_CALLING",
    TOOL_USE: "FUNCTION_CALLING",
    JSON_MODE: "STRUCTURED_OUTPUT",
    THINKING: "REASONING",
    CACHING: "PROMPT_CACHING",
    PDF: "FILE",
    RESEARCH: "RESEARCH_LAB",
  };
  const resolved = aliases[key] ?? key;
  if (!(resolved in e)) {
    throw new NormalizationError(
      `"${value}" is not one of ${Object.keys(e).join(", ")}`,
      path,
    );
  }
  return e[resolved as keyof T];
}

const uniq = <T,>(xs: T[]) => [...new Set(xs)];

export const enums = {
  labType: (v: string, p: string) => toEnum(LabType, v, p),
  providerType: (v: string, p: string) => toEnum(ProviderType, v, p),
  modelType: (v: string, p: string) => toEnum(ModelType, v, p),
  benchmarkCategory: (v: string, p: string) => toEnum(BenchmarkCategory, v, p),
  modalities: (vs: string[], p: string) => uniq(vs.map((v, i) => toEnum(Modality, v, `${p}[${i}]`))),
  capabilities: (vs: string[], p: string) =>
    uniq(vs.map((v, i) => toEnum(Capability, v, `${p}[${i}]`))),
};
