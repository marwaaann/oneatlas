"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SearchResults } from "@/lib/services/directory";
import { Avatar } from "../ui";

type Item = { key: string; href: string; title: string; subtitle: string; color: string; group: string };

const QUICK_LINKS: Item[] = [
  { key: "nav-models", href: "/models", title: "Browse all models", subtitle: "Discovery", color: "#5b7cfa", group: "Go to" },
  { key: "nav-rank", href: "/rankings", title: "Rankings & benchmarks", subtitle: "Leaderboards", color: "#5b7cfa", group: "Go to" },
  { key: "nav-compare", href: "/compare", title: "Compare models", subtitle: "Side by side", color: "#5b7cfa", group: "Go to" },
  { key: "nav-labs", href: "/labs", title: "AI labs", subtitle: "Directory", color: "#5b7cfa", group: "Go to" },
  { key: "nav-prov", href: "/providers", title: "Providers", subtitle: "Directory", color: "#5b7cfa", group: "Go to" },
];

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Global ⌘K / Ctrl+K search over models, labs and providers via GET /api/search. */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebounced(query.trim(), 150);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !open && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("oneatlas:open-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("oneatlas:open-search", onOpen);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setResults(null);
    }
  }, [open]);

  useEffect(() => {
    if (!debounced) {
      setResults(null);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debounced)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SearchResults | null) => {
        setResults(data);
        setActive(0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [debounced]);

  const items = useMemo<Item[]>(() => {
    if (!results) return query.trim() ? [] : QUICK_LINKS;
    return [
      ...results.models.map((m) => ({
        key: `m-${m.slug}`, href: `/models/${m.slug}`, title: m.name, subtitle: m.lab.name, color: m.lab.accentColor, group: "Models",
      })),
      ...results.labs.map((l) => ({
        key: `l-${l.slug}`, href: `/labs/${l.slug}`, title: l.name, subtitle: `${l.modelCount} models`, color: l.accentColor, group: "Labs",
      })),
      ...results.providers.map((p) => ({
        key: `p-${p.slug}`, href: `/providers/${p.slug}`, title: p.name, subtitle: `${p.modelCount} endpoints`, color: p.accentColor, group: "Providers",
      })),
      { key: "all", href: `/models?q=${encodeURIComponent(query.trim())}`, title: `Search all models for “${query.trim()}”`, subtitle: "Discovery", color: "#5b7cfa", group: "More" },
    ];
  }, [results, query]);

  const go = useCallback(
    (item: Item | undefined) => {
      if (!item) return;
      setOpen(false);
      router.push(item.href);
    },
    [router],
  );

  if (!open) return null;

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border-strong bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <span className="text-subtle" aria-hidden>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, items.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") go(items[active]);
            }}
            placeholder="Search models, labs, providers…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
            role="combobox"
            aria-expanded
            aria-controls="cmdk-list"
            aria-activedescendant={items[active]?.key}
          />
          {loading && <span className="text-xs text-subtle">…</span>}
          <kbd className="rounded border border-border px-1.5 text-[10px] text-subtle">ESC</kbd>
        </div>
        <ul id="cmdk-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 && !loading && <li className="px-3 py-6 text-center text-sm text-muted">No results</li>}
          {items.map((item, i) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <li key={item.key}>
                {header && <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-subtle">{header}</div>}
                <button
                  id={item.key}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm",
                    i === active ? "bg-surface-2" : "hover:bg-surface-2",
                  )}
                >
                  <Avatar name={item.title} color={item.color} size="sm" />
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  <span className="text-xs text-subtle">{item.subtitle}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function SearchTrigger({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("oneatlas:open-search"))}
      className={clsx(
        "flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-subtle transition-colors hover:border-border-strong hover:text-muted",
        className,
      )}
    >
      <span aria-hidden>⌕</span>
      <span className="flex-1 text-left">Search…</span>
      <kbd className="hidden rounded border border-border px-1.5 text-[10px] sm:inline">⌘K</kbd>
    </button>
  );
}
