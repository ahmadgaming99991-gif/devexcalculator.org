/**
 * The read endpoints for the split shape, in both candidate designs.
 *
 * Design A - the Worker joins: one request returns the selected ranking with
 * detail already merged. Simple client, two KV reads and a merge per miss.
 *
 * Design B - the browser joins: `live` returns the selected ranking without
 * detail, `details` returns the whole enrichment map once. Two requests, both
 * smaller, both independently cacheable at the edge, and the Worker never does
 * a join at all.
 *
 * Both are served here so the choice is made from measured CPU rather than from
 * a preference. Nothing else differs between them.
 */

import {
  HISTORY_DAYS,
  HISTORY_INTERVAL_MINUTES,
  RETENTION_DAYS,
  dayKeys,
  shardOf,
  type DetailRow,
  type LiveRow,
} from "./contracts";
import {
  readBucket,
  readDetailShard,
  readDetails,
  readHighlights,
  readLive,
  readTotals,
} from "./store";
import type { Env } from "../storage";

const ALLOWED_ORIGIN = "https://devexcalculator.org";
const CACHE_OK = "public, max-age=0, s-maxage=120, must-revalidate";
/** Enrichment moves on a multi-hour clock, so its copy may live far longer. */
const CACHE_SLOW = "public, max-age=0, s-maxage=900, must-revalidate";
const CACHE_FAIL = "no-store";

function headers(cache: string): Record<string, string> {
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": cache,
    "x-robots-tag": "noindex",
    "access-control-allow-origin": ALLOWED_ORIGIN,
    "access-control-allow-methods": "GET, HEAD, OPTIONS",
    vary: "Origin",
  };
}

const ok = (body: unknown, cache = CACHE_OK) =>
  new Response(JSON.stringify(body), { headers: headers(cache) });

const fail = (status: number, error: string, message: string) =>
  new Response(JSON.stringify({ ok: false, error, message }), {
    status,
    headers: headers(CACHE_FAIL),
  });

/** The ranges the UI offers. Anything else falls back rather than erroring. */
function clampDays(raw: string | null, max: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return max;
  for (const allowed of [1, 3, 7, 14]) if (value === allowed && value <= max) return allowed;
  return max;
}

function project(live: NonNullable<Awaited<ReturnType<typeof readLive>>>, requested: string | null) {
  // Validated against what Roblox actually returned, never against a list kept
  // in this repository. Roblox owns these ids.
  const ranking = requested && live.byRanking[requested] ? requested : live.defaultRanking;
  const ids = live.byRanking[ranking] ?? [];
  const rows: LiveRow[] = [];
  for (const id of ids) {
    const row = live.experiences[String(id)];
    if (row) rows.push(row);
  }
  return { ranking, rows };
}

/** Design B, part one: rankings and counts, no enrichment. */
export async function handleLive(env: Env, url: URL): Promise<Response> {
  const live = await readLive(env);
  if (!live) return fail(503, "no-observations", "No collected snapshot is available yet.");
  const { ranking, rows } = project(live, url.searchParams.get("ranking"));
  return ok({
    ok: true,
    data: {
      ranking,
      rankings: live.rankings,
      platform: live.platform,
      source: live.source,
      experiences: rows,
    },
    meta: { observedAt: live.observedAt, collector: live.collector, collectionIntervalMinutes: 15 },
  });
}

/** Design B, part two: the whole enrichment map, cached far longer. */
export async function handleDetails(env: Env): Promise<Response> {
  const details = await readDetails(env);
  if (!details) return fail(503, "no-observations", "No enrichment has been collected yet.");
  return ok({ ok: true, data: { rows: details.rows } }, CACHE_SLOW);
}

/** Design A: the same rows, joined here instead of in the browser. */
export async function handleMerged(env: Env, url: URL): Promise<Response> {
  const [live, details] = await Promise.all([readLive(env), readDetails(env)]);
  if (!live) return fail(503, "no-observations", "No collected snapshot is available yet.");
  const { ranking, rows } = project(live, url.searchParams.get("ranking"));

  const merged: (LiveRow & { x: DetailRow | null })[] = [];
  for (const row of rows) merged.push({ ...row, x: details?.rows[String(row.i)] ?? null });

  return ok({
    ok: true,
    data: {
      ranking,
      rankings: live.rankings,
      platform: live.platform,
      source: live.source,
      experiences: merged,
    },
    meta: { observedAt: live.observedAt, collector: live.collector, collectionIntervalMinutes: 15 },
  });
}

/**
 * Design A against sharded enrichment: the same join, four smaller reads.
 *
 * Sharding the enrichment map is what brought Stage B from a 9.93 ms median to
 * 4.94, because a refresh rewrites a fifth of the value rather than all of it.
 * The cost lands here instead - a merge needs every shard a ranking touches,
 * which in practice is all four - so this is measured rather than assumed.
 */
export async function handleMergedSharded(env: Env, url: URL): Promise<Response> {
  const [live, ...shards] = await Promise.all([
    readLive(env),
    readDetailShard(env, 0),
    readDetailShard(env, 1),
    readDetailShard(env, 2),
    readDetailShard(env, 3),
  ]);
  if (!live) return fail(503, "no-observations", "No collected snapshot is available yet.");
  const { ranking, rows } = project(live, url.searchParams.get("ranking"));

  const merged: (LiveRow & { x: DetailRow | null })[] = [];
  for (const row of rows) {
    const key = String(row.i);
    merged.push({ ...row, x: shards[shardOf(key)]?.rows[key] ?? null });
  }

  return ok({
    ok: true,
    data: {
      ranking,
      rankings: live.rankings,
      platform: live.platform,
      source: live.source,
      experiences: merged,
    },
    meta: { observedAt: live.observedAt, collector: live.collector, collectionIntervalMinutes: 15 },
  });
}

export async function handleTotals(env: Env, url: URL): Promise<Response> {
  const totals = await readTotals(env);
  if (!totals) return fail(503, "no-observations", "No totals history is available yet.");
  const days = clampDays(url.searchParams.get("days"), RETENTION_DAYS);
  const cutoff = Date.now() - days * 86_400_000;
  let start = totals.points.length;
  while (start > 0 && totals.points[start - 1]![0] >= cutoff) start -= 1;
  return ok({
    ok: true,
    data: { days, points: totals.points.slice(start) },
    meta: { collectionIntervalMinutes: 15 },
  });
}

/**
 * The totals series assembled from day buckets rather than one long value.
 *
 * The single 31.5 KB totals key is what put Stage A at 5.99 ms: appending one
 * pair meant reading and rewriting 1,344 points every fifteen minutes. Buckets
 * move that cost to the reader, which is the right side to pay it - a reader is
 * cached for two minutes and a collection is not cached at all.
 */
export async function handleTotalsDays(env: Env, url: URL): Promise<Response> {
  const days = clampDays(url.searchParams.get("days"), RETENTION_DAYS);
  const keys = dayKeys(Date.now(), days);
  const buckets = await Promise.all(
    keys.map(async (day) => {
      try {
        const value = await env.PLATFORM_V2.get(`p3:t:${day}`, "json");
        if (typeof value === "object" && value !== null) {
          const points = (value as { points?: unknown }).points;
          if (Array.isArray(points)) return points as [number, number][];
        }
      } catch {
        // A bucket that cannot be read is a gap in the chart, not an error page.
      }
      return null;
    }),
  );

  const points: [number, number][] = [];
  for (const bucket of buckets) if (bucket) for (const point of bucket) points.push(point);
  if (points.length === 0) {
    return fail(503, "no-observations", "No totals history is available yet.");
  }

  return ok({
    ok: true,
    data: { days, points },
    meta: { collectionIntervalMinutes: 15 },
  });
}

export async function handleHighlights(env: Env): Promise<Response> {
  const highlights = await readHighlights(env);
  if (!highlights) return fail(503, "no-observations", "No highlights are available yet.");
  return ok({ ok: true, data: highlights, meta: { intervalMinutes: HISTORY_INTERVAL_MINUTES } });
}

/**
 * One experience's history, assembled from that experience's own shard.
 *
 * Reads only the day buckets the requested window covers, and only for the one
 * shard the id hashes to, so the cost scales with the window rather than with
 * the number of experiences on the platform.
 */
export async function handleExperience(env: Env, id: string, url: URL): Promise<Response> {
  const universeId = Number(id);
  if (!Number.isFinite(universeId) || universeId <= 0) {
    return fail(400, "bad-request", "An experience id must be a positive number.");
  }

  const days = clampDays(url.searchParams.get("days"), HISTORY_DAYS);
  const shard = shardOf(universeId);
  const key = String(universeId);
  const buckets = await Promise.all(
    dayKeys(Date.now(), days).map((day) => readBucket(env, shard, day)),
  );

  const points: [number, number][] = [];
  for (const bucket of buckets) {
    if (!bucket) continue;
    const values = bucket.p[key];
    if (!values) continue;
    for (let i = 0; i < values.length; i += 1) {
      const at = bucket.at[i];
      const value = values[i];
      if (at === undefined || value === null || value === undefined) continue;
      points.push([at, value]);
    }
  }

  if (points.length === 0) {
    return fail(404, "not-found", "That experience has no recorded history.");
  }

  return ok({
    ok: true,
    data: { universeId, days, points },
    meta: { intervalMinutes: HISTORY_INTERVAL_MINUTES },
  });
}

export function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": ALLOWED_ORIGIN,
      "access-control-allow-methods": "GET, HEAD, OPTIONS",
      "access-control-max-age": "86400",
      vary: "Origin",
      "cache-control": "public, max-age=86400",
    },
  });
}
