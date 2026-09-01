/**
 * Archives a finished day of platform totals into its own key.
 *
 * Today's totals live inside the live value, which is what keeps the collection
 * cycle to one write. That series has to go somewhere when the day ends, or the
 * fourteen-day chart would only ever have today in it.
 *
 * The unit is idempotent and cheap: it runs shortly after midnight UTC, copies
 * whatever day the live value is still carrying if that day is over, and writes
 * nothing at all if the archive already holds at least as many points. Running
 * it twice, or missing it and catching up on the next hour, both end the same
 * way.
 *
 * Per run: 0 subrequests, 2 KV reads, 0 or 1 KV write.
 */

import { SCHEMA, dayKey } from "../contracts";
import { readLive, readTotals, writeTotals, type Env } from "../store";
import type { UnitReport } from "./report";

export async function rollUpTotals(env: Env, now = Date.now()): Promise<UnitReport> {
  const live = await readLive(env);
  if (!live) {
    return { unit: "rollup", outcome: "skipped", detail: "no live observation yet", subrequests: 0, reads: 1, writes: 0, items: 0 };
  }

  const day = live.todayDay;
  if (day === dayKey(now)) {
    return { unit: "rollup", outcome: "skipped", detail: "day is still in progress", subrequests: 0, reads: 1, writes: 0, items: 0 };
  }
  if (live.today.length === 0) {
    return { unit: "rollup", outcome: "skipped", detail: "nothing carried to archive", subrequests: 0, reads: 1, writes: 0, items: 0 };
  }

  const existing = await readTotals(env, day);
  if (existing && existing.points.length >= live.today.length) {
    return { unit: "rollup", outcome: "skipped", detail: "already archived", subrequests: 0, reads: 2, writes: 0, items: existing.points.length };
  }

  await writeTotals(env, day, { schema: SCHEMA, day, points: live.today });

  return {
    unit: "rollup", outcome: "recorded", detail: null,
    subrequests: 0, reads: 2, writes: 1, items: live.today.length,
  };
}
