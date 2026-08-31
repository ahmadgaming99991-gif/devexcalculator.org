/**
 * Stage A, with the fourteen-day totals value taken out of its path.
 *
 * The floor measurement settled where Stage A's CPU actually goes. Fetching the
 * Roblox sorts response and validating all of it costs 2.25-3.05 ms; Stage A
 * measured a median of 5.99. The difference is not the rankings and not the
 * detail split — it is `p3:totals`, a 31.5 KB array of 1,344 points that Stage A
 * reads and rewrites in full every fifteen minutes to append one pair to.
 *
 * So the series is day-bucketed the same way the per-experience history is.
 * Two variants are measured, because the cheaper one is also the more complex:
 *
 *   bucket - today's totals live in their own ~2.3 KB key: 1 read, 2 writes
 *   fold   - today's totals ride inside the live value: 0 reads, 1 write, and
 *            a separate once-a-day unit copies the finished day into its bucket
 *
 * Nothing here decides between them. Both are deployed and both are measured.
 */

import { dayKey, type CollectorState, type LiveRow, type Ranking } from "./contracts";
import { writeLive } from "./store";
import { SORTS_URL, getJson } from "./upstream";
import type { Env } from "../storage";

export interface LeanReport {
  readonly stage: "A-bucket" | "A-fold";
  readonly outcome: "recorded" | "skipped";
  readonly detail: string | null;
  readonly subrequests: number;
  readonly kvReads: number;
  readonly kvWrites: number;
  readonly experiences: number;
  readonly points: number;
}

interface TotalsBucket {
  readonly v: 3;
  readonly d: string;
  readonly points: readonly (readonly [number, number])[];
}

/** The live value, optionally carrying today's totals series inside it. */
interface LeanLive {
  readonly v: 3;
  readonly observedAt: string;
  readonly collector: CollectorState;
  readonly source: { readonly status: "read" | "unavailable"; readonly detail: string | null };
  readonly rankings: readonly Ranking[];
  readonly defaultRanking: string;
  readonly platform: { readonly players: number; readonly experiences: number; readonly rankings: number };
  readonly byRanking: Readonly<Record<string, readonly number[]>>;
  readonly experiences: Readonly<Record<string, LiveRow>>;
  readonly today?: readonly (readonly [number, number])[];
}

export async function stageALean(
  env: Env,
  mode: "bucket" | "fold",
): Promise<LeanReport> {
  let kvReads = 0;
  let kvWrites = 0;

  const sorts = await getJson(SORTS_URL);
  if (!sorts.ok) {
    return {
      stage: mode === "fold" ? "A-fold" : "A-bucket", outcome: "skipped",
      detail: sorts.detail ?? "upstream unavailable",
      subrequests: 1, kvReads, kvWrites, experiences: 0, points: 0,
    };
  }

  const payload = (sorts.data as { sorts?: unknown[] })?.sorts;
  const rankings: Ranking[] = [];
  const byRanking: Record<string, number[]> = {};
  const experiences: Record<string, LiveRow> = {};
  let players = 0;

  if (Array.isArray(payload)) {
    for (const sort of payload) {
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
        const key = String(universeId);
        if (experiences[key] === undefined) {
          experiences[key] = {
            i: universeId,
            r: typeof g.rootPlaceId === "number" ? g.rootPlaceId : null,
            n: typeof g.name === "string" ? g.name : key,
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
            : typeof s.topic === "string"
              ? s.topic
              : id,
        subtitle: typeof s.subtitle === "string" ? s.subtitle : null,
        size: ids.length,
      });
      byRanking[id] = ids;
    }
  }

  const count = Object.keys(experiences).length;
  if (rankings.length === 0 || count === 0) {
    return {
      stage: mode === "fold" ? "A-fold" : "A-bucket", outcome: "skipped",
      detail: "no usable rankings",
      subrequests: 1, kvReads, kvWrites, experiences: 0, points: 0,
    };
  }

  const observedAt = sorts.observedAt ?? new Date().toISOString();
  const stamp = Date.parse(observedAt);
  const day = dayKey(stamp);
  const collector: CollectorState = {
    outcome: "recorded",
    lastRunAt: new Date().toISOString(),
    consecutiveFailures: 0,
    detail: null,
  };

  let today: (readonly [number, number])[] = [];

  if (mode === "fold") {
    /*
     * The previous day's series comes back with the live value it rides in, so
     * this appends without a read of its own. The day is compared before the
     * append: a value carried over midnight would otherwise put yesterday's
     * points into today's bucket.
     */
    let previous: LeanLive | null = null;
    try {
      const value = await env.PLATFORM_V2.get("p3:lean", "json");
      if (typeof value === "object" && value !== null) previous = value as LeanLive;
    } catch {
      previous = null;
    }
    kvReads += 1;
    const carried = previous?.today ?? [];
    const sameDay = carried.length > 0 && dayKey(carried[0]![0]) === day;
    today = [...(sameDay ? carried : []), [stamp, players] as const];
  } else {
    let bucket: TotalsBucket | null = null;
    try {
      const value = await env.PLATFORM_V2.get(`p3:t:${day}`, "json");
      if (typeof value === "object" && value !== null) bucket = value as TotalsBucket;
    } catch {
      bucket = null;
    }
    kvReads += 1;
    today = [...(bucket?.points ?? []), [stamp, players] as const];
    await env.PLATFORM_V2.put(
      `p3:t:${day}`,
      JSON.stringify({ v: 3, d: day, points: today }),
      { expirationTtl: 1_209_600 },
    );
    kvWrites += 1;
  }

  const live: LeanLive = {
    v: 3,
    observedAt,
    collector,
    source: { status: "read", detail: null },
    rankings,
    defaultRanking: rankings[0]!.id,
    platform: { players, experiences: count, rankings: rankings.length },
    byRanking,
    experiences,
    ...(mode === "fold" ? { today } : {}),
  };

  if (mode === "fold") {
    await env.PLATFORM_V2.put("p3:lean", JSON.stringify(live), { expirationTtl: 1_209_600 });
  } else {
    await writeLive(env, live);
  }
  kvWrites += 1;

  return {
    stage: mode === "fold" ? "A-fold" : "A-bucket",
    outcome: "recorded",
    detail: null,
    subrequests: 1,
    kvReads,
    kvWrites,
    experiences: count,
    points: today.length,
  };
}
