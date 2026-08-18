/**
 * Roblox's own public endpoints.
 *
 * Two things matter here and both are deliberate.
 *
 * First, the experience list is fetched, never curated. Writing a list of
 * "top experiences" by hand would mean asserting a ranking this site did not
 * measure; Roblox's explore endpoint already publishes one, so that is what is
 * shown, attributed to Roblox.
 *
 * Second, nothing throws. A page that renders a payout calculator must not
 * disappear because a third-party list was slow, so every call returns a
 * discriminated result and the page decides what to show. An outage produces a
 * stated outage, never a blank space and never a stale number presented as
 * current.
 *
 * No API key, no third-party service, no client-side request: these are called
 * server-side from the Worker and the response is cached.
 */

const EXPLORE_SORTS_URL = "https://apis.roblox.com/explore-api/v1/get-sorts";
const GAMES_URL = "https://games.roblox.com/v1/games";

/** Long enough for a slow response, short enough not to hold a page hostage. */
const TIMEOUT_MS = 6_000;

/** How long a successful response is reused. Roblox's own figures move slowly. */
export const EXPERIENCE_CACHE_SECONDS = 300;

export interface ExperienceObservation {
  readonly universeId: number;
  readonly name: string;
  /** Players in the experience at the moment Roblox answered. */
  readonly playing: number;
  /** Lifetime visits, where Roblox reports them. */
  readonly visits: number | null;
  readonly maxPlayers: number | null;
  readonly creatorName: string | null;
}

export type FetchResult<T> =
  | { readonly ok: true; readonly data: T; readonly observedAt: string }
  | { readonly ok: false; readonly reason: string };

/** A fetch that always resolves, and never hangs a render. */
async function getJson(url: string): Promise<FetchResult<unknown>> {
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cf: { cacheTtl: EXPERIENCE_CACHE_SECONDS, cacheEverything: true },
    } as RequestInit);

    if (!response.ok) {
      return { ok: false, reason: `Roblox returned HTTP ${response.status}.` };
    }
    return { ok: true, data: await response.json(), observedAt: new Date().toISOString() };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      reason: message.includes("timed out" ) || message.includes("aborted")
        ? `Roblox did not respond within ${TIMEOUT_MS / 1000} seconds.`
        : `Could not reach Roblox: ${message}`,
    };
  }
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Reads the experiences out of Roblox's explore payload.
 *
 * The response carries several sorts; the first one that actually contains
 * games is used, and its display name is reported so the page can say which
 * Roblox ranking it is showing rather than inventing a label like "most
 * popular".
 */
export function parseSorts(payload: unknown): {
  sortName: string;
  experiences: ExperienceObservation[];
} | null {
  if (typeof payload !== "object" || payload === null) return null;
  const sorts = (payload as { sorts?: unknown }).sorts;
  if (!Array.isArray(sorts)) return null;

  for (const sort of sorts) {
    if (typeof sort !== "object" || sort === null) continue;
    const games = (sort as { games?: unknown }).games;
    if (!Array.isArray(games) || games.length === 0) continue;

    const experiences: ExperienceObservation[] = [];
    for (const game of games) {
      if (typeof game !== "object" || game === null) continue;
      const row = game as Record<string, unknown>;
      const universeId = asNumber(row.universeId);
      const playing = asNumber(row.playerCount);
      const name = typeof row.name === "string" ? row.name : null;

      // A row without an id, a name and a player count is not an observation.
      if (universeId === null || playing === null || !name) continue;

      experiences.push({
        universeId,
        name,
        playing,
        // The explore payload carries no visit count; it is filled in from
        // the games endpoint below, and stays null if that call fails.
        visits: null,
        maxPlayers: null,
        creatorName: typeof row.creatorName === "string" ? row.creatorName : null,
      });
    }

    if (experiences.length > 0) {
      const sortName = (sort as { sortDisplayName?: unknown }).sortDisplayName;
      return {
        sortName: typeof sortName === "string" && sortName.trim() ? sortName : "Roblox ranking",
        experiences,
      };
    }
  }
  return null;
}

/** Merges visit counts from the games endpoint into an experience list. */
export function mergeGameDetails(
  experiences: readonly ExperienceObservation[],
  payload: unknown,
): ExperienceObservation[] {
  const details = new Map<number, { visits: number | null; maxPlayers: number | null }>();

  if (typeof payload === "object" && payload !== null) {
    const rows = (payload as { data?: unknown }).data;
    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (typeof row !== "object" || row === null) continue;
        const record = row as Record<string, unknown>;
        const id = asNumber(record.id);
        if (id === null) continue;
        details.set(id, {
          visits: asNumber(record.visits),
          maxPlayers: asNumber(record.maxPlayers),
        });
      }
    }
  }

  return experiences.map((experience) => {
    const detail = details.get(experience.universeId);
    return detail
      ? { ...experience, visits: detail.visits, maxPlayers: detail.maxPlayers }
      : experience;
  });
}

/**
 * The experiences Roblox is currently ranking, with live player counts.
 *
 * `limit` keeps both the page and the stored history small; the ranking is far
 * longer than anyone reads.
 */
export async function fetchTopExperiences(
  limit = 10,
): Promise<FetchResult<{ sortName: string; experiences: ExperienceObservation[] }>> {
  const sorts = await getJson(`${EXPLORE_SORTS_URL}?sessionId=devexcalculator`);
  if (!sorts.ok) return sorts;

  const parsed = parseSorts(sorts.data);
  if (!parsed) {
    return { ok: false, reason: "Roblox's response did not contain a usable experience list." };
  }

  const top = parsed.experiences.slice(0, limit);

  // Visits come from a second endpoint. If it fails the page still has player
  // counts, so a partial answer is better than none and the column is omitted.
  const ids = top.map((experience) => experience.universeId).join(",");
  const details = await getJson(`${GAMES_URL}?universeIds=${ids}`);

  return {
    ok: true,
    observedAt: sorts.observedAt,
    data: {
      sortName: parsed.sortName,
      experiences: details.ok ? mergeGameDetails(top, details.data) : top,
    },
  };
}
