/**
 * Asks Google, page by page, whether it is actually indexed — and if not, why.
 *
 * Everything else in this repository controls what the site *offers* a crawler:
 * the sitemap, the canonicals, the hreflang cluster, IndexNow. None of it can
 * tell you what Google *did*, and Google indexes what it wants. A sitemap
 * submission is a suggestion; the URL Inspection API is the only way to read
 * the answer back, and it returns the same verdict Search Console shows a
 * person, one URL at a time, up to 2,000 a day per property.
 *
 * So this is the measurement half. It changes nothing about the site. It reads
 * the sitemap, asks about every URL in it, and writes down which pages Google
 * has, which it has seen and declined, and which it has never fetched — with
 * the reason Google gives, not a guess.
 *
 * **Read-only, and scoped that way.** The token is requested with
 * `webmasters.readonly`, so this credential cannot submit a sitemap, cannot
 * remove a URL, and cannot change a setting even if something here were wrong.
 *
 * **No dependency.** The service-account handshake is a signed JWT exchanged
 * for an access token — about thirty lines with `node:crypto`. Pulling in
 * `googleapis` for that would add a large transitive tree to a repository whose
 * Worker budget is already tracked to the byte.
 *
 * Setup, once, by the owner — see `docs/seo/index-coverage.md`:
 *
 *   1. Create a Google Cloud service account and download its JSON key.
 *   2. Enable the Search Console API on that project.
 *   3. In Search Console, add the service account's email as a **Full** user
 *      on the property. Without this every call returns 403.
 *   4. Put the key file OUTSIDE the repository and name it in
 *      `.claude/deploy.env` as `GOOGLE_SC_KEY_FILE`.
 *
 * Usage:
 *
 *   npm run seo:index-status              # every URL in the sitemap
 *   npm run seo:index-status -- --limit=50
 *   npm run seo:index-status -- --only-problems
 */

import { createSign } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { siteConfig } from "../../src/config/site";

const ROOT = process.cwd();
/** Git-ignored: this is the owner's data about their own property. */
const OUT_DIR = join(ROOT, "private");
const OUT = join(OUT_DIR, "index-status.json");

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const INSPECT_URL = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

/** Google's documented ceiling. Stopping short of it is deliberate. */
const DAILY_QUOTA = 2000;
/** Well under the per-minute limit; the run is not time-critical. */
const DELAY_MS = 350;

interface ServiceAccount {
  readonly client_email: string;
  readonly private_key: string;
}

interface Inspection {
  readonly url: string;
  /** Google's own verdict string, e.g. "PASS", "NEUTRAL", "FAIL". */
  readonly verdict: string;
  /** e.g. "Submitted and indexed", "Crawled - currently not indexed". */
  readonly coverageState: string;
  readonly lastCrawlTime: string | null;
  readonly googleCanonical: string | null;
  readonly userCanonical: string | null;
  readonly robotsTxtState: string | null;
  readonly indexingState: string | null;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Service account → access token.
 *
 * A JWT the account signs about itself, exchanged at Google's token endpoint.
 * The assertion is valid for an hour and is never written to disk.
 */
async function accessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );

  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = base64url(signer.sign(account.private_key));
  const assertion = `${header}.${claims}.${signature}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const body = (await response.json()) as { access_token?: string; error_description?: string };
  if (!response.ok || !body.access_token) {
    /*
     * The message is Google's, not the assertion. A failed handshake must not
     * echo back anything derived from the key.
     */
    throw new Error(
      `Token request failed (HTTP ${response.status}): ${body.error_description ?? "no detail"}`,
    );
  }
  return body.access_token;
}

async function inspect(url: string, token: string): Promise<Inspection | { url: string; error: string }> {
  const response = await fetch(INSPECT_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      inspectionUrl: url,
      siteUrl: siteConfig.url.endsWith("/") ? siteConfig.url : `${siteConfig.url}/`,
    }),
  });

  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    return { url, error: `HTTP ${response.status}: ${detail?.error?.message ?? "no detail"}` };
  }

  const body = (await response.json()) as {
    inspectionResult?: {
      indexStatusResult?: Record<string, string | undefined>;
    };
  };
  const result = body.inspectionResult?.indexStatusResult ?? {};
  return {
    url,
    verdict: result.verdict ?? "UNKNOWN",
    coverageState: result.coverageState ?? "unknown",
    lastCrawlTime: result.lastCrawlTime ?? null,
    googleCanonical: result.googleCanonical ?? null,
    userCanonical: result.userCanonical ?? null,
    robotsTxtState: result.robotsTxtState ?? null,
    indexingState: result.indexingState ?? null,
  };
}

function loadAccount(): ServiceAccount {
  const configured = process.env.GOOGLE_SC_KEY_FILE?.trim();
  if (!configured) {
    console.error("\nGOOGLE_SC_KEY_FILE is not set.\n");
    console.error("  This needs a Google service account with Search Console access.");
    console.error("  One-time setup: docs/seo/index-coverage.md\n");
    process.exit(1);
  }
  if (!existsSync(configured)) {
    console.error(`\nNo service-account key at ${configured}\n`);
    process.exit(1);
  }
  const parsed = JSON.parse(readFileSync(configured, "utf8")) as ServiceAccount;
  if (!parsed.client_email || !parsed.private_key) {
    console.error("\nThat file is not a service-account key: no client_email / private_key.\n");
    process.exit(1);
  }
  return parsed;
}

async function sitemapUrls(): Promise<string[]> {
  const response = await fetch(`${siteConfig.url}/sitemap.xml`, { cache: "no-store" });
  const xml = await response.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1])
    .filter((loc): loc is string => loc !== undefined);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith("--limit="));
  const onlyProblems = args.includes("--only-problems");
  const limit = limitArg ? Number(limitArg.slice("--limit=".length)) : DAILY_QUOTA;

  const account = loadAccount();
  const token = await accessToken(account);
  const urls = (await sitemapUrls()).slice(0, Math.min(limit, DAILY_QUOTA));

  console.log(`Inspecting ${urls.length} URL(s) as ${account.client_email}\n`);

  const results: (Inspection | { url: string; error: string })[] = [];
  for (const [index, url] of urls.entries()) {
    const result = await inspect(url, token);
    results.push(result);

    const line =
      "error" in result
        ? `  ${result.error}  ${url}`
        : `  ${result.coverageState.padEnd(38)} ${url}`;
    const indexed = !("error" in result) && result.coverageState.toLowerCase().includes("indexed")
      && !result.coverageState.toLowerCase().includes("not indexed");
    if (!onlyProblems || !indexed) console.log(line);

    if ((index + 1) % 25 === 0) console.log(`  … ${index + 1}/${urls.length}`);
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }

  const errors = results.filter((r): r is { url: string; error: string } => "error" in r);
  const ok = results.filter((r): r is Inspection => !("error" in r));
  const indexed = ok.filter(
    (r) =>
      r.coverageState.toLowerCase().includes("indexed") &&
      !r.coverageState.toLowerCase().includes("not indexed"),
  );
  const canonicalMismatch = ok.filter(
    (r) => r.googleCanonical && r.userCanonical && r.googleCanonical !== r.userCanonical,
  );

  const byState = new Map<string, number>();
  for (const r of ok) byState.set(r.coverageState, (byState.get(r.coverageState) ?? 0) + 1);

  console.log(`\n${"-".repeat(56)}`);
  console.log(`inspected            ${ok.length}`);
  console.log(`indexed              ${indexed.length}`);
  console.log(`not indexed          ${ok.length - indexed.length}`);
  console.log(`canonical mismatch   ${canonicalMismatch.length}`);
  if (errors.length > 0) console.log(`errors               ${errors.length}`);
  console.log("\nby state:");
  for (const [state, count] of [...byState.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(count).padStart(4)}  ${state}`);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    OUT,
    `${JSON.stringify(
      {
        $comment:
          "What Google reports about each URL in the sitemap. The owner's data about their own property — /private/ is git-ignored.",
        inspectedAt: new Date().toISOString(),
        totals: {
          inspected: ok.length,
          indexed: indexed.length,
          notIndexed: ok.length - indexed.length,
          canonicalMismatch: canonicalMismatch.length,
          errors: errors.length,
        },
        results,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.log(`\nwritten to private/index-status.json`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
