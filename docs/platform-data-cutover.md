# Cutting `/platform/` over to the data plane

Nothing in this document has been done. It is the ordered list of the steps that
remain, each with the thing that must be true before it and the thing that
proves it afterwards.

The code is complete and measured; what is left is infrastructure, and every one
of those steps is externally visible, so each is listed separately rather than
bundled into a deploy. Each stage is separately approved: reaching the end of
one stage is not permission to begin the next.

## What is already true

- `/platform/` and `/tr/platform/` are prerendered. The build reports them as
  `○ (Static)` and `● (SSG)`; neither route accepts `searchParams` or exports
  `revalidate`.
- The data Worker is written, tested and deployed to a **staging** workers.dev
  subdomain against a **throwaway** KV namespace, with **no** Cron Trigger, no
  route and no custom domain.
- 206 scheduled invocations measured on Workers Free: nothing at or above 8 ms,
  zero errors.
- The site's `connect-src` names the data plane origin, so the browser is
  allowed to make the request the page depends on. See `docs/security-model.md`
  for the terms that change was approved on.

## What is not yet true

The production hostname does not exist. Until stage 1 lands, `/platform/`
renders its static document and the dashboard shows **"These figures could not
be loaded"** — which is the correct, honest state for a data plane that is not
reachable, and is exactly what the failure-state tests assert.

## Stage 1 — the data plane, alone

Nothing about the site changes in this stage. The main production Worker is not
redeployed, and the v1 collector keeps running. This is a deliberate dual-run.

### 1.1 Create the production KV namespace

```
wrangler kv namespace create PLATFORM_DATA
```

A **new** namespace, not the v1 collector's. The two could share one safely —
every key here carries the `platform:v2:` prefix and v1's are unprefixed — but a
separate namespace means a mistake during migration cannot reach the data the
live site is currently serving from.

**Proves it:** `wrangler kv key list` on the new namespace returns `[]`.

### 1.2 Deploy the data Worker to production

Change four things in `workers/platform-data/wrangler.jsonc`, and nothing in
`src/`:

1. `name` → `devexcalculator-platform-data`
2. `kv_namespaces[0].id` → the namespace from 1.1
3. `routes` → `[{ "pattern": "api.devexcalculator.org", "custom_domain": true }]`
4. `triggers.crons` → `["*/5 * * * *"]`

Deploying the custom domain creates the DNS record. Deploy without the cron
first, confirm the endpoints answer 503 (`no-observations`), then add it — so
the first collection is observed from a known-empty start.

**Proves it:** `curl https://api.devexcalculator.org/health` returns
`hasObservations: false`; after fifteen minutes it returns an `observedAt` and
`stale: false`.

## Stage 2 — the 24-hour soak

The charts need history that does not exist yet, and a schedule that has run
once is not a schedule that works. A day gives 96 collection cycles, 96 history
points across four shards, 24 highlight points and the first totals rollup.

Passive observation only: Cloudflare analytics and the stored data. No synthetic
load — this is a data plane sized for a cron and a cached read, and hammering it
would measure the test rather than the system.

What has to hold, all of it:

| | Check |
|---|---|
| A | No `exceededResources` |
| B | No scheduled-unit errors |
| C | No unit reaches or exceeds 8 ms CPU |
| D | Collection produces observations at the expected cadence |
| E | History buckets advance, and roll over the UTC day correctly |
| F | Highlights advance |
| G | Enrichment rotation advances through all four shards |
| H | `detailsObservedAt` stays truthful — never restamped to the player-count clock |
| I | A failed enrichment preserves last-known-good details |
| J | API endpoints stay healthy |
| K | CORS answers the production origin and nothing else |
| L | KV writes match the ~241/day v2 budget |
| M | No schema-2 read failures |
| N | No unexpected Roblox response-shape failures |
| O | No v1 key is written or modified by the v2 Worker |

**Watch:** account KV writes. During dual-run the expected total is 649/day
(v1 408 + v2 241), rising to 745 if the stock page draws every possible
`quote:last` write. The Free limit is 1,000.

**Report before proceeding:** total scheduled invocations, errors,
`exceededResources`, CPU p50/p90/p95/max per unit, actual KV writes, API success
rate, last observation time, enrichment coverage, oldest `detailsObservedAt`,
data-plane Worker bundle size, upstream Roblox failures, anything unexpected.

**Operational rule carried in from the proof:** enrichment runs at batch size 50
with a measured p95 of 7.25 ms. If production shows any invocation at or above
8 ms, any `exceededResources`, or a persistent upward CPU trend, the batch size
is reconsidered before any other change.

## Stage 3 — the site, on its own approval

Only if the soak passes, and only when separately approved.

The site build inlines `NEXT_PUBLIC_PLATFORM_DATA_API`; the default is already
`https://api.devexcalculator.org`, so no variable needs setting for production.
A preview that should read staging sets it explicitly.

**Proves it:** `/platform/` shows a table, and the browser's network panel shows
exactly one origin beyond the site's own — `api.devexcalculator.org`.

Then verify against organic traffic: `/platform/` and `/tr/platform/` serve
correctly; the dashboard loads from the data plane; query state and back/forward
work; canonical stays query-free; charts, rankings and experience detail load;
the failure state degrades gracefully; no CSP violations in the console; no new
Worker CPU or resource errors.

**v1 keeps running throughout.**

## Stage 4 — retiring v1, gated on the exports

> **Hard invariant: v1 is not retired until `/api/platform/` reads v2.**
>
> Enforced by `tests/unit/platform/v1-retirement-gate.test.ts`, not only by this
> document. While the export route imports the v1 store, that test requires the
> scheduled handler, the Cron Trigger and the `PLATFORM_HISTORY` binding to
> still exist. Removing any of them fails the build.

Three things still read the v1 store:

| Reader | What it does | What it needs |
|---|---|---|
| `worker/index.ts` `scheduled` | writes `obs:`, `index`, `series`, `games`, `heartbeat` | stop the cron, or leave it running as a second record |
| `/api/platform/` | serves the CSV and JSON exports linked from the page | re-point at `platform:v2:*` — see below |
| `/api/health/` | reports collector freshness | re-point at the data plane's own `/health` |

The exports are the one that matters to a reader. They are linked from the
page's download section and have been public long enough to be in someone's
script. If v1 stops collecting while they still read v1 they keep answering
`200` with well-formed rows, and only the newest row stops moving — a download
that has silently frozen, sitting beside a page showing fresh figures. That is
stale data presented as current, which this project treats as worse than an
outage.

### The export contract, as published

Not to be changed by the migration. Pinned in the gate test above.

**Endpoints** — `/api/platform/`, `?format=csv`, `?series=experiences`,
`?series=experiences&format=csv`.

**Filenames** — `roblox-players-observed.csv`,
`roblox-experience-players-observed.csv`.

**Totals CSV columns**, in this order:
`observed_at, total_playing, origin, source`

**Per-experience CSV columns**, in this order:
`observed_at, universe_id, experience, playing, origin, source`

**JSON envelope** — `{ ok, data, meta }`, where `data` carries `series`,
`retentionDays`, `rows`, and for totals also `firstObservedAt`, `lastObservedAt`
and `spanHours`; `meta` carries `collectionIntervalMinutes`, the four `formats`
URLs and `notes`.

**Semantics** — observations only, no interpolation or carry-forward; totals at
the collection interval for `RETENTION_DAYS`; per-experience hourly for
`GAME_HISTORY_DAYS`; rows sorted by `observed_at` then experience name; every
row carries its own `origin` and `source`; 503 `no-observations` rather than an
empty 200.

### Before v1 retirement

1. Map the existing export contract exactly — done above.
2. Preserve the CSV and JSON field semantics and the filenames.
3. Re-point the implementation at `platform:v2:*`, reading through the data
   plane rather than KV directly.
4. Add equivalence tests against representative v1 data.
5. Confirm the existing public URLs still answer, unchanged.
6. Confirm no SEO or download-link change is needed.
7. Only once equivalence passes may v1 collection be retired — and then it is
   proposed, not performed.

Note one real difference to resolve at step 3: v2 keeps per-experience history
for 7 days against v1's `GAME_HISTORY_DAYS`, so `retentionDays` in the JSON
envelope will report a smaller window. That is a truthful change in what is
held, not a change in what the field means, but it is a visible one and belongs
in the proposal rather than in a diff.

Retiring v1 takes the account from 649 writes a day to 241.

**Do not delete v1 keys at retirement.** Stop the writes, leave the keys to
expire on their own retention, and keep the rollback window: a v1 collector that
is switched off can be switched back on, but a deleted history cannot be
recovered — nothing here back-fills.

## Rollback

Each stage reverses on its own:

- **Site**: redeploy the previous version. The data Worker is unaffected and
  keeps collecting, so no history is lost to a site rollback.
- **Data Worker**: `wrangler rollback`, or remove the cron to stop collection
  while leaving the read endpoints serving what is already stored.
- **Both**: `/platform/`'s static document does not depend on the data plane. A
  data plane that is down, rolled back, or never deployed produces a page that
  states it cannot load the figures and keeps every other section intact.

The one thing that does not reverse is collected history: an hour in which
nothing ran is an hour that stays empty, because nothing here back-fills.

## Not in scope, and deliberately

- **`/platform/stock/` stays dynamic.** It renders a market quote from a
  provider behind a server-side API key, which cannot move to a public data
  plane. Its CPU profile was never the problem.

## Stage 5 — the migration that was performed

This section replaces an earlier note saying the v1 history would not be
migrated. It was migrated, on 2026-09-02, through the Cloudflare control plane
— no Worker CPU, no Roblox request, no site request. What changed the answer
was finding out which v1 value is actually comparable to v2.

### `series` is not the platform total

v1's `series` is the **sum of one sort's ten rows**. Every sampled observation
across the full fourteen days reads `sortName: "Top Trending"`, `experiences:
10`. v2's total is the deduplicated sum across every ranking — around 260
experiences. At the ten instants where both systems stamped the same second the
ratio runs **2.33 to 3.42 and drifts**, so it is not a convertible unit.
Splicing `series` in front of v2 would have drawn a threefold cliff at the seam
and presented it as platform growth. It was not used.

### `games` is comparable, and was

v1's `games` value holds hourly **per-experience** observations — the same
quantity v2 stores. Checked directly: of 124 aligned `(experience, instant)`
pairs, **83 are identical** and the rest differ by fractions of a percent, the
two systems reading the same counter seconds apart.

Totals were therefore reconstructed the way v2 builds its own — by summing the
per-experience observations at each instant. Against the independent
pre-boundary capture that reproduces the real total to **within 0.1% at 13 of
14 instants** (the outlier, 1.024, is an hour when the roster moved 218 → 261
mid-sample).

### The seam is a time, not a comparison

v1 sampled at `:00:50` and v2 at `:00:12`. Matching timestamps exactly would
have kept both and put two points where one thing was observed once. The seam
is **2026-09-01T10:00:12Z**, v2's first observation: everything from v1
strictly before it, nothing from v1 after. 25 of 162 v1 instants were dropped
on that rule, and zero collisions remained.

### What was written

35 keys — 7 totals days and 28 history shards — 320,136 bytes, each read back
and checked for schema, day, count, chronological order, unique instants, and
that every point falls inside the day whose key holds it. 2026-09-01 was
recovered as **66 points** (10 reconstructed before the seam, 56 real v2
observations after it).

No interpolation, no carry-forward, no synthesised points. A gap in v1's
sampling is still a gap.

### The span this leaves

**6.28 days**, not 14. `games` retains 7 days, and the only fourteen-day value
in v1 is the top-ten metric that is not the same measurement. A truthful
fourteen-day totals history at v2 semantics did not exist to migrate. The
window fills on its own by **2026-09-09**.

### v1's state

Collection is **paused, not deleted**: the site Worker's Cron Trigger is
removed and every v1 key is intact and readable. A final manifest was captured
first — 1,172 keys, 1,166 observations spanning 2026-08-19T10:15Z to
2026-09-02T10:00Z.

The keys carry a 14-day TTL from their last write, so they expire on their own
by **2026-09-16**. Review then and delete nothing before it.
