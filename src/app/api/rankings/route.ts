import type { NextRequest } from "next/server";
import { route } from "@/lib/errors";
import { getLeaderboard } from "@/lib/services/rankings";
import { paramsToObject, rankingsQuery } from "@/lib/validation";

/**
 * GET /api/rankings?benchmark=atlas|<slug>&category=coding&type=reasoning&openWeights=true&limit=50
 * benchmark=atlas (default) returns the composite index; with category it is scoped to that category.
 */
export const GET = route(async (req: NextRequest) => {
  const q = rankingsQuery.parse(paramsToObject(req.nextUrl.searchParams));
  return getLeaderboard(q);
});
