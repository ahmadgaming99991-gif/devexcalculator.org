/**
 * The cache policy for `/platform/`, and the closed default behind it.
 *
 * ## What changed, and why this is a policy rather than a lookup
 *
 * This started as a `caches.default` lookup at the top of the Worker. That
 * skipped the React render on a hit but still paid isolate startup, because a
 * Worker on a custom domain is invoked for every request — and isolate startup
 * is part of what produces `error code: 1102` under a burst.
 *
 * Workers Caching removes that. With `cache.enabled` set in `wrangler.jsonc`,
 * Cloudflare checks the cache *before* invoking the Worker, so a hit costs no
 * isolate at all. The Worker's only job is then to say what may be cached and
 * for how long, which is what this module decides.
 *
 * ## Why `/platform/` needs it
 *
 * The page renders per request at ~125 ms of CPU — twenty times a cache-served
 * page — and the site's 1102 rate tracks per-request CPU almost exactly: a
 * prerendered page failed 0–2 times in 40, a plain dynamic page 5,
 * `/platform/` 13. Making the data cheaper was not enough: hoisting the
 * per-render rebuilds took the data work from 14.09 ms to 3.17 ms, and
 * dropping the table from 100 rows to 10 moved total CPU only 125.0 → 104.7
 * ms. About 105 ms is the render itself, so the only way to stop paying it is
 * to not render.
 *
 * ## Why 120 seconds is not a stale figure
 *
 * The collector writes every fifteen minutes. A copy at most two minutes old
 * cannot be behind by even one collection interval, so a reader can never see
 * a chart that has stopped moving relative to what has been collected — the
 * failure the exclusion note in `edge-policy.ts` was written to prevent,
 * prevented by the bound rather than by rendering every time. The page also
 * states the instant of each observation and reports the collector heartbeat,
 * so its age is visible rather than something to trust.
 *
 * No `stale-while-revalidate`: that directive exists to keep serving an
 * expired copy, and an expired copy is the one thing the bound is for.
 *
 * ## Why a query string is `no-store` rather than merely uncached
 *
 * `?ranking`, `?days` and `?experience` each select a different view of the
 * same data. Under cache-before-Worker, a response that simply omits a policy
 * is a response whose caching is decided by something other than this file —
 * so the parameterised views say `no-store` explicitly rather than saying
 * nothing and hoping. The rule is "any query string", not those three names,
 * so a fourth parameter is safe the day it is added rather than the day
 * somebody remembers this list.
 */

/** How long a copy may be served. Well inside the fifteen-minute collection interval. */
export const PLATFORM_CACHE_SECONDS = 120;

/** The one path this applies to. Exact match, with and without the trailing slash. */
const CACHED_PATHS: ReadonlySet<string> = new Set(["/platform", "/platform/"]);

/**
 * The instant the HTML was actually built.
 *
 * Kept after the move to Workers Caching because it is what makes "a hit did
 * not re-render" checkable rather than asserted: the value travels in the
 * cached copy, so repeated hits report the same render and only a miss reports
 * a new one. `Cf-Cache-Status` says what Cloudflare did; this says what the
 * application did, and the two agreeing is the evidence.
 */
export const RENDERED_AT_HEADER = "x-platform-rendered-at";

/** Served to a query-free request. No `stale-while-revalidate`, deliberately. */
export const PLATFORM_CACHEABLE_POLICY = `public, max-age=0, s-maxage=${PLATFORM_CACHE_SECONDS}, must-revalidate`;

/** Served to anything selecting a view. Explicit, not absent. */
export const PLATFORM_DYNAMIC_POLICY = "no-store";

/**
 * The policy for a platform request, or null when this is not one.
 *
 * Pure and exported so the rules are testable without a Worker: the decision
 * is the part that can be wrong in a way nobody notices, because a copy served
 * to a request that selected a different view looks like a working page
 * showing the wrong thing.
 */
export function platformCachePolicy(request: Request): string | null {
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return null;
  }

  if (!CACHED_PATHS.has(url.pathname)) return null;

  // Anything but a plain GET, and anything carrying a query string, is a view
  // rather than the page. A bare `?` carries no parameter and is the page.
  if (request.method !== "GET") return PLATFORM_DYNAMIC_POLICY;
  if (url.search !== "") return PLATFORM_DYNAMIC_POLICY;

  return PLATFORM_CACHEABLE_POLICY;
}

/** Whether a request is for the platform page at all, cacheable or not. */
export function isPlatformPath(request: Request): boolean {
  try {
    return CACHED_PATHS.has(new URL(request.url).pathname);
  } catch {
    return false;
  }
}

/**
 * Whether a rendered response is one a copy may be taken of.
 *
 * Only a plain 200 HTML document. An error, a redirect, or anything carrying a
 * `set-cookie` gets the dynamic policy instead: a cached failure outlives the
 * failure itself, which is the one way this could make an outage worse than it
 * found it.
 */
export function isStorablePlatformResponse(response: Response): boolean {
  if (response.status !== 200) return false;
  if (response.headers.has("set-cookie")) return false;
  const type = response.headers.get("content-type") ?? "";
  return type.includes("text/html");
}

/**
 * The policy given to any response that has not been given one.
 *
 * Turning on cache-before-Worker changes what an absent `Cache-Control` means.
 * Before, an unlabelled response was simply not cached by this site's own
 * rules; now it is a response whose caching is decided by Cloudflare's
 * defaults rather than by anything written down here. Every response that
 * leaves this Worker therefore carries a policy, and the one applied when
 * nothing else claimed the response is the closed one.
 *
 * This is deliberately the *last* rule consulted. Anything with a deliberate
 * policy — a route handler's own header, a static asset's year, the platform
 * policy above — keeps it, so this can never quietly become the site's cache
 * policy. It only ever fills a silence.
 */
export const CLOSED_DEFAULT_POLICY = "no-store";

/**
 * The single decision applied to every response leaving the Worker.
 *
 * Extracted from `worker/index.ts` so the closed default is something a test
 * can assert rather than something a person has to read the Worker to trust.
 * The order is precedence, most specific first, and the last two rules are the
 * point of the whole function: a deliberate policy is never overwritten, and a
 * silence is never left.
 *
 * `platform` and `others` are passed in rather than imported so this stays a
 * pure function of its inputs — the platform rule is this module's, and the
 * other two live in `edge-policy.ts` because they answer a different question.
 */
export function resolveCachePolicy(options: {
  readonly platform: string | null;
  readonly storablePlatformResponse: boolean;
  readonly others: readonly (string | null)[];
  readonly existing: string | null;
}): string {
  if (options.platform !== null) {
    // A platform response only keeps the cacheable policy if it is something a
    // copy may be taken of; an error or a redirect must not outlive itself.
    return options.storablePlatformResponse ? options.platform : PLATFORM_DYNAMIC_POLICY;
  }

  for (const policy of options.others) {
    if (policy) return policy;
  }

  // A deliberate policy — a route handler's own header, a static asset's year.
  if (options.existing !== null && options.existing !== "") return options.existing;

  return CLOSED_DEFAULT_POLICY;
}
