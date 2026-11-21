import { route } from "@/lib/errors";
import { getProvider } from "@/lib/services/directory";

/** GET /api/providers/:slug — provider profile and every model endpoint it serves */
export const GET = route(async (_req: Request, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params;
  return getProvider(slug);
});
