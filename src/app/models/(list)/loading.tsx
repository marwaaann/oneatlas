export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Loading models">
      <div className="h-8 w-48 rounded bg-surface-2" />
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <div className="hidden h-96 rounded-xl bg-surface lg:block" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-surface" />
          ))}
        </div>
      </div>
    </div>
  );
}
