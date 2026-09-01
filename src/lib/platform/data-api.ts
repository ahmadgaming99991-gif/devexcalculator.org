/**
 * The browser's contract with the platform data plane.
 *
 * `/platform/` is a static document. Everything on it that changes is fetched
 * from a separate, tiny Worker after the page has loaded — not rendered on the
 * server, because a React render of this page measured a median of 134 ms of
 * CPU and the Workers Free plan terminates an invocation at 10 ms. The data
 * Worker answers the same requests in under 3 ms.
 *
 * This module is imported by a Client Component, so it carries no dependencies,
 * no dictionary and no server-only import. It parses defensively: a response
 * that is not the shape below is treated as no data, because a dashboard that
 * renders `undefined` is worse than one that says it could not load.
 */

/**
 * Where the data Worker lives.
 *
 * Inlined at build time. It is configurable so a preview build can point at a
 * staging deployment without a code change, and it has a default so a missing
 * variable produces a page that fails honestly against the real hostname rather
 * than one that fetches `undefined`.
 */
export const PLATFORM_API_BASE =
  process.env.NEXT_PUBLIC_PLATFORM_DATA_API ?? "https://api.devexcalculator.org";

/** How long the browser waits before calling a request failed. */
const TIMEOUT_MS = 8_000;

/*
 * The cadences the page describes, in one place.
 *
 * Copied from the data Worker's own contracts rather than imported: the two
 * deploy separately, and a page that imported the Worker's source would drag a
 * second module graph into the site bundle to read four numbers. They are
 * asserted against the Worker's published `meta` in the dashboard, which is
 * what catches a drift.
 */
export const COLLECTION_INTERVAL_MINUTES = 15;
export const HISTORY_INTERVAL_MINUTES = 60;
/** How far back per-experience history reaches. */
export const HISTORY_DAYS = 7;
/** How long the platform totals series is kept. */
export const RETENTION_DAYS = 14;

/** One of Roblox's published rankings, exactly as Roblox labelled it. */
export interface ApiRanking {
  readonly id: string;
  readonly name: string;
  readonly subtitle: string | null;
  readonly size: number;
}

/** Slow-changing metadata, on its own refresh clock. Absent when never read. */
export interface ApiDetail {
  readonly v: number | null;
  readonly m: number | null;
  readonly c: string | null;
  readonly cv: boolean;
  readonly u: number | null;
  readonly d: number | null;
  readonly f: number | null;
  readonly g: string | null;
  readonly a: string | null;
  /** When this row's metadata was last refreshed. Never the ranking's time. */
  readonly o: string;
}

export interface ApiExperience {
  readonly i: number;
  readonly r: number | null;
  readonly n: string;
  readonly p: number;
  readonly s: boolean;
  /**
   * Roblox's maturity label, already resolved by the Worker.
   *
   * It sits on the row rather than inside `x` because it travels on the
   * player-count clock, not the hourly metadata one - it comes from the same
   * response as the player count. Reading it from `x` would both hide it on a
   * row nobody has enriched yet and imply, through `detailsRefreshed`, that it
   * is hours older than it is.
   */
  readonly a: string | null;
  readonly x: ApiDetail | null;
}

export interface ApiCollector {
  readonly outcome: string;
  readonly lastRunAt: string;
  readonly consecutiveFailures: number;
  readonly detail: string | null;
}

export interface RankingsPayload {
  readonly ranking: string;
  readonly rankings: readonly ApiRanking[];
  readonly platform: { readonly players: number; readonly experiences: number; readonly rankings: number };
  readonly source: { readonly status: string; readonly detail: string | null };
  readonly experiences: readonly ApiExperience[];
  readonly observedAt: string;
  readonly collector: ApiCollector | null;
  readonly collectionIntervalMinutes: number;
}

export interface SeriesPayload {
  readonly days: number;
  readonly points: readonly (readonly [number, number])[];
  readonly observedAt: string | null;
}

export interface HighlightsPayload {
  readonly at: readonly number[];
  readonly series: readonly {
    readonly id: string;
    readonly name: string;
    readonly players: readonly (number | null)[];
  }[];
  readonly intervalMinutes: number;
}

export interface ExperiencePayload {
  readonly universeId: number;
  readonly name: string | null;
  readonly days: number;
  readonly points: readonly (readonly [number, number])[];
}

/**
 * Why a request produced nothing.
 *
 * `empty` is a working data plane with nothing collected yet, and `offline` is
 * a data plane that could not be reached. The dashboard says different things
 * for the two, because they are different facts about the site.
 */
export type ApiFailure = { readonly kind: "empty" | "offline" | "not-found"; readonly status: number | null };

export type ApiResult<T> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: ApiFailure };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/**
 * The caller's abort signal and the timeout, combined where the browser can.
 *
 * `AbortSignal.any` is recent - Safari 17.4, Firefox 124 - and an older browser
 * throws on it. Reaching that `throw` inside the request would have been caught
 * and reported to the reader as "could not be loaded", which is a false
 * statement about a data plane that is working perfectly. Older browsers get
 * the caller's signal and lose only the client-side timeout.
 */
function combine(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal | undefined {
  if (typeof AbortSignal.timeout !== "function") return signal;
  const timeout = AbortSignal.timeout(timeoutMs);
  if (signal === undefined) return timeout;
  return typeof AbortSignal.any === "function" ? AbortSignal.any([signal, timeout]) : signal;
}

async function get(path: string, signal?: AbortSignal): Promise<ApiResult<Record<string, unknown>>> {
  let response: Response;
  try {
    response = await fetch(`${PLATFORM_API_BASE}${path}`, {
      signal: combine(signal, TIMEOUT_MS),
      headers: { accept: "application/json" },
    });
  } catch {
    return { ok: false, error: { kind: "offline", status: null } };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: {
        // 503 is the data plane saying "nothing collected yet", which is a
        // truthful state and not an outage. 404 is a series that has no
        // recorded history. Everything else is a failure to reach the data.
        kind: response.status === 503 ? "empty" : response.status === 404 ? "not-found" : "offline",
        status: response.status,
      },
    };
  }

  try {
    const body: unknown = await response.json();
    if (!isObject(body) || body.ok !== true || !isObject(body.data)) {
      return { ok: false, error: { kind: "offline", status: response.status } };
    }
    return { ok: true, data: { ...body.data, ...(isObject(body.meta) ? { $meta: body.meta } : {}) } };
  } catch {
    return { ok: false, error: { kind: "offline", status: response.status } };
  }
}

function metaOf(data: Record<string, unknown>): Record<string, unknown> {
  return isObject(data.$meta) ? data.$meta : {};
}

function pairs(value: unknown): (readonly [number, number])[] {
  if (!Array.isArray(value)) return [];
  const out: [number, number][] = [];
  for (const entry of value) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const [at, count] = entry as [unknown, unknown];
    if (typeof at !== "number" || typeof count !== "number") continue;
    if (!Number.isFinite(at) || !Number.isFinite(count)) continue;
    out.push([at, count]);
  }
  return out;
}

export async function fetchRankings(
  ranking: string | null,
  signal?: AbortSignal,
): Promise<ApiResult<RankingsPayload>> {
  const query = ranking ? `?ranking=${encodeURIComponent(ranking)}` : "";
  const result = await get(`/v1/platform/rankings${query}`, signal);
  if (!result.ok) return result;

  const data = result.data;
  const meta = metaOf(data);
  const experiences = Array.isArray(data.experiences) ? (data.experiences as ApiExperience[]) : [];
  const rankings = Array.isArray(data.rankings) ? (data.rankings as ApiRanking[]) : [];
  const platform = isObject(data.platform) ? data.platform : {};
  const observedAt = typeof meta.observedAt === "string" ? meta.observedAt : "";

  if (typeof data.ranking !== "string" || observedAt === "") {
    return { ok: false, error: { kind: "offline", status: null } };
  }

  return {
    ok: true,
    data: {
      ranking: data.ranking,
      rankings,
      platform: {
        players: typeof platform.players === "number" ? platform.players : 0,
        experiences: typeof platform.experiences === "number" ? platform.experiences : 0,
        rankings: typeof platform.rankings === "number" ? platform.rankings : rankings.length,
      },
      source: isObject(data.source)
        ? {
            status: typeof data.source.status === "string" ? data.source.status : "unavailable",
            detail: typeof data.source.detail === "string" ? data.source.detail : null,
          }
        : { status: "unavailable", detail: null },
      experiences,
      observedAt,
      collector: isObject(meta.collector) ? (meta.collector as unknown as ApiCollector) : null,
      collectionIntervalMinutes:
        typeof meta.collectionIntervalMinutes === "number" ? meta.collectionIntervalMinutes : 15,
    },
  };
}

export async function fetchTotals(days: number, signal?: AbortSignal): Promise<ApiResult<SeriesPayload>> {
  const result = await get(`/v1/platform/totals?days=${days}`, signal);
  if (!result.ok) return result;
  const meta = metaOf(result.data);
  return {
    ok: true,
    data: {
      days: typeof result.data.days === "number" ? result.data.days : days,
      points: pairs(result.data.points),
      observedAt: typeof meta.observedAt === "string" ? meta.observedAt : null,
    },
  };
}

export async function fetchHighlights(signal?: AbortSignal): Promise<ApiResult<HighlightsPayload>> {
  const result = await get("/v1/platform/highlights", signal);
  if (!result.ok) return result;
  const meta = metaOf(result.data);
  const at = Array.isArray(result.data.at) ? (result.data.at as number[]).filter((v) => typeof v === "number") : [];
  const series = Array.isArray(result.data.series)
    ? (result.data.series as HighlightsPayload["series"]).filter(
        (entry) => isObject(entry) && typeof entry.id === "string" && Array.isArray(entry.players),
      )
    : [];
  return {
    ok: true,
    data: { at, series, intervalMinutes: typeof meta.intervalMinutes === "number" ? meta.intervalMinutes : 60 },
  };
}

export async function fetchExperience(
  universeId: number,
  days: number,
  signal?: AbortSignal,
): Promise<ApiResult<ExperiencePayload>> {
  const result = await get(`/v1/platform/experience/${universeId}?days=${days}`, signal);
  if (!result.ok) return result;
  return {
    ok: true,
    data: {
      universeId,
      name: typeof result.data.name === "string" ? result.data.name : null,
      days: typeof result.data.days === "number" ? result.data.days : days,
      points: pairs(result.data.points),
    },
  };
}

/** The approval share: Roblox's own vote counts divided, never an estimate. */
export function approvalPercent(detail: ApiDetail | null): number | null {
  if (!detail || detail.u === null || detail.d === null) return null;
  const total = detail.u + detail.d;
  if (total <= 0) return null;
  return (detail.u / total) * 100;
}

/** A link to the experience on Roblox, when there is enough to build one. */
export function experienceUrl(row: ApiExperience): string | null {
  return row.r === null ? null : `https://www.roblox.com/games/${row.r}`;
}
