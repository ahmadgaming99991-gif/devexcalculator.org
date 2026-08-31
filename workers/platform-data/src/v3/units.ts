/**
 * One unit of work per invocation.
 *
 * The two-stage design failed on the hourly branch: Stage A's ordinary cycle
 * measured a p50 of 5.99 ms, and the same function on an hourly-due cycle
 * measured 12.35–23.15 ms, because that one invocation appended four history
 * buckets and the highlights on top of everything it already did.
 *
 * So the work is cut into units small enough that no invocation carries two of
 * them. A unit never fetches the sorts response — it reads the live value Stage
 * A already stored — which is what keeps it away from the 133 KB parse that
 * dominates Stage A's cost.
 *
 * One unit per invocation, scheduled by the minute of the hour:
 *
 *   :00,:15,:30,:45   Stage A          rankings and counts
 *   :05               history shard 0  ) each on its own invocation, so an
 *   :20               history shard 1  ) hourly append is four small writes
 *   :35               history shard 2  ) across four invocations rather than
 *   :50               history shard 3  ) one invocation doing four
 *   :10               highlights       incremental, twenty series
 *   :25,:40,:55       details          one enrichment shard, rotating
 */

import {
  HIGHLIGHT_KEEP,
  HIGHLIGHT_POINT_CAP,
  HIGHLIGHT_TOP,
  dayKey,
  shardOf,
  type Highlights,
  type HistoryBucket,
} from "./contracts";
import { readBucket, readHighlights, readLive, writeBucket, writeHighlights } from "./store";
import type { Env } from "../storage";

export interface UnitReport {
  readonly unit: string;
  readonly outcome: "recorded" | "skipped";
  readonly detail: string | null;
  readonly kvReads: number;
  readonly kvWrites: number;
  readonly items: number;
}

/** Appends this hour's point to one history shard, for one day's bucket. */
export async function historyUnit(env: Env, shard: number): Promise<UnitReport> {
  const live = await readLive(env);
  if (!live) {
    return { unit: `H${shard}`, outcome: "skipped", detail: "no live snapshot", kvReads: 1, kvWrites: 0, items: 0 };
  }

  const stamp = Date.parse(live.observedAt);
  const day = dayKey(stamp);
  const existing = await readBucket(env, shard, day);
  const base: HistoryBucket = existing ?? { v: 3, s: shard, d: day, at: [], p: {} };
  const at = [...base.at, stamp];
  const p: Record<string, (number | null)[]> = {};

  for (const key of Object.keys(base.p)) {
    const seen = live.experiences[key];
    p[key] = [...base.p[key]!, seen ? seen.p : null];
  }
  for (const key of Object.keys(live.experiences)) {
    if (p[key] !== undefined) continue;
    if (shardOf(key) !== shard) continue;
    // Padded with nulls, never back-filled: this row was not observed in the
    // earlier hours of the day and must not claim that it was.
    p[key] = [...Array<number | null>(at.length - 1).fill(null), live.experiences[key]!.p];
  }

  await writeBucket(env, shard, day, { v: 3, s: shard, d: day, at, p });
  return { unit: `H${shard}`, outcome: "recorded", detail: null, kvReads: 2, kvWrites: 1, items: Object.keys(p).length };
}

/** Appends one point to each kept highlight series. Never scans history. */
export async function highlightsUnit(env: Env): Promise<UnitReport> {
  const live = await readLive(env);
  if (!live) {
    return { unit: "HL", outcome: "skipped", detail: "no live snapshot", kvReads: 1, kvWrites: 0, items: 0 };
  }

  const stored = await readHighlights(env);
  const stamp = Date.parse(live.observedAt);
  const top = Object.values(live.experiences).sort((a, b) => b.p - a.p).slice(0, HIGHLIGHT_TOP);
  const topIds = new Set(top.map((row) => String(row.i)));

  const at = [...(stored?.at ?? []), stamp].slice(-HIGHLIGHT_POINT_CAP);
  const dropped = (stored?.at.length ?? 0) + 1 - at.length;
  const series: { id: string; name: string; players: (number | null)[] }[] = [];

  for (const line of stored?.series ?? []) {
    const seen = live.experiences[line.id];
    const next = [...line.players, seen ? seen.p : null];
    series.push({
      id: line.id,
      name: seen ? seen.n : line.name,
      players: dropped > 0 ? next.slice(dropped) : next,
    });
  }
  for (const row of top) {
    const id = String(row.i);
    if (series.some((line) => line.id === id)) continue;
    series.push({ id, name: row.n, players: [...Array<number | null>(at.length - 1).fill(null), row.p] });
  }

  const kept =
    series.length <= HIGHLIGHT_KEEP
      ? series
      : [...series]
          .sort((a, b) => {
            const ta = topIds.has(a.id) ? 1 : 0;
            const tb = topIds.has(b.id) ? 1 : 0;
            if (ta !== tb) return tb - ta;
            return (b.players[b.players.length - 1] ?? -1) - (a.players[a.players.length - 1] ?? -1);
          })
          .slice(0, HIGHLIGHT_KEEP);

  const highlights: Highlights = { v: 3, at, series: kept };
  await writeHighlights(env, highlights);
  return { unit: "HL", outcome: "recorded", detail: null, kvReads: 2, kvWrites: 1, items: kept.length };
}
