import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ModelTable } from "@/components/models/model-table";
import { Avatar, Badge, Card, SectionTitle, Stat } from "@/components/ui";
import { NotFoundError } from "@/lib/errors";
import { formatDate, formatScore, LAB_TYPE_LABEL, PROVIDER_TYPE_LABEL, TYPE_LABEL } from "@/lib/format";
import { getLab } from "@/lib/services/directory";

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
    return await getLab(slug);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const lab = await load((await params).slug);
  return { title: lab.name, description: lab.description };
}

export default async function LabPage({ params }: { params: Params }) {
  const lab = await load((await params).slug);
  const best = lab.models.reduce<(typeof lab.models)[number] | null>(
    (b, m) => (m.atlasScore !== null && (!b || m.atlasScore > (b.atlasScore ?? 0)) ? m : b),
    null,
  );

  return (
    <>
      <nav className="mb-6 text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/labs" className="hover:text-fg">Labs</Link>
      </nav>
      <header className="mb-8 flex items-start gap-4">
        <Avatar name={lab.name} color={lab.accentColor} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{lab.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <Badge>{LAB_TYPE_LABEL[lab.type]}</Badge>
            <span>{lab.headquarters}</span>
            <span className="text-subtle">·</span>
            <span>Founded {lab.foundedYear}</span>
            <span className="text-subtle">·</span>
            <a href={lab.website} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              {new URL(lab.website).hostname} ↗
            </a>
          </div>
          <p className="mt-3 max-w-2xl text-muted">{lab.description}</p>
        </div>
      </header>

      <section className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Models" value={lab.models.length} />
        <Stat label="Open weights" value={lab.models.filter((m) => m.openWeights).length} />
        <Stat label="Best Atlas score" value={formatScore(best?.atlasScore)} hint={best?.name} />
        <Stat label="Served by" value={`${lab.providers.length} providers`} />
      </section>

      <section className="mb-10">
        <SectionTitle>Models</SectionTitle>
        <ModelTable models={lab.models} />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle>Release timeline</SectionTitle>
          <Card className="p-4">
            <ol className="relative space-y-4 border-l border-border pl-5">
              {lab.models.map((m) => (
                <li key={m.slug} className="relative">
                  <span className="absolute -left-[25px] top-1.5 size-2 rounded-full bg-accent" />
                  <div className="text-xs text-subtle">{formatDate(m.releaseDate, "long")}</div>
                  <Link href={`/models/${m.slug}`} className="font-medium hover:text-accent">{m.name}</Link>
                  <span className="ml-2 text-xs text-muted">{TYPE_LABEL[m.type]}</span>
                </li>
              ))}
            </ol>
          </Card>
        </section>
        <section>
          <SectionTitle>Where to run {lab.name} models</SectionTitle>
          <Card className="divide-y divide-border">
            {lab.providers.map((p) => (
              <Link key={p.slug} href={`/providers/${p.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                <Avatar name={p.name} color={p.accentColor} size="sm" />
                <span className="flex-1 text-sm font-medium">{p.name}</span>
                <span className="text-xs text-subtle">{PROVIDER_TYPE_LABEL[p.type]}</span>
                <Badge>{p.modelCount} models</Badge>
              </Link>
            ))}
          </Card>
        </section>
      </div>
    </>
  );
}
