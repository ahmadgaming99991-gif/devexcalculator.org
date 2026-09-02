/**
 * The collection unit: rankings and player counts, every fifteen minutes.
 *
 * This is the only unit that talks to the sorts endpoint, and it does nothing
 * else expensive. It does not read enrichment, does not touch history, and does
 * not maintain the highlights - each of those is its own scheduled invocation
 * with its own CPU budget, because combining them is exactly what put the
 * earlier single-stage collector at 12-23 ms.
 *
 * Per run: 1 subrequest, 1 KV read, 1 KV write. The one invocation per UTC day
 * that crosses midnight is the deliberate exception: it reads the finished
 * day's archive and writes it before writing live, so 2 reads and 2 writes.
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
import { readLive, readTotals, writeLive, writeTotals, type Env } from "../store";
import { getSorts } from "../upstream";
import type { UnitReport } from "./report";

/** Minimal validation. Anything unrecognised is dropped rather than guessed at. */
export function parseSorts(payload: unknown): {
  rankings: Ranking[];
  byRanking: Record<string, number[]>;
  experiences: Record<string, LiveRow>;
  players: number;
  maturity: string[];
} {
  const rankings: Ranking[] = [];
  const byRanking: Record<string, number[]> = {};
  /*
   * Maturity is interned here rather than fetched later.
   *
   * Roblox publishes `ageRecommendationDisplayName` on every ranking row of
   * this same payload - the one Stage A already downloads. The first version of
   * this Worker dropped it here and asked the games endpoint for it instead,
   * which does not carry it, so the field was null on every row in production.
   * Reading it from the response already in hand costs no request and no write.
   */
  const maturity: string[] = [];
  const maturityIndex = new Map<string, number>();
  const experiences: Record<string, LiveRow> = {};
  let players = 0;

  const sorts = (payload as { sorts?: unknown })?.sorts;
  if (!Array.isArray(sorts)) return { rankings, byRanking, experiences, players, maturity };

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
        // Absent, empty or non-string stays null. There is no default rating:
        // a content rating nobody issued is not a rating.
        const label =
          typeof g.ageRecommendationDisplayName === "string" && g.ageRecommendationDisplayName !== ""
            ? g.ageRecommendationDisplayName
            : null;
        let a: number | null = null;
        if (label !== null) {
          const known = maturityIndex.get(label);
          if (known === undefined) {
            a = maturity.length;
            maturity.push(label);
            maturityIndex.set(label, a);
          } else {
            a = known;
          }
        }

        experiences[key] = {
          i: universeId,
          r: typeof g.rootPlaceId === "number" ? g.rootPlaceId : null,
          n: typeof g.name === "string" && g.name !== "" ? g.name : key,
          p: playing,
          s: g.isSponsored === true,
          a,
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

  return { rankings, byRanking, experiences, players, maturity };
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

  const { rankings, byRanking, experiences, players, maturity } = parseSorts(sorts.data);
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
   * today's bucket.
   */
  const rolledOver = previous !== null && previous.todayDay !== day;
  const carried = previous?.todayDay === day ? previous.today : [];
  const today = [...carried, [at, players] as const];

  /*
   * The finished day is archived here, by this invocation, before the value
   * that carries it is replaced.
   *
   * It used to be the rollup unit's job. That could not work: the rollup runs
   * at :40 and collection runs at :00, so by the time the rollup looked, this
   * unit had already replaced `today` with the new day and the finished series
   * was gone. The archive key was never written once, and 2026-09-01's points
   * were lost at the boundary - recovered only from an out-of-band capture.
   *
   * Nothing else can do it. Whichever unit resets the series is the last one
   * holding it, so that unit has to be the one that saves it. This is the sole
   * invocation per UTC day that issues two puts; every other collection is
   * still one. See docs/platform-data-cutover.md.
   */
  let archive: { day: string; points: readonly (readonly [number, number])[] } | null = null;
  if (rolledOver && previous.today.length > 0) {
    const finished = finishedDay(previous.today, previous.todayDay);
    if (finished.length > 0) archive = { day: previous.todayDay, points: finished };
  }

  let archiveReads = 0;
  let archiveWrites = 0;
  let archivedPoints = 0;
  if (archive) {
    /*
     * Read first, so a re-run cannot shrink an archive that is already right.
     * A retried or manually replayed boundary invocation arrives with the same
     * points, and an equal-or-larger existing archive is left exactly as it is.
     */
    const existing = await readTotals(env, archive.day);
    archiveReads = 1;
    if (!existing || existing.points.length < archive.points.length) {
      await writeTotals(env, archive.day, {
        schema: SCHEMA,
        day: archive.day,
        points: archive.points,
      });
      archiveWrites = 1;
      archivedPoints = archive.points.length;
    }
  }

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
    maturity,
    today,
    todayDay: day,
  };

  await writeLive(env, live);

  return {
    unit: "live",
    outcome: "recorded",
    detail: archiveWrites > 0 ? `archived ${archive!.day} (${archivedPoints} points)` : null,
    subrequests: 1,
    reads: 1 + archiveReads,
    writes: 1 + archiveWrites,
    items: count,
  };
}

/**
 * The finished day's series, validated rather than trusted.
 *
 * These points were written by this Worker, so they should already be well
 * formed - but this is the one moment they are copied into permanent storage,
 * and a malformed pair salted into an archive would outlive the value it came
 * from. Anything that is not a finite numeric pair stamped inside the day it
 * claims is dropped, duplicate instants collapse to one, and the result is
 * ascending. Nothing is added: no interpolation, no carry-forward, no
 * synthesised endpoint. A day with a gap keeps its gap.
 */
function finishedDay(
  points: readonly (readonly [number, number])[],
  day: string,
): readonly (readonly [number, number])[] {
  const byInstant = new Map<number, number>();
  for (const point of points) {
    if (!Array.isArray(point) || point.length !== 2) continue;
    const [at, players] = point;
    if (!Number.isFinite(at) || !Number.isFinite(players)) continue;
    if (dayKey(at) !== day) continue;
    byInstant.set(at, players);
  }
  return [...byInstant.entries()].sort((a, b) => a[0] - b[0]);
}
