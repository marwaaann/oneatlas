import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { HttpError, route } from "@/lib/errors";
import { ingest } from "@/lib/ingest/upsert";

export const dynamic = "force-dynamic";

function authorized(header: string | null) {
  const token = process.env.INGEST_TOKEN;
  if (!token || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * POST /api/ingest  (Authorization: Bearer $INGEST_TOKEN)
 * Body: { labs?, providers?, benchmarks?, models? } in the raw ingestion format
 * (see src/lib/ingest/schema.ts). Validates, normalizes and upserts; per-model
 * failures are returned in `errors` without aborting the batch (207).
 */
export const POST = route(
  async (req: Request) => {
    if (!authorized(req.headers.get("authorization"))) {
      throw new HttpError(401, "UNAUTHORIZED", "Missing or invalid bearer token");
    }
    const body = await req.json().catch(() => {
      throw new HttpError(400, "INVALID_JSON", "Request body must be JSON");
    });
    const summary = await ingest(prisma, body);
    // Purge ISR-cached pages so new data shows up immediately.
    if (summary.models || summary.labs || summary.providers || summary.benchmarks) revalidatePath("/", "layout");
    return Response.json(summary, { status: summary.errors.length ? 207 : 200 });
  },
  { cache: false },
);
