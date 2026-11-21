# OneAtlas: AI Model Discovery & Intelligence Platform

OneAtlas helps developers, AI engineers and researchers **discover, compare and evaluate AI models** across labs and inference providers. It covers pricing, context windows, capabilities, modalities and benchmarks in one place.

> **Role:** Full Stack Engineer · **Stack:** Next.js 15 (App Router) · React 19 · TypeScript · TailwindCSS 4 · PostgreSQL · Prisma 6 · Zod
>
> **Live:** https://oneatlas-beryl.vercel.app · **Loom:** `<your-loom-url>`

---

## Features

| Area | What's there |
| --- | --- |
| **Model discovery** | Search by name, lab or description. Filter by lab, provider, model type, capabilities, input modality, open weights, minimum context and maximum price. Sort by newest, price, context, Atlas score or name. Paginated. All state lives in the URL, so every view is shareable. |
| **Model detail** | Specs, cheapest and blended price, per-provider pricing (cached input, context, throughput, TTFT, uptime), modalities, a capability matrix, benchmark scores with bars, overall rank and similar models. |
| **Comparison** | Up to 4 models side by side, covering pricing, limits, performance, every benchmark, capabilities and modalities. The best value in each row is highlighted. A persistent compare tray works across pages, and the URL is shareable (`/compare?models=a,b`). |
| **Rankings** | Composite **Atlas Index**, per-category indexes (Coding, Math, Reasoning…) and single-benchmark leaderboards, filterable by model type and open/proprietary weights. Uses competition ranking (ties share a rank). |
| **Labs directory** | Lab profiles with model counts, open-weights count, best score, a release timeline and the providers that serve the lab's models. |
| **Provider directory** | First-party, cloud and inference hosts, each with coverage, cheapest price and median speed, plus every endpoint it serves. |
| **Global search** | ⌘K / Ctrl+K (or `/`) command palette across models, labs and providers, with keyboard navigation. |
| **Data ingestion** | `POST /api/ingest`: a validated, normalizing, idempotent upsert pipeline. The seed script uses the same pipeline. |

The UI is responsive throughout: tables become cards on mobile, filters move into a drawer, and nav collapses into a menu.

---

## Architecture

```
┌──────────────────────────────── Next.js (App Router) ────────────────────────────────┐
│                                                                                      │
│  Server Components (pages)          Route Handlers (/api/*)        Client Components │
│  /, /models, /models/[slug],        GET models, models/:slug,      filters, ⌘K search,│
│  /compare, /rankings, /labs…        compare, rankings, labs,       compare tray,     │
│        │                            providers, search, facets      compare picker    │
│        │                            POST ingest                         │            │
│        │                                  │                    fetch /api/search      │
│        └──────────────┬───────────────────┘                    URL ⇄ searchParams     │
│                       ▼                                                               │
│            src/lib/validation.ts   (Zod: one schema per query, shared by pages & API) │
│                       ▼                                                               │
│            src/lib/services/*      (models · rankings · directory · aggregates)       │
│                       ▼                                                               │
│            src/lib/dto.ts          (Decimal→number, Date→ISO; one JSON shape)         │
│                       ▼                                                               │
│            Prisma Client (Rust-free, `pg` driver adapter)                             │
└───────────────────────┬──────────────────────────────────────────────────────────────┘
                        ▼
                  PostgreSQL (Neon)
```

**One service layer, two consumers.** Pages call the services directly on the server, which skips an HTTP hop and gives the fastest TTFB. The public REST API calls the exact same functions. Because validation, querying and serialization exist in one place, the UI and the API can't drift apart.

**The URL is the state.** Filters, sort, pagination, rankings tabs and comparisons are all query params. Client components only rewrite the URL (`router.replace` inside a transition), and the server component re-renders. As a result every view can be bookmarked or shared, the back button works, and there is no duplicated client cache to keep in sync.

### Data model

```
Lab 1──* Model *──* Provider        (through ModelEndpoint: per-provider price, limits, perf)
            │
            └──* BenchmarkScore *──1 Benchmark (category, maxScore, higherIsBetter)
```

- **Money is `Decimal(12,4)`**, always normalized to **USD per 1M tokens**. Floats are never used for prices.
- **Enums** (`ModelType`, `Modality[]`, `Capability[]`, `BenchmarkCategory`, `ProviderType`, `LabType`) are enforced by Postgres, and capability/modality filters are native array operators (`hasEvery`).
- **Denormalized aggregates:** `Model.minInputPrice`, `minOutputPrice`, `providerCount` and `atlasScore` are recomputed **inside the same transaction** that writes a model's endpoints and scores (`services/aggregates.ts`). Listing pages can then sort and filter by "cheapest available price" or composite score with a plain indexed column instead of a join plus aggregate on every request. They also can't go stale, because no code path writes endpoints without recomputing.
- **Indexes** cover every sort and filter column: `releaseDate`, `contextWindow`, `minInputPrice`, `atlasScore`, `type`, `labId`, the `(modelId, providerId)` unique key, and `(benchmarkId, score)` for leaderboards.

### Ingestion & normalization (`src/lib/ingest`)

Real sources disagree on formats, so the pipeline is **validate → normalize → upsert**:

| Raw input | Normalized |
| --- | --- |
| prices `per_token` / `per_1k` / `per_1m` | USD per 1M, rounded to 4 dp |
| context `"128k"`, `"1M"`, `"1,048,576"`, `8192` | integer tokens |
| `"Tool Use"`, `"json-mode"`, `"thinking"`, `"pdf"` | `FUNCTION_CALLING`, `STRUCTURED_OUTPUT`, `REASONING`, `FILE` |
| model without slug, `"Command R+"` | `command-r-plus` |
| endpoint without price/context | inherits the model's reference values |

- Each model is upserted in its **own transaction**. A bad record shows up in `errors[]` (HTTP **207**) while the rest of the batch succeeds.
- Endpoints and scores missing from the payload are **deleted**, so re-ingesting a source is **idempotent** and reflects de-listings.
- Scores are range-checked against the benchmark's `maxScore`, and unknown lab, provider or benchmark slugs are rejected.
- `POST /api/ingest` requires `Authorization: Bearer $INGEST_TOKEN` (constant-time compare) and calls `revalidatePath` so ISR pages refresh immediately.

### Atlas Index

The composite score is the mean of a model's benchmark scores, each normalized to 0–100. A model needs at least **3** benchmarks to get one, which stops a model with a single easy result from topping the board. Category indexes relax that minimum to the number of benchmarks in the category.

### API

Every endpoint returns JSON. Errors share one envelope: `{ "error": { "code", "message", "details?" } }` with codes `VALIDATION_ERROR` 400, `UNAUTHORIZED` 401, `NOT_FOUND` 404 and `INTERNAL_ERROR` 500. Read endpoints send `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.

| Method | Endpoint | Notes |
| --- | --- | --- |
| GET | `/api/models` | `q, lab, provider, type, capability, modality, openWeights, minContext, maxPrice, sort=release\|price\|context\|name\|score, order, page, pageSize≤100`. Lists accept `a,b` or repeated params. Returns `{items,page,pageSize,total,totalPages}` |
| GET | `/api/models/:slug` | detail with endpoints, scores and `atlasRank` |
| GET | `/api/compare?models=a,b,c` | max 4; unknown slugs are returned in `missing` |
| GET | `/api/rankings` | `benchmark=atlas\|<slug>, category, type, openWeights, limit` |
| GET | `/api/labs`, `/api/labs/:slug` | |
| GET | `/api/providers`, `/api/providers/:slug` | |
| GET | `/api/benchmarks`, `/api/facets` | facets = filter options with counts |
| GET | `/api/search?q=` | grouped models / labs / providers (powers ⌘K) |
| GET | `/api/health` | DB round-trip latency |
| POST | `/api/ingest` | bearer-protected bulk upsert (see `src/lib/ingest/schema.ts`) |

```bash
curl "$URL/api/models?type=reasoning&openWeights=true&sort=price&pageSize=5"
curl "$URL/api/rankings?category=coding&limit=10"
curl -X POST "$URL/api/ingest" -H "Authorization: Bearer $INGEST_TOKEN" -H "content-type: application/json" \
  -d '{"models":[{"name":"Mistral Nemo","lab":"mistral","type":"chat","description":"12B open model","releaseDate":"2024-07-18","contextWindow":"128k","input":["text"],"output":["text"],"capabilities":["tool use"],"pricing":{"unit":"per_1k","input":0.00015,"output":0.00015},"endpoints":{"mistral":{}}}]}'
```

### Rendering & performance

- Detail and directory pages use **ISR** (`revalidate = 300`), and `react.cache` dedupes the DB call between `generateMetadata` and the page.
- Discovery, compare and rankings render dynamically from `searchParams`, and their queries run in parallel (`Promise.all` / `$transaction`).
- Client JS is minimal (~103 kB shared): only the interactive islands (filters, search, compare) are client components, and tables are server-rendered HTML.
- The Prisma client runs **without the Rust query engine** (`engineType = "client"` plus `@prisma/adapter-pg`). That means smaller serverless bundles and faster cold starts on Vercel, and connections are pooled per instance (`max: 5`).

### Key decisions & trade-offs

- **Next.js API routes over NestJS:** one deployable, shared types and services, and zero network hop for SSR. At larger scale the service layer can be lifted into a separate service unchanged.
- **Offset pagination:** simple and gives page numbers. At large scale, keyset pagination on `(sortKey, slug)` would be the next step (the stable `slug` tiebreak is already in place).
- **`ILIKE` search:** fine at this size. The next step is `pg_trgm` GIN indexes or Postgres full-text search.
- **Denormalized aggregates over views:** this favors read performance on the hottest pages. The cost is that writes must go through the ingest service (which is enforced).

---

## Data disclaimer

The seed dataset (41 models, 12 labs, 18 providers, 8 benchmarks, 133 endpoints) is a **sample** compiled from public model cards and pricing pages, then rounded. Prices and scores are illustrative and **not authoritative**. Throughput, latency and uptime are **synthetic** (deterministically generated in `prisma/seed.ts`). All application data is served from Postgres through the API and services; nothing is hard-coded in the frontend.

---

## Run locally

```bash
cp .env.example .env              # set DATABASE_URL / DIRECT_URL
docker compose up -d              # or any Postgres 14+
npm install
npx prisma migrate deploy         # create schema
npm run db:seed                   # load sample data (idempotent)
npm run dev                       # http://localhost:3000
npm run smoke                     # 50+ API/page checks against http://localhost:3000
npm run smoke -- https://<url>    # same checks against any deployment
```

Other scripts: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run db:studio`, `npm run smoke`.

## Deploy (Vercel + Neon)

1. Create a **Neon** project. Copy the **pooled** connection string into `DATABASE_URL` and the **direct** one into `DIRECT_URL`.
2. Push this repo to GitHub, then import it in **Vercel**. Add the env vars `DATABASE_URL`, `DIRECT_URL` and `INGEST_TOKEN`.
3. Deploy. Vercel runs `vercel-build` = `prisma generate && prisma migrate deploy && next build`, so migrations apply on every deploy.
4. Seed once from your machine: `DATABASE_URL=<neon-direct-url> DIRECT_URL=<neon-direct-url> npm run db:seed`, then redeploy (or call `POST /api/ingest`) so the ISR pages pick up the data.

## Project structure

```
prisma/
  schema.prisma            data model + indexes
  migrations/              SQL migrations
  data/                    raw sample dataset (mixed units on purpose)
  seed.ts                  runs the dataset through the ingest pipeline
src/
  app/                     pages (server components) + api/ route handlers
  components/              ui primitives, models/, compare/, search/
  lib/
    db.ts                  Prisma singleton (pg adapter)
    validation.ts          Zod query schemas (shared by pages and API)
    dto.ts                 response shapes + mappers
    errors.ts              error envelope + route() wrapper (cache headers)
    ingest/                schema → normalize → upsert
    services/              models, rankings, directory, aggregates
```

## What I'd do next

Real data connectors (provider pricing APIs, OpenRouter's models endpoint) on a scheduled ingest with change history; price-history charts; a price vs. Atlas-score scatter; `pg_trgm` fuzzy search; per-use-case "best model for X" recommendations; unit tests (Vitest for normalize/aggregates) and Playwright UI flows — an end-to-end API/page smoke suite already exists in scripts/smoke.mjs; and rate limiting on the public API.
