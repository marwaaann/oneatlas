import type { BenchmarkCategory, Capability, Modality, ModelType, Prisma, ProviderType, LabType } from "@prisma/client";

/**
 * DTOs: the JSON shape the API returns and the UI consumes.
 * Prisma Decimals → number, Dates → ISO strings, so the same objects can be
 * serialised by route handlers and passed from Server to Client Components.
 */

export interface LabRef {
  slug: string;
  name: string;
  accentColor: string;
}

export interface ModelSummary {
  slug: string;
  name: string;
  type: ModelType;
  description: string;
  lab: LabRef;
  releaseDate: string;
  contextWindow: number;
  maxOutputTokens: number | null;
  inputPrice: number | null; // cheapest available, USD / 1M
  outputPrice: number | null;
  providerCount: number;
  openWeights: boolean;
  parameterCount: string | null;
  capabilities: Capability[];
  inputModalities: Modality[];
  outputModalities: Modality[];
  atlasScore: number | null;
}

export interface EndpointDTO {
  provider: { slug: string; name: string; type: ProviderType; accentColor: string };
  inputPrice: number;
  outputPrice: number;
  cachedInputPrice: number | null;
  contextWindow: number;
  maxOutputTokens: number | null;
  throughputTps: number | null;
  latencyMs: number | null;
  uptimePct: number | null;
}

export interface ScoreDTO {
  benchmark: { slug: string; name: string; category: BenchmarkCategory; maxScore: number };
  score: number;
}

export interface ModelDetail extends ModelSummary {
  license: string | null;
  knowledgeCutoff: string | null;
  lab: LabRef & { type: LabType; website: string };
  endpoints: EndpointDTO[];
  scores: ScoreDTO[];
  atlasRank: number | null;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const num = (d: Prisma.Decimal | null | undefined) => (d == null ? null : Number(d));

export const modelSummarySelect = {
  slug: true,
  name: true,
  type: true,
  description: true,
  releaseDate: true,
  contextWindow: true,
  maxOutputTokens: true,
  minInputPrice: true,
  minOutputPrice: true,
  providerCount: true,
  openWeights: true,
  parameterCount: true,
  capabilities: true,
  inputModalities: true,
  outputModalities: true,
  id: true,
  lab: { select: { slug: true, name: true, accentColor: true } },
} satisfies Prisma.ModelSelect;

export type ModelSummaryRow = Prisma.ModelGetPayload<{ select: typeof modelSummarySelect }>;

export function toModelSummary(m: ModelSummaryRow, atlasScore: number | null): ModelSummary {
  return {
    slug: m.slug,
    name: m.name,
    type: m.type,
    description: m.description,
    lab: m.lab,
    releaseDate: m.releaseDate.toISOString(),
    contextWindow: m.contextWindow,
    maxOutputTokens: m.maxOutputTokens,
    inputPrice: num(m.minInputPrice),
    outputPrice: num(m.minOutputPrice),
    providerCount: m.providerCount,
    openWeights: m.openWeights,
    parameterCount: m.parameterCount,
    capabilities: m.capabilities,
    inputModalities: m.inputModalities,
    outputModalities: m.outputModalities,
    atlasScore,
  };
}

export { num as decimalToNumber };
