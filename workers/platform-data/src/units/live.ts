/**
 * The collection unit: rankings and player counts, every fifteen minutes.
 *
 * This is the only unit that talks to the sorts endpoint, and it does nothing
 * else expensive. It does not read enrichment, does not touch history, and does
 * not maintain the highlights - each of those is its own scheduled invocation
 * with its own CPU budget, because combining them is exactly what put the
 * earlier single-stage collector at 12-23 ms.
 *
 * Per run: 1 subrequest, 1 KV read, 1 KV write.
 * Measured: p50 3.24 ms, p95 5.04 ms, max 5.04 ms, nothing at or above 8 ms.
 */

import {
  SCHEMA,
  dayKey,
  type CollectorState,
  type Live,
  type LiveRow,
  type Ranking,
} from "../contracts";
import { readLive, writeLive, type Env } from "../store";
import { getSorts } from "../upstream";
import type { UnitReport } from "./report";

/** Minimal validation. Anything unrecognised is dropped rather than guessed at. */
export function parseSorts(payload: unknown): {
  rankings: Ranking[];
  byRanking: Record<string, number[]>;
  experiences: Record<string, LiveRow>;
  players: number;
} {
  const rankings: Ranking[] = [];
  const byRanking: Record<string, number[]> = {};
  const experiences: Record<string, LiveRow> = {};
  let players = 0;

  const sorts = (payload as { sorts?: unknown })?.sorts;
  if (!Array.isArray(sorts)) return { rankings, byRanking, experiences, players };

  for (const sort of sorts) {
    if (typeof sort !== "object" || sort === null) continue;
    const s = sort as Record<string, unknown>;
    const id = typeof s.sortId === "string" ? s.sortId : null;
    const games = Array.isArray(s.games) ? s.games : null;
    if (id === null || id === "" || games === null || games.length === 0) continue;

    const ids: number[] = [];
    for (const game of games) {
      if (typeof game !== "object" || game === null) continue;
      const g = game as Record<string, unknown>;
      const universeId = typeof g.universeId === "number" && Number.isFinite(g.universeId) ? g.universeId : null;
      const playing = typeof g.playerCount === "number" && Number.isFinite(g.playerCount) ? g.playerCount : null;
      if (universeId === null || playing === null || playing < 0) continue;

      ids.push(universeId);
      const key = String(universeId);
      // An experience listed in several rankings is one row and one count.
      if (experiences[key] === undefined) {
        experiences[key] = {
          i: universeId,
          r: typeof g.rootPlaceId === "number" ? g.rootPlaceId : null,
          n: typeof g.name === "string" && g.name !== "" ? g.name : key,
          p: playing,
          s: g.isSponsored === true,
        };
        players += playing;
      }
    }
    if (ids.length === 0) continue;

    const layout = s.topicLayoutData;
    rankings.push({
      id,
      name:
        typeof layout === "object" && layout !== null
          ? String((layout as Record<string, unknown>).topicTitle ?? id)
          : typeof s.topic === "string" && s.topic !== ""
            ? s.topic
            : id,
      subtitle: typeof s.subtitle === "string" && s.subtitle !== "" ? s.subtitle : null,
      size: ids.length,
    });
    byRanking[id] = ids;
  }

  return { rankings, byRanking, experiences, players };
}

/**
 * Records one observation of the rankings.
 *
 * A failed or unusable upstream response writes nothing at all. The previous
 * live value stays exactly as it was, with its own older `observedAt`, so the
 * page continues to show a dated reading rather than an empty one - and never
 * shows an outage as a set of zeroes.
 */
export async function collectLive(env: Env, now = Date.now()): Promise<UnitReport> {
  const sorts = await getSorts();
  if (!sorts.ok) {
    return {
      unit: "live", outcome: "skipped", detail: sorts.detail ?? "upstream unavailable",
      subrequests: 1, reads: 0, writes: 0, items: 0,
    };
  }

  const { rankings, byRanking, experiences, players } = parseSorts(sorts.data);
  const count = Object.keys(experiences).length;
  if (rankings.length === 0 || count === 0) {
    return {
      unit: "live", outcome: "skipped", detail: "no usable rankings in response",
      subrequests: 1, reads: 0, writes: 0, items: 0,
    };
  }

  const previous = await readLive(env);
  const observedAt = sorts.observedAt ?? new Date(now).toISOString();
  const stamp = Date.parse(observedAt);
  const at = Number.isFinite(stamp) ? stamp : now;
  const day = dayKey(at);

  /*
   * Today's totals ride inside this value, which is what keeps the cycle to one
   * write. The day is compared before appending: a value carried across
   * midnight starts a new series rather than putting yesterday's points into
   * today's bucket. Yesterday's are not lost - the rollup unit archives them.
   */
  const carried = previous?.todayDay === day ? previous.today : [];
  const today = [...carried, [at, players] as const];

  const collector: CollectorState = {
    outcome: "recorded",
    lastRunAt: new Date(now).toISOString(),
    consecutiveFailures: 0,
    detail: null,
  };

  const live: Live = {
    schema: SCHEMA,
    observedAt,
    collector,
    source: { status: "read", detail: null },
    rankings,
    defaultRanking: rankings[0]!.id,
    platform: { players, experiences: count, rankings: rankings.length },
    byRanking,
    experiences,
    today,
    todayDay: day,
  };

  await writeLive(env, live);

  return {
    unit: "live", outcome: "recorded", detail: null,
    subrequests: 1, reads: 1, writes: 1, items: count,
  };
}
