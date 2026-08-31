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

## Part 3 — Production verification (to run once Wrangler auth is restored)

Deploy `def689d` and the correction above. **No merge to `main`.**

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

## Related

- `docs/invariant-register.md` — the seventh false claim, and the method lesson.
- `docs/qa/falsification.md` — how a check is proven to fire before it is trusted.
- `src/lib/cache/platform-cache.ts` — the policy and the closed default.
- `src/lib/cache/response-policy.ts` — the single exit.
