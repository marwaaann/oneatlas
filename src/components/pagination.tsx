import clsx from "clsx";
import Link from "next/link";

/** Server-rendered pagination: plain links that preserve the current query string. */
export function Pagination({
  page,
  totalPages,
  basePath,
  params,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params: Record<string, string | string[] | undefined>;
}) {
  if (totalPages <= 1) return null;
  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === "page" || v === undefined) continue;
      qs.set(k, Array.isArray(v) ? v.join(",") : v);
    }
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  return (
    <nav className="mt-6 flex items-center justify-center gap-1 text-sm" aria-label="Pagination">
      <PageLink href={href(page - 1)} disabled={page <= 1}>← Prev</PageLink>
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - pages[i - 1]! > 1 && <span className="px-1 text-subtle">…</span>}
          <PageLink href={href(p)} active={p === page}>{p}</PageLink>
        </span>
      ))}
      <PageLink href={href(page + 1)} disabled={page >= totalPages}>Next →</PageLink>
    </nav>
  );
}

function PageLink({ href, children, active, disabled }: { href: string; children: React.ReactNode; active?: boolean; disabled?: boolean }) {
  if (disabled) return <span className="rounded-md px-3 py-1.5 text-subtle">{children}</span>;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "num rounded-md px-3 py-1.5",
        active ? "bg-accent text-black" : "border border-border hover:bg-surface-2",
      )}
    >
      {children}
    </Link>
  );
}
