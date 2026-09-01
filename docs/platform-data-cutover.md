# Cutting `/platform/` over to the data plane

Nothing in this document has been done. It is the ordered list of the steps that
remain, each with the thing that must be true before it and the thing that
proves it afterwards.

The code is complete and measured; what is left is infrastructure, and every one
of those steps is externally visible, so each is listed separately rather than
bundled into a deploy.

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
  allowed to make the request the page depends on.

## What is not yet true

The production hostname does not exist. Until step 2 lands, `/platform/` renders
its static document and the dashboard shows **"These figures could not be
loaded"** — which is the correct, honest state for a data plane that is not
reachable, and is exactly what the failure-state tests assert.

## The order, and why it is this order

### 1. Create the production KV namespace

```
wrangler kv namespace create PLATFORM_DATA
```

A **new** namespace, not the v1 collector's. The two could share one safely —
every key here carries the `platform:v2:` prefix and v1's are unprefixed — but a
separate namespace means a mistake during migration cannot reach the data the
live site is currently serving from.

**Proves it:** `wrangler kv key list` on the new namespace returns `[]`.

### 2. Deploy the data Worker to production

Change four things in `workers/platform-data/wrangler.jsonc`, and nothing in
`src/`:

1. `name` → `devexcalculator-platform-data`
2. `kv_namespaces[0].id` → the namespace from step 1
3. `routes` → `[{ "pattern": "api.devexcalculator.org", "custom_domain": true }]`
4. `triggers.crons` → `["*/5 * * * *"]`

Deploying the custom domain creates the DNS record. Do **not** add the cron in
the same deploy as the first one if the collection is to be observed cleanly —
deploy without it, confirm the endpoints answer 503 (`no-observations`), then
add it.

**Proves it:** `curl https://api.devexcalculator.org/health` returns
`hasObservations: false`; after fifteen minutes it returns an `observedAt` and
`stale: false`.

### 3. Let it collect for one full day before anything depends on it

The charts need history that does not exist yet. A day gives 96 collection
cycles, 96 history points across four shards, 24 highlight points and the first
totals rollup. Until then the dashboard will honestly report short series.

**Proves it:** `wrangler kv key list` shows `platform:v2:history:0..3:<today>`,
`platform:v2:highlights`, and one `platform:v2:totals:<yesterday>`.

**Watch:** account KV writes. During dual-run the expected total is 649/day
(v1 408 + v2 241), rising to 745 if the stock page draws every possible
`quote:last` write. The Free limit is 1,000.

### 4. Deploy the site

The site build inlines `NEXT_PUBLIC_PLATFORM_DATA_API`; the default is already
`https://api.devexcalculator.org`, so no variable needs setting for production.
A preview that should read staging sets it explicitly.

**Proves it:** `/platform/` shows a table, and the browser's network panel shows
exactly one origin beyond the site's own — `api.devexcalculator.org`.

### 5. Retire the v1 collector — a separate, later change

Not part of this cutover. Three things still read the v1 store and each needs
its own decision:

| Reader | What it does | What it needs |
|---|---|---|
| `worker/index.ts` `scheduled` | writes `obs:`, `index`, `series`, `games`, `heartbeat` | stop the cron, or leave it running as a second record |
| `/api/platform/` | serves the CSV and JSON exports linked from the page | re-point at `platform:v2:*`, or it starts exporting a frozen history |
| `/api/health/` | reports collector freshness | re-point at the data plane's own `/health` |

**The export endpoints are the one that matters to a reader.** They are linked
from the page's download section, and if v1 stops collecting while they still
read v1, the site will offer a download that silently stopped moving. Either
re-point them first or leave v1 collecting until they are.

Retiring v1 takes the account from 649 writes a day to 241.

## Rollback

Each step reverses on its own:

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
- **The v1 history is not migrated.** The two collectors record different
  shapes at different cadences, and copying one into the other would produce a
  series that is partly one measurement and partly another, drawn as one line.
  v2's charts start from v2's own first observation and say so.
