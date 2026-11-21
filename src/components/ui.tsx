import clsx from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "good" | "warn";
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap",
        tone === "default" && "border-border bg-surface-2 text-muted",
        tone === "accent" && "border-accent/30 bg-accent/10 text-accent",
        tone === "good" && "border-good/30 bg-good/10 text-good",
        tone === "warn" && "border-warn/30 bg-warn/10 text-warn",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Coloured initials chip standing in for a logo (no third-party brand assets shipped). */
export function Avatar({ name, color, size = "md" }: { name: string; color: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .replace(/\(.*?\)/g, "")
    .split(/[\s.-]+/)
    // "Meta AI" / "Mistral AI" / "Moonshot AI" would all become "MA"
    .filter((w) => w && w.toUpperCase() !== "AI")
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span
      aria-hidden
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-md font-semibold text-white",
        size === "sm" && "size-5 text-[9px]",
        size === "md" && "size-8 text-xs",
        size === "lg" && "size-12 text-base",
      )}
      style={{ background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, #000))` }}
    >
      {initials}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx("rounded-xl border border-border bg-surface", className)}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 text-xs font-medium uppercase tracking-wider text-accent">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted md:text-base">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, href, linkLabel = "View all" }: { children: ReactNode; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{children}</h2>
      {href && (
        <Link href={href} className="text-sm text-accent hover:underline">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="num mt-1 text-lg font-semibold">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-subtle">{hint}</div>}
    </div>
  );
}

/** Horizontal meter for a 0–max score. */
export function ScoreBar({ value, max = 100, highlight = false }: { value: number; max?: number; highlight?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2" role="presentation">
      <div
        className={clsx("h-full rounded-full", highlight ? "bg-accent" : "bg-accent/60")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border-strong px-6 py-16 text-center">
      <div className="font-medium">{title}</div>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "secondary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
        variant === "primary" && "bg-accent text-black hover:bg-accent-strong",
        variant === "secondary" && "border border-border bg-surface hover:border-border-strong hover:bg-surface-2",
      )}
    >
      {children}
    </Link>
  );
}
