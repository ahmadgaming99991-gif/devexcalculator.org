/**
 * Near-duplicate content detection.
 *
 * Compares the rendered text of every indexable page against every other and
 * fails when two are too similar. The keyword-set and metadata checks in
 * `validate:seo` catch duplication in the *inputs*; this catches it in the
 * *output*, which is what a search engine actually sees.
 *
 * The eight amount pages are the real target. They share a template by
 * construction, so if their amount-specific context is ever thinned out this is
 * the check that notices.
 *
 * Method: 5-word shingles, Jaccard similarity. Chosen over a naive word-set
 * comparison because word order matters — two pages can share a vocabulary
 * entirely while saying different things, and shingles distinguish them.
 *
 * Run with `npm run validate:duplicates` against a built server.
 */
import { indexableRoutes } from "../../src/lib/content/route-registry";
import { startServer } from "../quality/server";

/** Above this, two pages say substantially the same thing. */
const FAIL_THRESHOLD = 0.7;
/** Above this, worth a look but not a failure. */
const WARN_THRESHOLD = 0.55;
const SHINGLE_SIZE = 5;

/**
 * Extracts the page's own content, excluding the header, footer and any
 * repeated boilerplate. Comparing full pages would score every pair highly
 * simply because they share navigation and a trademark disclaimer.
 */
function extractMainText(html: string): string {
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html;
  return main
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function shingles(text: string, size = SHINGLE_SIZE): Set<string> {
  const words = text.split(" ").filter(Boolean);
  const result = new Set<string>();
  for (let i = 0; i + size <= words.length; i += 1) {
    result.add(words.slice(i, i + size).join(" "));
  }
  return result;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) if (b.has(item)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

async function main(): Promise<void> {
  const server = await startServer();
  const failures: string[] = [];
  const warnings: string[] = [];

  try {
    console.log(`\nFetching ${indexableRoutes.length} pages for similarity comparison…`);

    const pages: { route: string; shingles: Set<string>; words: number }[] = [];

    for (const record of indexableRoutes) {
      const response = await fetch(`${server.baseUrl}${record.route}`);
      if (!response.ok) {
        failures.push(`${record.route} returned ${response.status}.`);
        continue;
      }
      const text = extractMainText(await response.text());
      const words = text.split(" ").length;

      // A page with almost no content is thin regardless of what it resembles.
      if (words < 150) {
        failures.push(`${record.route} has only ${words} words of body text.`);
      }

      pages.push({ route: record.route, shingles: shingles(text), words });
    }

    console.log(`  comparing ${(pages.length * (pages.length - 1)) / 2} pairs`);

    let highest = { pair: "", score: 0 };

    for (let i = 0; i < pages.length; i += 1) {
      for (let j = i + 1; j < pages.length; j += 1) {
        const a = pages[i];
        const b = pages[j];
        if (!a || !b) continue;

        const score = jaccard(a.shingles, b.shingles);
        if (score > highest.score) {
          highest = { pair: `${a.route} vs ${b.route}`, score };
        }

        if (score >= FAIL_THRESHOLD) {
          failures.push(
            `${a.route} and ${b.route} are ${(score * 100).toFixed(1)}% similar — too close to be distinct pages.`,
          );
        } else if (score >= WARN_THRESHOLD) {
          warnings.push(
            `${a.route} and ${b.route} are ${(score * 100).toFixed(1)}% similar.`,
          );
        }
      }
    }

    console.log(
      `  most similar pair: ${highest.pair} at ${(highest.score * 100).toFixed(1)}%`,
    );
    console.log(
      `  shortest page: ${Math.min(...pages.map((p) => p.words))} words · ` +
        `median ${median(pages.map((p) => p.words))} words`,
    );
  } finally {
    await server.stop();
  }

  for (const warning of warnings) console.warn(`  warning  ${warning}`);

  if (failures.length > 0) {
    console.error(`\n${failures.length} near-duplicate failure(s):`);
    for (const failure of failures) console.error(`  ERROR  ${failure}`);
    process.exit(1);
  }

  console.log(`\nNear-duplicate check passed (${warnings.length} warnings).`);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2)
    : (sorted[middle] ?? 0);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
