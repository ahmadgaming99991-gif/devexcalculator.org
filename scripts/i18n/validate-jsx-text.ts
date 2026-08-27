/**
 * English written directly into JSX, where no dictionary can reach it.
 *
 * **Why this exists, specifically.** The audit of the six translations found
 * eight English strings rendering on every localized page — a tax disclaimer
 * on `/how-to-cash-out-robux/`, a row header on the tax table, the planner's
 * heading, `All calculators`, `Assumes:`. Every one of them was a bare text
 * node in a component: not a key, not a literal in a string, just words
 * between two tags.
 *
 * Three checks should have caught them and none did. `validate-dictionaries`
 * compares keys, and these had no key. `validate-interpolation` reads call
 * sites, and these were not calls. `detect-hardcoded` subtracts the inventory
 * from the dictionaries — but `inventory-english` stopped extracting JSX text
 * once the views were migrated, so its input no longer contained them and the
 * subtraction had nothing to find. The rendered-output check did see them, as
 * five of the twenty-six words it counted on a budget of sixty, which read as
 * "ok" for months.
 *
 * So this reads the one thing none of the others do: the text a component
 * prints without asking anybody. It is a build gate rather than an inventory,
 * because the lesson of those eight strings is that a number in a report is
 * not a check.
 *
 * **What counts as text.** A run of characters between `>` and `<` holding two
 * or more letters. Punctuation, entities, numbers, single symbols and the
 * separators components put between fields are not prose and are skipped —
 * `·`, `—`, `×`, `%`, a bare `{" "}`.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();

/** Where components render. Scripts and tests print for developers, not readers. */
const ROOTS = ["src/views", "src/features", "src/components", "src/app"];

/**
 * Text that is prose to a regex and not to a reader.
 *
 * Brand names that are the same in every language, and the units and symbols
 * a component puts between two translated values.
 */
const ALLOWED = [
  /^(devex|robux|roblox|devexcalculator|opennext|next\.js|cloudflare)$/i,
  /^(usd|eur|gbp|brl|idr|try|px|kb|mb)$/i,
  /^[^\p{L}]*$/u,
  /^(and|of|to|in|at|by)$/i,
  // The wordmark, and the proper names of formats, standards and products.
  /^calculator$/i,
  /^(atom|json feed|rss)$/i,
  /^wcag [0-9.]+ level a{1,3}$/i,
  /^(cloudflare web analytics|google analytics 4)$/i,
  /^\/[a-z0-9/_.-]+\/?$/i,
];

/**
 * Code that happens to sit between a `>` and a `<`.
 *
 * TypeScript spends both characters on things that are not tags — `useState<T>`,
 * `(a) => (`, `if (time > 0)` — so a scan for `>text<` finds a great deal of
 * source. Rather than parse TSX properly, this rejects anything shaped like
 * code: real prose in a component has no semicolons, no assignment, no arrow,
 * and none of these keywords.
 */
const CODE =
  /[;={}`_[\]]|=>|\.\.\.|^[(),]|\w+\(|\)\s*$|:\s*\(?$|&&|\|\||\?\s*:|\b(const|let|return|await|async|function|typeof|null|undefined|true|false|new|import|export|interface|type|extends|React|use[A-Z])/;

interface Finding {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}

function files(dir: string): string[] {
  const full = join(ROOT, dir);
  let entries: string[];
  try {
    entries = readdirSync(full);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries) {
    const path = join(full, entry);
    if (statSync(path).isDirectory()) out.push(...files(join(dir, entry)));
    // `opengraph-image.tsx` draws the English card. Every other language gets a
    // prebuilt PNG from `scripts/og/build-localized-cards.ts`, so English here
    // is the point rather than an oversight.
    else if (entry.endsWith(".tsx") && !entry.startsWith("opengraph-image")) {
      out.push(join(dir, entry));
    }
  }
  return out;
}

/**
 * Blanks out everything that is not JSX, so a comment or a string cannot be
 * mistaken for rendered text.
 *
 * Replaces rather than removes, so byte offsets — and therefore the reported
 * line numbers — stay true to the file on disk.
 */
/**
 * Same length, same line breaks, no content.
 *
 * Blanking a block comment with plain spaces collapses it onto one line and
 * every finding after it is reported at the wrong line number — which sends
 * whoever is fixing it to a line that looks innocent. Newlines are kept so the
 * offsets and the line count both stay true to the file on disk.
 */
function blank(match: string): string {
  return match.replace(/[^\n]/g, " ");
}

function withoutCodeText(source: string): string {
  return source
    /*
     * `<Foreign>` is a declaration, not an oversight. It renders `lang="en"`
     * around a name that stays English in every language — a cited document's
     * title, an experience a creator named. Blanking it here is what lets the
     * rest of this check be strict: anything still English and *not* wrapped
     * is a component that forgot to call `t`.
     */
    .replace(/<Foreign>[\s\S]*?<\/Foreign>/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/\/\/[^\n]*/g, blank)
    .replace(/"(?:[^"\\\n]|\\.)*"/g, blank)
    .replace(/'(?:[^'\\\n]|\\.)*'/g, blank)
    .replace(/`(?:[^`\\]|\\.)*`/g, blank);
}

/**
 * English kept in a constant and rendered through an expression.
 *
 * The bare-text scan below cannot see this, because what sits between the tags
 * is `{PERIOD_LABELS[period]}` and the words are somewhere else in the file.
 * `detect-hardcoded` cannot see it either: its inventory extracts named
 * reader-facing fields, and a lookup table has none.
 *
 * That is exactly how the planner's pace selector shipped in English in six
 * languages — `{ day: "a day", week: "a week", month: "a month (30 days)" }` —
 * and it was found by reading the file, not by any check.
 *
 * So: string literals in a component file that read as prose. Two or more
 * words, mostly letters, and not one of the shapes a component legitimately
 * writes in English.
 */
const PROSE_LITERAL = /(["'])((?:[A-Za-z][A-Za-z'’-]*)(?:\s+[A-Za-z0-9(][A-Za-z0-9'’()-]*){1,})\1/g;

/** Literals that are code, layout or a value, not something a reader reads. */
const NOT_PROSE = [
  /^(use client|use server|use strict)$/,
  // Tailwind and CSS: class lists, custom properties, media and size keywords.
  /^[a-z0-9-]+(\s+[a-z0-9:[\]()#%._/-]+)+$/,
  /(^|\s)(flex|grid|text|bg|border|rounded|hover|focus|sm|md|lg|xl|mt|mb|px|py|gap|min|max|w|h)[-:]/,
  // Identifiers, types and DOM plumbing.
  /^[a-z]+([A-Z][a-z]*)+$/,
  /^(application|text|image|video|font)\//,
  /^[A-Z][a-z]+ [A-Z][a-z]+$/, // Proper-noun pairs: brand and product names.
  /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/,
  /^x(Mid|Min|Max)Y(Mid|Min|Max)\s+(meet|slice)$/, // SVG preserveAspectRatio
  /^DevEx Calculator$/, // the wordmark
];

/**
 * Comments blanked, strings kept.
 *
 * The bare-text pass blanks both; this one needs the strings and must not see
 * the prose in a doc comment explaining why a string says what it says.
 */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/\/\/[^\n]*/g, blank);
}

function proseLiterals(file: string, source: string): Finding[] {
  const found: Finding[] = [];
  const body = withoutComments(source);
  let match: RegExpExecArray | null;
  PROSE_LITERAL.lastIndex = 0;

  while ((match = PROSE_LITERAL.exec(body)) !== null) {
    const literal = (match[2] ?? "").trim();
    if (literal === "") continue;
    if (!/\s/.test(literal)) continue;
    if (NOT_PROSE.some((p) => p.test(literal))) continue;

    /*
     * A literal handed to `t` is a key. One handed to `console`, `track` or
     * `new Error` is a message for whoever is reading the build output, and
     * translating those would be the wrong fix.
     */
    const before = body.slice(Math.max(0, match.index - 40), match.index);
    if (/\bt\(\s*$|\bkey:\s*$|\bimport\s|from\s+$/.test(before)) continue;
    if (/\b(console\.\w+|track|new Error|throw)\s*\([^)]*$/.test(before)) continue;

    found.push({
      file,
      line: body.slice(0, match.index).split("\n").length,
      text: literal,
    });
  }
  return found;
}

const findings: Finding[] = [];

for (const file of ROOTS.flatMap(files)) {
  const source = readFileSync(join(ROOT, file), "utf8");
  const scannable = withoutCodeText(source);

  // Between a closing `>` and the next opening `<`, with no brace in between:
  // a brace means the value came from an expression, which is where `t` lives.
  const pattern = />([^<>{}]*)</g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(scannable)) !== null) {
    const raw = match[1] ?? "";
    const text = raw.replace(/\s+/g, " ").trim();
    if (text === "") continue;
    if ((text.match(/\p{L}/gu) ?? []).length < 2) continue;
    if (CODE.test(text)) continue;
    if (ALLOWED.some((p) => p.test(text))) continue;

    findings.push({
      file: relative(ROOT, join(ROOT, file)).split("\\").join("/"),
      line: source.slice(0, match.index).split("\n").length,
      text,
    });
  }

  findings.push(...proseLiterals(relative(ROOT, join(ROOT, file)).split("\\").join("/"), source));
}

console.log(`JSX text — ${ROOTS.length} root(s) scanned\n`);

if (findings.length > 0) {
  for (const finding of findings.sort(
    (a, b) => a.file.localeCompare(b.file) || a.line - b.line,
  )) {
    console.error(`  ${finding.file}:${finding.line}  ${JSON.stringify(finding.text.slice(0, 90))}`);
  }
  console.error(
    `\n${findings.length} bare text node(s) in JSX.\n` +
      "Each one renders in English in every language. Move it to a dictionary key.",
  );
  process.exit(1);
}

console.log("No bare English text in any component.");
