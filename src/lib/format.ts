import type { BenchmarkCategory, Capability, Modality, ModelType, ProviderType, LabType } from "@prisma/client";

/** $ per 1M tokens. Sub-cent values keep precision; 0 reads as "Free". */
export function formatPrice(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n === 0) return "Free";
  if (n < 0.1) return `$${n.toFixed(3).replace(/0+$/, "")}`;
  return `$${n.toFixed(2)}`;
}

/** 128000 → "128K", 1048576 → "1.05M", 10000000 → "10M" */
export function formatTokens(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export function formatDate(iso: string | Date, style: "short" | "long" = "short"): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: style === "long" ? "long" : "short",
    ...(style === "long" ? { day: "numeric" } : {}),
    timeZone: "UTC",
  });
}

export function formatScore(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : n.toFixed(1);
}

export const TYPE_LABEL: Record<ModelType, string> = {
  CHAT: "Chat",
  REASONING: "Reasoning",
  CODE: "Code",
  EMBEDDING: "Embedding",
};

export const CAPABILITY_LABEL: Record<Capability, string> = {
  FUNCTION_CALLING: "Function calling",
  STRUCTURED_OUTPUT: "Structured output",
  VISION: "Vision",
  REASONING: "Reasoning",
  STREAMING: "Streaming",
  FINE_TUNING: "Fine-tuning",
  WEB_SEARCH: "Web search",
  PROMPT_CACHING: "Prompt caching",
  BATCH: "Batch API",
};

export const MODALITY_LABEL: Record<Modality, string> = {
  TEXT: "Text",
  IMAGE: "Image",
  AUDIO: "Audio",
  VIDEO: "Video",
  FILE: "Files / PDF",
};

export const CATEGORY_LABEL: Record<BenchmarkCategory, string> = {
  KNOWLEDGE: "Knowledge",
  REASONING: "Reasoning",
  CODING: "Coding",
  MATH: "Math",
  MULTIMODAL: "Multimodal",
  AGENTIC: "Agentic",
};

export const PROVIDER_TYPE_LABEL: Record<ProviderType, string> = {
  FIRST_PARTY: "First-party API",
  CLOUD: "Cloud platform",
  INFERENCE: "Inference host",
};

export const LAB_TYPE_LABEL: Record<LabType, string> = {
  COMPANY: "Company",
  RESEARCH_LAB: "Research lab",
  OPEN_SOURCE_COLLECTIVE: "Open-source collective",
};

export const label = <K extends string>(map: Record<K, string>, key: string) => map[key as K] ?? key;
