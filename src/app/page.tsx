import Link from "next/link";
import { SearchTrigger } from "@/components/search/command-palette";
import { Avatar, Badge, ButtonLink, Card, ScoreBar, SectionTitle } from "@/components/ui";
import { formatDate, formatPrice, formatScore, formatTokens, TYPE_LABEL } from "@/lib/format";
import { getHomeData, listLabs } from "@/lib/services/directory";

export const revalidate = 300;

export default async function HomePage() {
  const [{ stats, top, latest, bestValue }, labs] = await Promise.all([getHomeData(), listLabs()]);

  return (
    <div className="space-y-14">
      <section className="pt-4 text-center md:pt-10">
        <Badge tone="accent" className="mb-4">{stats.models} models · {stats.labs} labs · {stats.providers} providers</Badge>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
          Find the right AI model, <span className="text-accent">fast.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted md:text-lg">
          Compare pricing, context windows, capabilities and benchmarks across every major lab and inference provider.
        </p>
        <div className="mx-auto mt-8 max-w-md">
          <SearchTrigger className="h-12 w-full text-base" />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <ButtonLink href="/models" variant="primary">Browse models</ButtonLink>
          <ButtonLink href="/rankings">View leaderboards</ButtonLink>
          <ButtonLink href="/compare?models=gpt-5,claude-sonnet-4-5,gemini-2-5-pro">Compare flagships</ButtonLink>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionTitle href="/rankings">Top by Atlas Index</SectionTitle>
          <Card className="divide-y divide-border">
            {top.map((m, i) => (
              <Link key={m.slug} href={`/models/${m.slug}`} className="grid grid-cols-[1.5rem_1fr_6rem_3rem] items-center gap-3 px-4 py-3 hover:bg-surface-2">
                <span className="num text-sm font-semibold text-accent">{i + 1}</span>
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar name={m.lab.name} color={m.lab.accentColor} size="sm" />
                  <span className="truncate text-sm font-medium">{m.name}</span>
                </span>
                <ScoreBar value={m.atlasScore ?? 0} highlight={i === 0} />
                <span className="num text-right text-sm font-medium">{formatScore(m.atlasScore)}</span>
              </Link>
            ))}
          </Card>
        </section>
        <section>
          <SectionTitle href="/models?sort=price&maxPrice=1">Best value (Atlas ≥ 70)</SectionTitle>
          <Card className="divide-y divide-border">
            {bestValue.map((m) => (
              <Link key={m.slug} href={`/models/${m.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                <Avatar name={m.lab.name} color={m.lab.accentColor} size="sm" />
                <span className="flex-1 truncate text-sm font-medium">{m.name}</span>
                <span className="num text-xs text-muted">Atlas {formatScore(m.atlasScore)}</span>
                <span className="num w-20 text-right text-sm font-medium">{formatPrice(m.inputPrice)}<span className="text-xs text-subtle"> /1M</span></span>
              </Link>
            ))}
          </Card>
        </section>
      </div>

      <section>
        <SectionTitle href="/models">Latest releases</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map((m) => (
            <Link key={m.slug} href={`/models/${m.slug}`} className="group">
              <Card className="h-full p-4 transition-colors group-hover:border-border-strong">
                <div className="flex items-center gap-2">
                  <Avatar name={m.lab.name} color={m.lab.accentColor} size="sm" />
                  <span className="text-xs text-muted">{m.lab.name}</span>
                  <span className="ml-auto text-xs text-subtle">{formatDate(m.releaseDate)}</span>
                </div>
                <div className="mt-2 font-medium group-hover:text-accent">{m.name}</div>
                <p className="mt-1 line-clamp-2 text-sm text-muted">{m.description}</p>
                <div className="num mt-3 flex flex-wrap gap-1.5">
                  <Badge>{TYPE_LABEL[m.type]}</Badge>
                  <Badge>{formatTokens(m.contextWindow)} ctx</Badge>
                  <Badge>{formatPrice(m.inputPrice)} in</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle href="/labs">AI labs</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {labs.map((l) => (
            <Link key={l.slug} href={`/labs/${l.slug}`} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm hover:border-border-strong">
              <Avatar name={l.name} color={l.accentColor} size="sm" />
              {l.name}
              <span className="num text-xs text-subtle">{l.modelCount}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
