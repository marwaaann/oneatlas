import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CompareToggle } from "@/components/compare/compare-controls";
import { ModelTable } from "@/components/models/model-table";
import { Avatar, Badge, ButtonLink, Card, ScoreBar, SectionTitle, Stat } from "@/components/ui";
import { NotFoundError } from "@/lib/errors";
import {
  CAPABILITY_LABEL,
  CATEGORY_LABEL,
  formatDate,
  formatPrice,
  formatScore,
  formatTokens,
  MODALITY_LABEL,
  PROVIDER_TYPE_LABEL,
  TYPE_LABEL,
} from "@/lib/format";
import { blendedPrice } from "@/lib/services/aggregates";
import { getModel, similarModels } from "@/lib/services/models";
import { Capability } from "@prisma/client";

export const revalidate = 300;
// Render on first request, then cache and revalidate every 5 min (ISR).
// Empty list = nothing prebuilt at build time, so the build never needs every slug.
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}

type Params = Promise<{ slug: string }>;

// Dedupe the DB call between generateMetadata and the page render.
const load = cache(async (slug: string) => {
  try {
    return await getModel(slug);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const m = await load((await params).slug);
  return { title: `${m.name} — ${m.lab.name}`, description: m.description };
}

export default async function ModelPage({ params }: { params: Params }) {
  const m = await load((await params).slug);
  const similar = await similarModels(m);
  const cheapest = m.endpoints[0];
  const fastest = [...m.endpoints].sort((a, b) => (b.throughputTps ?? 0) - (a.throughputTps ?? 0))[0];

  return (
    <article>
      <nav className="mb-6 text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/models" className="hover:text-fg">Models</Link> <span className="text-subtle">/</span>{" "}
        <Link href={`/labs/${m.lab.slug}`} className="hover:text-fg">{m.lab.name}</Link>
      </nav>

      <header className="mb-8 flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-4">
          <Avatar name={m.lab.name} color={m.lab.accentColor} size="lg" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{m.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
              <Link href={`/labs/${m.lab.slug}`} className="hover:text-fg">{m.lab.name}</Link>
              <span className="text-subtle">·</span>
              <Badge tone="accent">{TYPE_LABEL[m.type]}</Badge>
              {m.openWeights ? <Badge tone="good">Open weights</Badge> : <Badge>Proprietary</Badge>}
              <span className="text-subtle">·</span>
              <span>Released {formatDate(m.releaseDate, "long")}</span>
            </div>
            <p className="mt-3 max-w-2xl text-muted">{m.description}</p>
            <code className="mt-3 inline-block rounded bg-surface-2 px-2 py-1 font-mono text-xs text-muted">{m.slug}</code>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <CompareToggle slug={m.slug} name={m.name} size="md" />
          <ButtonLink href={`/rankings`}>Rankings</ButtonLink>
        </div>
      </header>

      <section className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Input / 1M" value={formatPrice(m.inputPrice)} hint={cheapest ? `via ${cheapest.provider.name}` : undefined} />
        <Stat label="Output / 1M" value={formatPrice(m.outputPrice)} />
        <Stat label="Blended (3:1)" value={formatPrice(blendedPrice(m.inputPrice, m.outputPrice))} />
        <Stat label="Context" value={formatTokens(m.contextWindow)} hint={m.maxOutputTokens ? `${formatTokens(m.maxOutputTokens)} max output` : undefined} />
        <Stat label="Atlas Index" value={formatScore(m.atlasScore)} hint={m.atlasRank ? `#${m.atlasRank} overall` : "Not enough benchmarks"} />
        <Stat label="Providers" value={m.endpoints.length} hint={fastest?.throughputTps ? `up to ${fastest.throughputTps} tok/s` : undefined} />
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-10">
          <section>
            <SectionTitle>Providers & pricing</SectionTitle>
            <div className="scroll-x rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface text-left text-xs text-muted">
                  <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-medium">
                    <th>Provider</th>
                    <th className="text-right">Input</th>
                    <th className="text-right">Output</th>
                    <th className="text-right">Cached in</th>
                    <th className="text-right">Context</th>
                    <th className="text-right">Throughput</th>
                    <th className="text-right">TTFT</th>
                    <th className="text-right">Uptime</th>
                  </tr>
                </thead>
                <tbody className="num divide-y divide-border">
                  {m.endpoints.map((e, i) => (
                    <tr key={e.provider.slug} className="[&>td]:px-4 [&>td]:py-3">
                      <td>
                        <Link href={`/providers/${e.provider.slug}`} className="flex items-center gap-2 hover:text-accent">
                          <Avatar name={e.provider.name} color={e.provider.accentColor} size="sm" />
                          <span className="whitespace-nowrap">{e.provider.name}</span>
                          {i === 0 && <Badge tone="good">Cheapest</Badge>}
                        </Link>
                        <div className="ml-7 text-xs text-subtle">{PROVIDER_TYPE_LABEL[e.provider.type]}</div>
                      </td>
                      <td className="text-right">{formatPrice(e.inputPrice)}</td>
                      <td className="text-right">{formatPrice(e.outputPrice)}</td>
                      <td className="text-right text-muted">{formatPrice(e.cachedInputPrice)}</td>
                      <td className="text-right">{formatTokens(e.contextWindow)}</td>
                      <td className="text-right">{e.throughputTps ? `${e.throughputTps} t/s` : "—"}</td>
                      <td className="text-right text-muted">{e.latencyMs ? `${(e.latencyMs / 1000).toFixed(2)}s` : "—"}</td>
                      <td className="text-right text-muted">{e.uptimePct ? `${e.uptimePct.toFixed(2)}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-subtle">Prices in USD per 1M tokens. Throughput, TTFT and uptime are synthetic sample metrics.</p>
          </section>

          <section>
            <SectionTitle href="/rankings" linkLabel="All rankings">Benchmarks</SectionTitle>
            {m.scores.length ? (
              <Card className="divide-y divide-border">
                {m.scores.map((s) => (
                  <Link
                    key={s.benchmark.slug}
                    href={`/rankings?benchmark=${s.benchmark.slug}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 hover:bg-surface-2 sm:grid-cols-[180px_1fr_60px]"
                  >
                    <div>
                      <div className="text-sm font-medium">{s.benchmark.name}</div>
                      <div className="text-xs text-subtle">{CATEGORY_LABEL[s.benchmark.category]}</div>
                    </div>
                    <div className="order-3 col-span-2 sm:order-none sm:col-span-1">
                      <ScoreBar value={s.score} max={s.benchmark.maxScore} />
                    </div>
                    <div className="num text-right font-medium">{s.score.toFixed(1)}</div>
                  </Link>
                ))}
              </Card>
            ) : (
              <p className="text-sm text-muted">No benchmark results reported for this model.</p>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold">Specifications</h2>
            <dl className="space-y-2.5 text-sm">
              {[
                ["Lab", m.lab.name],
                ["Type", TYPE_LABEL[m.type]],
                ["Parameters", m.parameterCount ?? "Undisclosed"],
                ["License", m.license ?? "Proprietary"],
                ["Knowledge cutoff", m.knowledgeCutoff ?? "—"],
                ["Context window", `${m.contextWindow.toLocaleString()} tokens`],
                ["Max output", m.maxOutputTokens ? `${m.maxOutputTokens.toLocaleString()} tokens` : "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-muted">{k}</dt>
                  <dd className="text-right">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold">Modalities</h2>
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-14 text-muted">Input</span>
                {m.inputModalities.map((x) => <Badge key={x}>{MODALITY_LABEL[x]}</Badge>)}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-14 text-muted">Output</span>
                {m.outputModalities.map((x) => <Badge key={x}>{MODALITY_LABEL[x]}</Badge>)}
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold">Capabilities</h2>
            <ul className="space-y-1.5 text-sm">
              {Object.values(Capability).map((c) => {
                const has = m.capabilities.includes(c);
                return (
                  <li key={c} className={has ? "" : "text-subtle line-through decoration-subtle/50"}>
                    <span className={has ? "text-good" : ""} aria-hidden>{has ? "✓" : "–"}</span>{" "}
                    {CAPABILITY_LABEL[c]}
                    <span className="sr-only">{has ? " supported" : " not supported"}</span>
                  </li>
                );
              })}
            </ul>
          </Card>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-12">
          <SectionTitle>Similar {TYPE_LABEL[m.type].toLowerCase()} models</SectionTitle>
          <ModelTable models={similar} />
        </section>
      )}
    </article>
  );
}
