/**
 * A minimal Search Console client: a signed JWT, and two queries.
 *
 * Shared by `inspect-index-status.ts` and `query-demand-gap.ts`, which had
 * begun to carry the same thirty lines of handshake between them. One place
 * that knows how to authenticate is also one place to audit when the question
 * is "what can this credential do".
 *
 * The scope is `webmasters.readonly` and nothing here accepts a wider one. The
 * credential cannot submit a sitemap, request removal, or change a setting.
 *
 * No dependency: `googleapis` would add a large transitive tree to a repository
 * that tracks its Worker to the byte, for a signature `node:crypto` produces in
 * four lines.
 */

import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export interface ServiceAccount {
  readonly client_email: string;
  readonly private_key: string;
}

export interface SearchAnalyticsRow {
  readonly keys: readonly string[];
  readonly clicks: number;
  readonly impressions: number;
  readonly ctr: number;
  readonly position: number;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * The key file, named by path in `.claude/deploy.env` and living outside the
 * repository. Exits with the setup instructions rather than a stack trace,
 * because a tool that needs a credential to do anything at all is a tool whose
 * error message is most of its interface.
 */
export function loadServiceAccount(): ServiceAccount {
  const configured = process.env.GOOGLE_SC_KEY_FILE?.trim();
  if (!configured) {
    console.error("\nGOOGLE_SC_KEY_FILE is not set.");
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

/** Service account → access token. The assertion is never written anywhere. */
export async function accessToken(account: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({ iss: account.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${base64url(signer.sign(account.private_key))}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const body = (await response.json()) as { access_token?: string; error_description?: string };
  if (!response.ok || !body.access_token) {
    // Google's message, never anything derived from the key.
    throw new Error(`Token request failed (HTTP ${response.status}): ${body.error_description ?? "no detail"}`);
  }
  return body.access_token;
}

/**
 * Search Analytics: what people searched, and where this site appeared.
 *
 * Google withholds queries below a privacy threshold, so this is a sample of
 * the real demand rather than all of it — which matters when reading the
 * result, and is why the reports built on it rank by impressions instead of
 * claiming totals.
 */
export async function searchAnalytics(
  token: string,
  siteUrl: string,
  body: Record<string, unknown>,
): Promise<SearchAnalyticsRow[]> {
  const response = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Search Analytics failed (HTTP ${response.status}): ${detail.slice(0, 200)}`);
  }
  const parsed = (await response.json()) as { rows?: SearchAnalyticsRow[] };
  return parsed.rows ?? [];
}

/** The property as Search Console names it. */
export function propertyUrl(origin: string): string {
  return origin.endsWith("/") ? origin : `${origin}/`;
}
