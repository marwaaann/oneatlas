import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, Badge, Card, PageHeader } from "@/components/ui";
import { formatDate, formatScore, LAB_TYPE_LABEL } from "@/lib/format";
import { listLabs } from "@/lib/services/directory";

export const metadata: Metadata = { title: "AI labs" };
export const revalidate = 300;

export default async function LabsPage() {
  const labs = await listLabs();
  return (
    <>
      <PageHeader
        eyebrow="Directory"
        title="AI labs & companies"
        description="The organisations training frontier and open models: what they have released and how their best model ranks."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {labs.map((l) => (
          <Link key={l.slug} href={`/labs/${l.slug}`} className="group">
            <Card className="flex h-full flex-col p-5 transition-colors group-hover:border-border-strong">
              <div className="flex items-center gap-3">
                <Avatar name={l.name} color={l.accentColor} />
                <div className="min-w-0">
                  <div className="truncate font-semibold group-hover:text-accent">{l.name}</div>
                  <div className="text-xs text-muted">{l.headquarters} · est. {l.foundedYear}</div>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 flex-1 text-sm text-muted">{l.description}</p>
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <Badge>{LAB_TYPE_LABEL[l.type]}</Badge>
                <Badge>{l.modelCount} models</Badge>
                {l.openWeightsCount > 0 && <Badge tone="good">{l.openWeightsCount} open</Badge>}
                {l.topScore !== null && <Badge tone="accent">Best {formatScore(l.topScore)}</Badge>}
              </div>
              {l.latestRelease && (
                <div className="mt-3 border-t border-border pt-3 text-xs text-subtle">
                  Latest: <span className="text-muted">{l.latestRelease.name}</span> · {formatDate(l.latestRelease.releaseDate)}
                </div>
              )}
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
