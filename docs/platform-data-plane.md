# The platform data plane

`/platform/` is a static document. Everything on it that changes is collected by
a separate Cloudflare Worker on a schedule, stored in Workers KV, and fetched by
the reader's browser after the page loads.

This document is the contract: what is stored, who writes it, how often, who
reads it, how long it lives, and how big it gets.

## Why it exists

A per-request React render of `/platform/` measured a **median of 134 ms of CPU,
p90 709 ms, max 1,271.8 ms**. The Cloudflare Workers **Free** plan terminates an
invocation at **10 ms of CPU**, which is what produced the site's `error code:
1102` responses under load — 195 of 206 sampled failures sat at exactly 10.0 ms.

Removing the render was necessary but not sufficient. A single-stage collector
in a dependency-free Worker still measured **8.27–14.96 ms**, because the cost
was never the bundle: it was JSON volume. The design below is the shape that
measurement produced, and the numbers beside each unit are per-invocation
Cloudflare measurements, not estimates.

## The rules the shape enforces

1. **No invocation carries two expensive units.** Appending the hourly history
   and the highlights inside the collection cycle measured 12.35–23.15 ms. Split
   one-per-invocation, nothing exceeds 7.25 ms.
2. **Nothing is written that was not read.** A failed upstream call writes
   nothing at all, so the previous observation survives with its own older
   timestamp rather than being replaced by zeroes.
3. **Two clocks, never one.** Rankings and player counts carry `observedAt`.
   Each enrichment row carries its own `o`. A row is never restamped with a time
   at which it was not actually refreshed.
4. **Gaps are gaps.** An hour with no observation is stored as `null` and
   dropped from the chart. Nothing is back-filled, interpolated or averaged.

## Keys

Every key carries the `platform:v2:` prefix and a `schema` field. A value whose
`schema` does not match the running build reads as **absent**, not as data, so a
rollback degrades to "no observations yet" rather than to a misparsed chart.

The v1 collector's keys (`obs:<iso>`, `index`, `series`, `games`, `heartbeat`,
`quote:last`) are unprefixed and live in a different namespace. Nothing here can
read or overwrite them.

| Key | Written by | Cadence | Read by | Retention | Size |
|---|---|---|---|---|---|
| `platform:v2:live` | collection unit | every 15 min | `/v1/platform/rankings`, `/v1/platform/totals`, `/v1/platform/experience/:id`, `/health`, and every other unit | 14 d TTL | ~32 KB at 278 experiences |
| `platform:v2:details:<0-3>` | enrichment unit | one shard hourly | `/v1/platform/rankings` | 14 d TTL | ~17–21 KB per shard |
| `platform:v2:history:<0-3>:<YYYYMMDD>` | history unit | one shard hourly | `/v1/platform/experience/:id` | 14 d TTL | grows to ~21–25 KB by the day's final hour |
| `platform:v2:highlights` | highlights unit | hourly | `/v1/platform/highlights` | 14 d TTL | ~23 KB at 20 series × 168 points |
| `platform:v2:totals:<YYYYMMDD>` | rollup unit | once per day | `/v1/platform/totals` | 14 d TTL | ~2.3 KB at 96 points |

### `platform:v2:live`

The one value a reader's first paint depends on. It carries the rankings, the
per-experience rows, and **today's platform totals** — folding that series in is
what keeps the collection cycle to a single write. A separate totals key would
be 96 more writes a day for a value that only ever changes at the same instant
this one does.

`todayDay` records which UTC day `today` belongs to, so a value carried across
midnight starts a new series rather than mixing two days. The rollup unit
archives the finished day into its own key.

### `platform:v2:details:<shard>`

Sharded because a fifty-row refresh against a single 79 KB map measured
**9.93 ms**; against one ~20 KB shard it measures **4.89 ms**. The join that
sharding pushes onto the reader turned out to be cheaper than the value it
replaced — four parallel small parses at 1.83 ms against one large parse at
2.09 ms — so nothing was traded away for it.

Rows are keyed by universe id and use short field names (`v` visits, `m`
maxPlayers, `c` creator, `cv` verified, `u`/`d` votes, `f` favourites, `g`
genre, `a` maturity, `o` refreshed-at). The stored format is the wire format:
renaming 471 rows on every read would spend the CPU this shape exists to save.

A row is dropped only when it has both left the live roster **and** aged past
the retention window. A row still in the roster is never dropped, however old.

### `platform:v2:history:<shard>:<day>`

Day-bucketed. The alternative — one value per shard covering the whole window —
is read and rewritten in full on every hourly append, measured at roughly
**888 KB of JSON per append** across four shards. A day bucket starts each day
at nothing and reaches about 25 KB by its final hour.

Sharding is deterministic (`shardOf`), so one experience's series always lives
in one shard and a single-experience request reads `days` buckets rather than
the whole matrix.

## Schedule

One `*/5 * * * *` Cron Trigger. `dispatch` chooses the unit from the wall clock;
the invariant is that **no invocation ever runs two units**.

```
:00 :15 :30 :45   collection      rankings and player counts
:05 :20 :35 :50   history 0-3     one shard's hourly point
:10               highlights      one point onto each charted series
:25               enrichment      one detail shard, rotating with the hour
:40               rollup          archives yesterday's totals when due
:55               reserved        nothing, deliberately
```

`:55` is headroom for a unit that does not exist yet. Adding one there is
cheaper than re-timing the whole schedule later.

## Measured CPU

206 scheduled invocations over ten hours on Workers Free, per-invocation figures
from `workersInvocationsAdaptive`. Zero errors, and **nothing at or above 8 ms**.

| Unit | n | min | p50 | p90 | p95 | max |
|---|---|---|---|---|---|---|
| collection | 62 | 3.72 | **4.64** | 5.39 | 5.54 | 6.38 |
| history | 60 | 0.41 | **1.34** | 1.78 | 1.94 | 4.78 |
| highlights | 14 | 1.09 | **1.28** | 2.82 | 2.83 | 2.83 |
| enrichment | 15 | 3.71 | **4.89** | 6.34 | 7.25 | 7.25 |
| rollup | 17 | 0.52 | 1.05 | 1.37 | 1.47 | 1.47 |
| idle | 18 | 0.15 | 0.22 | 0.29 | 0.32 | 0.32 |

## Write budget

The Workers KV Free tier allows **1,000 writes a day**. Counted from actual
`put()` calls, asserted in `tests/unit/platform/data-worker.test.ts`:

| Unit | Writes per run | Runs per day | Writes per day |
|---|---|---|---|
| collection | 1 | 96 | 96 |
| history | 1 | 96 | 96 |
| highlights | 1 | 24 | 24 |
| enrichment | 1 | 24 | 24 |
| rollup | 1 | 1 | 1 |
| **Total** | | | **241** |

During migration the v1 collector keeps running at **408/day** (`obs:` 96,
`index` 96, `series` 96, `heartbeat` 96, `games` 24), plus **0–96** traffic-driven
`quote:last` writes. Dual-run is therefore **649/day**, or **745/day** if the
stock page draws every possible quote write — inside the 750/day target under
both readings. After v1 is retired: **241/day**.

## The public contract

`/v1/` is the read contract and is independent of the storage schema. A stored
shape can change without moving readers to `/v2/` as long as these responses
keep their meaning.

| Endpoint | Returns | Cache | Measured |
|---|---|---|---|
| `GET /v1/platform/rankings?ranking=` | one ranking's rows with enrichment joined | `s-maxage=120` | 1.83 ms p50 |
| `GET /v1/platform/totals?days=1\|3\|7\|14` | platform totals, archive plus today | `s-maxage=120` | 1.66 ms p50 |
| `GET /v1/platform/highlights` | 20 kept series across 7 days | `s-maxage=900` | 0.97 ms p50 |
| `GET /v1/platform/experience/:id?days=` | one experience's hourly series | `s-maxage=120` | 1.41 ms p50 |
| `GET /health` | collector freshness, for monitoring | `no-store` | — |

Every failure is `no-store`, without exception: a cached outage outlives the
outage, and a 503 held at the edge for two minutes is a working site pretending
to be broken.

CORS is an allowlist of exactly `https://devexcalculator.org`. An unrecognised
origin receives **no** `Access-Control-Allow-Origin` header at all rather than a
wildcard, so the browser refuses the read instead of this Worker inventing a
permission for a site it does not serve.

## What the Worker deliberately does not have

No test endpoints. No debug routes. No secrets. No write path reachable over
HTTP. Everything stored is written by a Cron Trigger; everything served over
HTTP is a read. `POST`, `PUT`, `PATCH` and `DELETE` return 405.
