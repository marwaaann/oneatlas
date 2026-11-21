"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const MAX_COMPARE = 4;
const STORAGE_KEY = "oneatlas.compare.v1";

export interface CompareItem {
  slug: string;
  name: string;
}

interface CompareState {
  items: CompareItem[];
  has: (slug: string) => boolean;
  toggle: (item: CompareItem) => void;
  remove: (slug: string) => void;
  clear: () => void;
  replace: (items: CompareItem[]) => void;
  isFull: boolean;
}

const CompareContext = createContext<CompareState | null>(null);

/**
 * Compare selection lives in client state and is mirrored to localStorage so
 * it survives navigation and reloads. The /compare page itself is driven by the
 * URL (?models=a,b) so comparisons are shareable; the tray just builds that URL.
 */
export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw).slice(0, MAX_COMPARE));
    } catch {
      /* storage unavailable or corrupt: start empty */
    }
  }, []);

  const persist = useCallback((next: CompareItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<CompareState>(
    () => ({
      items,
      has: (slug) => items.some((i) => i.slug === slug),
      toggle: (item) =>
        persist(
          items.some((i) => i.slug === item.slug)
            ? items.filter((i) => i.slug !== item.slug)
            : items.length >= MAX_COMPARE
              ? items
              : [...items, item],
        ),
      remove: (slug) => persist(items.filter((i) => i.slug !== slug)),
      clear: () => persist([]),
      replace: (next) => persist(next.slice(0, MAX_COMPARE)),
      isFull: items.length >= MAX_COMPARE,
    }),
    [items, persist],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used inside <CompareProvider>");
  return ctx;
}
