"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MAX_COMPARE, useCompare } from "./compare-context";

export function CompareToggle({ slug, name, size = "sm" }: { slug: string; name: string; size?: "sm" | "md" }) {
  const { has, toggle, isFull } = useCompare();
  const active = has(slug);
  const disabled = !active && isFull;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle({ slug, name });
      }}
      disabled={disabled}
      aria-pressed={active}
      title={disabled ? `You can compare up to ${MAX_COMPARE} models` : active ? "Remove from compare" : "Add to compare"}
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-md border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" ? "px-2 py-1 text-xs" : "px-3.5 py-2 text-sm",
        active
          ? "border-accent/50 bg-accent/15 text-accent"
          : "border-border bg-surface text-muted hover:border-border-strong hover:text-fg",
      )}
    >
      <span aria-hidden>{active ? "✓" : "+"}</span>
      {size === "md" ? (active ? "In comparison" : "Add to compare") : "Compare"}
    </button>
  );
}

export function compareHref(slugs: string[]) {
  return `/compare?models=${slugs.map(encodeURIComponent).join(",")}`;
}

/** Floating tray showing the current selection; hidden on the compare page itself. */
export function CompareTray() {
  const { items, remove, clear } = useCompare();
  const pathname = usePathname();
  if (items.length === 0 || pathname.startsWith("/compare")) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
      <div className="flex w-full max-w-3xl flex-wrap items-center gap-2 rounded-xl border border-border-strong bg-surface-2/95 p-2.5 shadow-2xl shadow-black/50 backdrop-blur">
        <span className="px-1 text-xs font-medium text-muted">
          Compare {items.length}/{MAX_COMPARE}
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {items.map((i) => (
            <span key={i.slug} className="inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-xs">
              {i.name}
              <button onClick={() => remove(i.slug)} className="text-subtle hover:text-fg" aria-label={`Remove ${i.name}`}>
                ×
              </button>
            </span>
          ))}
        </div>
        <button onClick={clear} className="px-2 text-xs text-muted hover:text-fg">
          Clear
        </button>
        <Link
          href={compareHref(items.map((i) => i.slug))}
          aria-disabled={items.length < 2}
          className={clsx(
            "rounded-lg px-3 py-1.5 text-sm font-medium",
            items.length < 2 ? "pointer-events-none bg-surface text-subtle" : "bg-accent text-black hover:bg-accent-strong",
          )}
        >
          {items.length < 2 ? "Pick 1 more" : "Compare →"}
        </Link>
      </div>
    </div>
  );
}
