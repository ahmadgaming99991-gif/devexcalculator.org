/**
 * Every page the build produced is either in the sitemap or deliberately not.
 *
 * The sitemap is generated from the route registry, so it cannot drift from
 * *itself*. What it can drift from is the site: add a route and forget the
 * registry entry and the page ships, renders, is linked, and is invisible to
 * the one file that tells a crawler it exists. Nothing failed when that
 * happened, because nothing compared the two lists.
 *
 * So this compares them, in both directions, against the real build output
 * rather than against the source the sitemap is already derived from — which
 * would be tautological and would pass while the site was wrong.
 *
 *   - A built page missing from the sitemap is an error, unless it is named
 *     below as one that must never be indexed.
 *   - A sitemap URL with no built page is an error: it is a link to a 404,
 *     handed to a crawler on purpose.
 *   - A sitemap URL whose page carries `noindex` is an error, and the worst of
 *     the three — the sitemap asks for indexing and the page refuses it, which
 *     is a contradiction Search Console reports as an error against the domain.
 *
 * `lastmod` is checked for shape only. Whether the date is *true* is
 * `validate:freshness`'s job, and duplicating it here would mean two answers to
 * one question.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const APP = join(ROOT, ".next/server/app");
const SITEMAP = join(APP, "sitemap.xml.body");

/**
 * Pages that are built and must stay out of the sitemap.
 *
 * Next's own error routes. They are real HTML files with no URL a reader
 * reaches deliberately, and submitting an error page for indexing is how a site
 * ends up ranking for its own 404.
 */
const NEVER_INDEXED = new Set(["/_not-found/", "/_global-error/"]);

function builtPages(): Map<string, string> {
  const pages = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".html")) continue;
      const route = full
        .slice(APP.length)
        .replace(/\\/g, "/")
        .replace(/\/index\.html$/, "/")
        .replace(/\.html$/, "/");
      pages.set(route === "" ? "/" : route, full);
    }
  };
  walk(APP);
  return pages;
}

function sitemapEntries(): { path: string; lastmod: string | null }[] {
  const xml = readFileSync(SITEMAP, "utf8");
  const entries: { path: string; lastmod: string | null }[] = [];
  for (const block of xml.split("<url>").slice(1)) {
    const loc = /<loc>([^<]+)<\/loc>/.exec(block)?.[1];
    if (!loc) continue;
    const lastmod = /<lastmod>([^<]+)<\/lastmod>/.exec(block)?.[1] ?? null;
    const path = new URL(loc).pathname;
    entries.push({ path: path.endsWith("/") ? path : `${path}/`, lastmod });
  }
  return entries;
}

function main(): void {
  if (!existsSync(SITEMAP)) {
    console.error(`No sitemap at ${SITEMAP}. Run \`npm run build\` first.`);
    process.exit(1);
  }

  const pages = builtPages();
  const entries = sitemapEntries();
  const listed = new Set(entries.map((entry) => entry.path));

  const problems: string[] = [];

  for (const route of [...pages.keys()].sort()) {
    if (listed.has(route) || NEVER_INDEXED.has(route)) continue;
    problems.push(`built but not in the sitemap: ${route}`);
  }

  for (const { path, lastmod } of entries) {
    if (!pages.has(path)) {
      problems.push(`in the sitemap but not built: ${path}`);
      continue;
    }
    if (NEVER_INDEXED.has(path)) {
      problems.push(`in the sitemap but must never be indexed: ${path}`);
    }
    if (lastmod === null) {
      problems.push(`no lastmod: ${path}`);
    } else if (Number.isNaN(Date.parse(lastmod))) {
      problems.push(`lastmod is not a date (${lastmod}): ${path}`);
    }

    /*
     * The contradiction worth failing a build over. A page can acquire
     * `noindex` from a change nowhere near the sitemap — a locale moving back
     * into review, a route being retired — and the sitemap would go on asking
     * for it.
     */
    const html = readFileSync(pages.get(path) as string, "utf8");
    const robots = /<meta name="robots" content="([^"]*)"/.exec(html)?.[1] ?? "";
    if (/noindex/i.test(robots)) {
      problems.push(`in the sitemap but the page says noindex: ${path}`);
    }
  }

  console.log(`Sitemap coverage — ${entries.length} URL(s), ${pages.size} built page(s)`);

  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s):\n`);
    for (const problem of problems.slice(0, 40)) console.error(`  ${problem}`);
    if (problems.length > 40) console.error(`  ...and ${problems.length - 40} more`);
    console.error(
      "\nA page that is built and indexable belongs in the sitemap. If it must not be,\n" +
        "add it to NEVER_INDEXED in this file with the reason.\n",
    );
    process.exit(1);
  }

  const excluded = [...pages.keys()].filter((route) => NEVER_INDEXED.has(route));
  console.log(`  every built page accounted for; ${excluded.length} deliberately excluded`);
}

main();
