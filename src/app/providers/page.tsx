import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, Badge, Card, PageHeader } from "@/components/ui";
import { formatPrice, PROVIDER_TYPE_LABEL } from "@/lib/format";
import { listProviders } from "@/lib/services/directory";
import type { ProviderType } from "@prisma/client";

export const metadata: Metadata = { title: "Providers" };
export const revalidate = 300;

const GROUP_BLURB: Record<ProviderType, string> = {
  FIRST_PARTY: "APIs run by the labs themselves: newest models first, list pricing.",
  CLOUD: "Hyperscaler platforms with enterprise controls, regions and compliance.",
  INFERENCE: "Specialised hosts for open-weights models, often cheaper and much faster.",
};

export default async function ProvidersPage() {
  const providers = await listProviders();
  const groups = (["FIRST_PARTY", "CLOUD", "INFERENCE"] as const).map((t) => ({
    type: t,
    items: providers.filter((p) => p.type === t),
  }));

  return (
    <>
      <PageHeader
        eyebrow="Directory"
        title="Inference providers"
        description="Where you can actually call a model, with how many models each serves, its cheapest price and typical output speed."
      />
      <div className="space-y-10">
        {groups.map((g) => (
          <section key={g.type}>
            <div className="mb-3">
              <h2 className="font-semibold">{PROVIDER_TYPE_LABEL[g.type]}s</h2>
              <p className="text-sm text-muted">{GROUP_BLURB[g.type]}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((p) => (
                <Link key={p.slug} href={`/providers/${p.slug}`} className="group">
                  <Card className="h-full p-4 transition-colors group-hover:border-border-strong">
                    <div className="flex items-center gap-3">
                      <Avatar name={p.name} color={p.accentColor} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium group-hover:text-accent">{p.name}</div>
                        <div className="truncate text-xs text-muted">{p.description}</div>
                      </div>
                    </div>
                    <dl className="num mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <dt className="text-subtle">Models</dt>
                        <dd className="font-medium">{p.modelCount}</dd>
                      </div>
                      <div>
                        <dt className="text-subtle">From</dt>
                        <dd className="font-medium">{formatPrice(p.cheapestInput)}</dd>
                      </div>
                      <div>
                        <dt className="text-subtle">Median speed</dt>
                        <dd className="font-medium">{p.medianTps ? `${p.medianTps} t/s` : "—"}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex gap-1.5">
                      <Badge>{p.labCount} labs</Badge>
                      {p.openWeightsCount > 0 && <Badge tone="good">{p.openWeightsCount} open models</Badge>}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
