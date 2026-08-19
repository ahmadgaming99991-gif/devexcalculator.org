/**
 * Roblox's own public endpoints.
 *
 * Three things matter here and all three are deliberate.
 *
 * First, the experience list is fetched, never curated. Writing a list of
 * "top experiences" by hand would mean asserting a ranking this site did not
 * measure; Roblox's explore endpoint already publishes several, so those are
 * what is shown, each attributed to Roblox by its own name.
 *
 * Second, nothing throws. A page that renders a payout calculator must not
 * disappear because a third-party list was slow, so every call returns a
 * discriminated result and the page decides what to show. An outage produces a
 * stated outage, never a blank space and never a stale number presented as
 * current.
 *
 * Third, the shape the *collector* records is frozen. `fetchTopExperiences`
 * exists separately from `fetchRankings` for exactly one reason: the recorded
 * history must stay comparable with itself. Widening what the page displays
 * must never change what the cron measures, or the chart silently becomes two
 * different series drawn as one line.
 *
 * No API key, no third-party service, no client-side request: these are called
 * server-side from the Worker and the response is cached.
 */

const EXPLORE_SORTS_URL = "https://apis.roblox.com/explore-api/v1/get-sorts";
const GAMES_URL = "https://games.roblox.com/v1/games";

/**
 * Long enough for a slow response, short enough not to hold a page hostage.
 *
 * These are now the page's own budget rather than a background section's: the
 * live table is awaited inline so it exists without JavaScript, which means a
 * slow Roblox delays the whole page. The two calls are sequential — the second
 * needs ids from the first — so the worst case a reader can see is their sum,
 * and the detail call gets the smaller share because the page is still useful
 * without it.
 */
const TIMEOUT_MS = 5_000;
const DETAIL_TIMEOUT_MS = 3_000;

/** How long a successful response is reused. Roblox's own figures move slowly. */
export const EXPERIENCE_CACHE_SECONDS = 300;

/**
 * How many rows the page shows from the selected ranking.
 *
 * Roblox returns around ninety per sort. Showing all of them would make the
 * page enormous for no gain, and the detail call below is a single request for
 * this many ids, so the limit is also what keeps it one request.
 */
export const DISPLAY_LIMIT = 25;

export interface ExperienceObservation {
  readonly universeId: number;
  /** The place a reader would actually open. Null when Roblox omits it. */
  readonly rootPlaceId: number | null;
  readonly name: string;
  /** Players in the experience at the moment Roblox answered. */
  readonly playing: number;
  /** Lifetime visits, where Roblox reports them. */
  readonly visits: number | null;
  readonly maxPlayers: number | null;
  readonly creatorName: string | null;
  readonly creatorVerified: boolean;
  /** Vote counts as published by Roblox. Neither is derived by this site. */
  readonly upVotes: number | null;
  readonly downVotes: number | null;
  readonly favourites: number | null;
  readonly genre: string | null;
  /** Roblox's own maturity wording, e.g. "Maturity: Minimal". */
  readonly maturity: string | null;
  /** Roblox marks paid placements in its rankings; readers deserve to know. */
  readonly isSponsored: boolean;
  /** Roblox's canonical path for the experience, when it supplies one. */
  readonly urlPath: string | null;
}

/** One of Roblox's published rankings. */
export interface Ranking {
  readonly id: string;
  readonly name: string;
  readonly subtitle: string | null;
  /** How many experiences Roblox returned in this ranking. */
  readonly size: number;
}

export interface RankingsPayload {
  /** Every ranking Roblox returned that actually contained experiences. */
  readonly rankings: readonly Ranking[];
  readonly selected: Ranking;
  readonly experiences: readonly ExperienceObservation[];
  /** True when the detail endpoint answered and enriched the rows. */
  readonly detailsLoaded: boolean;
}

export type FetchResult<T> =
  | { readonly ok: true; readonly data: T; readonly observedAt: string }
  | { readonly ok: false; readonly reason: string };

/** A fetch that always resolves, and never hangs a render. */
async function getJson(url: string, timeoutMs = TIMEOUT_MS): Promise<FetchResult<unknown>> {
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      cf: { cacheTtl: EXPERIENCE_CACHE_SECONDS, cacheEverything: true },
    } as RequestInit);

    if (!response.ok) {
      return { ok: false, reason: `Roblox returned HTTP ${response.status}.` };
    }

    /*
     * The observation time is Roblox's, not ours.
     *
     * A successful response is cached for five minutes, so reading the clock
     * here would stamp a four-minute-old reading as though it had just been
     * taken — the page would present a stale number as current, which is the
     * one thing it must not do. The upstream `date` header travels with the
     * cached response and records when Roblox actually answered.
     */
    const upstream = response.headers.get("date");
    const observedAt =
      upstream && !Number.isNaN(Date.parse(upstream))
        ? new Date(upstream).toISOString()
        : new Date().toISOString();

    return { ok: true, data: await response.json(), observedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      reason: message.includes("timed out" ) || message.includes("aborted")
        ? `Roblox did not respond within ${timeoutMs / 1000} seconds.`
        : `Could not reach Roblox: ${message}`,
    };
  }
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export interface ParsedRanking extends Ranking {
  readonly experiences: readonly ExperienceObservation[];
}

/**
 * Reads every ranking out of Roblox's explore payload.
 *
 * The response carries several — Top Playing Now, Top Trending, Up-and-Coming
 * and others — and previously only the first was used, which threw away most
 * of what Roblox had already sent in the same response. Each keeps Roblox's own
 * display name, so the page can say which ranking it is showing rather than
 * inventing a label like "most popular".
 *
 * Sorts with no games are skipped: the payload includes a filter descriptor
 * that carries none.
 */
export function parseRankings(payload: unknown): ParsedRanking[] {
  if (typeof payload !== "object" || payload === null) return [];
  const sorts = (payload as { sorts?: unknown }).sorts;
  if (!Array.isArray(sorts)) return [];

  const rankings: ParsedRanking[] = [];

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
      const name = asString(row.name);

      // A row without an id, a name and a player count is not an observation.
      if (universeId === null || playing === null || !name) continue;

      experiences.push({
        universeId,
        rootPlaceId: asNumber(row.rootPlaceId),
        name,
        playing,
        // The explore payload carries no visit or favourite count; those are
        // filled in from the games endpoint below, and stay null if it fails.
        visits: null,
        maxPlayers: null,
        favourites: null,
        creatorName: null,
        creatorVerified: false,
        upVotes: asNumber(row.totalUpVotes),
        downVotes: asNumber(row.totalDownVotes),
        genre: asString(row.genreL1),
        maturity: asString(row.ageRecommendationDisplayName),
        isSponsored: row.isSponsored === true,
        urlPath: null,
      });
    }

    if (experiences.length === 0) continue;

    const id = asString((sort as { sortId?: unknown }).sortId);
    rankings.push({
      id: id ?? `ranking-${rankings.length + 1}`,
      name: asString((sort as { sortDisplayName?: unknown }).sortDisplayName) ?? "Roblox ranking",
      subtitle: asString((sort as { subtitle?: unknown }).subtitle),
      size: experiences.length,
      experiences,
    });
  }

  return rankings;
}

/**
 * The first ranking that carries experiences.
 *
 * Retained with its original behaviour because the collector depends on it:
 * every stored observation so far was taken from this sort, and changing the
 * basis would make old and new points incomparable.
 */
export function parseSorts(payload: unknown): {
  sortName: string;
  experiences: ExperienceObservation[];
} | null {
  const first = parseRankings(payload)[0];
  if (!first) return null;
  return { sortName: first.name, experiences: [...first.experiences] };
}

/** Merges detail from the games endpoint into an experience list. */
export function mergeGameDetails(
  experiences: readonly ExperienceObservation[],
  payload: unknown,
): ExperienceObservation[] {
  type Detail = Pick<
    ExperienceObservation,
    "visits" | "maxPlayers" | "favourites" | "creatorName" | "creatorVerified" | "urlPath"
  >;
  const details = new Map<number, Detail>();

  if (typeof payload === "object" && payload !== null) {
    const rows = (payload as { data?: unknown }).data;
    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (typeof row !== "object" || row === null) continue;
        const record = row as Record<string, unknown>;
        const id = asNumber(record.id);
        if (id === null) continue;

        const creator =
          typeof record.creator === "object" && record.creator !== null
            ? (record.creator as Record<string, unknown>)
            : null;

        details.set(id, {
          visits: asNumber(record.visits),
          maxPlayers: asNumber(record.maxPlayers),
          favourites: asNumber(record.favoritedCount),
          creatorName: creator ? asString(creator.name) : null,
          creatorVerified: creator?.hasVerifiedBadge === true,
          urlPath: asString(record.canonicalUrlPath),
        });
      }
    }
  }

  return experiences.map((experience) => {
    const detail = details.get(experience.universeId);
    if (!detail) return experience;
    return {
      ...experience,
      visits: detail.visits,
      maxPlayers: detail.maxPlayers,
      favourites: detail.favourites,
      // Explore does not name the creator, so this is the only source for it.
      creatorName: detail.creatorName ?? experience.creatorName,
      creatorVerified: detail.creatorVerified,
      urlPath: detail.urlPath ?? experience.urlPath,
    };
  });
}

/** The public Roblox URL for an experience, when there is enough to build one. */
export function experienceUrl(experience: ExperienceObservation): string | null {
  if (experience.urlPath) return `https://www.roblox.com${experience.urlPath}`;
  if (experience.rootPlaceId !== null) {
    return `https://www.roblox.com/games/${experience.rootPlaceId}`;
  }
  return null;
}

/**
 * The share of votes that are positive, as a percentage.
 *
 * Both counts are Roblox's; the ratio is arithmetic on them, and the page
 * labels it as such. Null when nobody has voted, because 0/0 is not 0%.
 */
export function approvalPercent(experience: ExperienceObservation): number | null {
  const up = experience.upVotes;
  const down = experience.downVotes;
  if (up === null || down === null) return null;
  const total = up + down;
  if (total <= 0) return null;
  return (up / total) * 100;
}

/**
 * Every ranking Roblox publishes, with the chosen one's rows enriched.
 *
 * `sortId` selects a ranking by Roblox's own id; an unknown or absent id falls
 * back to the first, so a hand-edited query string cannot produce an error page.
 */
export async function fetchRankings(
  sortId?: string,
  limit = DISPLAY_LIMIT,
): Promise<FetchResult<RankingsPayload>> {
  const sorts = await getJson(`${EXPLORE_SORTS_URL}?sessionId=devexcalculator`);
  if (!sorts.ok) return sorts;

  const parsed = parseRankings(sorts.data);
  if (parsed.length === 0) {
    return { ok: false, reason: "Roblox's response did not contain a usable experience list." };
  }

  const selected = parsed.find((ranking) => ranking.id === sortId) ?? parsed[0];
  if (!selected) {
    return { ok: false, reason: "Roblox's response did not contain a usable experience list." };
  }

  const top = selected.experiences.slice(0, limit);

  // Detail comes from a second endpoint. If it fails the page still has player
  // counts and votes, so a partial answer is shown and the missing columns are
  // dropped rather than filled with a guess.
  const ids = top.map((experience) => experience.universeId).join(",");
  const details = await getJson(`${GAMES_URL}?universeIds=${ids}`, DETAIL_TIMEOUT_MS);

  const rankings: Ranking[] = parsed.map(({ id, name, subtitle, size }) => ({
    id,
    name,
    subtitle,
    size,
  }));

  return {
    ok: true,
    observedAt: sorts.observedAt,
    data: {
      rankings,
      selected: {
        id: selected.id,
        name: selected.name,
        subtitle: selected.subtitle,
        size: selected.size,
      },
      experiences: details.ok ? mergeGameDetails(top, details.data) : top,
      detailsLoaded: details.ok,
    },
  };
}

/**
 * The experiences the collector records.
 *
 * Deliberately unchanged: first ranking, ten experiences. Every observation in
 * the store was taken this way, and a series is only a series while its basis
 * holds still.
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

  const ids = top.map((experience) => experience.universeId).join(",");
  const details = await getJson(`${GAMES_URL}?universeIds=${ids}`, DETAIL_TIMEOUT_MS);

  return {
    ok: true,
    observedAt: sorts.observedAt,
    data: {
      sortName: parsed.sortName,
      experiences: details.ok ? mergeGameDetails(top, details.data) : top,
    },
  };
}
