/**
 * The two Roblox endpoints this data plane reads, and nothing else.
 *
 * Kept separate from the stages so both stages share one timeout policy and one
 * rule about whose clock an observation carries: Roblox's `Date` header, not
 * ours. A response we cannot date is dated by us and says so by falling back.
 */

const TIMEOUT_MS = 6_000;
const DETAIL_TIMEOUT_MS = 3_000;

export const SORTS_URL = "https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=devexcalculator";
export const GAMES_URL = "https://games.roblox.com/v1/games";
export const VOTES_URL = "https://games.roblox.com/v1/games/votes";

export interface Fetched {
  readonly ok: boolean;
  readonly data?: unknown;
  readonly observedAt?: string;
  readonly detail?: string;
}

export async function getJson(url: string, timeoutMs = TIMEOUT_MS): Promise<Fetched> {
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return { ok: false, detail: `HTTP ${response.status}` };
    const date = response.headers.get("date");
    return {
      ok: true,
      data: await response.json(),
      observedAt: date ? new Date(date).toISOString() : new Date().toISOString(),
    };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "unreachable" };
  }
}

export const getDetails = (ids: readonly number[]) =>
  getJson(`${GAMES_URL}?universeIds=${ids.join(",")}`, DETAIL_TIMEOUT_MS);

export const getVotes = (ids: readonly number[]) =>
  getJson(`${VOTES_URL}?universeIds=${ids.join(",")}`, DETAIL_TIMEOUT_MS);
