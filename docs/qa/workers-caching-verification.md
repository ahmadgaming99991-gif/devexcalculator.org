# Workers Caching: invocation-surface audit and production verification

Branch `perf/platform-cpu-1102`. Candidate `def689d` plus the correction this
document's first half produced.

`cache.enabled` in `wrangler.jsonc` makes Cloudflare check the cache **before**
invoking the Worker. That is what removes the isolate startup a `caches.default`
lookup still paid, and it is also why the two questions below have to be
answered before it is switched on: which invocations it fronts, and whether any
response reachable through any of them is cacheable when it should not be.

---

## Part 1 — Invocation surfaces (static)

Read from the code and the build output rather than fetched, because the
finding at the end of this section is one that cannot be fetched.

### The surfaces that exist

| Surface | What it is | Cacheable? |
| --- | --- | --- |
| `default.fetch` | `handler.fetch` in `worker/index.ts`, reached through the two custom domains in `routes`. | **Yes** — this is the one Workers Caching fronts. Every response is given an explicit policy. |
| `default.scheduled` | The Cron Trigger. Not a fetch invocation. | No. Nothing to cache. |
| `DOQueueHandler`, `DOShardedTagCache`, `BucketCachePurge` | Re-exported by `export * from "opennext-worker"`. | **No surface at all.** All three `extend DurableObject`; none extends `WorkerEntrypoint`; none defines a `fetch()` method. They expose RPC methods only. |
| `WORKER_SELF_REFERENCE` | Service binding to `devexcalculator-org`, declared because `@opennextjs/cloudflare` requires it for ISR revalidation. | Unreachable — see below. |

### `openNextWorker.fetch` is a direct in-process call

`worker/index.ts` imports `openNextWorker` from `"opennext-worker"`, which
`wrangler.jsonc` aliases to `./.open-next/worker.js`. The call is
`openNextWorker.fetch(request, env, ctx)` — a method call on an imported
module's default export, in the same isolate. It is **not** `env.X.fetch()`,
there is no network hop, and it is not a second cacheable invocation. The
generated worker's default export is a plain `{ async fetch(...) }` object.

*Documented as asked, and it is the answer that makes the rest simple: there is
exactly one fetch invocation per request.*

### The service binding is declared but never exercised

`WORKER_SELF_REFERENCE` has one consumer in the whole build:
`DOQueueHandler.executeRevalidation` in
`.open-next/.build/durable-objects/queue.js`, which calls
`this.service.fetch(...)`. That constructor is never run here:

1. `open-next.config.ts` sets only `incrementalCache` and
   `enableCacheInterception`. `queue` therefore resolves to `"dummy"`
   (`resolveQueue(value = "dummy")` in the generated config).
2. `wrangler.jsonc` declares **no** `durable_objects` bindings, so no namespace
   exists from which a stub could be obtained.
3. `DOQueueHandler` appears exactly once in `.open-next/worker.js` — in the
   `export` line. Nothing instantiates it.

Every route on this site is prerendered and nothing revalidates, which is why
the queue is a dummy in the first place.

**And if it ever became reachable:** the revalidation request is
`method: "HEAD"` with `x-prerender-revalidate` and `x-isr: 1`.
`platformCachePolicy` returns `no-store` for any non-`GET`, so it could not
store a copy under the platform key. Asserted in
`tests/unit/cache/response-policy.test.ts`.

### Static assets never reach the Worker

`.open-next/assets/_headers` sets an explicit `Cache-Control` on
`/_next/static/*`, `/icons/*`, `/images/*` and `/brand/*`. Those are served by
Cloudflare's asset server, not by this Worker, so the Worker's cache setting
does not govern them.

Two asset paths carry no explicit policy — `/og/*` and `/BUILD_ID`. Both are
outside the Worker's response set, both are immutable public content, and
neither is changed here. Recorded so it is a known gap rather than an
assumption.

### What this audit found that the empirical one could not

**The HTTPS upgrade returned a 301 with no `Cache-Control` at all.**

`worker/index.ts` returned it four lines above the block that applied the
policy, so it bypassed the chain entirely — while a comment directly beneath it
said every response leaving the Worker carries a policy.

The earlier audit enumerated every response class against a running Worker and
found none unlabelled. It could not have found this one: a local preview serves
over plain HTTP, so it runs with `DISABLE_HTTPS_UPGRADE` set, so the upgrade
never executes there. No amount of fetching produces the response.

**Fixed** by giving `worker/index.ts` a single `return`: the upgrade is now a
response like any other, and the wiring moved to
`src/lib/cache/response-policy.ts` so a test can hold it rather than only a
build artefact that resolves inside wrangler. The upgrade 301 now carries
`no-store`.

Recorded in `docs/invariant-register.md` as the seventh false claim.

---

## Part 2 — How a 1102 on a HIT is classified

**Correction to the caveat carried into this phase.** It previously said that if
cached bursts still failed at roughly the rate `/devex-rates/` failed at
(2 in 40), that would be an isolate-start floor rather than a failure of this
change.

That reasoning does not survive the move from `caches.default` to Workers
Caching. A genuine `Cf-Cache-Status: HIT` is served **before** the Worker is
invoked, so there is no isolate to start. A Worker 1102 on a response marked
HIT is therefore not a floor, not background noise, and not attributable to
cold start. It is evidence that the request was not served the way the header
says it was, and it stops the phase.

The old caveat applies only to MISS and EXPIRED, where the Worker does run.

---

## Part 3 — The production verification protocol

Executed on 2026-08-31; results in Part 4. **No merge to `main`.**

`cross_version_cache` is off, so the new deployment starts with an empty cache
and is itself the cold-cache test. **Do not add a query parameter to cache-bust**
— any query string is deliberately a BYPASS, so it would test the wrong path.

1. **First query-free request** to `https://devexcalculator.org/platform/`.
   Record HTTP status, `Cf-Cache-Status`, `x-platform-rendered-at`, Worker CPU
   where available, and any 1102. Expect MISS.

2. **Three separate 40-parallel bursts** against the exact same query-free URL,
   inside the 120-second TTL, once one successful response has populated the
   cache.

   Acceptance, strictly:
   - responses marked HIT
   - **0/40 1102 in every burst**
   - `x-platform-rendered-at` identical across HITs

   A HIT that returns 1102 stops everything and is reported as evidence.

3. **View bypasses** — each must be BYPASS, `no-store`, and render its own
   correct view: `?days=7`, `?ranking=most-engaging`, `?experience=...`.
   `x-platform-rendered-at` should *change* between repeated requests here;
   that is what makes the bypass observable rather than asserted.

4. **Three TTL refresh cycles.** Cache age never exceeds 120 s; the first
   post-expiry render succeeds; subsequent requests return to HIT; no 1102
   during refresh.

5. **Regression check**, recording `Cf-Cache-Status` only and changing no
   policy unless a real problem appears: `/`, `/devex-rates/`, the feeds, and
   the static assets.

### Decision rules

| | Result | Action |
| --- | --- | --- |
| **A** | HIT bursts 0/40 and refresh cycles clean | PASS. Stop before merge. |
| **B** | HIT bursts 0/40 but MISS/EXPIRED refresh produces 1102 | PARTIAL PASS. Stop. The remaining cost is cold/dynamic render; bundle reduction or another architecture may be needed. |
| **C** | Any genuine HIT returns 1102 | Report the exact evidence and stop. Do not implement option (b) automatically. |

---

## Part 4 — Production evidence, 2026-08-31

**Classification: A — PASS.**

### What was deployed

| | |
| --- | --- |
| Version | `260b9e74-6edc-4f47-adab-c6c91c249e23`, deployed 14:13:58Z |
| Previous version | `47a75c09-84b4-4dfb-a8d7-edbcf16a7f43` (the `0c433b7` deploy) |
| Worker / account | `devexcalculator-org` / `262ead2fbb850b9e7dcca04b21ed0fec` — the existing Worker, appended to its own deployment history. No duplicate, nothing in `5492212f…`. |
| Branch / head | `perf/platform-cpu-1102` at `2b0063b` |

`2b0063b` is `d3ffdde` plus a regenerated `docs/i18n/current-string-inventory.json`
(`filesScanned` 251 → 252). No runtime, config or source difference: the deployed
code is byte-identical to `d3ffdde`.

Deployment used the account API token rather than the OAuth session, which was
logged in to a different account. See the account-mismatch note in Part 6.

### Cold MISS, then population

| Step | Status | `Cf-Cache-Status` | `x-platform-rendered-at` | Age | Time |
| --- | --- | --- | --- | --- | --- |
| First query-free request | 200 | MISS | `14:15:00.858Z` | — | 4.06 s |
| Second | 200 | HIT | `14:15:00.858Z` | 8 | 1.31 s |
| Third | 200 | HIT | `14:15:00.858Z` | 9 | 0.90 s |

`Cache-Control` was `public, max-age=0, s-maxage=120, must-revalidate` on every
one, exactly as specified. The 4.06 s → 0.90 s drop is the render being skipped.

### The three 40-parallel bursts

| Burst | Status | `Cf-Cache-Status` | 1102 | New renders introduced |
| --- | --- | --- | --- | --- |
| 1 | 40 × 200 | 37 HIT, 3 MISS | **0 / 40** | 3 |
| 2 | 40 × 200 | **40 HIT** | **0 / 40** | **0** |
| 3 | 40 × 200 | **40 HIT** | **0 / 40** | **0** |

**Across all 120 requests only four distinct renders ever existed**, all created
at or before `14:15:36.566Z`: the original cold render plus three shard fills in
burst 1. Bursts 2 and 3 — eighty requests, all HIT — introduced none.

### Worker invocation evidence

From Cloudflare's own `workersInvocationsAdaptive` analytics, which counts
invocations rather than requests and so settles the question the response
headers can only suggest:

| Window | Requests sent | Worker invocations | Errors |
| --- | --- | --- | --- |
| 14:14–14:19Z (the burst window) | ~136 | **11** | **0** |
| 14:13Z onward (whole session) | ~214 | **152** | **0** |

A HIT is served before the Worker exists, so it cannot appear in this count —
and it does not. The 117 burst HITs cost eleven invocations between them,
because only the misses ran.

### TTL refresh cycles

Thirty polls at ~17 s, 14:20:33Z → 14:28:55Z. **30/30 → HTTP 200, 0 × 1102**,
`Cache-Control` constant throughout.

| Cycle | `x-platform-rendered-at` | Sequence | Ages observed | Max age |
| --- | --- | --- | --- | --- |
| 1 | `14:20:17.397Z` | E→H×7 | 16, 32, 48, 65, 83, 99, 115 | 115 |
| 2 | `14:22:29.915Z` | E→H×7 | 17, 34, 51, 67, 84, 100, 117 | **117** |
| 3 | `14:24:44.204Z` | E | — | — |
| 4 | `14:25:01.425Z` | E→H×4 | 19, 36, 52, 70 | 70 |
| 5 | `14:26:31.358Z` | E | — | — |
| 6 | `14:26:53.462Z` | E | — | — |
| 7 | `14:27:11.885Z` | E→H×2 | 16, 33 | 33 |
| 8 | `14:28:03.997Z` | E | — | — |
| 9 | `14:26:53.462Z` | H | 88 | 88 |
| 10 | `14:27:11.885Z` | H | 86 | 86 |

**Highest age ever observed: 117 s.** Nothing exceeded the 120 s bound. Every
EXPIRED produced a successful fresh render, every render was followed by HITs,
and no refresh produced a 1102.

### Production CPU

Per-invocation CPU across 63 one-minute buckets since the deploy:

| min | median | p90 | max |
| --- | --- | --- | --- |
| ~0 ms | **134 ms** | **709 ms** | **1,271.8 ms** |

An order of magnitude above the ~125 ms measured locally. Recorded prominently
because it is the whole finding: these renders succeed individually and only
collapsed when forty ran at once. See Part 5.

### Query views

All four `Cf-Cache-Status: BYPASS`, `Cache-Control: no-store`, with
`x-platform-rendered-at` changing on every request — the bypass observed rather
than asserted. Re-confirmed after the refresh cycles.

| View | Evidence it rendered its own view |
| --- | --- |
| `?days=7` | **539 chart series points** against 1085 for the default 14-day window |
| `?experience=10563114921` | distinct payload, 849,733 B against 838,969 B |
| `?ranking=most-engaging` | **not a slug this site offers.** Bypassed correctly and fell back to the default ranking |
| `?ranking=fun-with-friends` | added to test a real slug: first row **"Collect All Pets!"** against **"Steal An Egg"** |

The site's ranking slugs are `top-playing-now`, `fun-with-friends`,
`top-revisited` and `up-and-coming`. `most-engaging` was named in the test plan
and does not exist; it is kept above because an unknown value falling back
cleanly is worth knowing, but it proves bypass, not view selection — which is
why the real slug was added rather than the result being reported as if it had.

### Regression sweep

Run before and after the cycles. Every value identical to the pre-deploy audit;
no policy changed anywhere.

| Route | `Cache-Control` | Status |
| --- | --- | --- |
| `/` | `s-maxage=600, stale-while-revalidate=86400` | MISS → HIT |
| `/devex-rates/`, `/sources/` | `s-maxage=3600, stale-while-revalidate=86400` | MISS → HIT |
| `/usd-to-robux/`, `/platform/stock/`, `/tr/`, `/tr/platform/` | `private, no-cache, no-store, max-age=0, must-revalidate` | BYPASS |
| feeds, `/llms.txt`, `/api/rates/` | `max-age=3600, s-maxage=86400` | MISS → HIT |
| `/robots.txt`, `/sitemap.xml` | `max-age=0, must-revalidate` | MISS → EXPIRED |
| `/api/health/` | `no-store` | BYPASS |
| `/api/platform/` | `max-age=450, s-maxage=450` | MISS → HIT |
| `/_next/static/*`, `/icons/icon.svg`, `/brand/*` | `max-age=31536000, immutable` | MISS → HIT |

### Per-colo cache shards, and the two literal deviations

Two acceptance criteria were not literally met, both for the same reason, and
both were reviewed and accepted by the owner rather than waived quietly.

Cloudflare's cache is **per colo, and sharded within one**. A burst of forty
connections does not land on one cache; it lands on several, and each populates
independently. So:

1. **Burst 1 was 37 HIT / 3 MISS**, not 40 HIT. Three shards had no copy yet.
   All three rendered successfully with no 1102.
2. **Four distinct `x-platform-rendered-at` values existed**, not one. Four
   shards, four independently rendered copies.

Neither is a re-render on a HIT, which is what the criterion protects. The
invariant that actually holds, and is the one worth stating: **no genuine HIT
ever produced a new render timestamp**, confirmed independently by the
invocation count. Cycles 9 and 10 above are the same effect in the refresh
phase — two shards still serving their own fresh copies, both well inside the
bound.

---

## Part 5 — What the 1102 incident actually was

**The cause was concurrent expensive dynamic SSR, not the platform data layer.**

Recording this explicitly because the data layer was the intuitive suspect and
was wrong, and because the fix that followed from the correct diagnosis —
not rendering — is not the fix the intuitive one would have suggested.

The evidence, from the investigation phase:

- **Failure rate tracked per-request CPU, not data volume.** Measured CPU:
  `/devex-rates/` 6.3 ms, `/platform/stock/` 42.2 ms, `/platform/` 125.0 ms.
  The 503 gradient under a 40-parallel burst followed it exactly: a prerendered
  page 0–2 of 40, a plain dynamic page 5–8, `/platform/` 13–14.
- **Making the data cheaper was not enough.** Hoisting the per-render rebuilds
  (`9bbccf6`) took the data work from 14.09 ms to 3.17 ms and did not stop the
  failures.
- **Cutting the data did almost nothing.** Dropping the table from 100 rows to
  10 halved the bytes, 575 → 264 KB, and moved total CPU only 125.0 → 104.7 ms.
  About 105 ms was the render itself.
- **It was not a Turkish regression.** English `/platform/stock/` failed 14 of
  40 against Turkish 13 of 40.
- **Failures were front-loaded in each burst** — the cold-isolate signature.

Production CPU of up to 1,271.8 ms per render makes the mechanism plainer than
the local numbers did: forty of those at once is the incident, and one of them
is fine.

---

## Part 6 — Remaining architectural observations

Recorded, not actioned. Neither is a release blocker.

### `/platform/` SSR is still expensive

Median 134 ms, p90 709 ms, max 1,271.8 ms per invocation in production. Workers
Caching removes repeated concurrent rendering for the query-free route, which is
what was failing — it does not make the render cheaper. What remains exposed:

- every **query view** (`?days`, `?ranking`, `?experience`) renders per request
  by design, and a burst against one of those would still be a burst of renders;
- every **cache expiry** costs one render per shard;
- the **other five locales**, if `/platform/` is ever published in them.

Bundle reduction, a cron-written render snapshot, or moving the chart work off
the render path all remain open. None was attempted here.

### The OAuth session points at the wrong account

`wrangler whoami` reports `ahmadseo8688@gmail.com` / `5492212f…`, while the
Worker lives in `262ead2f…`. A wrangler call therefore fails with
`Authentication error [code: 10000]`, which reads exactly like an expired token
and is not one. `code: 10007` on the logged-in account id confirms the
mismatch.

Deployment used the account API token instead. **Do not clear the cached
account id in `node_modules/.cache/wrangler/wrangler-account.json` to get past
this**: with the wrong login it would deploy a new Worker into the wrong
account.

---

## Related

- `docs/invariant-register.md` — the seventh false claim, and the method lesson.
- `docs/qa/falsification.md` — how a check is proven to fire before it is trusted.
- `src/lib/cache/platform-cache.ts` — the policy and the closed default.
- `src/lib/cache/response-policy.ts` — the single exit.
