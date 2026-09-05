/**
 * Which Robux amounts people search for, and which of them have no page.
 *
 * The conversion pages exist because a reader who types "how much is 100k
 * robux" wants one number, not a calculator to operate. Which amounts to
 * publish, though, was a guess — eight round figures — and the search data says
 * the guess was only partly right.
 *
 * Ninety days of Search Console, read on 2026-09-05: the site's *best* position
 * on any query, 8.3, was for `1.5m robux to usd` — an amount with no page of
 * its own, ranking on a generic one. `75k`, `9k`, `31000` and `3 million` were
 * all searched too, and none has a page. Meanwhile `700 usd to robux` was
 * searched and the site has no per-amount page in that direction at all.
 *
 * So this stops the guessing. It reads the queries, pulls the amount out of
 * each one, and reports the amounts with real demand that no page answers —
 * ranked by impressions, so the list is a priority order rather than an
 * inventory.
 *
 * **This proposes; it does not publish.** A page still has to be added
 * deliberately, because a page per permutation is the thin-content pattern
 * Google is right to punish. The point of reading the data first is that
 * every page added has a query behind it.
 *
 * Usage:
 *
 *   npm run seo:demand-gap
 *   npm run seo:demand-gap -- --days=28
 */

import { indexableRoutes } from "../../src/lib/content/route-registry";
import { siteConfig } from "../../src/config/site";
import {
  accessToken,
  loadServiceAccount,
  propertyUrl,
  searchAnalytics,
  type SearchAnalyticsRow,
} from "./search-console-client";

interface Demand {
  readonly amount: number;
  readonly direction: "robux-to-usd" | "usd-to-robux";
  impressions: number;
  clicks: number;
  /** Best (lowest) position seen across the queries that mentioned it. */
  bestPosition: number;
  readonly queries: string[];
}

/**
 * Pulls a number out of a query.
 *
 * Handles what people actually type: `100k`, `1.5m`, `30000`, `3 million`,
 * `9k`. The multiplier suffixes matter — half of the amounts in the sample were
 * written in shorthand, and reading `1.5m` as `1` would have put a real query
 * in the wrong bucket entirely.
 */
function amountIn(query: string): number | null {
  const match = /(\d[\d,.]*)\s*(k|m|thousand|million)?\b/i.exec(query);
  if (!match) return null;

  const digits = Number(match[1]?.replace(/,/g, ""));
  if (!Number.isFinite(digits) || digits <= 0) return null;

  const suffix = match[2]?.toLowerCase();
  const scaled =
    suffix === "k" || suffix === "thousand"
      ? digits * 1_000
      : suffix === "m" || suffix === "million"
        ? digits * 1_000_000
        : digits;

  // Not an amount worth a page: years, rate figures, ordinary small numbers.
  if (!Number.isInteger(scaled) || scaled < 1_000 || scaled > 1_000_000_000) return null;
  return scaled;
}

/** Which way round the reader is asking. */
function directionOf(query: string): Demand["direction"] | null {
  const q = query.toLowerCase();
  const robuxFirst = /robux\s*(to|in|into)\s*(usd|dollar|cash|money|\$)/.test(q) || /how much (is|money)/.test(q);
  const usdFirst = /(usd|dollar|\$)\s*(to|in|into)\s*robux/.test(q);
  if (usdFirst) return "usd-to-robux";
  if (robuxFirst || q.includes("robux")) return "robux-to-usd";
  return null;
}

/** Amounts that already have a page, from the registry rather than a guess. */
function publishedAmounts(): Set<string> {
  const published = new Set<string>();
  for (const record of indexableRoutes) {
    const match = /\/conversions\/(\d+)-(robux-to-usd|usd-to-robux)\/?$/.exec(record.route);
    if (match) published.add(`${match[1]}:${match[2]}`);
  }
  return published;
}

async function main(): Promise<void> {
  const daysArg = process.argv.find((a) => a.startsWith("--days="));
  const days = daysArg ? Number(daysArg.slice("--days=".length)) : 90;

  const account = loadServiceAccount();
  const token = await accessToken(account);

  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

  const rows: SearchAnalyticsRow[] = await searchAnalytics(token, propertyUrl(siteConfig.url), {
    startDate: start,
    endDate: end,
    dimensions: ["query"],
    rowLimit: 1000,
  });

  console.log(`Search Console, ${start} to ${end} — ${rows.length} quer${rows.length === 1 ? "y" : "ies"}\n`);
  if (rows.length === 0) {
    console.log("  No query data yet. Google reports queries only once pages have impressions.");
    return;
  }

  const demand = new Map<string, Demand>();
  for (const row of rows) {
    const query = row.keys[0] ?? "";
    const amount = amountIn(query);
    const direction = directionOf(query);
    if (amount === null || direction === null) continue;

    const key = `${amount}:${direction}`;
    const existing = demand.get(key);
    if (existing) {
      existing.impressions += row.impressions;
      existing.clicks += row.clicks;
      existing.bestPosition = Math.min(existing.bestPosition, row.position);
      existing.queries.push(query);
    } else {
      demand.set(key, {
        amount,
        direction,
        impressions: row.impressions,
        clicks: row.clicks,
        bestPosition: row.position,
        queries: [query],
      });
    }
  }

  const published = publishedAmounts();
  const ranked = [...demand.entries()].sort((a, b) => b[1].impressions - a[1].impressions);
  const missing = ranked.filter(([key]) => !published.has(key));
  const covered = ranked.filter(([key]) => published.has(key));

  console.log(`amounts searched      ${ranked.length}`);
  console.log(`already have a page   ${covered.length}`);
  console.log(`no page               ${missing.length}\n`);

  if (missing.length > 0) {
    console.log("Searched, with no page of its own — most impressions first:\n");
    for (const [, d] of missing) {
      console.log(
        `  ${String(d.impressions).padStart(4)} impr  pos ${d.bestPosition.toFixed(1).padStart(5)}  ` +
          `${d.amount.toLocaleString("en-US").padStart(12)}  ${d.direction}`,
      );
      console.log(`        ${d.queries.slice(0, 3).join(" · ")}`);
    }
    console.log(
      "\nA position already in the teens on a query with no dedicated page is the\n" +
        "strongest case for adding one: the ranking exists on a generic page.\n",
    );
  }

  if (covered.length > 0) {
    console.log("Searched, and already has a page:\n");
    for (const [, d] of covered) {
      console.log(
        `  ${String(d.impressions).padStart(4)} impr  pos ${d.bestPosition.toFixed(1).padStart(5)}  ` +
          `${d.amount.toLocaleString("en-US").padStart(12)}  ${d.direction}`,
      );
    }
  }

  console.log(
    "\nGoogle withholds low-volume queries, so this is a sample of demand, not all\n" +
      "of it. Add pages the data asks for; a page per permutation is the thin-content\n" +
      "pattern this report exists to avoid.",
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
