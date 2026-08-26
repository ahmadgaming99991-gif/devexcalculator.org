/**
 * What a localized page actually sends: its URLs, its cluster, its schema.
 *
 * Five separate things could be checked from source and each would pass while
 * the served page was wrong, because every one of them is assembled at render
 * time from several places that have to agree. So this reads the HTML, the
 * same way `detect-language-leakage` does, and asks the questions a search
 * engine will ask:
 *
 *   **Route parity.** Every indexable English route exists in every renderable
 *   language, at the prefixed address, with a 200. A missing translation is a
 *   dead link from the language selector and a gap in the cluster.
 *
 *   **`<html lang>` and `dir`.** The one attribute that tells a screen reader
 *   which language to pronounce, and the one that decides which way the page
 *   flows. Wrong here and everything downstream is decoration.
 *
 *   **Canonical.** Points at this page's own localized URL. A Spanish page
 *   canonicalising to the English one asks a search engine to drop it, and it
 *   will.
 *
 *   **hreflang.** Either absent entirely — correct while English is the only
 *   public language — or a complete cluster that names itself and carries
 *   `x-default`. A cluster missing the page it is on is ignored wholesale, and
 *   a cluster that names an unpublished language advertises it.
 *
 *   **Internal links stay in the language.** A link from a German page to an
 *   English URL drops the reader out of their language mid-journey, and it is
 *   the single easiest thing to get wrong: one `href="/devex-rates/"` written
 *   without `localizedPath` and nothing else notices.
 *
 *   **Schema.** The JSON-LD `inLanguage` matches the page, and every `@id` and
 *   `url` in it points at the localized address rather than the English one.
 *
 *   **The `noindex` rule.** A locale awaiting native review must carry
 *   `noindex` whatever else is true — `ENABLE_REVIEW_LOCALES` decides whether
 *   these pages render, never whether they may be indexed.
 *
 * Needs a running server:
 *
 *     ENABLE_REVIEW_LOCALES=true npm run build && npm start -- --port 3210
 *     npm run validate:localized-html http://127.0.0.1:3210
 */

import { DEFAULT_LOCALE, getLocaleMeta } from "../../src/i18n/config";
import { renderableLocales, isPubliclyVisible, publicLocales } from "../../src/i18n/visibility";
import { localizedPath, getLocaleFromPath } from "../../src/i18n/locale-path";
import { indexableRoutes } from "../../src/lib/content/route-registry";
import { siteConfig } from "../../src/config/site";
import type { Locale } from "../../src/i18n/types";

const origin = process.argv[2] ?? "";
if (!/^https?:\/\//.test(origin)) {
  console.error(
    "Usage: tsx scripts/i18n/validate-localized-html.ts <origin>\n" +
      "The origin must be a running server built with ENABLE_REVIEW_LOCALES=true.",
  );
  process.exit(1);
}

const problems: string[] = [];
const note = (where: string, what: string): void => {
  problems.push(`  ${where}\n      ${what}`);
};

function attr(tag: string, name: string): string | null {
  const match = new RegExp(`${name}="([^"]*)"`).exec(tag);
  return match?.[1] ?? null;
}

/** Every `<link rel="alternate" hreflang>` in the document. */
function hreflangs(html: string): { hreflang: string; href: string }[] {
  const rows: { hreflang: string; href: string }[] = [];
  for (const match of html.matchAll(/<link[^>]*rel="alternate"[^>]*>/g)) {
    const tag = match[0];
    const hreflang = attr(tag, "hreflang");
    const href = attr(tag, "href");
    if (hreflang && href) rows.push({ hreflang, href });
  }
  return rows;
}

/** The `href`s of anchors in the document body, absolute or root-relative. */
function internalLinks(html: string): string[] {
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/i, " ");
  const hrefs: string[] = [];
  for (const match of body.matchAll(/<a[^>]*href="([^"]+)"/g)) {
    const href = match[1] ?? "";
    if (href.startsWith("/")) hrefs.push(href);
    else if (href.startsWith(siteConfig.url)) hrefs.push(href.slice(siteConfig.url.length) || "/");
  }
  return hrefs;
}

/** Every JSON-LD block, parsed. */
function jsonLd(html: string): unknown[] {
  const blocks: unknown[] = [];
  for (const match of html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
  )) {
    try {
      blocks.push(JSON.parse(match[1] ?? ""));
    } catch {
      blocks.push(null);
    }
  }
  return blocks;
}

/** Every string value under `@id`, `url` or `inLanguage`, at any depth. */
function collect(node: unknown, key: string, into: string[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collect(item, key, into);
    return;
  }
  if (node !== null && typeof node === "object") {
    for (const [name, value] of Object.entries(node as Record<string, unknown>)) {
      if (name === key && typeof value === "string") into.push(value);
      else collect(value, key, into);
    }
  }
}

/**
 * Addresses that are the same in every language on purpose.
 *
 * The API is one contract with one address, and a feed is one document. A link
 * to either from a German page is not a link that lost its language.
 */
const LANGUAGE_NEUTRAL =
  /^\/(api\/|feed\.(xml|json)|sitemap\.xml|robots\.txt|llms\.txt|indexnow|og\/|_next\/|icon|apple-|manifest)/;

const routes = indexableRoutes.map((record) => record.route);
const targets = renderableLocales().filter((meta) => meta.locale !== DEFAULT_LOCALE);

console.log(
  `localized HTML — ${routes.length} route(s) × ${targets.length} locale(s)\n`,
);

async function checkPage(locale: Locale, route: string): Promise<void> {
  const meta = getLocaleMeta(locale);
  const path = localizedPath(locale, route);
  const where = `${locale}  ${path}`;

  const response = await fetch(`${origin}${path}`);
  if (!response.ok) {
    note(where, `HTTP ${response.status} — the route has no page in this language`);
    return;
  }
  const html = await response.text();

  // --- <html lang> and dir -------------------------------------------------
  const htmlTag = /<html[^>]*>/.exec(html)?.[0] ?? "";
  if (attr(htmlTag, "lang") !== meta.htmlLang) {
    note(where, `<html lang> is "${attr(htmlTag, "lang")}", expected "${meta.htmlLang}"`);
  }
  if (attr(htmlTag, "dir") !== meta.direction) {
    note(where, `<html dir> is "${attr(htmlTag, "dir")}", expected "${meta.direction}"`);
  }

  // --- canonical -----------------------------------------------------------
  const canonicalTag = /<link[^>]*rel="canonical"[^>]*>/.exec(html)?.[0] ?? "";
  const canonical = attr(canonicalTag, "href");
  const expectedCanonical = `${siteConfig.url}${path}`;
  if (canonical !== expectedCanonical) {
    note(where, `canonical is "${canonical}", expected "${expectedCanonical}"`);
  }

  // --- robots --------------------------------------------------------------
  const robots = /<meta[^>]*name="robots"[^>]*>/.exec(html)?.[0] ?? "";
  const content = attr(robots, "content") ?? "";
  if (!isPubliclyVisible(locale) && !content.includes("noindex")) {
    note(
      where,
      `locale status is "${meta.status}" and the page is not noindex (robots: "${content}")`,
    );
  }

  // --- hreflang ------------------------------------------------------------
  const cluster = hreflangs(html);
  const publicSet = publicLocales();
  if (publicSet.length < 2) {
    if (cluster.length > 0) {
      note(where, `${cluster.length} hreflang link(s) with only one public language`);
    }
  } else {
    for (const other of publicSet) {
      if (!cluster.some((row) => row.hreflang === other.hreflang)) {
        note(where, `hreflang cluster is missing "${other.hreflang}"`);
      }
    }
    if (!cluster.some((row) => row.hreflang === "x-default")) {
      note(where, "hreflang cluster has no x-default");
    }
    for (const row of cluster) {
      if (row.hreflang === "x-default") continue;
      if (!publicSet.some((other) => other.hreflang === row.hreflang)) {
        note(where, `hreflang names "${row.hreflang}", which is not a public language`);
      }
    }
  }

  // --- internal links stay in the language --------------------------------
  const strayed = new Set<string>();
  for (const href of internalLinks(html)) {
    const target = href.split(/[?#]/)[0] ?? "";
    if (LANGUAGE_NEUTRAL.test(target)) continue;
    if (getLocaleFromPath(target) !== locale) strayed.add(target);
  }
  for (const href of [...strayed].slice(0, 5)) {
    note(where, `links to "${href}", which is not in this language`);
  }

  // --- schema --------------------------------------------------------------
  for (const block of jsonLd(html)) {
    if (block === null) {
      note(where, "a JSON-LD block is not valid JSON");
      continue;
    }
    const languages: string[] = [];
    collect(block, "inLanguage", languages);
    for (const value of languages) {
      if (value !== meta.bcp47) {
        note(where, `schema inLanguage is "${value}", expected "${meta.bcp47}"`);
      }
    }
    const urls: string[] = [];
    collect(block, "@id", urls);
    collect(block, "url", urls);
    for (const value of urls) {
      if (!value.startsWith(siteConfig.url)) continue;
      const rest = value.slice(siteConfig.url.length).split("#")[0] ?? "";
      if (rest === "" || LANGUAGE_NEUTRAL.test(rest)) continue;
      if (getLocaleFromPath(rest) !== locale) {
        note(where, `schema points at "${rest}", which is not in this language`);
      }
    }
  }
}

async function main(): Promise<void> {
  for (const meta of targets) {
    const before = problems.length;
    for (const route of routes) {
      await checkPage(meta.locale, route);
    }
    const found = problems.length - before;
    console.log(
      `  ${meta.locale.padEnd(6)} ${routes.length} route(s)  ` +
        (found === 0 ? "ok" : `${found} problem(s)`),
    );
  }

  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s):\n`);
    for (const problem of problems.slice(0, 60)) console.error(problem);
    if (problems.length > 60) console.error(`  … and ${problems.length - 60} more`);
    console.error("\nLocalized HTML check failed.");
    process.exit(1);
  }
  console.log("\nLocalized HTML checks passed.");
}

void main();
