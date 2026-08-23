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

function hasInterpolation(value: string): boolean {
  return /\{[a-zA-Z_][a-zA-Z0-9_]*\}/.test(value);
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

function scan(file: string): Finding[] {
  const raw = readFileSync(file, "utf8");
  const source = blank(blank(raw, CODE_ELEMENT), JSX_COMMENT);
  const lines = source.split(/\r?\n/);
  const rel = relative(ROOT, file).split(sep).join("/");
  const isRegistry = rel.includes("route-registry") || rel.includes("amount-pages");
  const findings: Finding[] = [];

  lines.forEach((line, index) => {
    // Skip comment-only lines: prose in a comment is not shipped.
    const bare = line.trim();
    if (bare.startsWith("//") || bare.startsWith("*") || bare.startsWith("/*")) return;

    // Reader-facing attributes and registry prose fields.
    const attribute = /(?:^|[\s{,])([a-zA-Z-]+)\s*[=:]\s*(?:\{?)"([^"]{4,})"/g;
    let match: RegExpExecArray | null;
    while ((match = attribute.exec(line)) !== null) {
      const [, name, value] = match;
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

    // Only a .tsx file can hold JSX. In a .ts file a generic type argument
    // reads as a tag: `ParseResult<T> = ParseSuccess<T>` has a `>`, some
    // characters and a `<`, and is a declaration rather than a sentence.
    if (!file.endsWith(".tsx")) return;

    /*
     * JSX text nodes: between a closing bracket and an opening tag.
     *
     * The lookarounds are what keep this from reading TypeScript as markup.
     * `if (value >= "0" && char < x)` contains a `>`, four characters, and a
     * `<`, and an earlier version of this pattern happily reported `= "0" &&
     * char` as a sentence somebody had forgotten to translate. A real tag ends
     * with a name, a quote or a brace before the `>`, and the next tag opens
     * with a letter or a slash.
     */
    const jsxText = /(?<=[A-Za-z0-9"'\}\]])>([^<>{}]{4,})<(?=[/A-Za-z])/g;
    while ((match = jsxText.exec(line)) !== null) {
      const value = match[1];
      if (!value || !looksTranslatable(value)) continue;
      findings.push({
        file: rel,
        line: index + 1,
        category: "jsx-text",
        words: countWords(value),
        hasTokens: hasInterpolation(value),
        text: value.trim(),
      });
    }
  });

  findings.push(...scanWrappedProse(file, source, rel, isRegistry));
  return findings;
}

/**
 * Prose that runs across several lines, which the line scan cannot see.
 *
 * The scan above reads one line at a time, and most of this site's real
 * sentences do not fit on one. A paragraph wraps, and an inline link lands in
 * the middle of it:
 *
 *     <p>
 *       Roblox decides which rate applies. See{" "}
 *       <Link href="/devex-rates/">the current rates</Link> for the detail.
 *     </p>
 *
 * To the line scan that is three fragments, two of them too short to look like
 * anything. To a reader it is one sentence, and to a translator it is one
 * string. Without this pass the inventory would report a page as fully
 * extracted while most of its words were still in the component — which is
 * the exact failure the inventory exists to make impossible.
 *
 * Tags and expressions are removed repeatedly rather than once, because they
 * nest; what survives is text. The filters that follow drop anything still
 * carrying code punctuation, which is what a partially-stripped expression
 * looks like.
 */
function scanWrappedProse(
  file: string,
  source: string,
  rel: string,
  isRegistry: boolean,
): Finding[] {
  if (!file.endsWith(".tsx")) return [];

  // Line numbers are lost once tags are removed, so the offset of each run is
  // recovered by counting newlines up to it in the masked text — which has the
  // same length as the original, because masking preserves it.
  let masked = source.replace(/\/\*[\s\S]*?\*\//g, (w) => w.replace(/[^\n]/g, " "));
  masked = masked.replace(/^\s*\/\/.*$/gm, (w) => " ".repeat(w.length));
  /*
   * Tags and interpolations become a separator, not a space.
   *
   * Filling them with spaces would weld two neighbouring elements into one
   * run: a hint ending "...the one you pick." followed by a legend reading
   * "What do you know?" came back as a single 19-word sentence that appears
   * nowhere on the page, and no dictionary could ever match it. The one
   * exception is `{" "}`, which exists precisely to hold a sentence together
   * across a line break and so really is a space.
   */
  masked = masked.replace(/\{\s*"\s*"\s*\}/g, (w) => ` ${" ".repeat(w.length - 1)}`);
  for (let pass = 0; pass < 12; pass += 1) {
    const next = masked
      .replace(/<[^<>\0]*>/g, (w) => w.replace(/[^\n]/g, "\0"))
      .replace(/\{[^{}\0]*\}/g, (w) => w.replace(/[^\n]/g, "\0"));
    if (next === masked) break;
    masked = next;
  }

  const findings: Finding[] = [];
  const run = /[^<>{}\0]{12,}/g;
  let match: RegExpExecArray | null;
  while ((match = run.exec(masked)) !== null) {
    const text = match[0].split(/\s+/).filter(Boolean).join(" ");
    if (text.length < 12) continue;
    // Two lowercase words in a row is the shortest thing that reads as prose
    // rather than as a label, an identifier or a stripped expression.
    if (!/[a-z]{3}\s+[a-z]{2}/.test(text)) continue;
    if (/[=;()[\]`$]|=>/.test(text)) continue;
    if (!looksTranslatable(text)) continue;
    // Anything the line scan already reported. Reported once, not twice.
    if (!text.includes(" ") || text.split(" ").length < 4) continue;
    findings.push({
      file: rel,
      line: (masked.slice(0, match.index).match(/\n/g)?.length ?? 0) + 1,
      category: isRegistry ? "registry-prose" : "jsx-text",
      words: countWords(text),
      hasTokens: hasInterpolation(text),
      text: text,
    });
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
