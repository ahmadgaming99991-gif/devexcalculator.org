/**
 * The public read endpoints. KV in, small JSON out, nothing else.
 *
 * Every handler is a read, a projection and a serialise. None sorts hundreds of
 * rows, rebuilds a history, converts a timestamp array or fetches upstream —
 * that work belongs to the collector, and putting any of it here is what would
 * put a reader request back near the 10 ms ceiling.
 */

import { HISTORY_INTERVAL_MINUTES, RETENTION_DAYS, shardOf, type ExperienceRecord } from "./contracts";
import { readCurrent, readHighlights, readShard, readTotals, type Env } from "./storage";

/**
 * Only the real site origin. No wildcard, no credentials.
 *
 * `www` is deliberately absent: it exists solely to 308 to the apex, so a page
 * served from it — and therefore a browser sending it as an Origin — is not a
 * state this site produces. Adding it would widen the policy for a case that
 * cannot occur.
 */
const ALLOWED_ORIGIN = "https://devexcalculator.org";

/**
 * Two minutes at the edge against a fifteen-minute collection cadence.
 *
 * Readers share one cached copy, so many arrivals cost one KV read rather than
 * one each, and nothing served can be more than a fraction of a cycle behind
 * what was collected. `observedAt` travels in the body regardless, so cache age
 * can never be mistaken for observation age.
 */
const CACHE_OK = "public, max-age=0, s-maxage=120, must-revalidate";
/** A failure is never stored: a cached outage outlives the outage. */
const CACHE_FAIL = "no-store";

function cors(origin: string | null): Record<string, string> {
  const allowed = origin === ALLOWED_ORIGIN;
  return {
    "access-control-allow-origin": allowed ? ALLOWED_ORIGIN : ALLOWED_ORIGIN,
    "access-control-allow-methods": "GET, HEAD, OPTIONS",
    vary: "Origin",
  };
}

function ok(body: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": CACHE_OK,
      "x-robots-tag": "noindex",
      ...cors(origin),
    },
  });
}

function fail(status: number, error: string, message: string, origin: string | null): Response {
  return new Response(JSON.stringify({ ok: false, error, message }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": CACHE_FAIL,
      "x-robots-tag": "noindex",
      ...cors(origin),
    },
  });
}

/** Freshness metadata every response carries, so the UI can always date itself. */
function meta(observedAt: string, collector: unknown) {
  return { observedAt, collector, collectionIntervalMinutes: 15 };
}

export async function handleCurrent(env: Env, url: URL, origin: string | null): Promise<Response> {
  const current = await readCurrent(env);
  if (!current) return fail(503, "no-observations", "No collected snapshot is available yet.", origin);

  const requested = url.searchParams.get("ranking");
  // The ranking id is validated against what Roblox actually returned, never
  // against a list kept in this repository — Roblox owns these ids.
  const rankingId = requested && current.byRanking[requested] ? requested : current.defaultRanking;
  const ids = current.byRanking[rankingId] ?? [];

  const rows: ExperienceRecord[] = [];
  for (const id of ids) {
    const record = current.experiences[String(id)];
    if (record) rows.push(record);
  }

  return ok(
    {
      ok: true,
      data: {
        ranking: rankingId,
        rankings: current.rankings,
        platform: current.platform,
        source: current.source,
        experiences: rows,
      },
      meta: meta(current.observedAt, current.collector),
    },
    origin,
  );
}

export async function handleTotals(env: Env, url: URL, origin: string | null): Promise<Response> {
  const totals = await readTotals(env);
  if (!totals) return fail(503, "no-observations", "No totals history is available yet.", origin);

  const days = clampDays(url.searchParams.get("days"));
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  // The points are already ascending, so this is a scan from the end rather
  // than a filter over the whole series.
  let start = totals.points.length;
  while (start > 0 && totals.points[start - 1]![0] >= cutoff) start -= 1;

  return ok(
    { ok: true, data: { days, points: totals.points.slice(start) }, meta: { collectionIntervalMinutes: 15 } },
    origin,
  );
}

export async function handleExperience(env: Env, id: string, url: URL, origin: string | null): Promise<Response> {
  const universeId = Number(id);
  if (!Number.isFinite(universeId) || universeId <= 0) {
    return fail(400, "bad-request", "An experience id must be a positive number.", origin);
  }

  // One shard, chosen deterministically. Never all of them.
  const shard = await readShard(env, shardOf(universeId));
  if (!shard) return fail(503, "no-observations", "No experience history is available yet.", origin);

  const values = shard.players[String(universeId)];
  if (!values) return fail(404, "not-found", "That experience has no recorded history.", origin);

  const days = clampDays(url.searchParams.get("days"));
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const points: [number, number][] = [];
  for (let i = 0; i < values.length; i += 1) {
    const at = shard.at[i];
    const value = values[i];
    if (at === undefined || value === null || value === undefined) continue;
    if (at < cutoff) continue;
    points.push([at, value]);
  }

  return ok(
    {
      ok: true,
      data: { universeId, name: shard.names[String(universeId)] ?? null, days, points },
      meta: { intervalMinutes: HISTORY_INTERVAL_MINUTES },
    },
    origin,
  );
}

export async function handleHighlights(env: Env, origin: string | null): Promise<Response> {
  const highlights = await readHighlights(env);
  if (!highlights) return fail(503, "no-observations", "No highlights are available yet.", origin);
  return ok({ ok: true, data: highlights, meta: { intervalMinutes: HISTORY_INTERVAL_MINUTES } }, origin);
}

export function handleOptions(origin: string | null): Response {
  return new Response(null, {
    status: 204,
    headers: { ...cors(origin), "access-control-max-age": "86400", "cache-control": "public, max-age=86400" },
  });
}

/** The ranges the UI offers. Anything else falls back rather than erroring. */
function clampDays(raw: string | null): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return RETENTION_DAYS;
  for (const allowed of [1, 3, 7, RETENTION_DAYS]) if (value === allowed) return allowed;
  return RETENTION_DAYS;
}
