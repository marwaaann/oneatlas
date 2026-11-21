"use client";

import { EmptyState } from "@/components/ui";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-10">
      <EmptyState title="Something went wrong">
        <p className="mb-4">We couldn&apos;t load this page. The database may be unavailable.</p>
        <button onClick={reset} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-surface-2">
          Try again
        </button>
      </EmptyState>
    </div>
  );
}
