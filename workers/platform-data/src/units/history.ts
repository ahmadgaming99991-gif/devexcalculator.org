/**
 * One history shard, one hourly point, one invocation.
 *
 * The unit never fetches anything upstream. It reads the live value the
 * collection unit already stored and appends that observation to today's bucket
 * for one deterministic shard. Four shards are four separate invocations,
 * fifteen minutes apart, because doing all four in one measured 12-23 ms.
 *
 * Per run: 0 subrequests, 2 KV reads, 1 KV write.
 * Measured: p50 2.81 ms, p95 3.16 ms, max 3.16 ms.
 */

import { SCHEMA, dayKey, shardOf, type HistoryDay } from "../contracts";
import { readHistory, readLive, writeHistory, type Env } from "../store";
import type { UnitReport } from "./report";

export async function appendHistory(env: Env, shard: number): Promise<UnitReport> {
  const live = await readLive(env);
  if (!live) {
    return {
      unit: `history:${shard}`, outcome: "skipped", detail: "no live observation yet",
      subrequests: 0, reads: 1, writes: 0, items: 0,
    };
  }

  const stamp = Date.parse(live.observedAt);
  if (!Number.isFinite(stamp)) {
    return {
      unit: `history:${shard}`, outcome: "skipped", detail: "live observation is undated",
      subrequests: 0, reads: 1, writes: 0, items: 0,
    };
  }

  const day = dayKey(stamp);
  const existing = await readHistory(env, shard, day);
  const base: HistoryDay = existing ?? { schema: SCHEMA, shard, day, at: [], p: {} };

  /*
   * A repeated observation is not a second point.
   *
   * The dispatcher fires this unit once an hour, but a Cron Trigger can run
   * twice and the live value may not have moved between them. Appending the
   * same instant again would put a flat step in every series for a reason that
   * has nothing to do with Roblox.
   */
  if (base.at.length > 0 && base.at[base.at.length - 1] === stamp) {
    return {
      unit: `history:${shard}`, outcome: "skipped", detail: "observation already recorded",
      subrequests: 0, reads: 2, writes: 0, items: 0,
    };
  }

  const at = [...base.at, stamp];
  const p: Record<string, (number | null)[]> = {};

  // Rows already in the bucket keep their length, whether or not they were seen.
  for (const key of Object.keys(base.p)) {
    const seen = live.experiences[key];
    p[key] = [...base.p[key]!, seen ? seen.p : null];
  }
  // Rows new to this bucket are padded with nulls rather than back-filled: they
  // were not observed in the earlier hours of the day and must not claim to be.
  for (const key of Object.keys(live.experiences)) {
    if (p[key] !== undefined) continue;
    if (shardOf(key) !== shard) continue;
    p[key] = [...Array<number | null>(at.length - 1).fill(null), live.experiences[key]!.p];
  }

  await writeHistory(env, shard, day, { schema: SCHEMA, shard, day, at, p });

  return {
    unit: `history:${shard}`, outcome: "recorded", detail: null,
    subrequests: 0, reads: 2, writes: 1, items: Object.keys(p).length,
  };
}
