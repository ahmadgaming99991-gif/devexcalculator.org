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
 * `/platform/` and `/platform/stock/` are deliberately absent. They are drawn
 * from storage the collector writes to every fifteen minutes, so a cached copy
 * would be a chart that has quietly stopped moving — the exact failure the
 * collector's heartbeat exists to make visible.
 */

/** Routes whose HTML is a pure function of the URL and the rate registry. */
export const CACHEABLE_DYNAMIC_ROUTES: readonly string[] = [
  "/",
  "/conversions/",
  "/devex-fees-and-taxes/",
  "/robux-to-usd/",
  "/usd-to-robux/",
];

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
  if (request.method !== "GET") return null;
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
  if (!CACHEABLE_DYNAMIC_ROUTES.includes(url.pathname)) return null;

  return EDGE_POLICY;
}
