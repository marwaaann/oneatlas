import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CompareToggle } from "@/components/compare/compare-controls";
import { Avatar, Badge, SectionTitle, Stat } from "@/components/ui";
import { NotFoundError } from "@/lib/errors";
import { formatPrice, formatScore, formatTokens, PROVIDER_TYPE_LABEL } from "@/lib/format";
import { getProvider } from "@/lib/services/directory";

export const revalidate = 300;
// Render on first request, then cache and revalidate every 5 min (ISR).
// Empty list = nothing prebuilt at build time, so the build never needs every slug.
export const dynamicParams = true;
export async function generateStaticParams() {
  return [];
}
type Params = Promise<{ slug: string }>;

const load = cache(async (slug: string) => {
  try {
    return await getProvider(slug);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await load((await params).slug);
  return { title: p.name, description: p.description };
}

export default async function ProviderPage({ params }: { params: Params }) {
  const p = await load((await params).slug);
  const labs = new Set(p.endpoints.map((e) => e.model.lab.slug));
  const tps = p.endpoints.map((e) => e.throughputTps).filter((x): x is number => x !== null);

  return (
    <>
      <nav className="mb-6 text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/providers" className="hover:text-fg">Providers</Link>
      </nav>
      <header className="mb-8 flex items-start gap-4">
        <Avatar name={p.name} color={p.accentColor} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{p.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <Badge>{PROVIDER_TYPE_LABEL[p.type]}</Badge>
            <a href={p.website} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              {new URL(p.website).hostname} ↗
            </a>
          </div>
          <p className="mt-3 max-w-2xl text-muted">{p.description}</p>
        </div>
      </header>

      <section className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Models served" value={p.endpoints.length} />
        <Stat label="Labs" value={labs.size} />
        <Stat label="Cheapest input" value={formatPrice(Math.min(...p.endpoints.map((e) => e.inputPrice)))} />
        <Stat label="Peak throughput" value={tps.length ? `${Math.max(...tps)} t/s` : "—"} />
      </section>

      <SectionTitle>Supported models</SectionTitle>
      <div className="scroll-x rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs text-muted">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-medium">
              <th>Model</th>
              <th className="text-right">Input</th>
              <th className="text-right">Output</th>
              <th className="text-right">Context</th>
              <th className="text-right">Throughput</th>
              <th className="text-right">Atlas</th>
              <th><span className="sr-only">Compare</span></th>
            </tr>
          </thead>
          <tbody className="num divide-y divide-border">
            {p.endpoints.map((e) => (
              <tr key={e.model.slug} className="hover:bg-surface/60 [&>td]:px-4 [&>td]:py-3">
                <td>
                  <div className="flex items-center gap-2">
                    <Avatar name={e.model.lab.name} color={e.model.lab.accentColor} size="sm" />
                    <Link href={`/models/${e.model.slug}`} className="whitespace-nowrap font-medium hover:text-accent">{e.model.name}</Link>
                    <span className="hidden text-xs text-subtle sm:inline">{e.model.lab.name}</span>
                  </div>
                </td>
                <td className="text-right">{formatPrice(e.inputPrice)}</td>
                <td className="text-right">{formatPrice(e.outputPrice)}</td>
                <td className="text-right">{formatTokens(e.contextWindow)}</td>
                <td className="text-right">{e.throughputTps ? `${e.throughputTps} t/s` : "—"}</td>
                <td className="text-right font-medium">{formatScore(e.model.atlasScore)}</td>
                <td className="text-right"><CompareToggle slug={e.model.slug} name={e.model.name} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-subtle">Prices in USD per 1M tokens on this provider.</p>
    </>
  );
}
