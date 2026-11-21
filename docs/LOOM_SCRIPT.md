# Loom walkthrough (target: ~8 minutes)

**0:00 Intro (30s)**
"I'm Rishabh. I applied for the Full Stack role and built OneAtlas end to end: Next.js, Prisma, Postgres on Neon, deployed on Vercel. I'll demo the product first, then walk through the architecture and decisions."

**0:30 Product demo (3 min)**
1. Home: stats, top by Atlas Index, best value, latest releases.
2. ⌘K: type "claude", arrow down, Enter → detail page.
3. Model detail: cheapest vs blended price, per-provider table (cheapest badge, throughput), benchmarks, capabilities, similar models. Click "Add to compare".
4. /models: tick Vision and ≥1M context, sort by price, type "gemini". **Point at the URL:** every filter is a query param, so the view is shareable. Show the mobile layout by resizing.
5. Add 2–3 models, use the compare tray, open /compare. Green = best in row. Add a model from the picker, then copy the URL.
6. /rankings: Atlas Index → Coding → SWE-bench Verified → Open weights only.
7. Labs → Meta (timeline, where to run). Providers → Groq (endpoints).

**3:30 Architecture (3 min)** — open the README diagram plus code
- `prisma/schema.prisma`: Lab / Model / Provider joined by ModelEndpoint (per-provider price); BenchmarkScore. Decimal prices normalized to $/1M. Enums and array columns.
- Denormalized `minInputPrice` / `atlasScore`: why (indexed sort for the hottest page), and how they stay consistent (`services/aggregates.ts`, recomputed in the same transaction).
- `lib/validation.ts` → `lib/services/*` → `dto.ts`: **one service layer** used by both server pages and `/api/*`.
- `lib/errors.ts`: `route()` wrapper with a consistent error envelope and CDN cache headers. Show `curl /api/models?sort=bogus` returning a 400 with details.
- `lib/ingest/*`: validate → normalize → upsert. Show `prisma/data/models.ts` mixing per_1k / per_token / "128k", and the per-model transaction with 207 partial failure. Demo `POST /api/ingest` with one good and one bad record.

**6:30 Decisions & challenges (1.5 min)**
- Next API routes vs NestJS: one deployable, shared types, no SSR network hop.
- URL as state instead of a client store.
- Rust-free Prisma client + pg adapter for smaller serverless bundles and Neon pooling.
- Challenge: sort by "cheapest price" across providers without a join per request → denormalized aggregate.
- Challenge: a fair composite score → normalize by maxScore, minimum 3 benchmarks, competition ranking.
- Be upfront: the dataset is a sample; perf metrics are synthetic.

**8:00 Next steps (30s)**
Real ingestion connectors on a schedule, price history, trigram search, tests, rate limiting.
