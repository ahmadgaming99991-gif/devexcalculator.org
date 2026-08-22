/**
 * IndexNow submission.
 *
 * IndexNow is a shared endpoint that tells participating search engines a URL
 * has changed, instead of waiting for them to come back and look. Bing, Yandex,
 * Seznam and Naver participate.
 *
 * **It does not submit anything to Google.** Google has never joined IndexNow
 * and has said so publicly. Running this is not a substitute for Search
 * Console, and no output here implies otherwise.
 *
 * Three rules this script exists to enforce, because the endpoint itself will
 * happily accept anything:
 *
 *   - **Only canonical, indexable pages.** URLs come from the route registry,
 *     never from a hand-typed list, so an API endpoint, a noindex route or a
 *     query-string state cannot be submitted by accident.
 *   - **Only what actually changed.** Submitting every page after every small
 *     edit is how a site teaches a crawler to ignore it. The default is the set
 *     of routes whose `dateModified` is the newest in the registry — that is,
 *     the ones this release actually touched — and submitting more than a
 *     quarter of the site needs `--all` said out loud.
 *   - **Nothing at all without a key.** Unset is the normal state, and it
 *     exits cleanly rather than failing a pipeline.
 *
 * Usage:
 *
 *   INDEXNOW_KEY=... npx tsx scripts/seo/indexnow.ts            # this release
 *   INDEXNOW_KEY=... npx tsx scripts/seo/indexnow.ts --since=2026-08-20
 *   INDEXNOW_KEY=... npx tsx scripts/seo/indexnow.ts --all
 *   npx tsx scripts/seo/indexnow.ts --dry-run                   # prints, sends
 *                                                               # nothing
 */

import { indexableRoutes } from "../../src/lib/content/route-registry";
import { isBulkSubmission, selectRoutes } from "../../src/lib/seo/indexnow";
import { siteConfig, absoluteUrl } from "../../src/config/site";

const ENDPOINT = "https://api.indexnow.org/indexnow";

/** The endpoint's own cap on one submission. */
const MAX_URLS_PER_REQUEST = 10_000;

interface Options {
  readonly since: string | null;
  readonly all: boolean;
  readonly dryRun: boolean;
}

function parseArgs(argv: readonly string[]): Options {
  let since: string | null = null;
  let all = false;
  let dryRun = false;

  for (const arg of argv) {
    if (arg === "--all") all = true;
    else if (arg === "--dry-run") dryRun = true;
    else if (arg.startsWith("--since=")) since = arg.slice("--since=".length).trim();
    else {
      console.error(`Unrecognised argument: ${arg}`);
      process.exit(2);
    }
  }

  if (since !== null && !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
    console.error(`--since needs a YYYY-MM-DD date, not "${since}".`);
    process.exit(2);
  }

  return { since, all, dryRun };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const key = process.env.INDEXNOW_KEY?.trim();

  if (!key && !options.dryRun) {
    // Not an error. Unconfigured is the ordinary state, and a pipeline that
    // includes this step must not go red because an optional integration is
    // off.
    console.log("INDEXNOW_KEY is not set — nothing submitted. This is not a failure.");
    return;
  }

  const routes = selectRoutes({ all: options.all, since: options.since });
  if (routes.length === 0) {
    console.log("No routes matched — nothing to submit.");
    return;
  }

  if (!options.all && isBulkSubmission(routes.length)) {
    const share = Math.round((routes.length / indexableRoutes.length) * 100);
    console.error(
      `Refusing to submit ${routes.length} of ${indexableRoutes.length} routes ` +
        `(${share}%). Submitting most of a site as "changed" is ` +
        `how a crawler learns to discount these notifications. Pass --all if that ` +
        `is genuinely what happened.`,
    );
    process.exit(1);
  }

  const urls = routes.map((route) => absoluteUrl(route)).slice(0, MAX_URLS_PER_REQUEST);

  console.log(`IndexNow — ${urls.length} URL${urls.length === 1 ? "" : "s"}:`);
  for (const url of urls) console.log(`  ${url}`);
  console.log(
    "\nParticipating engines include Bing, Yandex, Seznam and Naver. " +
      "Google does not participate in IndexNow; this submits nothing to it.",
  );

  if (options.dryRun) {
    console.log("\n--dry-run: nothing was sent.");
    return;
  }

  const body = {
    host: siteConfig.host,
    key,
    keyLocation: absoluteUrl("/indexnow.txt"),
    urlList: urls,
  };

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error(`\nSubmission failed to send: ${(error as Error).message}`);
    process.exit(1);
  }

  // 200 accepted, 202 accepted but the key is still being verified. Anything
  // else is reported with the endpoint's own words rather than a guess.
  if (response.status === 200 || response.status === 202) {
    console.log(`\nAccepted (${response.status}). ${describeStatus(response.status)}`);
    return;
  }

  const text = await response.text().catch(() => "");
  console.error(`\nRejected (${response.status}). ${describeStatus(response.status)}`);
  if (text.trim()) console.error(text.trim().slice(0, 500));
  process.exit(1);
}

function describeStatus(status: number): string {
  switch (status) {
    case 200:
      return "The URLs were received.";
    case 202:
      return "Received; the key file has not been verified yet.";
    case 400:
      return "The request was malformed.";
    case 403:
      return `The key was not accepted. Check that ${absoluteUrl("/indexnow.txt")} serves it.`;
    case 422:
      return "A URL did not belong to this host, or the key did not match.";
    case 429:
      return "Too many submissions. Submit what changed, not the whole site.";
    default:
      return "Unexpected response.";
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
