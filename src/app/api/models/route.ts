import type { NextRequest } from "next/server";
import { route } from "@/lib/errors";
import { listModels } from "@/lib/services/models";
import { modelListQuery, paramsToObject } from "@/lib/validation";

/**
 * GET /api/models
 *   ?q=&lab=openai,anthropic&provider=groq&type=reasoning&capability=vision,function_calling
 *   &modality=image&openWeights=true&minContext=128000&maxPrice=1
 *   &sort=release|price|context|name|score&order=asc|desc&page=1&pageSize=20
 */
export const GET = route(async (req: NextRequest) => {
  const query = modelListQuery.parse(paramsToObject(req.nextUrl.searchParams));
  return listModels(query);
});
