"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

/**
 * The URL is the single source of truth for discovery state (filters, sort,
 * page). That makes every view shareable/bookmarkable and lets the Server
 * Component re-render the list. Any filter change resets pagination.
 */
export function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const getList = useCallback((key: string) => params.get(key)?.split(",").filter(Boolean) ?? [], [params]);

  const update = useCallback(
    (changes: Record<string, string | string[] | null>, opts: { resetPage?: boolean } = { resetPage: true }) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(changes)) {
        const value = Array.isArray(v) ? v.join(",") : v;
        if (value === null || value === "") next.delete(k);
        else next.set(k, value);
      }
      if (opts.resetPage) next.delete("page");
      const qs = next.toString();
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [params, pathname, router],
  );

  const toggleInList = useCallback(
    (key: string, value: string) => {
      const list = getList(key);
      update({ [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] });
    },
    [getList, update],
  );

  return { params, getList, update, toggleInList, pending };
}
