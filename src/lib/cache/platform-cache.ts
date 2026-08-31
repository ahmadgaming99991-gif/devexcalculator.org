/**
 * A short-lived edge copy of `/platform/`, taken before the render runs.
 *
 * ## Why this exists
 *
 * `/platform/` renders per request and costs ~125 ms of CPU — twenty times a
 * cache-served page. Under a 40-request burst Cloudflare returned
 * `error code: 1102` for roughly a quarter of them, and the failure rate
 * across the site tracks per-request CPU almost exactly: a prerendered page
 * failed 0–2 times in 40, a plain dynamic page 5, `/platform/` 13.
 *
 * Making the data cheaper was not enough to matter. Hoisting the two per-render
 * rebuilds out of the history readers took one request's data work from
 * 14.09 ms to 3.17 ms, which is about eight per cent of the page. Dropping the
 * table from 100 rows to 10 — halving the bytes — moved CPU only 125.0 ms to
 * 104.7 ms. Roughly 105 ms is the fixed cost of the dynamic render itself, so
 * the only way to stop paying it is to not render.
 *
 * ## Where this sits, precisely
 *
 * As early as code can sit. A Worker bound to a custom domain is invoked for
 * every request — there is no zone cache ahead of it that this repository can
 * configure — so the earliest interception point available is the top of the
 * Worker's own `fetch`, before the OpenNext handler is called at all. On a hit
 * the Next.js request pipeline, the React render and the KV reads never run.
 * The isolate still starts; that cost remains and is not addressed here.
 *
 * ## Why 120 seconds is not a stale figure
 *
 * The collector writes every fifteen minutes. A copy at most two minutes old
 * cannot be behind by even one collection interval, so a reader can never see
 * a chart that has stopped moving relative to what has actually been
 * collected — which is the failure the exclusion in `edge-policy.ts` was
 * written to prevent, and it is prevented by the bound rather than by
 * rendering every time.
 *
 * No `stale-while-revalidate`. The point of that directive is to keep serving
 * an expired copy while a new one is fetched, and an expired copy is exactly
 * what this must not serve: the bound is the guarantee.
 *
 * The page also states the instant each observation was taken and reports the
 * collector's heartbeat, so its age is visible on the page rather than
 * something a reader has to trust.
 *
 * ## What is deliberately not cached
 *
 * Anything carrying a query string. `?ranking`, `?days` and `?experience`
 * select a different view of the same data, and a cached copy keyed on the
 * path alone would serve one reader's selection to another. Rather than
 * enumerate those three parameters — a list that would go stale the day a
 * fourth is added — any query string at all bypasses. That is also what the
 * existing dynamic-route policy does, and for the same reason.
 *
 * `/platform/stock/` and the localized `/{locale}/platform/` variants are not
 * covered. Fixing one route first and measuring it on its own is the point;
 * widening this is a separate change with its own measurement.
 */

/** How long a copy may be served. Well inside the fifteen-minute collection interval. */
export const PLATFORM_CACHE_SECONDS = 120;

/**
 * The two methods this uses, rather than Cloudflare's whole cache type.
 *
 * `caches.default` is a Workers extension and is not on the standard
 * `CacheStorage`. Declaring the pair actually called keeps the dependency
 * visible and lets a test supply a fake.
 */
export interface EdgeCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

/**
 * Cloudflare's shared cache, or null where there isn't one.
 *
 * Null in `next start`, in tests and in the build — every one of which should
 * render normally rather than throw. A caching layer that turns an
 * environment without a cache into an error would be a worse failure than the
 * one it was added to fix.
 */
export function edgeCache(): EdgeCache | null {
  const store = (globalThis as { caches?: { default?: EdgeCache } }).caches?.default;
  return store ?? null;
}

/** The one path this applies to. Exact match, with and without the trailing slash. */
const CACHED_PATHS: ReadonlySet<string> = new Set(["/platform", "/platform/"]);

/**
 * Sent on every response for the path, so a verification run can tell the
 * three outcomes apart without guessing from timing.
 */
export const CACHE_STATUS_HEADER = "x-platform-cache";

/**
 * The instant the HTML was actually rendered, set only when it was.
 *
 * This is what makes "a hit did not re-render" checkable rather than asserted:
 * the value travels in the cached copy, so repeated hits all report the same
 * render, and a miss reports a new one.
 */
export const RENDERED_AT_HEADER = "x-platform-rendered-at";

export type CacheOutcome = "HIT" | "MISS" | "BYPASS";

/**
 * Whether this request may be served from, or stored in, the short-lived copy.
 *
 * Pure and exported so the rules are testable without a Worker: the decision
 * is the part that can be wrong in a way nobody notices.
 */
export function isCacheablePlatformRequest(request: Request): boolean {
  if (request.method !== "GET") return false;

  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return false;
  }

  // Any query string at all, not a list of known parameters.
  if (url.search !== "") return false;

  return CACHED_PATHS.has(url.pathname);
}

/** The policy stored with a cached copy. No `stale-while-revalidate`, deliberately. */
export function platformCacheControl(): string {
  return `public, max-age=0, s-maxage=${PLATFORM_CACHE_SECONDS}, must-revalidate`;
}

/**
 * Whether a rendered response may be stored.
 *
 * Only a plain 200 HTML document. An error, a redirect, or anything carrying a
 * `set-cookie` is rendered fresh every time — a cached failure would outlive
 * the failure itself, which is the one way this could make an outage worse.
 */
export function isStorablePlatformResponse(response: Response): boolean {
  if (response.status !== 200) return false;
  if (response.headers.has("set-cookie")) return false;
  const type = response.headers.get("content-type") ?? "";
  return type.includes("text/html");
}
