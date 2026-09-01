/**
 * Roblox's public endpoints, and the rules for talking to them.
 *
 * Nothing throws. Every call returns a discriminated result and the caller
 * decides what to record, because a scheduled unit that throws is retried by
 * Cloudflare, and retrying into an upstream outage turns one bad quarter hour
 * into a burst of requests against a service that is already struggling.
 *
 * One retry, once, on a network error or a 5xx - a single dropped connection
 * should not cost a whole collection cycle. A 4xx is not retried: it will fail
 * the same way twice and the second attempt is only load. Both attempts share
 * the invocation's time budget, so the ceiling is the timeout doubled and the
 * unit still finishes inside a scheduled invocation.
 */

import { describeError, log } from "./log";

const SORTS_TIMEOUT_MS = 6_000;
const DETAIL_TIMEOUT_MS = 3_000;
const RETRY_DELAY_MS = 250;

export const SORTS_URL = "https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=devexcalculator";
export const GAMES_URL = "https://games.roblox.com/v1/games";
export const VOTES_URL = "https://games.roblox.com/v1/games/votes";

export interface Fetched {
  readonly ok: boolean;
  readonly data?: unknown;
  /** Roblox's own clock, from its `Date` header. The observation is theirs. */
  readonly observedAt?: string;
  readonly detail?: string;
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "unknown";
  }
}

async function attempt(url: string, timeoutMs: number): Promise<Fetched & { retryable: boolean }> {
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      return {
        ok: false,
        detail: `HTTP ${response.status}`,
        retryable: response.status >= 500,
      };
    }
    const date = response.headers.get("date");
    return {
      ok: true,
      data: await response.json(),
      observedAt: date ? new Date(date).toISOString() : new Date().toISOString(),
      retryable: false,
    };
  } catch (error) {
    return { ok: false, detail: describeError(error), retryable: true };
  }
}

async function getJson(url: string, timeoutMs: number): Promise<Fetched> {
  const first = await attempt(url, timeoutMs);
  if (first.ok || !first.retryable) {
    if (!first.ok) log.warn({ event: "upstream.failed", host: hostOf(url), detail: first.detail ?? null });
    return first;
  }

  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  const second = await attempt(url, timeoutMs);
  if (!second.ok) {
    log.warn({ event: "upstream.failed", host: hostOf(url), detail: second.detail ?? null });
  }
  return second;
}

export const getSorts = () => getJson(SORTS_URL, SORTS_TIMEOUT_MS);

export const getDetails = (ids: readonly number[]) =>
  getJson(`${GAMES_URL}?universeIds=${ids.join(",")}`, DETAIL_TIMEOUT_MS);

export const getVotes = (ids: readonly number[]) =>
  getJson(`${VOTES_URL}?universeIds=${ids.join(",")}`, DETAIL_TIMEOUT_MS);
