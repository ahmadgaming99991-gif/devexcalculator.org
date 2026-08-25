/**
 * English left in the rendered HTML of a page that is not in English.
 *
 * Every other i18n check in this repo reads source or dictionaries: the
 * inventory counts literals in `.tsx`, the coverage validator compares keys.
 * Both can be perfectly green while a reader still sees English, because
 * neither of them looks at a page. A literal can be replaced by a lookup that
 * is never reached, a component can be handed the wrong translator, a string
 * can arrive from `src/data/` instead of a dictionary. This is the check that
 * would have caught each of those, because it reads the HTML the server sends.
 *
 * **How it decides.** It counts English function words — "the", "and", "which",
 * "because" — chosen because no other launch language shares them and because
 * they are unavoidable in real English prose. A page of English scores in the
 * hundreds; a translated page scores near zero. Near zero rather than zero:
 * "Roblox", "DevEx", "Earned Robux", `no-cache`, an English document title and
 * a URL all survive translation on purpose, and several of those contain a
 * word on the list.
 *
 * So the number is a budget, not a target of nought, and the useful output is
 * not the number: it is the list of offending fragments, printed with the page
 * they came from, so a leak is something to go and fix rather than something
 * to argue with.
 *
 * Needs a server. Start one with review locales enabled and pass its origin:
 *
 *     ENABLE_REVIEW_LOCALES=true npm run build && npm start -- --port 3210
 *     npx tsx scripts/i18n/detect-language-leakage.ts http://127.0.0.1:3210
 *
 * `--budget N` sets the per-locale ceiling; the default is the value below.
 */

import { LAUNCH_LOCALES, DEFAULT_LOCALE, getLocaleMeta } from "../../src/i18n/config";
import { indexableRoutes } from "../../src/lib/content/route-registry";
import type { Locale } from "../../src/i18n/types";

/**
 * Words that mark a fragment as English.
 *
 * Deliberately function words only. Content words ("rate", "payout") appear as
 * loanwords and inside protected names, and a detector that flags those is one
 * nobody keeps green.
 */
const ENGLISH_WORDS =
  /\b(the|and|that|with|this|which|from|your|about|would|there|their|what|when|these|those|because|rather|every|into|than|only|been|were|does|not|for|are|you|its|have|has|is|of|to|at|by|on|as|or|but|if|so|no|nothing|will|can|cannot|any|each|both|more|most|some|such|then|they|them|our|per|before|after|between|through|without|under|over|how|why|who|whose|been|being|was|had|did|should|could|must|may|might)\b/gi;

/**
 * Fragments that are English on every page and are meant to be.
 *
 * Each is here because translating it would be wrong, not because translating
 * it is inconvenient. Brand and product names, the titles of the English
 * documents this site cites, HTTP header names, and code identifiers.
 */
const ALLOWED = [
  /^devex(\s+calculator)?$/i,
  /^robux$/i,
  /^roblox( corporation)?$/i,
  /^earned robux$/i,
  /^developer exchange( \(devex\))?$/i,
  /^creator hub$/i,
  /^cloudflare( web analytics| workers| turnstile)?$/i,
  /^next\.js$/i,
  /^opennext$/i,
  /^google analytics 4$/i,
  /^adjusted ebitda$/i,
  /^(cache-control|access-control-allow-origin|content-type|user-agent)\b/i,
  /^https?:\/\//i,
  /^[a-z0-9_.\-/]+$/i,
  /^\W+$/,
];

/** Text nodes only: attributes, scripts, styles and JSON-LD are not prose. */
function visibleText(html: string): string[] {
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  return body
    .split(/<[^>]*>/)
    .map((chunk) =>
      chunk
        .replace(/&nbsp;|&#160;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&(?:rsquo|#8217);/g, "’")
        .replace(/&(?:lsquo|#8216);/g, "‘")
        .replace(/&(?:ldquo|#8220);/g, "“")
        .replace(/&(?:rdquo|#8221);/g, "”")
        .replace(/&(?:mdash|#8212);/g, "—")
        .replace(/&(?:ndash|#8211);/g, "–")
        .replace(/&[a-z]+;|&#\d+;/gi, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((chunk) => chunk.length > 0);
}

function isAllowed(fragment: string): boolean {
  return ALLOWED.some((pattern) => pattern.test(fragment.trim()));
}

interface Leak {
  readonly route: string;
  readonly fragment: string;
  readonly hits: number;
}

async function scanPage(origin: string, url: string): Promise<{ leaks: Leak[]; total: number }> {
  const response = await fetch(`${origin}${url}`);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const html = await response.text();

  const leaks: Leak[] = [];
  let total = 0;
  for (const fragment of visibleText(html)) {
    if (isAllowed(fragment)) continue;
    const hits = (fragment.match(ENGLISH_WORDS) ?? []).length;
    if (hits === 0) continue;
    total += hits;
    leaks.push({ route: url, fragment, hits });
  }
  return { leaks, total };
}

const origin = process.argv[2];
if (!origin || !/^https?:\/\//.test(origin)) {
  console.error(
    "Usage: tsx scripts/i18n/detect-language-leakage.ts <origin> [--budget N] [--locale xx]\n" +
      "The origin must be a running server built with ENABLE_REVIEW_LOCALES=true.",
  );
  process.exit(1);
}

const budgetArg = process.argv.indexOf("--budget");
const BUDGET = budgetArg === -1 ? 60 : Number(process.argv[budgetArg + 1]);
const localeArg = process.argv.indexOf("--locale");
const onlyLocale = localeArg === -1 ? null : (process.argv[localeArg + 1] as Locale);

const routes = indexableRoutes.map((record) => record.route);
const targets = LAUNCH_LOCALES.filter(
  (locale) => locale !== DEFAULT_LOCALE && (onlyLocale === null || locale === onlyLocale),
);

console.log(`language leakage — ${routes.length} route(s) × ${targets.length} locale(s)\n`);

let failed = false;

for (const locale of targets) {
  const prefix = getLocaleMeta(locale).prefix;
  const found: Leak[] = [];
  let total = 0;

  for (const route of routes) {
    try {
      const page = await scanPage(origin, `${prefix}${route}`);
      total += page.total;
      found.push(...page.leaks);
    } catch (error) {
      console.error(`  ${locale}  ${route}  ${String(error)}`);
      failed = true;
    }
  }

  const verdict = total > BUDGET ? "OVER BUDGET" : "ok";
  console.log(`  ${locale.padEnd(6)} ${String(total).padStart(5)} English word(s)  ${verdict}`);

  if (total > BUDGET) {
    failed = true;
    // Worst fragments first: one long English paragraph matters more than
    // twenty stray "no"s, and fixing it removes the most leakage per edit.
    const byFragment = new Map<string, { hits: number; routes: Set<string> }>();
    for (const leak of found) {
      const row = byFragment.get(leak.fragment) ?? { hits: 0, routes: new Set<string>() };
      row.hits += leak.hits;
      row.routes.add(leak.route);
      byFragment.set(leak.fragment, row);
    }
    const ranked = [...byFragment.entries()].sort((a, b) => b[1].hits - a[1].hits).slice(0, 25);
    for (const [fragment, row] of ranked) {
      const where = [...row.routes].slice(0, 2).join(" ");
      const more = row.routes.size > 2 ? ` +${row.routes.size - 2}` : "";
      console.log(
        `      ${String(row.hits).padStart(4)}  ${fragment.slice(0, 96)}\n            ${where}${more}`,
      );
    }
  }
}

if (failed) {
  console.error("\nLanguage leakage check failed.");
  process.exit(1);
}
console.log("\nLanguage leakage within budget.");
