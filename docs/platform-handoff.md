# Platform data plane — final handoff

**Status: frozen, in production, accepted.** 2026-09-02.

This is the checkpoint for the `/platform/` refactor: what runs, what was
measured, what is deliberately unfinished, and how to undo it. For *why* each
shape was chosen see [platform-data-plane.md](platform-data-plane.md); for the
staged cutover and the migration that was performed see
[platform-data-cutover.md](platform-data-cutover.md).

## What is deployed

| | |
|---|---|
| main | `622152b` (pushed) |
| Data Worker | `cae0e992` — `devexcalculator-platform-data`, cron `*/5 * * * *` |
| Site Worker | `44fdae1e` — `devexcalculator-org`, **no cron** |

## Architecture

`/platform/` is a static document with a client-side dashboard. It makes no
Roblox request from the reader's browser and no per-request render on the
server — that render measured ~134 ms of CPU against a 10 ms plan limit and
was the source of `error code: 1102`.

- A dedicated **platform data Worker** collects on its own schedule and serves
  reads from **`api.devexcalculator.org`** (custom domain, no workers.dev).
- Storage is the **v2 KV model**: `platform:v2:*` in namespace
  `a8b623a0b4324f7bab0b61f38769c208`, one unit per invocation, one write per
  invocation.
- **`DETAIL_BATCH = 30`.**
- The **v1 collector is retired** — the site Worker's Cron Trigger is removed.
- **v1 KV is retained**, read-only, as rollback evidence.

CSP allows exactly one added origin: `connect-src 'self'
https://api.devexcalculator.org`.

## Verified performance

Accepted final verification, on Workers Free:

- latest collection **~5.40 ms**, 1 subrequest
- latest enrichment **~6.12 ms**, 2 subrequests
- **zero `exceededResources`**, zero errors

A single enrichment reached **11.94 ms** before the change, against a 10 ms
limit, while the eight runs around it sat between 4.63 and 6.81 ms. That was an
outlier rather than a trend, and `DETAIL_BATCH` 50 → 30 is the mitigation: it
lowers the ceiling without changing what enrichment does, and is pinned by a
test so moving it has to be deliberate.

## Data

- **Maturity is populated** on every row, read from the sorts payload Roblox
  actually publishes it in, interned into `Live.maturity`.
- **Totals and per-experience history were migrated** from v1 through the
  Cloudflare control plane — no Worker CPU, no Roblox request.
- **No interpolation, no carried-forward values, no synthetic points, no fake
  zeroes.** A gap in sampling is still a gap.

The migration used v1's `games` per-experience observations, **not** its
`series` value. `series` is the sum of one sort's ten rows and runs 2.33×–3.42×
below a v2 platform total at the same instants; splicing it in would have drawn
a threefold cliff at the seam. Totals were reconstructed the way v2 builds its
own, reproducing the real total to within 0.1% at 13 of 14 checkable instants.
The seam is a time — v2's first observation — not a timestamp comparison.

The historical span is therefore shorter than the retention target and **grows
into it naturally**: v1's per-experience history only reached back 7 days, so
no longer truthful window existed to migrate.

## Public contract

Unchanged, and verified in production:

- `/platform/` — 200
- `/tr/platform/` — 200
- `/api/platform/` · `?format=csv` · `?series=experiences` ·
  `?series=experiences&format=csv` — all 200

Filenames (`roblox-players-observed.csv`,
`roblox-experience-players-observed.csv`), column names and column order are
preserved by construction: the v2 adapter builds the v1 in-memory shapes and
hands them to the existing row builders.

## Quality gates at freeze

- `npm run check` — passed
- **977 tests passed, 3 skipped**, 58 suites
- E2E — **zero new failure identities** against baseline
- working tree clean, `main` pushed

## Rollback

v1 data remains readable and complete. **Do not restore the v1 collector unless
v2 has a genuine production failure** — restoring it resumes a second writer
against the same 1,000-writes-a-day account budget.

To restore: re-add the site Worker's Cron Trigger. The v1 keys, the export
fallback path in `src/app/api/platform/route.ts`, and the `PLATFORM_HISTORY`
binding are all still in place.

A final manifest of v1 at the moment collection stopped — 1,172 keys, 1,166
observations, 2026-08-19T10:15Z to 2026-09-02T10:00Z — is held outside the
tracked tree in `private/qa/local-evidence/`.

## Open, non-blocking

**The archive-before-reset path has not yet run in production.** It is covered
by six deterministic tests — a 96-point completed day, exactly two boundary
puts against one for a normal collection, one sorts subrequest, archive
read-back, idempotency in both directions, and rejection of duplicate,
malformed and foreign-day points.

The next real UTC boundary exercises it on its own. **Observe it if convenient;
it is not an unfinished gate.** If it were to fail, the symptom is a missing
`platform:v2:totals:<yesterday>` key the following morning.

The workers.dev proof that was meant to cover this did not: control-plane seeds
were written ~16 s before each run against KV's ~60 s propagation, so the Worker
read its own prior value and the branch never executed. Those numbers were
retracted rather than reported.

## Cleanup

Already done: proof cron removed, proof config deleted, the one-time capture
task unregistered, the `:40` rollup unit removed.

Left deliberately, **do not delete automatically**:

- `devexcalculator-platform-data-proof` and KV namespace
  `7eab89c7af41467f915ef4a2c6d52f7c` — both inert (no cron, no route, no
  secrets). Removable by hand later.
- **v1 KV — review 2026-09-16**, when its 14-day TTL has expired the keys on
  its own. Delete nothing before then.
