/**
 * Purges the edge copies of the pages whose figures expire.
 *
 * Run by `npm run purge:cache`, and wired to follow a deploy.
 *
 * **Targeted, never the whole zone.** A zone purge is one call and is the
 * wrong call: it throws away every cached asset the site has, including the
 * fingerprinted bundles under `/_next/static/` that are cached for a year
 * precisely because their contents can never change. The next visitor then
 * pays for a cold cache on everything, to fix a handful of HTML documents.
 * The list here is the rate-sensitive routes from the registry — the same
 * field that decides whether a page shows a last-verified badge, so a page
 * displaying a date it must keep current cannot be missing from it.
 *
 * **A missing token is not a failed deploy.** Purging makes a correction
 * visible sooner than the hour the cache header already guarantees; it is not
 * what makes the site correct. Somebody deploying without Cloudflare
 * credentials to hand should get a clear note about what was skipped and an
 * exit code of zero, not a red build. Exit 1 is kept for a purge that was
 * genuinely attempted and genuinely failed, which is a real signal.
 *
 * **Known limitation, measured 2026-09-03.** The API now accepts these purges
 * — the token was given `Zone → Cache Purge` and the call returns `success:
 * true` where it used to return `10000 Authentication error` — but a purge by
 * URL does not evict the HTML documents. Measured on `/devex-rates/`: a
 * successful purge, then eleven requests over sixty seconds, all `HIT` with
 * `Age` climbing from 520 to 557 on the same object.
 *
 * The cause is **Workers Assets**, not the cache key. A request matching an
 * uploaded static file is answered by the assets binding without the Worker
 * running, and every page here is prerendered, so every page is such a file.
 * A zone purge addresses the zone cache, which is not the cache answering.
 *
 * The first version of this note blamed the cache key and said the same
 * property explained `www` serving 200. That was wrong and is corrected in
 * `docs/cache-purge.md` rather than quietly dropped: the apex and `www` hold
 * separate objects for the same path — `Age: 1` against `Age: 1146` at one
 * moment — so the key does carry the host. `www` serves 200 for the same
 * reason a purge evicts nothing: the assets binding answered first, and
 * `redirectToCanonicalHost` never ran. On `www`, a path with no matching file
 * (`/api/health/`, `/no-such-page-xyz/`) does redirect, which is what pins it.
 *
 * So this script is best-effort today and the hour-long `s-maxage` is what
 * actually bounds staleness. It is kept, and kept running, because the call is
 * correct and costs nothing. There is no rule-shaped fix for the purge half;
 * the `www` half wants a Redirect Rule, which runs ahead of both Workers and
 * Assets, and is a routing change to be proposed rather than made.
 *
 * Credentials come from the environment and are never written to a file:
 *
 *   CLOUDFLARE_API_TOKEN   a token carrying the Zone → Cache Purge permission
 *   CLOUDFLARE_ZONE_ID     optional; looked up from the site's own host when
 *                          it is absent, so nobody has to paste an id
 *
 * Neither value is ever printed, including in an error.
 */

import { routeRegistry } from "../../src/lib/content/route-registry";
import { absoluteUrl, siteConfig } from "../../src/config/site";

/** Cloudflare accepts at most this many URLs per purge call. */
const BATCH_SIZE = 30;

/**
 * The zone id for the site's own host, asked for rather than configured.
 *
 * The id is not a secret and it never changes, but it is one more value to
 * copy from a dashboard into an environment, and a deploy that silently
 * skipped its purge because that one value was missing is exactly what
 * happened here: the token had been given the purge permission, the script
 * ran, and it skipped anyway. The token already proves which account it
 * belongs to, and the site already knows its own hostname, so the lookup has
 * everything it needs.
 *
 * Returns null rather than throwing. A zone that cannot be resolved is the
 * same situation as a missing token — worth reporting, not worth failing a
 * deploy over.
 */
async function resolveZoneId(token: string): Promise<string | null> {
  const host = new URL(siteConfig.url).hostname.replace(/^www\./, "");

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(host)}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    const body = (await response.json().catch(() => null)) as {
      success?: boolean;
      result?: { id?: string; name?: string }[];
    } | null;

    if (!response.ok || !body?.success) return null;
    // Matched on the name as well, so a broadened token that can see several
    // zones cannot have the site's cache purged against somebody else's.
    const zone = body.result?.find((entry) => entry.name === host);
    return typeof zone?.id === "string" ? zone.id : null;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();

  const urls = routeRegistry
    .filter((record) => record.rateSensitive)
    .map((record) => absoluteUrl(record.route))
    .sort();

  console.log(`Rate-sensitive routes to purge: ${urls.length}`);

  const skip = (reason: string): void => {
    console.log(`\nSkipped: ${reason}`);
    console.log("The deploy is unaffected. These pages carry s-maxage=3600, so the edge");
    console.log("picks the change up within the hour on its own; a purge only makes it");
    console.log("immediate. To run it by hand, see docs/cache-purge.md.");
  };

  if (!token) {
    skip("CLOUDFLARE_API_TOKEN not set.");
    return;
  }

  const configured = process.env.CLOUDFLARE_ZONE_ID?.trim();
  const zone = configured || (await resolveZoneId(token));

  if (!zone) {
    skip(
      "could not determine the zone. CLOUDFLARE_ZONE_ID is not set and the\n" +
        "token could not look it up — it needs Zone → Zone → Read for that, or\n" +
        "set CLOUDFLARE_ZONE_ID directly.",
    );
    return;
  }

  if (!configured) console.log("Zone resolved from the site's hostname.");

  const batches: string[][] = [];
  for (let index = 0; index < urls.length; index += BATCH_SIZE) {
    batches.push(urls.slice(index, index + BATCH_SIZE));
  }

  let failed = false;

  for (const [index, batch] of batches.entries()) {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ files: batch }),
      },
    );

    const body = (await response.json().catch(() => null)) as {
      success?: boolean;
      errors?: { code?: number; message?: string }[];
    } | null;

    if (response.ok && body?.success) {
      console.log(`  batch ${index + 1}/${batches.length}: purged ${batch.length} URL(s)`);
      continue;
    }

    failed = true;
    /*
     * The status and Cloudflare's own message, and nothing else. The request
     * carried the token in a header, and echoing a failed request back is how
     * a secret ends up in a CI log.
     */
    const detail =
      body?.errors
        ?.map((error) => `${error.code ?? "?"} ${error.message ?? ""}`.trim())
        .join("; ") ?? `HTTP ${response.status}`;
    console.error(`  batch ${index + 1}/${batches.length}: failed — ${detail}`);

    if (response.status === 403) {
      console.error("    A 403 here usually means the token lacks Zone → Cache Purge.");
    }
  }

  if (failed) {
    console.error("\nPurge failed. The pages are still correct — they carry s-maxage=3600");
    console.error("and the edge refreshes within the hour — but the change is not immediate.");
    process.exit(1);
  }

  console.log("\nPurge complete.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
