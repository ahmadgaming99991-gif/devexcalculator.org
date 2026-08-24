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
 * Credentials come from the environment and are never written to a file:
 *
 *   CLOUDFLARE_API_TOKEN   a token carrying the Zone → Cache Purge permission
 *   CLOUDFLARE_ZONE_ID     the zone id for devexcalculator.org
 *
 * Neither value is ever printed, including in an error.
 */

import { routeRegistry } from "../../src/lib/content/route-registry";
import { absoluteUrl } from "../../src/config/site";

/** Cloudflare accepts at most this many URLs per purge call. */
const BATCH_SIZE = 30;

async function main(): Promise<void> {
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const zone = process.env.CLOUDFLARE_ZONE_ID?.trim();

  const urls = routeRegistry
    .filter((record) => record.rateSensitive)
    .map((record) => absoluteUrl(record.route))
    .sort();

  console.log(`Rate-sensitive routes to purge: ${urls.length}`);

  if (!token || !zone) {
    const missing = [
      ...(token ? [] : ["CLOUDFLARE_API_TOKEN"]),
      ...(zone ? [] : ["CLOUDFLARE_ZONE_ID"]),
    ];
    console.log(`\nSkipped: ${missing.join(" and ")} not set.`);
    console.log("The deploy is unaffected. These pages carry s-maxage=3600, so the edge");
    console.log("picks the change up within the hour on its own; a purge only makes it");
    console.log("immediate. To run it by hand, see docs/cache-purge.md.");
    return;
  }

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
