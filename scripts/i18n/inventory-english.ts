/**
 * Counts the English this site would have to translate, and says where it is.
 *
 * Written before any locale exists, because every estimate that follows —
 * how long a locale takes, whether a page is fully covered, whether English
 * has leaked into a translated page — is a fraction of this number. Guessing
 * it would make every later percentage a guess too.
 *
 * What counts as a translatable string, and what deliberately does not:
 *
 *   - **JSX text** between tags is the bulk of it, and all of it counts.
 *   - **Attributes that reach a reader** — `alt`, `title`, `placeholder`,
 *     `aria-label`, `aria-description` — count. `className`, `href`, `id`,
 *     `key`, `name`, `type` and the rest do not.
 *   - **Registry prose** — titles, meta descriptions, H1s, quick answers, FAQ
 *     questions and answers, link anchors — counts, and is the largest single
 *     block. It lives in `route-registry.ts` rather than in components.
 *   - **A number, a URL, a route, a CSS class or a lone punctuation mark is
 *     not a string to translate.** Nor is a protected name on its own:
 *     "Roblox", "Robux", "DevEx", "USD", "API", "JSON", "CSV".
 *
 * Findings carry the whole string, never a clipped one. This report is read
 * by `detect-hardcoded.ts` and by the prose extractor, and a paragraph clipped
 * to 160 characters written into a dictionary is a paragraph the site has
 * quietly lost. Only the console summary shortens anything.
 *
 * The output is deterministic — sorted, with no timestamp — so it can be
 * committed and a later run diffed against it. A count that moves without a
 * commit explaining why is the signal this file exists to give.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const SCAN_DIRS = ["src"];
const EXTENSIONS = [".ts", ".tsx"];

/** Directories whose strings never reach a reader. */
const SKIP_SEGMENTS = ["__tests__", "node_modules"];

/**
 * Files whose strings reach somebody, but never as page copy in a language.
 *
 * Each is here for its own reason, and each reason is a claim that can be
 * checked by opening the file:
 *
 *   `src/app/api/` — a JSON response is a machine contract. Its `message`
 *   and `disclaimer` fields are quoted in the documentation on `/api/`, and
 *   a client that switched language would be a different API. The prose a
 *   reader sees about these endpoints lives in `src/lib/api/contract.ts`,
 *   which is not on this list.
 *
 *   `heartbeat.ts` and `exports.ts` — read only by `/api/health/` and by the
 *   CSV exports. Operator diagnostics and column values, not sentences on a
 *   page.
 *
 *   `opengraph-image.tsx` — the social card is a rendered image, and the
 *   generator runs once per route, not once per route per language. The
 *   cards are English. This is a real limitation and it is written down in
 *   `docs/i18n/` as a blocker on publishing any locale, rather than hidden
 *   behind a detector that stopped looking. The `og:image:alt` a reader's
 *   screen reader announces *is* translated — it comes from the route
 *   registry, through `localizedRoute`.
 */
const NOT_PAGE_COPY = [
  "src/app/api/",
  // The OpenAPI document and llms.txt. Both describe the endpoints to a
  // machine, in one file, at one URL. `/api/` — the page a person reads
  // about the same endpoints — is written separately in `views/api.tsx`
  // and is translated like any other page.
  "src/lib/api/contract.ts",
  "src/lib/content/llms.ts",
  "src/lib/platform/heartbeat.ts",
  "src/lib/api/exports.ts",
  "opengraph-image.tsx",
];

/** Attributes whose value is shown or read aloud to a person. */
const READER_FACING_ATTRIBUTES = [
  "alt",
  "title",
  "placeholder",
  "aria-label",
  "aria-description",
  "aria-roledescription",
  "aria-placeholder",
  "aria-valuetext",
  "label",
  "summary",
  "caption",
  "heading",
  "description",
  "anchor",
  "quickAnswer",
  "metaDescription",
  "h1",
  "navLabel",
  "question",
  "answer",
  "note",
  "detail",
  "ogImageAlt",
  "eligibilitySummary",
  "conditionNote",
  /*
   * Found by sweeping every `name = "..."` in the source for a value that
   * reads as a sentence and checking it against this list. A detector that
   * does not know an attribute reports full coverage of the strings it can
   * see, which is the most convincing way to be wrong.
   */
  "intro",
  "jumpLabel",
  "hint",
  "term",
  "headline",
  "useWhen",
  "claim",
  "reality",
  "meaning",
  "assumes",
  "answers",
  "context",
  "what",
  "above",
  "below",
  "total",
  "bio",
  "formula",
  "by",
  "error",
  "staleReason",
  "role",
];

/**
 * Names that stay in every language. A value made only of these is not a
 * translation job — it is a proper noun with spaces around it.
 */
const PROTECTED = new Set(
  [
    "roblox",
    "robux",
    "devex",
    "developer exchange",
    "creator hub",
    "cloudflare",
    "next.js",
    "opennext",
    "api",
    "json",
    "csv",
    "usd",
    "eur",
    "gbp",
    "rss",
    "atom",
    "seo",
    "html",
    "url",
    "kv",
    "sec",
    "ecb",
    "wcag",
    "openapi",
  ].map((s) => s.toLowerCase()),
);

interface Finding {
  readonly file: string;
  readonly line: number;
  readonly category: "jsx-text" | "attribute" | "registry-prose";
  readonly words: number;
  readonly hasTokens: boolean;
  readonly text: string;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_SEGMENTS.includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (EXTENSIONS.some((ext) => entry.endsWith(ext))) out.push(full);
  }
  return out;
}

/** A run of letters with at least one space, or one word of four letters up. */
function looksTranslatable(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 4) return false;
  // No letters at all: a number, a class list, punctuation.
  if (!/[A-Za-z]{3}/.test(trimmed)) return false;
  // A URL, a path, an identifier.
  if (/^(https?:\/\/|\/|#|\.|[a-z-]+:[a-z-]+$)/.test(trimmed)) return false;
  if (/^[a-z0-9-]+$/.test(trimmed) && !trimmed.includes(" ")) return false;
  /*
   * A single token that is a name in code rather than a word in a sentence.
   *
   * `registryVersion`, `lastVerifiedAt`, `meta.cache`, `sources[]` and
   * `FALLBACK` all reach a reader — they are printed on the API page — and
   * none of them is translatable: renaming a JSON field in Portuguese would
   * document an endpoint that does not exist. The test is shape, not a list:
   * no spaces, plus camelCase, a dot, brackets, or all-caps.
   */
  if (!/\s/.test(trimmed)) {
    if (/[a-z][A-Z]/.test(trimmed)) return false;
    if (/[.[\]()_]/.test(trimmed)) return false;
    if (/^[A-Z0-9_-]+$/.test(trimmed)) return false;
  }
  // Tailwind and CSS custom-property soup.
  if (/(^|\s)(flex|grid|mt-|mb-|px-|py-|text-|bg-|border-|rounded-|gap-)/.test(trimmed)) {
    return false;
  }
  if (PROTECTED.has(trimmed.toLowerCase())) return false;
  // An HTML entity is a character, not a word: `&nbsp;` and `&uarr;` are a
  // space and an arrow, and neither has a Portuguese equivalent.
  if (/^(&[a-z]+;|&#\d+;)+$/i.test(trimmed)) return false;
  return true;
}

/**
 * Whether a run could be a sentence at all, judged on shape alone.
 *
 * Deliberately structural rather than a list of keywords. `return` and `null`
 * both appear in this site's English, and a filter naming them would delete
 * real sentences — silently, which is the one failure direction nothing else
 * here would catch.
 */
function isStructurallyProse(value: string): boolean {
  /*
   * A named token is part of the sentence and stays. Any other brace means the
   * split failed to close an interpolation, which only happens when the brace
   * was opened outside this span — a conditional wrapping the whole element.
   */
  if (/[{}]/.test(value.replace(TOKEN, ""))) return false;
  // Unbalanced parentheses: `export function ValueFlow(` opens one and stops.
  const open = (value.match(/\(/g) ?? []).length;
  const close = (value.match(/\)/g) ?? []).length;
  if (open !== close) return false;
  // A sentence does not begin with the punctuation that ended the last one.
  if (/^[:;,.)\]?!]/.test(value)) return false;
  return true;
}

/** Whether this line sits inside an object literal that is a build diagnostic. */
function isDiagnosticObject(lines: readonly string[], index: number): boolean {
  for (let i = Math.max(0, index - 4); i < index; i += 1) {
    if (/^\s*(severity|code)\s*:/.test(lines[i] ?? "")) return true;
  }
  return false;
}

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

const TOKEN = /\{[a-zA-Z_][a-zA-Z0-9_]*\}/g;

function hasInterpolation(value: string): boolean {
  return new RegExp(TOKEN.source).test(value);
}

/**
 * Blanks a span while keeping every line ending, so line numbers survive.
 *
 * The report names a file and a line and a reviewer opens that line. Masking
 * that removed characters would shift every number after it.
 */
function blank(source: string, pattern: RegExp): string {
  return source.replace(pattern, (whole) => whole.replace(/[^\n]/g, " "));
}

/*
 * Two spans are not content, and both routinely run across several lines —
 * which is why they are masked in the whole file before it is split, rather
 * than line by line.
 *
 *   `<code>` and its relatives. Text inside them is code by definition of the
 *   element: `Cache-Control` and `?format=csv` are printed for a reader and
 *   are still not translatable, because renaming a header in Portuguese
 *   documents a request nobody can make.
 *
 *   JSX comments. Their prose ships to nobody, and the comment explaining why
 *   a style element sits inside a noscript element was itself being read as a
 *   JSX text node, because it names those tags.
 */
const CODE_ELEMENT = /<(code|kbd|samp|var|pre|Code)(\s[^>]*)?>[\s\S]*?<\/\1>/g;
const JSX_COMMENT = /\{\/\*[\s\S]*?\*\/\}/g;
/*
 * Comments, masked before anything is scanned.
 *
 * The line scan skipped a line that began one. Reading the file as spans lost
 * that, and the doc comments here are long, discuss JSX and name tags — so a
 * `<details>` written inside one opened a span that ran to the next real tag
 * and carried a paragraph of implementation notes into the inventory.
 */
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT = /^[^\S\n]*\/\/.*$/gm;

/**
 * A source string as the reader will see it.
 *
 * The scan matches source text, so what it captures still carries the
 * escapes the author wrote: `\\"` around a quoted phrase, and `\\u2014` where
 * the page shows an em dash. Compared against a dictionary — which holds the
 * decoded characters — neither can ever match, and the report calls a string
 * that was extracted correctly missing.
 */
function decodeSource(value: string): string {
  return value
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\(.)/g, "$1");
}

function scan(file: string): Finding[] {
  const path = relative(ROOT, file).split(sep).join("/");
  if (NOT_PAGE_COPY.some((fragment) => path.includes(fragment))) return [];
  const raw = readFileSync(file, "utf8");
  const source = blank(
    blank(blank(blank(raw, CODE_ELEMENT), JSX_COMMENT), BLOCK_COMMENT),
    LINE_COMMENT,
  );
  const lines = source.split(/\r?\n/);
  const rel = path;
  const isRegistry = rel.includes("route-registry") || rel.includes("amount-pages");
  const findings: Finding[] = [];

  /*
   * Reader-facing attributes and registry prose fields.
   *
   * Scanned across the whole file rather than line by line, because the
   * formatter puts a long value on its own line:
   *
   *     meaning:
   *       "Seen on a publicly accessible page..."
   *
   * Line by line that is a name with no string followed by a string with no
   * name, and neither half is reported. The values that wrap are the long
   * ones, so the strings this missed were the densest prose in the file.
   */
  {
    const attribute =
      /(?:^|[\s{,])([a-zA-Z-]+)\s*[=:]\s*(?:\{?)\s*"((?:[^"\\]|\\.){4,})"/g;
    let match: RegExpExecArray | null;
    while ((match = attribute.exec(source)) !== null) {
      const [, name, raw] = match;
      const value = raw === undefined ? undefined : decodeSource(raw);
      const index = source.slice(0, match.index).split("\n").length - 1;
      const line = lines[index] ?? "";
      const bare = line.trim();
      // Prose in a comment is not shipped.
      if (bare.startsWith("//") || bare.startsWith("*") || bare.startsWith("/*")) continue;
      if (!name || !value) continue;
      if (!READER_FACING_ATTRIBUTES.includes(name)) continue;
      if (!looksTranslatable(value)) continue;
      /*
       * `detail` means page copy in the content registry and means a build
       * failure message in a validator, and the two look identical on their
       * own line. A `severity:` or `code:` field just above marks the object
       * as a finding this build prints to a console — never to a reader, and
       * never in a language other than the one the code is written in.
       */
      if (isDiagnosticObject(lines, index)) continue;
      findings.push({
        file: rel,
        line: index + 1,
        category: isRegistry ? "registry-prose" : "attribute",
        words: countWords(value),
        hasTokens: hasInterpolation(value),
        text: value,
      });
    }
  }

  findings.push(...scanJsxText(file, source, rel, isRegistry));
  return findings;
}

/**
 * Every JSX text node in the file, including the ones that wrap.
 *
 * A text node is what sits between a tag that closes and a tag that opens, and
 * most of this site's real sentences do not fit on one line:
 *
 *     <p>
 *       Roblox decides which rate applies. See{" "}
 *       <Link href="/devex-rates/">the current rates</Link> for the detail.
 *     </p>
 *
 * Read line by line that is three fragments, two of them too short to look
 * like anything. Read as spans it is two sentences and a link label, which is
 * what a translator is given.
 *
 * Tags are the boundary here, deliberately. Masking braces instead — the
 * obvious alternative — fails in both directions: exclude the characters
 * already masked and an outer brace can never match its own pattern, so
 * `export const metadata = { title: "…" }` comes back as a paragraph; include
 * them and the mask eats whole function bodies.
 *
 * `{" "}` becomes a space because that is the only reason it is ever written.
 *
 * A **value** interpolation stays in the sentence as a named token:
 *
 *     Last reviewed {formatDate(record.lastReviewedAt)}.
 *       ->  Last reviewed {lastReviewedAt}.
 *
 * Splitting there instead — which this did — hands a translator the fragment
 * "Last reviewed" and throws the rest away. That is not a shorter sentence,
 * it is a different one, and it cannot be put back together in a language that
 * orders it differently: German and Turkish both place that date somewhere
 * English does not, and concatenating in source order silently produces word
 * salad. `interpolate()` exists for exactly this, so the inventory records
 * what it can fill.
 *
 * A **structural** interpolation still ends the run — a ternary, a `&&`, an
 * arrow function. Those choose between sentences rather than sit inside one,
 * and welding across a branch produces text that appears on no page.
 */
/**
 * Turns value interpolations into named tokens, and breaks on structural ones.
 *
 * The span the caller passes can hold neither `<`, `>` nor a nested brace —
 * the tag-bounded pattern guarantees it — so an interpolation here is a flat
 * expression, and only four operators can make it a choice between sentences
 * rather than a value inside one.
 */
function splitOnStructure(raw: string): string[] {
  const parts: string[] = [];
  const used = new Map<string, number>();
  let current = "";
  let index = 0;
  const pattern = /\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(raw)) !== null) {
    current += raw.slice(index, match.index);
    index = match.index + match[0].length;
    const expression = (match[1] ?? "").trim();
    const name = tokenName(expression);
    if (name === null) {
      // A branch, not a value. The sentence ends here.
      parts.push(current);
      current = "";
      continue;
    }
    /*
     * Two dates in one sentence need two tokens. Numbering the second rather
     * than reusing the first keeps `interpolate` able to fill them separately;
     * sharing a name would put the same value in both places.
     */
    const seen = used.get(name) ?? 0;
    used.set(name, seen + 1);
    current += `{${seen === 0 ? name : `${name}${seen + 1}`}}`;
  }
  parts.push(current + raw.slice(index));
  return parts;
}

/**
 * A name for the value an expression produces, or null if it produces a
 * choice.
 *
 * The last identifier is the one that means something: `formatDate` and
 * `formatRobux` are how a value is written, not what it is, and every one of
 * them wraps the field a reader would name — `lastReviewedAt`,
 * `minimumEarnedRobux`. Constants are lowered to the same camelCase so
 * `{EXPERIENCE_CACHE_SECONDS}` and `{experienceCacheSeconds}` cannot become
 * two different tokens for one value.
 */
function tokenName(expression: string): string | null {
  if (expression === "") return null;
  // A ternary, a guard, an arrow, or a template literal that may hold either.
  if (/\?|&&|\|\||=>|`/.test(expression)) return null;
  /*
   * String literals first. `formatDate("2025-09-05T10:00:00-07:00")` ends in
   * an identifier only if you count the `T10` inside an ISO timestamp, and
   * `{t10}` is a token nobody can read or fill correctly.
   */
  const identifiers = expression.replace(/"[^"]*"|'[^']*'/g, "").match(/[A-Za-z_$][\w$]*/g);
  if (!identifiers || identifiers.length === 0) return null;
  const last = identifiers[identifiers.length - 1] as string;

  /*
   * `.length` names the operation, not the value. The collection before it is
   * what the sentence is counting.
   */
  if (last === "length" && identifiers.length > 1) {
    return `${identifiers[identifiers.length - 2] as string}Count`;
  }

  /*
   * A method call names how the value is rendered, the same way `.length`
   * names an operation. `rate.toFixed(4)` is still the rate.
   */
  if (/^(toFixed|toString|toLocaleString|toUpperCase|toLowerCase|trim)$/.test(last)) {
    if (identifiers.length > 1) return identifiers[identifiers.length - 2] as string;
    return null;
  }

  // `formatCurrency(...)` around a literal leaves only the formatter, and what
  // it formats is the better name for what the reader sees. `getRateValue()`
  // likewise: the reader sees a rate, not a getter.
  const formatted = /^(?:format|get)([A-Z]\w*)$/.exec(last);
  if (formatted?.[1]) return formatted[1].charAt(0).toLowerCase() + formatted[1].slice(1);

  if (/^[A-Z0-9_$]+$/.test(last)) {
    return last
      .toLowerCase()
      .replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
      .replace(/^[0-9]+/, "");
  }
  return last;
}

function scanJsxText(
  file: string,
  source: string,
  rel: string,
  isRegistry: boolean,
): Finding[] {
  // Only a .tsx file can hold JSX. In a .ts file a generic type argument reads
  // as a tag: `ParseResult<T> = ParseSuccess<T>` has a `>`, some characters
  // and a `<`, and is a declaration rather than a sentence.
  if (!file.endsWith(".tsx")) return [];

  const findings: Finding[] = [];
  /*
   * The lookarounds are what keep this from reading TypeScript as markup.
   * `if (value >= "0" && char < x)` also has a `>`, some text and a `<`. A
   * real tag ends with a name, a quote or a brace, and the next one opens with
   * a letter or a slash.
   */
  const span = /(?<=[A-Za-z0-9"'}\]])>([^<>]{4,}?)<(?=[/A-Za-z])/gs;
  let match: RegExpExecArray | null;
  while ((match = span.exec(source)) !== null) {
    const line = (source.slice(0, match.index).match(/\n/g)?.length ?? 0) + 1;
    const raw = match[1] ?? "";
    for (const part of splitOnStructure(raw.replace(/\{\s*"\s*"\s*\}/g, " "))) {
      // Removing an interpolation leaves the space that sat before it, so
      // `quote reference {digest}.` would end `reference .`. The sentence is
      // the same one either way; this just does not write the gap down.
      const value = part
        .split(/\s+/)
        .filter(Boolean)
        .join(" ")
        .replace(/\s+([.,;:!?])/g, "$1");
      if (!value || !looksTranslatable(value)) continue;
      /*
       * Splitting on `{...}` cannot balance a brace that opened outside the
       * span, so a conditional leaves fragments like `) : null}` and
       * `const [open, setOpen] = useState(false)`. Both are code, and both say
       * so in their punctuation — prose on this site contains no `=>`, no
       * semicolon and no bare parenthesis pair.
       */
      if (/[=;`$]|=>|\(\s*\)|\)\s*[:;{}]|\[[a-z]/i.test(value)) continue;
      if (!isStructurallyProse(value)) continue;
      // Two lowercase words in a row is the shortest thing that reads as a
      // sentence rather than as a label or a stripped expression.
      if (!/[a-z]{3}\s+[a-z]{2}/.test(value)) continue;
      findings.push({
        file: rel,
        line,
        category: isRegistry ? "registry-prose" : "jsx-text",
        words: countWords(value),
        hasTokens: hasInterpolation(value),
        text: value,
      });
    }
  }
  return findings;
}

const files = SCAN_DIRS.flatMap((dir) => walk(join(ROOT, dir)));
const findings = files
  .flatMap(scan)
  .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);

const byFile = new Map<string, number>();
const byCategory = new Map<string, number>();
let words = 0;
for (const finding of findings) {
  byFile.set(finding.file, (byFile.get(finding.file) ?? 0) + 1);
  byCategory.set(finding.category, (byCategory.get(finding.category) ?? 0) + 1);
  words += finding.words;
}

const report = {
  $comment:
    "Deterministic inventory of translatable English. No timestamp: a diff here should mean the content changed, not that the script ran again.",
  totals: {
    strings: findings.length,
    words,
    files: byFile.size,
    filesScanned: files.length,
  },
  byCategory: Object.fromEntries([...byCategory].sort()),
  byFile: Object.fromEntries([...byFile].sort((a, b) => b[1] - a[1])),
  findings,
};

mkdirSync(join(ROOT, "docs/i18n"), { recursive: true });
writeFileSync(
  join(ROOT, "docs/i18n/current-string-inventory.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log("English string inventory");
console.log(`  ${findings.length} strings, ${words} words, across ${byFile.size} files`);
for (const [category, count] of [...byCategory].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${category.padEnd(16)} ${count}`);
}
console.log("\n  Heaviest files:");
for (const [file, count] of [...byFile].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`    ${String(count).padStart(4)}  ${file}`);
}
console.log("\n  Written to docs/i18n/current-string-inventory.json");
