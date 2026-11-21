#!/usr/bin/env node
// OneAtlas smoke test: hits the API and pages of a running server.
//
//   npm run smoke                          # http://localhost:3000
//   npm run smoke -- https://my-app.vercel.app
//   INGEST_TOKEN=... npm run smoke         # also runs the ingest write test
//
// Plain Node ESM (>= 20, global fetch), no dependencies. Exits 1 on any failure.
// Note: the ingest write test creates a model with slug "smoke-test-model".
// Re-running it is idempotent, but reset or re-seed the DB to remove it.

const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/+$/, "");
const TOKEN = process.env.INGEST_TOKEN || "";
const ALL = "pageSize=100"; // so "every item" / ordering checks cover the whole result set

const results = [];

class Fail extends Error {}
function assert(cond, msg) {
  if (!cond) throw new Fail(msg);
}

async function request(path, init) {
  const res = await fetch(BASE + path, { redirect: "manual", ...init });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: res.status, headers: res.headers, text, json };
}

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail ?? "" });
  } catch (err) {
    results.push({ name, ok: false, detail: err instanceof Fail ? err.message : `${err?.name}: ${err?.message}` });
  }
}

const expectStatus = (r, code) => assert(r.status === code, `expected ${code}, got ${r.status}`);

/** GET a JSON endpoint, assert status, return parsed body. */
async function api(path, code = 200) {
  const r = await request(path);
  expectStatus(r, code);
  assert(r.json !== undefined, "response is not JSON");
  return r.json;
}

/** Assert values are ordered; `nullsLast` allows nulls only after all non-null values. */
function assertOrdered(values, dir, label, { nullsLast = false } = {}) {
  let seenNull = false;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === null || v === undefined) {
      assert(nullsLast, `${label}: null at index ${i}`);
      seenNull = true;
      continue;
    }
    assert(!seenNull, `${label}: non-null value after a null at index ${i}`);
    if (i > 0 && values[i - 1] !== null && values[i - 1] !== undefined) {
      const ok = dir === "asc" ? values[i - 1] <= v : values[i - 1] >= v;
      assert(ok, `${label}: not ${dir === "asc" ? "non-decreasing" : "non-increasing"} at index ${i} (${values[i - 1]} then ${v})`);
    }
  }
}

const every = (items, pred, msg) => {
  assert(items.length > 0, "no items returned");
  const bad = items.find((x) => !pred(x));
  if (bad) throw new Fail(`${msg}: ${bad.slug ?? bad.model?.slug ?? JSON.stringify(bad).slice(0, 80)}`);
};

// ─── API ────────────────────────────────────────────────────────────────────

await check("GET /api/health → 200, status ok", async () => {
  const j = await api("/api/health");
  assert(j.status === "ok", `status is ${JSON.stringify(j.status)}`);
  return `db ${j.dbLatencyMs}ms`;
});

await check("GET /api/models → 41 total, page 1/3, pageSize 20", async () => {
  const j = await api("/api/models");
  assert(j.total === 41, `total ${j.total}`);
  assert(j.page === 1, `page ${j.page}`);
  assert(j.pageSize === 20, `pageSize ${j.pageSize}`);
  assert(j.totalPages === 3, `totalPages ${j.totalPages}`);
  assert(j.items.length === 20, `items ${j.items.length}`);
  return "41 / 20 / 3";
});

await check("GET /api/models?page=3 → 1 item", async () => {
  const j = await api("/api/models?page=3");
  assert(j.items.length === 1, `items ${j.items.length}`);
  return j.items[0].slug;
});

await check("GET /api/models?type=reasoning&sort=price → REASONING, price asc", async () => {
  const j = await api("/api/models?type=reasoning&sort=price&pageSize=50");
  every(j.items, (m) => m.type === "REASONING", "non-REASONING item");
  assertOrdered(j.items.map((m) => m.inputPrice), "asc", "inputPrice", { nullsLast: true });
  return `${j.items.length} items`;
});

await check("GET /api/models?sort=context → contextWindow desc", async () => {
  const j = await api(`/api/models?sort=context&${ALL}`);
  assertOrdered(j.items.map((m) => m.contextWindow), "desc", "contextWindow");
  return `${j.items.length} items`;
});

await check("GET /api/models?sort=release&order=asc → releaseDate asc", async () => {
  const j = await api(`/api/models?sort=release&order=asc&${ALL}`);
  assertOrdered(j.items.map((m) => Date.parse(m.releaseDate)), "asc", "releaseDate");
  return `${j.items.length} items`;
});

await check("GET /api/models?sort=score → atlasScore desc, nulls last", async () => {
  const j = await api(`/api/models?sort=score&${ALL}`);
  assertOrdered(j.items.map((m) => m.atlasScore), "desc", "atlasScore", { nullsLast: true });
  return `${j.items.filter((m) => m.atlasScore == null).length} unscored at end`;
});

await check("GET /api/models?capability=vision,function_calling → both caps", async () => {
  const j = await api(`/api/models?capability=vision,function_calling&${ALL}`);
  every(j.items, (m) => m.capabilities.includes("VISION") && m.capabilities.includes("FUNCTION_CALLING"), "missing capability");
  return `${j.total} models`;
});

await check("GET /api/models?lab=anthropic,openai → only those labs", async () => {
  const j = await api(`/api/models?lab=anthropic,openai&${ALL}`);
  every(j.items, (m) => ["anthropic", "openai"].includes(m.lab?.slug), "wrong lab");
  return `${j.total} models`;
});

await check("GET /api/models?provider=groq → total > 0", async () => {
  const j = await api("/api/models?provider=groq");
  assert(j.total > 0, `total ${j.total}`);
  return `${j.total} models`;
});

await check("GET /api/models?openWeights=true → all open weights", async () => {
  const j = await api(`/api/models?openWeights=true&${ALL}`);
  every(j.items, (m) => m.openWeights === true, "closed-weights item");
  return `${j.total} models`;
});

await check("GET /api/models?minContext=1000000 → context ≥ 1M", async () => {
  const j = await api(`/api/models?minContext=1000000&${ALL}`);
  every(j.items, (m) => m.contextWindow >= 1_000_000, "context below 1M");
  return `${j.total} models`;
});

await check("GET /api/models?maxPrice=0.5 → inputPrice ≤ 0.5", async () => {
  const j = await api(`/api/models?maxPrice=0.5&${ALL}`);
  every(j.items, (m) => m.inputPrice !== null && m.inputPrice <= 0.5, "price above 0.5");
  return `${j.total} models`;
});

await check('GET /api/models?q=claude → ≥ 4, names contain "Claude"', async () => {
  const j = await api(`/api/models?q=claude&${ALL}`);
  assert(j.total >= 4, `total ${j.total}`);
  every(j.items, (m) => m.name.includes("Claude"), "name without Claude");
  return `${j.total} models`;
});

await check("GET /api/models?sort=bogus → 400 VALIDATION_ERROR", async () => {
  const j = await api("/api/models?sort=bogus", 400);
  assert(j.error?.code === "VALIDATION_ERROR", `code ${j.error?.code}`);
});

await check("GET /api/models?pageSize=500 → 400", async () => {
  await api("/api/models?pageSize=500", 400);
});

await check("GET /api/models/gpt-5 → endpoints, scores, atlasRank", async () => {
  const j = await api("/api/models/gpt-5");
  assert(j.endpoints?.length >= 1, `endpoints ${j.endpoints?.length}`);
  assert(j.scores?.length >= 3, `scores ${j.scores?.length}`);
  assert(typeof j.atlasRank === "number", `atlasRank ${JSON.stringify(j.atlasRank)}`);
  return `${j.endpoints.length} endpoints, ${j.scores.length} scores, rank ${j.atlasRank}`;
});

await check("GET /api/models/does-not-exist → 404 NOT_FOUND", async () => {
  const j = await api("/api/models/does-not-exist", 404);
  assert(j.error?.code === "NOT_FOUND", `code ${j.error?.code}`);
});

await check("GET /api/compare?models=gpt-5,claude-sonnet-4-5,nope → 2 + missing", async () => {
  const j = await api("/api/compare?models=gpt-5,claude-sonnet-4-5,nope");
  assert(j.models?.length === 2, `models ${j.models?.length}`);
  assert(JSON.stringify(j.missing) === '["nope"]', `missing ${JSON.stringify(j.missing)}`);
});

await check("GET /api/compare?models=a,b,c,d,e → 400", async () => {
  await api("/api/compare?models=a,b,c,d,e", 400);
});

await check("GET /api/rankings → score desc, first rank 1", async () => {
  const j = await api("/api/rankings");
  assert(j.rows?.length > 0, "no rows");
  assert(j.rows[0].rank === 1, `rank[0] ${j.rows[0].rank}`);
  assertOrdered(j.rows.map((r) => r.score), "desc", "score");
  return `${j.rows.length} rows`;
});

await check("GET /api/rankings?benchmark=swe-bench-verified&limit=5 → 5 rows", async () => {
  const j = await api("/api/rankings?benchmark=swe-bench-verified&limit=5");
  assert(j.rows?.length === 5, `rows ${j.rows?.length}`);
});

await check("GET /api/rankings?category=coding&openWeights=true → all open", async () => {
  const j = await api("/api/rankings?category=coding&openWeights=true");
  every(j.rows, (r) => r.model?.openWeights === true, "closed-weights row");
  return `${j.rows.length} rows`;
});

await check("GET /api/rankings?benchmark=nope → 404", async () => {
  await api("/api/rankings?benchmark=nope", 404);
});

await check("GET /api/labs → 12 items", async () => {
  const j = await api("/api/labs");
  assert(j.items?.length === 12, `items ${j.items?.length}`);
});
await check("GET /api/labs/openai → 200", async () => {
  const j = await api("/api/labs/openai");
  assert(j.slug === "openai", `slug ${j.slug}`);
});
await check("GET /api/labs/nope → 404", () => api("/api/labs/nope", 404).then(() => ""));

await check("GET /api/providers → 18 items", async () => {
  const j = await api("/api/providers");
  assert(j.items?.length === 18, `items ${j.items?.length}`);
});
await check("GET /api/providers/groq → 200", async () => {
  const j = await api("/api/providers/groq");
  assert(j.slug === "groq", `slug ${j.slug}`);
});
await check("GET /api/providers/nope → 404", () => api("/api/providers/nope", 404).then(() => ""));

await check("GET /api/benchmarks → 8 items", async () => {
  const j = await api("/api/benchmarks");
  assert(j.items?.length === 8, `items ${j.items?.length}`);
});

await check("GET /api/facets → labs, providers, types, capabilities", async () => {
  const j = await api("/api/facets");
  for (const k of ["labs", "providers", "types", "capabilities"]) assert(Array.isArray(j[k]), `missing ${k}`);
});

await check("GET /api/search?q=llama → models > 0", async () => {
  const j = await api("/api/search?q=llama");
  assert(j.models?.length > 0, `models ${j.models?.length}`);
  return `${j.models.length} models`;
});
await check("GET /api/search (no q) → 400", () => api("/api/search", 400).then(() => ""));

await check("GET /api/labs → Cache-Control has s-maxage", async () => {
  const r = await request("/api/labs");
  const cc = r.headers.get("cache-control") || "";
  assert(cc.includes("s-maxage"), `cache-control "${cc}"`);
  return cc;
});

await check("POST /api/ingest without token → 401", async () => {
  const r = await request("/api/ingest", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  expectStatus(r, 401);
});

if (TOKEN) {
  const PER_1K_INPUT = 0.0002;
  const model = (over) => ({
    name: "Smoke Test Model",
    slug: "smoke-test-model",
    lab: "mistral",
    type: "chat",
    description: "Created by scripts/smoke.mjs",
    releaseDate: "2025-01-01",
    contextWindow: "32k",
    input: ["text"],
    output: ["text"],
    pricing: { unit: "per_1k", input: PER_1K_INPUT, output: 0.0006 },
    endpoints: { mistral: {} },
    ...over,
  });

  await check("POST /api/ingest (1 valid + 1 unknown lab) → 207", async () => {
    const r = await request("/api/ingest", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ models: [model(), model({ name: "Smoke Bad Lab", slug: "smoke-bad-lab", lab: "no-such-lab" })] }),
    });
    expectStatus(r, 207);
    assert(r.json?.models === 1, `models ${r.json?.models}`);
    assert(r.json?.errors?.length === 1, `errors ${r.json?.errors?.length}`);
    return r.json.errors[0].message;
  });

  await check("GET /api/models/smoke-test-model → normalized", async () => {
    const j = await api("/api/models/smoke-test-model");
    assert(j.contextWindow === 32000, `contextWindow ${j.contextWindow}`);
    const expected = PER_1K_INPUT * 1000;
    assert(Math.abs(j.inputPrice - expected) < 1e-9, `inputPrice ${j.inputPrice}, expected ${expected}`);
    return `ctx 32000, $${j.inputPrice}/1M`;
  });
} else {
  results.push({ name: "POST /api/ingest write test", ok: null, detail: "skipped (INGEST_TOKEN not set)" });
}

// ─── Pages ──────────────────────────────────────────────────────────────────

const pages = [
  ["/", 200, "Find the right AI model"],
  ["/models", 200],
  ["/models?capability=vision", 200],
  ["/models/gpt-5", 200, "GPT-5"],
  ["/models/does-not-exist", 404],
  ["/compare", 200],
  ["/compare?models=gpt-5,o3", 200, "o3"],
  ["/rankings", 200],
  ["/rankings?category=math", 200],
  ["/labs", 200],
  ["/labs/meta", 200],
  ["/labs/nope", 404],
  ["/providers", 200],
  ["/providers/groq", 200],
  ["/providers/nope", 404],
];
for (const [path, code, text] of pages) {
  await check(`PAGE ${path} → ${code}${text ? ` "${text}"` : ""}`, async () => {
    const r = await request(path);
    expectStatus(r, code);
    if (text) assert(r.text.includes(text), `"${text}" not in HTML`);
    return `${r.text.length} bytes`;
  });
}

// ─── Report ─────────────────────────────────────────────────────────────────

const label = (ok) => (ok === true ? "PASS" : ok === false ? "FAIL" : "SKIP");
const width = Math.max(...results.map((r) => r.name.length));
console.log(`\nOneAtlas smoke test → ${BASE}\n`);
console.log(`${"RESULT".padEnd(6)}  ${"CHECK".padEnd(width)}  DETAIL`);
console.log(`${"-".repeat(6)}  ${"-".repeat(width)}  ${"-".repeat(20)}`);
for (const r of results) console.log(`${label(r.ok).padEnd(6)}  ${r.name.padEnd(width)}  ${r.detail}`);

const failed = results.filter((r) => r.ok === false).length;
const passed = results.filter((r) => r.ok === true).length;
const skipped = results.filter((r) => r.ok === null).length;
console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
// exitCode (not process.exit) lets fetch's sockets close first; an abrupt exit can trip a libuv assertion on Windows.
process.exitCode = failed ? 1 : 0;
