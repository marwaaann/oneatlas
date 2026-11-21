import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ComparePicker } from "@/components/compare/compare-picker";
import { Avatar, Badge, Card, PageHeader } from "@/components/ui";
import type { ModelDetail } from "@/lib/dto";
import {
  CAPABILITY_LABEL,
  CATEGORY_LABEL,
  formatDate,
  formatPrice,
  formatScore,
  formatTokens,
  MODALITY_LABEL,
  TYPE_LABEL,
} from "@/lib/format";
import { blendedPrice } from "@/lib/services/aggregates";
import { compareModels } from "@/lib/services/models";
import { compareQuery, paramsToObject } from "@/lib/validation";
import { Capability, Modality } from "@prisma/client";

export const metadata: Metadata = { title: "Compare models" };

const PRESETS = [
  { label: "Frontier flagships", models: ["gpt-5", "claude-sonnet-4-5", "gemini-2-5-pro", "grok-4"] },
  { label: "Budget workhorses", models: ["gpt-5-mini", "gemini-2-5-flash", "claude-haiku-4-5", "deepseek-v3"] },
  { label: "Open-weights reasoning", models: ["deepseek-r1", "qwen3-235b-a22b", "gpt-oss-120b", "glm-4-5"] },
];

type Row = {
  label: string;
  values: (number | null)[];
  render: (v: number | null, m: ModelDetail) => ReactNode;
  best?: "max" | "min";
};

function bestIndexes(values: (number | null)[], mode?: "max" | "min") {
  if (!mode) return new Set<number>();
  const nums = values.filter((v): v is number => v !== null);
  if (nums.length < 2) return new Set<number>();
  const target = mode === "max" ? Math.max(...nums) : Math.min(...nums);
  return new Set(values.flatMap((v, i) => (v === target ? [i] : [])));
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const parsed = compareQuery.safeParse(paramsToObject(await searchParams));
  const slugs = parsed.success ? parsed.data.models : [];
  const { models, missing, benchmarks } = slugs.length ? await compareModels(slugs) : { models: [], missing: [], benchmarks: [] };

  const header = (
    <PageHeader
      eyebrow="Compare"
      title="Compare models side by side"
      description="Pricing, context, capabilities and benchmarks for up to four models. The URL is shareable."
    />
  );

  if (models.length === 0) {
    return (
      <>
        {header}
        <ComparePicker selected={[]} />
        {missing.length > 0 && <p className="mb-4 text-sm text-warn">Unknown model(s): {missing.join(", ")}</p>}
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Popular comparisons</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {PRESETS.map((p) => (
            <Link key={p.label} href={`/compare?models=${p.models.join(",")}`}>
              <Card className="h-full p-4 transition-colors hover:border-border-strong">
                <div className="font-medium">{p.label}</div>
                <div className="mt-1 text-sm text-muted">{p.models.join(" · ")}</div>
              </Card>
            </Link>
          ))}
        </div>
      </>
    );
  }

  const col = (fn: (m: ModelDetail) => number | null) => models.map(fn);
  const scoreOf = (m: ModelDetail, slug: string) => m.scores.find((s) => s.benchmark.slug === slug)?.score ?? null;
  const fastest = (m: ModelDetail) => Math.max(0, ...m.endpoints.map((e) => e.throughputTps ?? 0)) || null;

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: "Pricing (USD / 1M tokens, cheapest provider)",
      rows: [
        { label: "Input", values: col((m) => m.inputPrice), render: (v) => formatPrice(v), best: "min" },
        { label: "Output", values: col((m) => m.outputPrice), render: (v) => formatPrice(v), best: "min" },
        { label: "Blended 3:1", values: col((m) => blendedPrice(m.inputPrice, m.outputPrice)), render: (v) => formatPrice(v), best: "min" },
      ],
    },
    {
      title: "Limits & performance",
      rows: [
        { label: "Context window", values: col((m) => m.contextWindow), render: (v) => formatTokens(v), best: "max" },
        { label: "Max output", values: col((m) => m.maxOutputTokens), render: (v) => formatTokens(v), best: "max" },
        { label: "Providers", values: col((m) => m.endpoints.length), render: (v) => v ?? "—", best: "max" },
        { label: "Fastest throughput", values: col(fastest), render: (v) => (v ? `${v} t/s` : "—"), best: "max" },
        { label: "Released", values: col((m) => new Date(m.releaseDate).getTime()), render: (_v, m) => formatDate(m.releaseDate) },
      ],
    },
    {
      title: "Benchmarks",
      rows: [
        { label: "Atlas Index", values: col((m) => m.atlasScore), render: (v) => formatScore(v), best: "max" },
        ...benchmarks.map<Row>((b) => ({
          label: `${b.name} · ${CATEGORY_LABEL[b.category]}`,
          values: col((m) => scoreOf(m, b.slug)),
          render: (v) => (v === null ? "—" : v.toFixed(1)),
          best: "max",
        })),
      ],
    },
  ];

  const gridCols = { gridTemplateColumns: `minmax(150px,200px) repeat(${models.length}, minmax(150px, 1fr))` };

  return (
    <>
      {header}
      <ComparePicker selected={models.map((m) => ({ slug: m.slug, name: m.name }))} />
      {missing.length > 0 && <p className="mb-4 text-sm text-warn">Skipped unknown model(s): {missing.join(", ")}</p>}

      <div className="scroll-x rounded-xl border border-border">
        <div className="min-w-fit">
          {/* Model header row */}
          <div className="grid border-b border-border bg-surface" style={gridCols}>
            <div className="px-4 py-4 text-xs text-muted">Model</div>
            {models.map((m) => (
              <div key={m.slug} className="border-l border-border px-4 py-4">
                <div className="flex items-center gap-2">
                  <Avatar name={m.lab.name} color={m.lab.accentColor} size="sm" />
                  <Link href={`/models/${m.slug}`} className="truncate font-medium hover:text-accent">{m.name}</Link>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge>{TYPE_LABEL[m.type]}</Badge>
                  {m.openWeights && <Badge tone="good">Open</Badge>}
                </div>
              </div>
            ))}
          </div>

          {sections.map((s) => (
            <div key={s.title}>
              <div className="border-b border-border bg-surface-2/50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted">{s.title}</div>
              {s.rows.map((r) => {
                const best = bestIndexes(r.values, r.best);
                return (
                  <div key={r.label} className="grid border-b border-border text-sm last:border-0" style={gridCols}>
                    <div className="px-4 py-2.5 text-muted">{r.label}</div>
                    {models.map((m, i) => (
                      <div key={m.slug} className={clsx("num border-l border-border px-4 py-2.5", best.has(i) && "font-semibold text-good")}>
                        {r.render(r.values[i] ?? null, m)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}

          <div className="border-b border-border bg-surface-2/50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted">Capabilities & modalities</div>
          {Object.values(Capability).map((c) => (
            <div key={c} className="grid border-b border-border text-sm" style={gridCols}>
              <div className="px-4 py-2.5 text-muted">{CAPABILITY_LABEL[c]}</div>
              {models.map((m) => (
                <div key={m.slug} className="border-l border-border px-4 py-2.5">
                  {m.capabilities.includes(c) ? <span className="text-good">✓</span> : <span className="text-subtle">—</span>}
                </div>
              ))}
            </div>
          ))}
          {Object.values(Modality).map((x) => (
            <div key={x} className="grid border-b border-border text-sm last:border-0" style={gridCols}>
              <div className="px-4 py-2.5 text-muted">{MODALITY_LABEL[x]} input</div>
              {models.map((m) => (
                <div key={m.slug} className="border-l border-border px-4 py-2.5">
                  {m.inputModalities.includes(x) ? <span className="text-good">✓</span> : <span className="text-subtle">—</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-subtle">Green marks the best value in each row.</p>
    </>
  );
}
