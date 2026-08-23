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
  // Tailwind and CSS custom-property soup.
  if (/(^|\s)(flex|grid|mt-|mb-|px-|py-|text-|bg-|border-|rounded-|gap-)/.test(trimmed)) {
    return false;
  }
  if (PROTECTED.has(trimmed.toLowerCase())) return false;
  return true;
}

function countWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function hasInterpolation(value: string): boolean {
  return /\{[a-zA-Z_][a-zA-Z0-9_]*\}/.test(value);
}

function scan(file: string): Finding[] {
  const source = readFileSync(file, "utf8");
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
      findings.push({
        file: rel,
        line: index + 1,
        category: isRegistry ? "registry-prose" : "attribute",
        words: countWords(value),
        hasTokens: hasInterpolation(value),
        text: value.length > 160 ? `${value.slice(0, 157)}...` : value,
      });
    }

    // JSX text nodes: between a closing bracket and an opening tag.
    const jsxText = />([^<>{}]{4,})</g;
    while ((match = jsxText.exec(line)) !== null) {
      const value = match[1];
      if (!value || !looksTranslatable(value)) continue;
      findings.push({
        file: rel,
        line: index + 1,
        category: "jsx-text",
        words: countWords(value),
        hasTokens: hasInterpolation(value),
        text: value.trim().length > 160 ? `${value.trim().slice(0, 157)}...` : value.trim(),
      });
    }
  });

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
