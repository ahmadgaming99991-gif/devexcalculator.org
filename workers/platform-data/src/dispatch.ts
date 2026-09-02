/**
 * One trigger, one unit per invocation.
 *
 * A single `*&#47;5 * * * *` Cron Trigger fires twelve times an hour and this
 * decides which unit that invocation runs. The invariant it exists to enforce:
 * **no invocation ever carries two expensive units.** Combining the hourly
 * history append with the collection cycle measured 12.35-23.15 ms against a
 * 10 ms plan limit; run separately, the same work is under 6 ms per unit.
 *
 *   :00 :15 :30 :45   collection      rankings and player counts
 *   :05 :20 :35 :50   history 0-3     one shard's hourly point
 *   :10               highlights      one point onto each charted series
 *   :25               enrichment      one detail shard, rotating
 *   :40 :55           reserved        nothing, deliberately
 *
 * The enrichment shard and the history shard both advance with the hour, so a
 * full sweep of four shards takes four hours for enrichment and one hour for
 * history. `:40` and `:55` are left empty on purpose: they are the headroom for
 * a unit that has not been written yet, and adding one there is cheaper than
 * re-timing the whole schedule later.
 *
 * `:40` used to hold a rollup unit that archived the finished day's totals. It
 * could never do that. Collection runs at :00 and replaces the series the
 * rollup came to read, so the rollup arrived every day to find the day already
 * in progress and skipped - it archived nothing, ever. The archive now happens
 * inside the collection unit at the moment of the reset, which is the only
 * place that still holds the finished day. See units/live.ts.
 */

import { SHARD_COUNT } from "./contracts";
import { describeError, log } from "./log";
import { refreshDetails } from "./units/enrichment";
import { appendHighlights } from "./units/highlights";
import { appendHistory } from "./units/history";
import { collectLive } from "./units/live";
import type { UnitReport } from "./units/report";
import type { Env } from "./store";

/** Which unit a given wall-clock instant belongs to. Exported so it is testable. */
export function unitFor(at: Date): { kind: string; shard: number } | null {
  const minute = at.getUTCMinutes();
  const hour = at.getUTCHours();

  // Cron fires at five-minute boundaries; anything else is a manual invocation
  // and gets the same answer the schedule would have given it.
  const slot = Math.floor(minute / 5) * 5;

  switch (slot) {
    case 0:
    case 15:
    case 30:
    case 45:
      return { kind: "live", shard: 0 };
    case 5:
      return { kind: "history", shard: hour % SHARD_COUNT };
    case 20:
      return { kind: "history", shard: (hour + 1) % SHARD_COUNT };
    case 35:
      return { kind: "history", shard: (hour + 2) % SHARD_COUNT };
    case 50:
      return { kind: "history", shard: (hour + 3) % SHARD_COUNT };
    case 10:
      return { kind: "highlights", shard: 0 };
    case 25:
      return { kind: "enrichment", shard: hour % SHARD_COUNT };
    default:
      return null;
  }
}

/**
 * Runs the unit this instant belongs to.
 *
 * Nothing propagates. A unit that throws is reported as `failed` and logged,
 * because a scheduled handler that rejects is retried by Cloudflare, and a
 * retry into a deterministic fault is load without a chance of succeeding.
 */
export async function dispatch(env: Env, at = new Date()): Promise<UnitReport> {
  const chosen = unitFor(at);
  if (!chosen) {
    return { unit: "idle", outcome: "skipped", detail: "no unit scheduled", subrequests: 0, reads: 0, writes: 0, items: 0 };
  }

  const started = Date.now();
  try {
    let report: UnitReport;
    switch (chosen.kind) {
      case "live":
        report = await collectLive(env);
        break;
      case "history":
        report = await appendHistory(env, chosen.shard);
        break;
      case "highlights":
        report = await appendHighlights(env);
        break;
      case "enrichment":
        report = await refreshDetails(env, chosen.shard);
        break;
      default:
        // `unitFor` is the only source of `kind`, so this is unreachable unless
        // a slot is added there without a branch here. Recording it beats
        // silently running the wrong unit.
        report = {
          unit: chosen.kind, outcome: "failed", detail: "no handler for unit",
          subrequests: 0, reads: 0, writes: 0, items: 0,
        };
        break;
    }

    log.info({
      event: "unit.finished",
      unit: report.unit,
      outcome: report.outcome,
      detail: report.detail,
      ms: Date.now() - started,
      reads: report.reads,
      writes: report.writes,
      subrequests: report.subrequests,
      items: report.items,
    });
    return report;
  } catch (error) {
    const detail = describeError(error);
    log.error({ event: "unit.threw", unit: chosen.kind, outcome: "failed", detail, ms: Date.now() - started });
    return { unit: chosen.kind, outcome: "failed", detail, subrequests: 0, reads: 0, writes: 0, items: 0 };
  }
}
