import { route } from "@/lib/errors";
import { listBenchmarks } from "@/lib/services/rankings";

/** GET /api/benchmarks */
export const GET = route(async () => ({ items: await listBenchmarks() }));
