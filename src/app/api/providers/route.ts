import { route } from "@/lib/errors";
import { listProviders } from "@/lib/services/directory";

/** GET /api/providers — inference providers with coverage, cheapest price and median speed */
export const GET = route(async () => ({ items: await listProviders() }));
