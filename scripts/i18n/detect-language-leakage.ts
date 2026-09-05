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
 * **How it decides.** Three passes, because one of them was not enough:
 *
 *   1. **English function words.** "the", "and", "which", "because" — chosen
 *      because they are unavoidable in real English prose. A page of English
 *      scores in the hundreds; a translated page scores near zero.
 *
 *   2. **English labels.** A function-word count is blind to `Maturity: Mild`,
 *      which is two English words and no function word. That fragment scored
 *      zero on every run until somebody read the list by hand.
 *
 *   3. **Nothing marked `lang="en"`.** A page that says which of its words are
 *      foreign gets believed. See `Foreign` in `src/components/ui`.
 *
 * The third pass is what makes the first two strict. Before it, the score had
 * to carry a budget of 60 to absorb the names of Roblox experiences and the
 * titles of cited English documents, and a budget that size hides five real
 * leaks. Now those are marked in the markup and skipped here, so what is left
 * is a leak and the budget can be small.
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
import { startServer, type RunningServer } from "../quality/server";

/**
 * Words that mark a fragment as English.
 *
 * Deliberately function words only. Content words ("rate", "payout") appear as
 * loanwords and inside protected names, and a detector that flags those is one
 * nobody keeps green.
 */
const ENGLISH_WORD_LIST: readonly string[] = [
  "the", "and", "that", "with", "this", "which", "from", "your", "about",
  "would", "there", "their", "what", "when", "these", "those", "because",
  "rather", "every", "into", "than", "only", "been", "were", "does", "not",
  "for", "are", "you", "its", "have", "has", "but", "if", "nothing", "will",
  "cannot", "any", "each", "both", "more", "most", "such", "then", "they",
  "them", "our", "before", "after", "between", "through", "without", "under",
  "over", "how", "why", "who", "whose", "being", "had", "did", "should",
  "could", "must", "might", "here", "other", "another", "first", "last",
  "same", "still", "while", "much", "many", "few",
];

/**
 * Words that are English *and also* an ordinary word in one of these languages.
 *
 * The first version matched with a plain word boundary, which is defined over
 * ASCII: every accented letter counted as a boundary, so `here` matched inside
 * the German `höhere` and `not` inside the French `notée`. Thirty-one of the
 * findings in the first audit were that bug. The Unicode-aware boundary below
 * fixes those, and no exclusion list is needed for them.
 *
 * These are the ones a boundary cannot fix, because the word really is a whole
 * word in the target language: Spanish `has` (haber), Portuguese `for` (ser,
 * future subjunctive), German `will` (wants) and `still` (quietly), Turkish
 * `not` (a note). Per locale rather than global, so `still` on a French page
 * is still a leak.
 */
const COLLISIONS: Readonly<Record<string, readonly string[]>> = {
  "pt-BR": ["for", "as", "no", "a", "e", "de", "da", "do", "os"],
  es: ["has", "no", "a", "e", "de", "for"],
  id: ["per", "are", "dan"],
  fr: ["on", "or", "a", "not"],
  de: ["will", "still", "was", "hat", "der", "die", "das", "war", "man", "so", "hier"],
  tr: ["not", "can", "as"],
};

/**
 * A word boundary that understands accents.
 *
 * These lookarounds use Unicode letter and number classes rather than the
 * ASCII-only word boundary, so `höhere`, `notée` and `Wörter` are single words
 * the way a reader sees them rather than three places an English word can hide.
 */
function englishWordPattern(locale: string): RegExp {
  const excluded = new Set(COLLISIONS[locale] ?? []);
  const words = ENGLISH_WORD_LIST.filter((word) => !excluded.has(word));
  return new RegExp(
    String.raw`(?<![\p{L}\p{N}_])(?:` + words.join("|") + String.raw`)(?![\p{L}\p{N}_])`,
    "giu",
  );
}

/**
 * English chrome that carries no function word, so the counter above is blind
 * to it.
 *
 * `Maturity: Minimal` scored zero on every run: two English words, neither of
 * them a function word, because a label is exactly the shape that has none.
 * Every entry here is one of this site's own labels and has a translated key,
 * so an appearance means a component printed a literal instead of calling `t`.
 * Roblox's own value in that field is marked `lang="en"` and skipped before
 * this pattern ever sees it.
 */
const LABEL_WORDS_LIST = [
  "Maturity", "Sponsored", "Genre", "Visits", "Favourites", "Favorites",
  "Rating", "Fees", "Taxes", "Publicly",
] as const;

/**
 * Label words that are ordinary vocabulary in one of these languages.
 *
 * `LABEL_WORDS` is matched case-sensitively, so it only ever fires on a
 * capitalised occurrence — which is what an untranslated English label looks
 * like. German capitalises every noun, so a correctly translated German
 * sentence produces exactly the same shape: `Genre` in
 * `platform.method.freshnessBody` is `das Genre`, the normal German word,
 * inside prose that is otherwise entirely German.
 *
 * French and Indonesian use `genre` too and are not listed, because they write
 * it lower-case and the pattern never sees them. They would belong here the
 * day one of them starts a sentence with it.
 *
 * Per locale, like `COLLISIONS` above, so `Genre` standing alone on a Spanish
 * page is still a leak.
 */
const NATIVE_LABEL_WORDS: Readonly<Record<string, readonly string[]>> = {
  de: ["Genre"],
};

function labelWordPattern(locale: string): RegExp {
  const native = new Set(NATIVE_LABEL_WORDS[locale] ?? []);
  const words = LABEL_WORDS_LIST.filter((word) => !native.has(word));
  return new RegExp(
    String.raw`(?<![\p{L}\p{N}_])(?:` + words.join("|") + String.raw`)(?![\p{L}\p{N}_])`,
    "gu",
  );
}

/**
 * Fragments that are English on every page and are meant to be.
 *
 * Shorter than it was. Brand and product names, HTTP header names and code
 * identifiers stay; the long tail of cited document titles has moved into the
 * markup as `lang="en"`, where it is a fact the page states rather than a
 * pattern this file has to keep guessing at.
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

/**
 * Removes every element that declares itself English.
 *
 * Runs before the tags are stripped, because afterwards there is no way to
 * tell which text was inside the marked span. Innermost-first so a marked span
 * inside a link is removed with its own tags rather than leaving a stray `</a>`
 * behind — the elements this marks never nest inside each other.
 */
function stripForeign(html: string): string {
  let previous: string;
  let current = html;
  do {
    previous = current;
    current = current.replace(/<([a-z]+)\b[^>]*\blang="en"[^>]*>(?:(?!<\1[\s>])[\s\S])*?<\/\1>/gi, " ");
  } while (current !== previous);
  return current;
}

/** Text nodes only: attributes, scripts, styles and JSON-LD are not prose. */
function visibleText(html: string): string[] {
  const body = stripForeign(html)
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
  readonly words: readonly string[];
}

async function scanPage(
  origin: string,
  url: string,
  words: RegExp,
  labels: RegExp,
): Promise<{ leaks: Leak[]; total: number }> {
  const response = await fetch(`${origin}${url}`);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const html = await response.text();

  const leaks: Leak[] = [];
  let total = 0;
  for (const fragment of visibleText(html)) {
    if (isAllowed(fragment)) continue;
    const matched = [...(fragment.match(words) ?? []), ...(fragment.match(labels) ?? [])];
    if (matched.length === 0) continue;
    total += matched.length;
    leaks.push({ route: url, fragment, hits: matched.length, words: matched });
  }
  return { leaks, total };
}

/*
 * An origin, or nothing - see the same note in `validate-localized-html.ts`.
 * With none, a local production server is started, so this can run in
 * `npm run check` rather than only by hand.
 */
const argOrigin = process.argv[2] ?? "";
if (argOrigin !== "" && !/^https?:\/\//.test(argOrigin)) {
  console.error(
    "Usage: tsx scripts/i18n/detect-language-leakage.ts [origin] [--budget N] [--locale xx]\n" +
      "With no origin a local production server is started. Add\n" +
      "ENABLE_REVIEW_LOCALES=true to the build to cover every locale.",
  );
  process.exit(1);
}
let origin = argOrigin;

const budgetArg = process.argv.indexOf("--budget");
/*
 * Zero, now that the page marks its own foreign text.
 *
 * The old default was 60, sized to absorb the names of Roblox experiences and
 * the titles of cited English documents. A budget that size also absorbed five
 * hardcoded English strings on money pages, which sat under it for months
 * while the number read "ok".
 */
const BUDGET = budgetArg === -1 ? 0 : Number(process.argv[budgetArg + 1]);
const localeArg = process.argv.indexOf("--locale");
const onlyLocale = localeArg === -1 ? null : ((process.argv[localeArg + 1] ?? "") as Locale);

const routes = indexableRoutes.map((record) => record.route);
const targets = LAUNCH_LOCALES.filter(
  (locale) => locale !== DEFAULT_LOCALE && (onlyLocale === null || locale === onlyLocale),
);

async function main(): Promise<void> {
  let server: RunningServer | null = null;
  if (origin === "") {
    server = await startServer();
    origin = server.baseUrl;
  }
  try {
    await run();
  } finally {
    await server?.stop();
  }
}

async function run(): Promise<void> {
  console.log(`language leakage — ${routes.length} route(s) × ${targets.length} locale(s)\n`);

  let failed = false;

  for (const locale of targets) {
    const prefix = getLocaleMeta(locale).prefix;
    const words = englishWordPattern(locale);
    const labels = labelWordPattern(locale);
    const found: Leak[] = [];
    let total = 0;

    for (const route of routes) {
      try {
        const page = await scanPage(origin, `${prefix}${route}`, words, labels);
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
      // twenty stray labels, and fixing it removes the most leakage per edit.
      const byFragment = new Map<string, { hits: number; routes: Set<string>; words: Set<string> }>();
      for (const leak of found) {
        const row = byFragment.get(leak.fragment) ?? {
          hits: 0,
          routes: new Set<string>(),
          words: new Set<string>(),
        };
        row.hits += leak.hits;
        row.routes.add(leak.route);
        for (const word of leak.words) row.words.add(word.toLowerCase());
        byFragment.set(leak.fragment, row);
      }
      const ranked = [...byFragment.entries()].sort((a, b) => b[1].hits - a[1].hits).slice(0, 25);
      for (const [fragment, row] of ranked) {
        const where = [...row.routes].slice(0, 2).join(" ");
        const more = row.routes.size > 2 ? ` +${row.routes.size - 2}` : "";
        console.log(
          `      ${String(row.hits).padStart(4)}  ${fragment.slice(0, 96)}\n` +
            `            [${[...row.words].join(" ")}]  ${where}${more}`,
        );
      }
    }
  }

  if (failed) {
    console.error("\nLanguage leakage check failed.");
    process.exit(1);
  }
  console.log("\nLanguage leakage within budget.");
}

void main();
