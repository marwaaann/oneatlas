import type { NextRequest } from "next/server";
import { route } from "@/lib/errors";
import { compareModels } from "@/lib/services/models";
import { compareQuery, paramsToObject } from "@/lib/validation";

/** GET /api/compare?models=gpt-5,claude-sonnet-4-5 (max 4) */
export const GET = route(async (req: NextRequest) => {
  const { models } = compareQuery.parse(paramsToObject(req.nextUrl.searchParams));
  return compareModels(models);
});
