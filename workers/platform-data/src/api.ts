/**
 * The public read contract. KV in, small JSON out, nothing else.
 *
 * No handler here fetches upstream, sorts hundreds of rows, or rebuilds a
 * history. That work belongs to the scheduled units, and putting any of it here
 * is what would put a reader request back near the CPU ceiling. Measured, the
 * heaviest response on this surface is 2.16 ms.
 *
 * ## Versioning
 *
 * `/v1/` is the contract, and it is independent of the storage schema. A stored
 * shape can change without moving readers to `/v2/` as long as these responses
 * keep their meaning; a change that breaks a reader gets a new prefix.
 *
 * ## Caching
 *
 * Successful responses are cacheable at the edge for a fraction of the
 * collection interval, so many arrivals cost one KV read rather than one each.
 * Failures are `no-store` without exception: a cached outage outlives the
 * outage, and a 503 held for two minutes is a working site pretending to be
 * broken. Every response carries its own `observedAt` in the body, so cache age
 * can never be mistaken for observation age.
 */

import {
  COLLECTION_INTERVAL_MINUTES,
  HISTORY_DAYS,
  HISTORY_INTERVAL_MINUTES,
  RETENTION_DAYS,
  SHARD_COUNT,
  dayKey,
  dayKeys,
  shardOf,
  type DetailRow,
  type LiveRow,
} from "./contracts";
import { readDetails, readHighlights, readHistory, readLive, readTotals, type Env } from "./store";

/**
 * The one origin allowed to read this from a browser.
 *
 * No wildcard and no credentials. `www` is deliberately absent: it exists only
 * to redirect to the apex, so a page served from it - and therefore a browser
 * sending it as an `Origin` - is not a state this site produces.
 */
export const ALLOWED_ORIGINS = ["https://devexcalculator.org"] as const;

const CACHE_LIVE = "public, max-age=0, s-maxage=120, must-revalidate";
const CACHE_SLOW = "public, max-age=0, s-maxage=900, must-revalidate";
/** A failure is never stored. */
const CACHE_FAIL = "no-store";

function cors(origin: string | null): Record<string, string> {
  const allowed = origin !== null && (ALLOWED_ORIGINS as readonly string[]).includes(origin);
  return {
    // Echoed only when it matches. An unrecognised origin gets no allow header
    // at all, so the browser refuses the read rather than this Worker inventing
    // a permission for a site it does not serve.
    ...(allowed ? { "access-control-allow-origin": origin } : {}),
    "access-control-allow-methods": "GET, HEAD, OPTIONS",
    vary: "Origin",
  };
}

function headers(cache: string, origin: string | null): Record<string, string> {
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": cache,
    "x-robots-tag": "noindex",
    ...cors(origin),
  };
}

const ok = (body: unknown, origin: string | null, cache = CACHE_LIVE) =>
  new Response(JSON.stringify(body), { headers: headers(cache, origin) });

const fail = (status: number, error: string, message: string, origin: string | null) =>
  new Response(JSON.stringify({ ok: false, error, message }), {
    status,
    headers: headers(CACHE_FAIL, origin),
  });

/** The ranges the dashboard offers. Anything else falls back rather than erroring. */
function clampDays(raw: string | null, max: number): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return max;
  for (const allowed of [1, 3, 7, 14]) if (value === allowed && value <= max) return allowed;
  return max;
}

/** Freshness metadata every response carries, so the UI can always date itself. */
function meta(observedAt: string, collector: unknown) {
  return {
    observedAt,
    collector,
    collectionIntervalMinutes: COLLECTION_INTERVAL_MINUTES,
    historyIntervalMinutes: HISTORY_INTERVAL_MINUTES,
  };
}

/**
 * One ranking's rows, with enrichment joined here rather than in the browser.
 *
 * Measured at 1.83 ms median against 2.09 for a single unsharded enrichment
 * value: four parallel 20 KB parses beat one 79 KB parse. The alternative -
 * shipping the whole 80 KB enrichment map to every reader and joining it there -
 * costs the reader four times the bytes to save the Worker nothing.
 */
export async function handleRankings(env: Env, url: URL, origin: string | null): Promise<Response> {
  const [live, ...shards] = await Promise.all([
    readLive(env),
    ...Array.from({ length: SHARD_COUNT }, (_, n) => readDetails(env, n)),
  ]);

  if (!live) {
    return fail(503, "no-observations", "No observation has been collected yet.", origin);
  }

  // Validated against what Roblox actually returned, never against a list kept
  // in this repository. Roblox owns these ids.
  const requested = url.searchParams.get("ranking");
  const ranking = requested !== null && live.byRanking[requested] ? requested : live.defaultRanking;
  const ids = live.byRanking[ranking] ?? [];

  const experiences: (LiveRow & { x: DetailRow | null })[] = [];
  for (const id of ids) {
    const key = String(id);
    const row = live.experiences[key];
    if (!row) continue;
    experiences.push({ ...row, x: shards[shardOf(key)]?.rows[key] ?? null });
  }

  return ok(
    {
      ok: true,
      data: {
        ranking,
        rankings: live.rankings,
        platform: live.platform,
        source: live.source,
        experiences,
      },
      meta: meta(live.observedAt, live.collector),
    },
    origin,
  );
}

/**
 * The platform totals series, assembled from day buckets plus today.
 *
 * Today's points come from the live value, which is where the collection unit
 * leaves them; the finished days come from their own keys. A day that cannot be
 * read is a gap in the chart, not an error page.
 */
export async function handleTotals(env: Env, url: URL, origin: string | null): Promise<Response> {
  const days = clampDays(url.searchParams.get("days"), RETENTION_DAYS);
  const now = Date.now();
  const today = dayKey(now);
  const wanted = dayKeys(now, days);

  const [live, ...archived] = await Promise.all([
    readLive(env),
    ...wanted.filter((day) => day !== today).map((day) => readTotals(env, day)),
  ]);

  const points: (readonly [number, number])[] = [];
  for (const bucket of archived) if (bucket) for (const point of bucket.points) points.push(point);
  if (live && live.todayDay === today) for (const point of live.today) points.push(point);

  if (points.length === 0) {
    return fail(503, "no-observations", "No totals history is available yet.", origin);
  }

  points.sort((a, b) => a[0] - b[0]);
  return ok(
    {
      ok: true,
      data: { days, points },
      meta: {
        observedAt: live?.observedAt ?? null,
        collectionIntervalMinutes: COLLECTION_INTERVAL_MINUTES,
        retentionDays: RETENTION_DAYS,
      },
    },
    origin,
  );
}

/** The pre-derived charted series. One read, no assembly. */
export async function handleHighlights(env: Env, origin: string | null): Promise<Response> {
  const highlights = await readHighlights(env);
  if (!highlights) {
    return fail(503, "no-observations", "No charted history is available yet.", origin);
  }
  return ok(
    {
      ok: true,
      data: { at: highlights.at, series: highlights.series },
      meta: { intervalMinutes: HISTORY_INTERVAL_MINUTES, days: HISTORY_DAYS },
    },
    origin,
    CACHE_SLOW,
  );
}

/**
 * One experience's history, from that experience's own shard.
 *
 * Reads only the day buckets the requested window covers, and only the one
 * shard the id hashes to, so the cost scales with the window rather than with
 * the number of experiences on the platform.
 */
export async function handleExperience(
  env: Env,
  id: string,
  url: URL,
  origin: string | null,
): Promise<Response> {
  const universeId = Number(id);
  if (!Number.isFinite(universeId) || universeId <= 0 || !Number.isInteger(universeId)) {
    return fail(400, "bad-request", "An experience id must be a positive whole number.", origin);
  }

  const days = clampDays(url.searchParams.get("days"), HISTORY_DAYS);
  const shard = shardOf(universeId);
  const key = String(universeId);

  const [live, ...buckets] = await Promise.all([
    readLive(env),
    ...dayKeys(Date.now(), days).map((day) => readHistory(env, shard, day)),
  ]);

  const points: [number, number][] = [];
  for (const bucket of buckets) {
    if (!bucket) continue;
    const values = bucket.p[key];
    if (!values) continue;
    for (let i = 0; i < values.length; i += 1) {
      const at = bucket.at[i];
      const value = values[i];
      // A null is "not observed at this hour" and is dropped rather than drawn
      // as a zero: the chart shows a gap, which is what happened.
      if (at === undefined || value === null || value === undefined) continue;
      points.push([at, value]);
    }
  }

  if (points.length === 0) {
    return fail(404, "not-found", "That experience has no recorded history.", origin);
  }

  return ok(
    {
      ok: true,
      data: { universeId, name: live?.experiences[key]?.n ?? null, days, points },
      meta: { intervalMinutes: HISTORY_INTERVAL_MINUTES, days: HISTORY_DAYS },
    },
    origin,
  );
}

/**
 * Whether the collector is keeping up, for monitoring rather than for readers.
 *
 * Never cached, and never fails: a monitor needs the answer even when the
 * answer is that nothing has been collected.
 */
export async function handleHealth(env: Env, origin: string | null): Promise<Response> {
  const live = await readLive(env);
  const observedAt = live ? Date.parse(live.observedAt) : NaN;
  const ageMinutes = Number.isFinite(observedAt) ? Math.round((Date.now() - observedAt) / 60_000) : null;
  // A missed run is a hiccup; four in a row is a pattern worth reporting.
  const stale = ageMinutes === null || ageMinutes > COLLECTION_INTERVAL_MINUTES * 4;

  return new Response(
    JSON.stringify({
      ok: true,
      data: {
        hasObservations: live !== null,
        observedAt: live?.observedAt ?? null,
        ageMinutes,
        stale,
        collector: live?.collector ?? null,
        experiences: live?.platform.experiences ?? 0,
      },
    }),
    { headers: headers(CACHE_FAIL, origin) },
  );
}

export function handleOptions(origin: string | null): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...cors(origin),
      "access-control-max-age": "86400",
      "cache-control": "public, max-age=86400",
    },
  });
}

export function handleNotFound(origin: string | null): Response {
  return fail(404, "not-found", "No such endpoint.", origin);
}

export function handleMethodNotAllowed(): Response {
  return new Response(null, { status: 405, headers: { allow: "GET, HEAD, OPTIONS", "cache-control": CACHE_FAIL } });
}
