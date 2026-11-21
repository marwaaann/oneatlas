"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SearchResults } from "@/lib/services/directory";
import { Avatar } from "../ui";
import { MAX_COMPARE, useCompare, type CompareItem } from "./compare-context";
import { compareHref } from "./compare-controls";

/**
 * Edits the comparison by rewriting the URL; the server page re-renders from
 * it. Also syncs the selection into the global compare tray state.
 */
export function ComparePicker({ selected }: { selected: CompareItem[] }) {
  const router = useRouter();
  const { replace } = useCompare();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults["models"]>([]);

  const key = selected.map((s) => s.slug).join(",");
  useEffect(() => {
    replace(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const term = q.trim();
    if (!term) return setResults([]);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(term)}&limit=8`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { models: [] }))
        .then((d: SearchResults) => setResults(d.models))
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (slugs: string[]) => router.push(slugs.length ? compareHref(slugs) : "/compare", { scroll: false });
  const full = selected.length >= MAX_COMPARE;

  return (
    <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-start">
      <div className="flex flex-wrap gap-2">
        {selected.map((s) => (
          <span key={s.slug} className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">
            {s.name}
            <button
              onClick={() => go(selected.filter((x) => x.slug !== s.slug).map((x) => x.slug))}
              className="text-subtle hover:text-fg"
              aria-label={`Remove ${s.name}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="relative md:ml-auto md:w-80">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          disabled={full}
          placeholder={full ? `Maximum ${MAX_COMPARE} models` : "Add a model…"}
          aria-label="Add a model to compare"
          className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none placeholder:text-subtle focus:border-accent disabled:opacity-50"
        />
        {results.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border-strong bg-surface shadow-xl">
            {results.map((m) => {
              const already = selected.some((s) => s.slug === m.slug);
              return (
                <li key={m.slug}>
                  <button
                    disabled={already}
                    onClick={() => {
                      setQ("");
                      go([...selected.map((s) => s.slug), m.slug]);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2 disabled:opacity-40"
                  >
                    <Avatar name={m.lab.name} color={m.lab.accentColor} size="sm" />
                    <span className="flex-1 truncate">{m.name}</span>
                    <span className="text-xs text-subtle">{already ? "Added" : m.lab.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
