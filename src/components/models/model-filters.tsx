"use client";

import clsx from "clsx";
import { useEffect, useState, type ReactNode } from "react";
import { CAPABILITY_LABEL, label, MODALITY_LABEL, TYPE_LABEL } from "@/lib/format";
import type { Facets } from "@/lib/services/models";
import { useQueryState } from "./use-query-state";

const CONTEXT_OPTIONS = [
  { value: "", label: "Any" },
  { value: "32000", label: "≥ 32K" },
  { value: "128000", label: "≥ 128K" },
  { value: "200000", label: "≥ 200K" },
  { value: "1000000", label: "≥ 1M" },
];
const PRICE_OPTIONS = [
  { value: "", label: "Any" },
  { value: "0.2", label: "≤ $0.20" },
  { value: "1", label: "≤ $1" },
  { value: "3", label: "≤ $3" },
  { value: "10", label: "≤ $10" },
];
const SORTS = [
  { value: "release", label: "Newest" },
  { value: "price", label: "Cheapest input" },
  { value: "context", label: "Largest context" },
  { value: "score", label: "Atlas score" },
  { value: "name", label: "Name A–Z" },
];

function Group({ title, children, defaultOpen = true }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group border-b border-border py-3 last:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted">
        {title}
        <span className="text-subtle transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="mt-2.5 space-y-1">{children}</div>
    </details>
  );
}

function Check({ checked, onChange, children, count }: { checked: boolean; onChange: () => void; children: ReactNode; count?: number }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-surface-2">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-3.5 accent-[var(--color-accent)]" />
      <span className="flex-1 truncate">{children}</span>
      {count !== undefined && <span className="num text-xs text-subtle">{count}</span>}
    </label>
  );
}

function Segmented({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx(
            "rounded-md border px-2 py-1 text-xs",
            value === o.value ? "border-accent/50 bg-accent/15 text-accent" : "border-border text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ModelFilters({ facets }: { facets: Facets }) {
  const { params, getList, update, toggleInList } = useQueryState();
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeCount = ["lab", "provider", "type", "capability", "modality", "openWeights", "minContext", "maxPrice"].filter((k) =>
    params.get(k),
  ).length;

  const panel = (
    <div>
      <div className="flex items-center justify-between pb-2">
        <span className="text-sm font-semibold">Filters</span>
        {activeCount > 0 && (
          <button
            onClick={() => update({ lab: null, provider: null, type: null, capability: null, modality: null, openWeights: null, minContext: null, maxPrice: null })}
            className="text-xs text-accent hover:underline"
          >
            Reset ({activeCount})
          </button>
        )}
      </div>
      <Group title="Model type">
        {facets.types.map((t) => (
          <Check key={t.value} checked={getList("type").includes(t.value.toLowerCase())} onChange={() => toggleInList("type", t.value.toLowerCase())} count={t.count}>
            {TYPE_LABEL[t.value]}
          </Check>
        ))}
      </Group>
      <Group title="Weights">
        <Segmented
          value={params.get("openWeights") ?? ""}
          onChange={(v) => update({ openWeights: v || null })}
          options={[
            { value: "", label: "All" },
            { value: "true", label: `Open (${facets.openWeights})` },
            { value: "false", label: "Proprietary" },
          ]}
        />
      </Group>
      <Group title="Max input price / 1M">
        <Segmented value={params.get("maxPrice") ?? ""} options={PRICE_OPTIONS} onChange={(v) => update({ maxPrice: v || null })} />
      </Group>
      <Group title="Context window">
        <Segmented value={params.get("minContext") ?? ""} options={CONTEXT_OPTIONS} onChange={(v) => update({ minContext: v || null })} />
      </Group>
      <Group title="Capabilities">
        {facets.capabilities.map((c) => (
          <Check key={c.value} checked={getList("capability").includes(c.value.toLowerCase())} onChange={() => toggleInList("capability", c.value.toLowerCase())} count={c.count}>
            {label(CAPABILITY_LABEL, c.value)}
          </Check>
        ))}
      </Group>
      <Group title="Input modality" defaultOpen={false}>
        {facets.modalities.map((c) => (
          <Check key={c.value} checked={getList("modality").includes(c.value.toLowerCase())} onChange={() => toggleInList("modality", c.value.toLowerCase())} count={c.count}>
            {label(MODALITY_LABEL, c.value)}
          </Check>
        ))}
      </Group>
      <Group title="Company / lab">
        {facets.labs.map((l) => (
          <Check key={l.value} checked={getList("lab").includes(l.value)} onChange={() => toggleInList("lab", l.value)} count={l.count}>
            {l.label}
          </Check>
        ))}
      </Group>
      <Group title="Provider" defaultOpen={false}>
        {facets.providers.map((p) => (
          <Check key={p.value} checked={getList("provider").includes(p.value)} onChange={() => toggleInList("provider", p.value)} count={p.count}>
            {p.label}
          </Check>
        ))}
      </Group>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="mb-4 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm lg:hidden"
      >
        Filters{activeCount ? ` (${activeCount})` : ""}
      </button>
      <aside className="hidden lg:block">{panel}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] overflow-y-auto bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            {panel}
            <button onClick={() => setMobileOpen(false)} className="mt-4 w-full rounded-lg bg-accent py-2 text-sm font-medium text-black">
              Show results
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function ModelToolbar({ total }: { total: number }) {
  const { params, update, pending } = useQueryState();
  const [q, setQ] = useState(params.get("q") ?? "");

  // Debounce typing → URL
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => update({ q: q.trim() || null }), 250);
    return () => clearTimeout(t);
  }, [q, params, update]);

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by model, lab or description…"
        aria-label="Search models"
        className="h-10 w-full rounded-lg sm:flex-1 border border-border bg-surface px-3 text-sm outline-none placeholder:text-subtle focus:border-accent"
      />
      <div className="flex items-center gap-3">
        <span className={clsx("num whitespace-nowrap text-sm text-muted", pending && "opacity-50")}>
          {total} model{total === 1 ? "" : "s"}
        </span>
        <select
          value={params.get("sort") ?? "release"}
          onChange={(e) => update({ sort: e.target.value === "release" ? null : e.target.value, order: null })}
          aria-label="Sort by"
          className="h-10 rounded-lg border border-border bg-surface px-2 text-sm"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button
          onClick={() => update({ order: params.get("order") === "asc" ? "desc" : params.get("order") === "desc" ? "asc" : defaultFlip(params.get("sort")) }, { resetPage: true })}
          className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-muted hover:text-fg"
          aria-label="Toggle sort direction"
          title="Toggle sort direction"
        >
          ⇅
        </button>
      </div>
    </div>
  );
}

/** First click on the direction toggle flips the sort's default direction. */
function defaultFlip(sort: string | null) {
  return sort === "price" || sort === "name" ? "desc" : "asc";
}
