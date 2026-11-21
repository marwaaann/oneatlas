import { route } from "@/lib/errors";
import { getModel } from "@/lib/services/models";

/** GET /api/models/:slug — full spec, per-provider endpoints and benchmark scores */
export const GET = route(async (_req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  return getModel(slug);
});
