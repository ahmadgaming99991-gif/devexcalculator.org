/**
 * Upgrading a plain HTTP request to HTTPS, before anything else sees it.
 *
 * The zone's "Always Use HTTPS" setting is off and can only be changed from
 * the Cloudflare dashboard, but plain HTTP requests reach the Worker — the
 * logs are full of them — so the redirect is done in code instead. HSTS
 * already protects anyone who has visited before; this covers the first visit,
 * which is exactly the case HSTS cannot.
 *
 * 301 rather than 308: a permanent scheme upgrade for a GET, and 301 is what
 * every crawler and client already understands for it.
 *
 * Here rather than in `worker/index.ts` so it can be tested. The worker module
 * imports the generated OpenNext bundle, which only exists after a build and
 * only resolves inside wrangler; a rule this consequential should not be
 * reachable only through a deployment artefact.
 */

/**
 * The one way to switch the upgrade off, and it is deliberately awkward.
 *
 * `wrangler dev` and `opennextjs-cloudflare preview` serve over plain HTTP
 * locally, and they present the request to the Worker with the **production**
 * hostname and a `cf` object — `request.url` reads `http://devexcalculator.org/`
 * — then rewrite the `Location` of the response back to `127.0.0.1` on the way
 * out. So the Worker upgraded, the rewritten redirect pointed at the local
 * address it had just come from, and every request answered itself with a
 * permanent redirect to itself. The end-to-end suite could not reach a single
 * page, and the acceptance gate requires it to pass against the Workers
 * runtime and not only against `next start`, because the two have already
 * diverged once on this project.
 *
 * There is no signal on the request that separates that case from a genuine
 * plain-HTTP visitor: the hostname, the headers and the `cf` object are the
 * same. Sniffing for one would mean guessing, and a wrong guess here serves
 * the site over HTTP to somebody who typed the domain without a scheme.
 *
 * So it is configuration, not detection, and it has to be passed explicitly:
 *
 *     wrangler dev --var DISABLE_HTTPS_UPGRADE:1
 *
 * The variable is absent from `wrangler.jsonc`, so it does not exist in a
 * deploy. It cannot be set by a request, it leaves a visible trace in whatever
 * command turned it on, and anything other than the exact string `"1"` is
 * ignored.
 */
export interface UpgradeEnv {
  readonly DISABLE_HTTPS_UPGRADE?: string;
}

export function upgradeIsDisabled(env: UpgradeEnv | undefined): boolean {
  return env?.DISABLE_HTTPS_UPGRADE === "1";
}

/** The redirect, or null when the request needs no upgrade. */
export function upgradeToHttps(
  request: { readonly url: string },
  env?: UpgradeEnv,
): Response | null {
  if (upgradeIsDisabled(env)) return null;

  const url = new URL(request.url);
  if (url.protocol !== "http:") return null;

  url.protocol = "https:";
  return new Response(null, {
    status: 301,
    headers: {
      location: url.toString(),
      "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    },
  });
}
