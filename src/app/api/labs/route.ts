import { route } from "@/lib/errors";
import { listLabs } from "@/lib/services/directory";

/** GET /api/labs — AI labs with model counts and latest release */
export const GET = route(async () => ({ items: await listLabs() }));
