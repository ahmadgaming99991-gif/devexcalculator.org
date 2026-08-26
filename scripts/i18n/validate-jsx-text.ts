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
    else if (entry.endsWith(".tsx")) out.push(join(dir, entry));
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
function withoutCodeText(source: string): string {
  return source
    /*
     * `<Foreign>` is a declaration, not an oversight. It renders `lang="en"`
     * around a name that stays English in every language — a cited document's
     * title, an experience a creator named. Blanking it here is what lets the
     * rest of this check be strict: anything still English and *not* wrapped
     * is a component that forgot to call `t`.
     */
    .replace(/<Foreign>[\s\S]*?<\/Foreign>/g, (m) => " ".repeat(m.length))
    .replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length))
    .replace(/\/\/[^\n]*/g, (m) => " ".repeat(m.length))
    .replace(/"(?:[^"\\\n]|\\.)*"/g, (m) => " ".repeat(m.length))
    .replace(/'(?:[^'\\\n]|\\.)*'/g, (m) => " ".repeat(m.length))
    .replace(/`(?:[^`\\]|\\.)*`/g, (m) => " ".repeat(m.length));
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
