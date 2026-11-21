import { route } from "@/lib/errors";
import { getLab } from "@/lib/services/directory";

/** GET /api/labs/:slug — lab profile, its models (newest first) and the providers serving them */
export const GET = route(async (_req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  return getLab(slug);
});
