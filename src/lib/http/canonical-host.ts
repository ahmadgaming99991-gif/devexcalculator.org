import { siteConfig } from "@/config/site";

/**
 * One address for one page.
 *
 * Both `devexcalculator.org` and `www.devexcalculator.org` are custom domains
 * on this Worker, so both served the whole site with `200 OK`. The canonical
 * link on every page named the apex, which is the mitigation and not the fix:
 * a crawler still has to fetch the duplicate to find out it is one, links and
 * shares accumulate against the wrong host, and anything that reads the URL
 * rather than the document — analytics, a share card, a copied address — sees
 * two sites.
 *
 * 301 rather than 308, matching the scheme upgrade beside it: a permanent
 * move for a GET, and 301 is what every crawler already understands for it.
 *
 * Scoped to exactly `www.` in front of the configured apex. Nothing else is
 * touched — not `127.0.0.1`, not a `workers.dev` subdomain, not a preview
 * host — because this must be inert everywhere except the one duplicate that
 * actually exists. A blanket "strip any subdomain" rule would break local
 * development and the preview flow, and would be a redirect loop waiting for
 * the first host nobody thought about.
 *
 * ## Why this response is never cached
 *
 * The first version of this carried `cache-control: public, max-age=3600`,
 * which is the obvious thing to put on a permanent redirect and was wrong
 * here. Both hostnames are custom domains on **one** Worker behind **one**
 * zone cache, and within minutes of deploying, `https://devexcalculator.org/`
 * was answering `301` to itself: the `www` redirect had been stored and was
 * being replayed against the apex. The homepage was a redirect loop in
 * production until the cache was bypassed.
 *
 * So: `no-store`, and it is not a performance compromise worth arguing about.
 * A redirect is two hundred bytes and the reader is going somewhere else
 * immediately; a redirect that can be stored under a key it does not own is a
 * site outage.
 *
 * The self-host check below is the second layer. It is redundant if the host
 * comparison above is right, and it is exactly the thing that was not
 * redundant on 2026-09-02: whatever else goes wrong, this function will not
 * hand a client a `Location` pointing at the host it just came from.
 */

/** The host this site answers on, from `NEXT_PUBLIC_SITE_URL`. */
function canonicalHost(): string {
  try {
    return new URL(siteConfig.url).host;
  } catch {
    return "";
  }
}

/** The redirect to the canonical host, or null when the request is already on it. */
export function redirectToCanonicalHost(request: { readonly url: string }): Response | null {
  const apex = canonicalHost();
  if (apex === "") return null;

  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return null;
  }

  if (url.host !== `www.${apex}`) return null;

  const from = url.host;
  url.host = apex;
  // The scheme is normalised too, so a plain-HTTP request to the `www` host
  // does not need a second hop through the upgrade beside this one.
  url.protocol = "https:";

  // Never send a client back to where it came from. See the note above.
  if (url.host === from) return null;

  return new Response(null, {
    status: 301,
    headers: {
      location: url.toString(),
      "cache-control": "no-store",
      "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    },
  });
}
