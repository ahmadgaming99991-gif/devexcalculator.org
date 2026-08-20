/**
 * Headers for the endpoints anyone may read.
 *
 * Two of this site's JSON endpoints publish reference data — the rate registry
 * and the European Central Bank reference rates. Both were readable by a
 * script or a server, and unusable from a browser on any other origin, because
 * no `Access-Control-Allow-Origin` was ever sent. An endpoint published so that
 * "anyone can check the site's figures without scraping HTML" that a web page
 * cannot call is only half published.
 *
 * `*` is the right value here and not a shortcut. These responses are
 * identical for every caller, carry no credentials, set no cookie and expose
 * nothing that is not already on a public page. There is no session for a
 * cross-origin read to abuse, which is the thing a narrower origin list exists
 * to protect.
 *
 * Deliberately not applied to `/api/contact/` or `/api/health/`. Contact
 * accepts submissions and is origin-checked on purpose; health is
 * infrastructure for an operator, not reference data for the public.
 */

/** Methods a reference endpoint answers. Reads only. */
const ALLOWED_METHODS = "GET, HEAD, OPTIONS";

export const publicApiCors: Readonly<Record<string, string>> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": ALLOWED_METHODS,
  "access-control-allow-headers": "content-type",
  // A day. The policy does not vary by caller, so re-asking is wasted work.
  "access-control-max-age": "86400",
  /*
   * `Vary: Origin` is deliberately absent. It matters when the allowed origin
   * is computed from the request; here the answer is the same for everyone, and
   * adding it would fragment the shared cache by origin for no benefit.
   */
};

/** The preflight answer, for browsers that send one before a cross-origin GET. */
export function corsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: { ...publicApiCors, "cache-control": "public, max-age=86400" },
  });
}
