import { route } from "@/lib/errors";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** GET /api/health — liveness + DB round-trip */
export const GET = route(
  async () => {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok", db: "ok", dbLatencyMs: Date.now() - t0 };
  },
  { cache: false },
);
