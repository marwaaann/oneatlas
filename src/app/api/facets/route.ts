import { route } from "@/lib/errors";
import { getFacets } from "@/lib/services/models";

/** GET /api/facets — filter options with counts */
export const GET = route(async () => getFacets());
