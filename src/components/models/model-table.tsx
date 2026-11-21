import Link from "next/link";
import type { ModelSummary } from "@/lib/dto";
import { CAPABILITY_LABEL, formatDate, formatPrice, formatScore, formatTokens, TYPE_LABEL } from "@/lib/format";
import { CompareToggle } from "../compare/compare-controls";
import { Avatar, Badge } from "../ui";

const KEY_CAPS = ["VISION", "REASONING", "FUNCTION_CALLING", "WEB_SEARCH"] as const;

function ModelName({ m }: { m: ModelSummary }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={m.lab.name} color={m.lab.accentColor} />
      <div className="min-w-0">
        <Link href={`/models/${m.slug}`} className="block truncate font-medium hover:text-accent">
          {m.name}
        </Link>
        <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted">
          <Link href={`/labs/${m.lab.slug}`} className="hover:text-fg">{m.lab.name}</Link>
          <span className="text-subtle">·</span>
          <span>{TYPE_LABEL[m.type]}</span>
          {m.openWeights && <Badge tone="good" className="ml-1">Open</Badge>}
        </div>
      </div>
    </div>
  );
}

/** Up to two headline capabilities, then a "+N" overflow chip (full list on hover). */
function CapBadges({ caps }: { caps: ModelSummary["capabilities"] }) {
  const key = KEY_CAPS.filter((c) => caps.includes(c));
  const shown = key.slice(0, 2);
  const rest = key.length - shown.length;
  return (
    <div className="flex flex-nowrap gap-1" title={key.map((c) => CAPABILITY_LABEL[c]).join(", ")}>
      {shown.map((c) => (
        <Badge key={c}>{CAPABILITY_LABEL[c]}</Badge>
      ))}
      {rest > 0 && <Badge>+{rest}</Badge>}
    </div>
  );
}

/**
 * Model listing. A real <table> from md up (scannable, comparable columns);
 * stacked cards on small screens where columns would not fit.
 */
export function ModelTable({ models }: { models: ModelSummary[] }) {
  return (
    <>
      <div className="scroll-x hidden rounded-xl border border-border md:block">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs text-muted">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:font-medium">
              <th>Model</th>
              <th className="text-right">Input $/1M</th>
              <th className="text-right">Output $/1M</th>
              <th className="text-right">Context</th>
              <th className="text-right">Atlas</th>
              <th>Capabilities</th>
              <th className="hidden 2xl:table-cell">Released</th>
              <th><span className="sr-only">Compare</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {models.map((m) => (
              <tr key={m.slug} className="transition-colors hover:bg-surface/60 [&>td]:px-4 [&>td]:py-3">
                <td className="max-w-72"><ModelName m={m} /></td>
                <td className="num text-right">{formatPrice(m.inputPrice)}</td>
                <td className="num text-right">{formatPrice(m.outputPrice)}</td>
                <td className="num text-right">{formatTokens(m.contextWindow)}</td>
                <td className="num text-right font-medium">{formatScore(m.atlasScore)}</td>
                <td>
                  <CapBadges caps={m.capabilities} />
                </td>
                <td className="hidden whitespace-nowrap text-muted 2xl:table-cell">{formatDate(m.releaseDate)}</td>
                <td className="text-right"><CompareToggle slug={m.slug} name={m.name} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {models.map((m) => (
          <li key={m.slug} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <ModelName m={m} />
              <CompareToggle slug={m.slug} name={m.name} />
            </div>
            <dl className="num mt-3 grid grid-cols-4 gap-2 text-xs">
              {[
                ["Input", formatPrice(m.inputPrice)],
                ["Output", formatPrice(m.outputPrice)],
                ["Context", formatTokens(m.contextWindow)],
                ["Atlas", formatScore(m.atlasScore)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-subtle">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
