import type { NextRequest } from "next/server";
import { route } from "@/lib/errors";
import { globalSearch } from "@/lib/services/directory";
import { paramsToObject, searchQuery } from "@/lib/validation";

/** GET /api/search?q=claude — grouped results across models, labs and providers (powers ⌘K) */
export const GET = route(async (req: NextRequest) => {
  const { q, limit } = searchQuery.parse(paramsToObject(req.nextUrl.searchParams));
  return globalSearch(q, limit);
});
