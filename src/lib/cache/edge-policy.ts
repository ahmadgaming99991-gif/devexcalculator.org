import { stripLocalePrefix } from "@/i18n/locale-path";
import { routeRegistry } from "@/lib/content/route-registry";

/**
 * Letting the edge hold pages that Next renders per request.
 *
 * Seven routes render on demand, because they read the query string: the
 * calculator hydrates from a shared link, and so do the pages beside it. Next
 * marks every such response `private, no-cache, no-store, max-age=0`, which is
 * the correct default — it cannot know whether a dynamic render contains
 * anything personal.
 *
 * Here it does not. What the homepage renders is a function of the URL and the
 * rate registry, both public, and the cost of that default was measured rather
 * than assumed: Lighthouse reported the root document taking **1,030 ms**, and
 * `no-store` additionally disqualifies the page from the browser's
 * back/forward cache, so returning from a click reloads instead of restoring.
 * Both are Core Web Vitals findings on the most-visited page on the site.
 *
 * Three rules keep this from becoming the kind of caching that leaks:
 *
 *   1. **An allowlist of paths, not a pattern.** Every entry below was read and
 *      confirmed to render from the URL and the registry alone. A new dynamic
 *      route is not covered until somebody adds it here deliberately.
 *   2. **Only when there is no query string.** A shared calculation carries
 *      somebody's balance in the URL, and while that link is public by
 *      construction, there is no reason for an edge to keep a copy. Query-free
 *      requests are the organic landings, which is nearly all of the traffic
 *      and all of the benefit.
 *   3. **Only a response that is already `no-store` HTML with a 200.** This
 *      relaxes Next's blanket default; it never touches a response that has
 *      been given a policy on purpose, and it can never make something
 *      cacheable that was deliberately marked otherwise.
 *
 * `/platform/` and `/platform/stock/` are absent from *this* list, and only
 * one of them is uncached.
 *
 * The reasoning here was that they are drawn from storage the collector writes
 * to every fifteen minutes, so a cached copy would be a chart that has quietly
 * stopped moving. That risk is real and it is a property of an *unbounded*
 * copy. `/platform/` is now answered from a two-minute one, held by
 * `src/lib/cache/platform-cache.ts` and checked at the top of the Worker
 * before the render — a bound shorter than one collection interval cannot miss
 * a run, and the page states the instant of each observation regardless.
 *
 * It is a separate module rather than an entry here because it is a different
 * mechanism: this file relaxes a header on a response that has already been
 * rendered, and that one avoids the render. Adding `/platform/` below would
 * have set a header and changed nothing about the ~125 ms that was the problem.
 *
 * `/platform/stock/` remains uncached and remains dynamic.
 */

/** Routes whose HTML is a pure function of the URL and the rate registry. */
export const CACHEABLE_DYNAMIC_ROUTES: readonly string[] = [
  "/",
  "/conversions/",
  "/devex-fees-and-taxes/",
  "/robux-to-usd/",
];

/**
 * `/usd-to-robux/` was on this list and came off it.
 *
 * It renders today's calendar date into the HTML five times — the planner's
 * pre-hydration fallback, so a reader with scripts blocked still sees a real
 * date rather than an empty field. Cached, that becomes yesterday's date served
 * as today's, on the one page that counts days to a deadline. A reader with
 * JavaScript never sees it, because the client replaces the value on mount;
 * a reader without JavaScript would be told the wrong number of days.
 *
 * Found by fetching the page twice and diffing the delivered HTML, which is
 * also the check to run before adding anything here: two requests, and the
 * bodies must be identical for reasons that hold tomorrow as well as today.
 */
export const EXCLUDED_FOR_RENDERING_A_DATE: readonly string[] = ["/usd-to-robux/"];

/**
 * Ten minutes at the edge, a day of serving stale while it refreshes.
 *
 * Short enough that a redeploy's own purge is a formality rather than the only
 * thing keeping the page current, and long enough that a burst of arrivals
 * from one search result is served from Cloudflare rather than from a render.
 *
 * `max-age=0` keeps the reader's own browser revalidating, so a rate change is
 * never held locally — but it is not `no-store`, which is what restores the
 * back/forward cache.
 */
export const EDGE_POLICY =
  "public, max-age=0, s-maxage=600, stale-while-revalidate=86400, must-revalidate";

/**
 * An hour at the edge for anything whose figures can go out of date.
 *
 * A statically prerendered page leaves Next with `s-maxage=31536000` — a
 * year — which is correct for a page that is a fixed document and wrong for
 * every page here that quotes a rate or a verification date. `/sources/` was
 * the one that made it obvious: it exists to say when each source was last
 * checked, and it was cached for a year at the edge, so the date it displayed
 * could be a year older than the date it was describing.
 *
 * An hour rather than the ten minutes the dynamic routes get, because these
 * pages are prerendered and a rate changes a few times a year. The deploy's
 * own purge is what makes a correction immediate; this is the ceiling on how
 * long a missed purge can be wrong for.
 */
export const RATE_SENSITIVE_EDGE_POLICY =
  "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400, must-revalidate";

/**
 * Which routes that is, taken from the registry rather than listed here.
 *
 * `rateSensitive` already decides whether a page shows a last-verified badge,
 * so it already means "the figures on this page expire". A second list would
 * be a second answer to the same question, and the one that drifted would be
 * this one — the badge is visible on the page and a cache header is not.
 */
const RATE_SENSITIVE_ROUTES: ReadonlySet<string> = new Set(
  routeRegistry.filter((record) => record.rateSensitive).map((record) => record.route),
);

/**
 * Next's static default, and the only value this will overwrite.
 *
 * Matching the exact number rather than "a large s-maxage" keeps this to the
 * one header Next generates without being asked. Anything set deliberately —
 * by a route handler, by the dynamic policy above — is left alone, so this
 * cannot quietly become the site's cache policy.
 */
const NEXT_STATIC_FOREVER = "s-maxage=31536000";

/** Methods whose response may be relaxed. Never a mutation. */
const SAFE_METHODS: readonly string[] = ["GET", "HEAD"];

/**
 * The route a path names, with any published locale prefix removed.
 *
 * Both lists below are keyed by canonical route — `/devex-rates/`, not
 * `/de/devex-rates/` — because a route is one page in seven languages and its
 * caching is a property of the page, not of the language.
 *
 * Matching the raw pathname meant neither list saw a translated URL, and both
 * failure modes were live in production on 2026-09-02:
 *
 *   - A locale home page matched nothing, fell through to the closed default,
 *     and was served `no-store`. That bypasses the edge entirely, so the Worker
 *     rendered every request for `/tr/`, `/de/`, `/es/` and `/pt-br/` — which
 *     returned `503` on roughly four requests in five.
 *   - A translated rate page kept Next's untouched `s-maxage=31536000`. The
 *     English page expires hourly because its figures do; the same page in six
 *     languages would have served a superseded DevEx rate for up to a year.
 *
 * This is the fourth surface to be caught reading the bare English path, after
 * the sitemap, IndexNow and `llms.txt`. See docs/invariant-register.md.
 */
function canonicalRouteOf(pathname: string): string {
  return stripLocalePrefix(pathname);
}

/** What Next sends for a dynamically rendered page. */
function isUncachedByDefault(value: string | null): boolean {
  return value !== null && value.includes("no-store");
}

/**
 * The `Cache-Control` this response should carry instead, or null to leave it
 * exactly as it is.
 *
 * Returns a value rather than mutating, so the decision can be tested without
 * constructing a Worker.
 */
export function edgeCachePolicy(
  request: { method: string; url: string },
  response: { status: number; headers: { get(name: string): string | null } },
): string | null {
  /*
   * HEAD as well as GET. This read `!== "GET"`, which was meant to exclude
   * mutations and caught HEAD by accident — so a HEAD request answered
   * `no-store` on a route whose GET answered with the cached policy.
   *
   * RFC 9110 is explicit that a HEAD response should carry the same headers
   * the GET would. Two answers that disagree is a debugging trap: it is what
   * made `curl -I` report this whole feature as broken when it was working.
   */
  if (!SAFE_METHODS.includes(request.method)) return null;
  if (response.status !== 200) return null;

  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("text/html")) return null;

  if (!isUncachedByDefault(response.headers.get("cache-control"))) return null;

  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return null;
  }

  // A shared calculation lives in the query string. Nothing with one is cached.
  if (url.search !== "") return null;
  if (!CACHEABLE_DYNAMIC_ROUTES.includes(canonicalRouteOf(url.pathname))) return null;

  return EDGE_POLICY;
}

/**
 * The same question for a page Next prerendered rather than rendered.
 *
 * Separate from `edgeCachePolicy` because it is the opposite operation on the
 * opposite input: that one relaxes `no-store` on a dynamic page, this one
 * tightens a year on a static one. Sharing a function would mean one set of
 * guards doing two jobs, and the guard that matters here — that the header is
 * Next's untouched default — is not the guard that matters there.
 */
export function staticCachePolicy(
  request: { method: string; url: string },
  response: { status: number; headers: { get(name: string): string | null } },
): string | null {
  if (!SAFE_METHODS.includes(request.method)) return null;
  if (response.status !== 200) return null;

  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("text/html")) return null;

  const current = response.headers.get("cache-control");
  if (current === null || !current.includes(NEXT_STATIC_FOREVER)) return null;

  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return null;
  }

  if (!RATE_SENSITIVE_ROUTES.has(canonicalRouteOf(url.pathname))) return null;

  return RATE_SENSITIVE_EDGE_POLICY;
}
