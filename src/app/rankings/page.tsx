import clsx from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { CompareToggle } from "@/components/compare/compare-controls";
import { Avatar, Badge, Card, EmptyState, PageHeader, ScoreBar } from "@/components/ui";
import { CATEGORY_LABEL, formatPrice, TYPE_LABEL } from "@/lib/format";
import { getLeaderboard, listBenchmarks } from "@/lib/services/rankings";
import { paramsToObject, rankingsQuery, type RankingsQuery } from "@/lib/validation";
import { BenchmarkCategory, ModelType } from "@prisma/client";

export const metadata: Metadata = { title: "Rankings & benchmarks" };

type SP = Promise<Record<string, string | string[] | undefined>>;

function hrefWith(q: RankingsQuery, changes: Partial<Record<"benchmark" | "category" | "type" | "openWeights", string | undefined>>) {
  const merged = {
    benchmark: q.benchmark === "atlas" ? undefined : q.benchmark,
    category: q.category?.toLowerCase(),
    type: q.type?.toLowerCase(),
    openWeights: q.openWeights === undefined ? undefined : String(q.openWeights),
    ...changes,
  };
  const qs = new URLSearchParams(Object.entries(merged).filter((e): e is [string, string] => !!e[1]));
  const s = qs.toString();
  return s ? `/rankings?${s}` : "/rankings";
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={clsx(
        "whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm transition-colors",
        active ? "border-accent/50 bg-accent/15 text-accent" : "border-border text-muted hover:border-border-strong hover:text-fg",
      )}
    >
      {children}
    </Link>
  );
}

export default async function RankingsPage({ searchParams }: { searchParams: SP }) {
  const parsed = rankingsQuery.safeParse(paramsToObject(await searchParams));
  const q = parsed.success ? parsed.data : rankingsQuery.parse({});
  const [board, benchmarks] = await Promise.all([
    getLeaderboard(q).catch(() => null), // unknown benchmark slug → empty state
    listBenchmarks(),
  ]);
  const composite = q.benchmark === "atlas";
  const top = board?.rows[0]?.score ?? 100;

  return (
    <>
      <PageHeader
        eyebrow="Rankings"
        title="Leaderboards"
        description="Composite Atlas Index, category indexes and individual benchmarks. Filter by model type or open weights."
      />

      <div className="mb-6 space-y-3">
        <div className="scroll-x flex gap-2 pb-1">
          <Chip href={hrefWith(q, { benchmark: undefined, category: undefined })} active={composite && !q.category}>Atlas Index</Chip>
          {Object.values(BenchmarkCategory).map((c) => (
            <Chip key={c} href={hrefWith(q, { benchmark: undefined, category: c.toLowerCase() })} active={composite && q.category === c}>
              {CATEGORY_LABEL[c]}
            </Chip>
          ))}
        </div>
        <div className="scroll-x flex gap-2 pb-1">
          {benchmarks.map((b) => (
            <Chip key={b.slug} href={hrefWith(q, { benchmark: b.slug, category: undefined })} active={q.benchmark === b.slug}>
              {b.name}
              <span className="ml-1.5 text-xs text-subtle">{b.modelCount}</span>
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="self-center pr-1 text-muted">Type:</span>
          <Chip href={hrefWith(q, { type: undefined })} active={!q.type}>All</Chip>
          {Object.values(ModelType)
            .filter((t) => t !== "EMBEDDING")
            .map((t) => (
              <Chip key={t} href={hrefWith(q, { type: t.toLowerCase() })} active={q.type === t}>{TYPE_LABEL[t]}</Chip>
            ))}
          <span className="self-center pl-3 pr-1 text-muted">Weights:</span>
          <Chip href={hrefWith(q, { openWeights: undefined })} active={q.openWeights === undefined}>All</Chip>
          <Chip href={hrefWith(q, { openWeights: "true" })} active={q.openWeights === true}>Open</Chip>
          <Chip href={hrefWith(q, { openWeights: "false" })} active={q.openWeights === false}>Proprietary</Chip>
        </div>
      </div>

      {!board || board.rows.length === 0 ? (
        <EmptyState title="No ranked models for this selection" />
      ) : (
        <Card>
          <div className="border-b border-border px-4 py-3">
            <div className="font-semibold">{board.title}</div>
            <div className="text-sm text-muted">{board.description}</div>
          </div>
          <ol className="divide-y divide-border">
            {board.rows.map((r) => (
              <li
                key={r.model.slug}
                className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-3 md:grid-cols-[2.5rem_minmax(220px,1.2fr)_2fr_90px_90px_auto]"
              >
                <span className={clsx("num text-center text-sm font-semibold", r.rank <= 3 ? "text-accent" : "text-subtle")}>
                  {r.rank}
                </span>
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={r.model.lab.name} color={r.model.lab.accentColor} />
                  <div className="min-w-0">
                    <Link href={`/models/${r.model.slug}`} className="block truncate font-medium hover:text-accent">{r.model.name}</Link>
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      {r.model.lab.name}
                      {r.model.openWeights && <Badge tone="good">Open</Badge>}
                    </div>
                  </div>
                </div>
                <div className="num text-right text-sm font-semibold md:order-last md:col-start-6">{r.score.toFixed(1)}</div>
                <div className="col-span-3 md:col-span-1 md:col-start-3 md:row-start-1">
                  <ScoreBar value={r.score} max={Math.max(top, board.maxScore === 100 ? top : board.maxScore)} highlight={r.rank === 1} />
                </div>
                <div className="num hidden text-right text-xs text-muted md:col-start-4 md:row-start-1 md:block">
                  {formatPrice(r.model.inputPrice)}<span className="text-subtle"> in</span>
                </div>
                <div className="hidden text-right md:col-start-5 md:row-start-1 md:block">
                  <CompareToggle slug={r.model.slug} name={r.model.name} />
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}
      <p className="mt-3 text-xs text-subtle">
        Scores are sample values for demonstration. Bars are scaled to the leader of the current board.
      </p>
    </>
  );
}
