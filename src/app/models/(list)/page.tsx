import type { Metadata } from "next";
import { Suspense } from "react";
import { ModelFilters, ModelToolbar } from "@/components/models/model-filters";
import { ModelTable } from "@/components/models/model-table";
import { Pagination } from "@/components/pagination";
import { EmptyState, PageHeader } from "@/components/ui";
import { getFacets, listModels } from "@/lib/services/models";
import { modelListQuery, paramsToObject } from "@/lib/validation";

export const metadata: Metadata = { title: "Models" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function ModelsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const parsed = modelListQuery.safeParse(paramsToObject(sp));
  // Bad params (e.g. hand-edited URL) fall back to defaults rather than erroring.
  const query = parsed.success ? parsed.data : modelListQuery.parse({});
  const [result, facets] = await Promise.all([listModels(query), getFacets()]);

  return (
    <>
      <PageHeader
        eyebrow="Discovery"
        title="Models"
        description="Every model, with its cheapest available price across providers. Filter by capability, context and cost; add up to four to compare."
      />
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <Suspense>
          <ModelFilters facets={facets} />
        </Suspense>
        <div className="min-w-0">
          <Suspense>
            <ModelToolbar total={result.total} />
          </Suspense>
          {result.items.length ? (
            <ModelTable models={result.items} />
          ) : (
            <EmptyState title="No models match these filters">Try removing a filter or widening the price range.</EmptyState>
          )}
          <Pagination page={result.page} totalPages={result.totalPages} basePath="/models" params={sp} />
        </div>
      </div>
    </>
  );
}
