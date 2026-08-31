/**
 * Stage A: the fifteen-minute cycle. Rankings and player counts, nothing slow.
 *
 * The single-stage collector's cost was carrying detail through a cycle that
 * never touched it. Stage A does not read the details value, does not write it,
 * and does not know its shape. Its whole working set is the sorts response and
 * the live value it produces from it.
 *
 * Steady cycle:
 *   1 subrequest  - Roblox sorts
 *   1 KV read     - totals, which also carries the hourly bookkeeping stamp, so
 *                   knowing whether history is due costs no extra read
 *   2 KV writes   - live, totals
 *
 * The hourly cycle adds the day-bucketed history append and the incremental
 * highlights update: five more reads and five more writes, all bounded values.
 */

import {
  COLLECTION_INTERVAL_MINUTES,
  HIGHLIGHT_KEEP,
  HIGHLIGHT_POINT_CAP,
  HIGHLIGHT_TOP,
  HISTORY_INTERVAL_MINUTES,
  SHARD_COUNT,
  TOTALS_POINT_CAP,
  dayKey,
  shardOf,
  type Highlights,
  type HistoryBucket,
  type Live,
  type LiveRow,
  type Ranking,
} from "./contracts";
import {
  readBucket,
  readHighlights,
  readTotals,
  writeBucket,
  writeHighlights,
  writeLive,
  writeTotals,
} from "./store";
import { SORTS_URL, getJson } from "./upstream";
import type { Env } from "../storage";

export interface StageReport {
  readonly stage: string;
  readonly outcome: "recorded" | "skipped";
  readonly detail: string | null;
  readonly subrequests: number;
  readonly kvReads: number;
  readonly kvWrites: number;
  readonly experiences: number;
  readonly hourly: boolean;
}

/** Minimal validation. Anything unrecognised is dropped rather than guessed at. */
function parseSorts(payload: unknown): {
  rankings: Ranking[];
  byRanking: Record<string, number[]>;
  rows: Map<number, LiveRow>;
} {
  const rankings: Ranking[] = [];
  const byRanking: Record<string, number[]> = {};
  const rows = new Map<number, LiveRow>();

  const sorts = (payload as { sorts?: unknown[] })?.sorts;
  if (!Array.isArray(sorts)) return { rankings, byRanking, rows };

  for (const sort of sorts) {
    const s = sort as Record<string, unknown>;
    const id = typeof s.sortId === "string" ? s.sortId : null;
    const games = Array.isArray(s.games) ? s.games : null;
    if (!id || !games || games.length === 0) continue;

    const ids: number[] = [];
    for (const game of games) {
      const g = game as Record<string, unknown>;
      const universeId = typeof g.universeId === "number" ? g.universeId : null;
      const playing = typeof g.playerCount === "number" ? g.playerCount : null;
      if (universeId === null || playing === null) continue;
      ids.push(universeId);
      if (!rows.has(universeId)) {
        rows.set(universeId, {
          i: universeId,
          r: typeof g.rootPlaceId === "number" ? g.rootPlaceId : null,
          n: typeof g.name === "string" ? g.name : String(universeId),
          p: playing,
          s: g.isSponsored === true,
        });
      }
    }
    if (ids.length === 0) continue;

    const layout = s.topicLayoutData;
    rankings.push({
      id,
      name:
        typeof layout === "object" && layout !== null
          ? String((layout as Record<string, unknown>).topicTitle ?? id)
          : typeof s.topic === "string"
            ? s.topic
            : id,
      subtitle: typeof s.subtitle === "string" ? s.subtitle : null,
      size: ids.length,
    });
    byRanking[id] = ids;
  }

  return { rankings, byRanking, rows };
}

export async function stageA(
  env: Env,
  options: { now?: number; forceHourly?: boolean } = {},
): Promise<StageReport> {
  const now = options.now ?? Date.now();
  let subrequests = 0;
  let kvReads = 0;
  let kvWrites = 0;

  const sorts = await getJson(SORTS_URL);
  subrequests += 1;
  if (!sorts.ok) {
    return {
      stage: "A", outcome: "skipped", detail: sorts.detail ?? "upstream unavailable",
      subrequests, kvReads, kvWrites, experiences: 0, hourly: false,
    };
  }

  const { rankings, byRanking, rows } = parseSorts(sorts.data);
  if (rankings.length === 0 || rows.size === 0) {
    return {
      stage: "A", outcome: "skipped", detail: "no usable rankings",
      subrequests, kvReads, kvWrites, experiences: 0, hourly: false,
    };
  }

  const experiences: Record<string, LiveRow> = {};
  let players = 0;
  for (const [universeId, row] of rows) {
    experiences[String(universeId)] = row;
    players += row.p;
  }

  const observedAt = sorts.observedAt ?? new Date(now).toISOString();
  const live: Live = {
    v: 3,
    observedAt,
    collector: {
      outcome: "recorded",
      lastRunAt: new Date(now).toISOString(),
      consecutiveFailures: 0,
      detail: null,
    },
    source: { status: "read", detail: null },
    rankings,
    defaultRanking: rankings[0]!.id,
    platform: { players, experiences: rows.size, rankings: rankings.length },
    byRanking,
    experiences,
  };

  await writeLive(env, live);
  kvWrites += 1;

  const totals = await readTotals(env);
  kvReads += 1;

  /*
   * Hourly is due from the stamp the totals value already carries, not from the
   * wall clock: a missed or retried run then produces one point at the right
   * spacing rather than a double point or a silent gap.
   */
  const dueAfter = (HISTORY_INTERVAL_MINUTES - COLLECTION_INTERVAL_MINUTES / 2) * 60_000;
  const last = totals?.lastHistoryAt ?? 0;
  const hourly = options.forceHourly === true || now - last >= dueAfter;

  if (hourly) {
    const stamp = Date.parse(observedAt);
    const day = dayKey(stamp);

    for (let n = 0; n < SHARD_COUNT; n += 1) {
      const existing = await readBucket(env, n, day);
      kvReads += 1;
      const base: HistoryBucket = existing ?? { v: 3, s: n, d: day, at: [], p: {} };
      const at = [...base.at, stamp];
      const p: Record<string, (number | null)[]> = {};

      for (const key of Object.keys(base.p)) {
        const seen = experiences[key];
        p[key] = [...base.p[key]!, seen ? seen.p : null];
      }
      for (const key of Object.keys(experiences)) {
        if (p[key] !== undefined) continue;
        if (shardOf(key) !== n) continue;
        // Padded with nulls rather than back-filled: this row was not observed
        // in the earlier hours of the day and must not claim that it was.
        p[key] = [...Array<number | null>(at.length - 1).fill(null), experiences[key]!.p];
      }

      const bucket: HistoryBucket = { v: 3, s: n, d: day, at, p };
      await writeBucket(env, n, day, bucket);
      kvWrites += 1;
    }

    // Highlights, appended rather than re-derived by scanning history.
    const stored = await readHighlights(env);
    kvReads += 1;
    const top = Object.values(experiences).sort((a, b) => b.p - a.p).slice(0, HIGHLIGHT_TOP);
    const topIds = new Set(top.map((row) => String(row.i)));

    const at = [...(stored?.at ?? []), stamp].slice(-HIGHLIGHT_POINT_CAP);
    const dropped = (stored?.at.length ?? 0) + 1 - at.length;
    const series: { id: string; name: string; players: (number | null)[] }[] = [];

    for (const line of stored?.series ?? []) {
      const seen = experiences[line.id];
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
      series.push({
        id,
        name: row.n,
        players: [...Array<number | null>(at.length - 1).fill(null), row.p],
      });
    }
    /*
     * Eviction keeps the charted twelve plus a margin, so an experience that
     * dips out of the top for an hour keeps its line instead of restarting it.
     * Evicted first are those not currently charted and quietest.
     */
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
    kvWrites += 1;
  }

  const points = [...(totals?.points ?? []), [Date.parse(observedAt), players] as const].slice(
    -TOTALS_POINT_CAP,
  );
  await writeTotals(env, {
    v: 3,
    points,
    lastHistoryAt: hourly ? Date.parse(observedAt) : last,
  });
  kvWrites += 1;

  return {
    stage: hourly ? "A2" : "A1",
    outcome: "recorded",
    detail: null,
    subrequests,
    kvReads,
    kvWrites,
    experiences: rows.size,
    hourly,
  };
}
