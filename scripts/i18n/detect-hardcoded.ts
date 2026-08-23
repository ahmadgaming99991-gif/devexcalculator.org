/**
 * How much reader-facing English is still written into the source.
 *
 * `inventory-english.ts` counts every translatable string in `src`.
 * `inventory-dictionaries.ts` counts what the English dictionaries hold. This
 * one subtracts: it re-runs the inventory and marks each finding **covered**
 * when its exact text already exists as a value in an English dictionary, and
 * **hardcoded** when it does not.
 *
 * The number that matters during an extraction is the second one, and it is
 * the only honest way to answer "is the extraction finished". A namespace
 * count going up proves work happened; only this going down proves the work
 * was the right work. Extraction is a copy before it is a cut, so a string can
 * be in both places at once — that is what "covered" means, and the page is
 * not migrated until the literal is gone from the source too.
 *
 * Comparison is on normalised text: curly and straight quotes are folded
 * together, and runs of whitespace collapse, because JSX wraps a sentence
 * across lines and a dictionary holds it on one. It is an exact comparison
 * after that — the inventory carries whole strings, so a prefix match would
 * only let a half-extracted paragraph pass.
 *
 * Run by `npm run i18n:hardcoded`. Deterministic, and writes a sorted report
 * to `docs/i18n/hardcoded-remaining.json` so two runs can be diffed.
 */

import { execSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { flatten } from "../../src/i18n/coverage";
import type { DictionaryNamespaceContent } from "../../src/i18n/types";

const ROOT = process.cwd();
const INVENTORY = join(ROOT, "docs/i18n/current-string-inventory.json");
const LOCALES = join(ROOT, "src/i18n/locales/en");
const OUT = join(ROOT, "docs/i18n/hardcoded-remaining.json");

interface Finding {
  readonly file: string;
  readonly line: number;
  readonly category: string;
  readonly words: number;
  readonly text: string;
}

interface Inventory {
  readonly totals: { readonly strings: number; readonly words: number; readonly files: number };
  readonly findings: readonly Finding[];
}

/**
 * Fold the differences that are typography rather than content.
 *
 * A page writes `Roblox&rsquo;s` and a dictionary writes `Roblox’s`; JSX puts
 * a newline and eight spaces mid-sentence where JSON has one space. Neither is
 * a different string, and treating them as different would report an
 * extraction as unfinished forever.
 */
function normalise(value: string): string {
  return value
    .replace(/&rsquo;|&#8217;|[‘’ʼ]/g, "'")
    .replace(/&ldquo;|&rdquo;|[“”]/g, '"')
    .replace(/&mdash;|—/g, "-")
    .replace(/&ndash;|–/g, "-")
    .replace(/&hellip;|…/g, "...")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Re-run the inventory so this can never report against a stale scan.
execSync("npx tsx scripts/i18n/inventory-english.ts", { cwd: ROOT, stdio: "ignore" });

const inventory = JSON.parse(readFileSync(INVENTORY, "utf8")) as Inventory;

const dictionary = new Set<string>();
for (const file of readdirSync(LOCALES).filter((f) => f.endsWith(".json"))) {
  const content = JSON.parse(readFileSync(join(LOCALES, file), "utf8")) as DictionaryNamespaceContent;
  for (const value of flatten(content).values()) dictionary.add(normalise(value));
}

const covered: Finding[] = [];
const hardcoded: Finding[] = [];
for (const finding of inventory.findings) {
  (dictionary.has(normalise(finding.text)) ? covered : hardcoded).push(finding);
}

const byFile = new Map<string, { strings: number; words: number }>();
for (const finding of hardcoded) {
  const row = byFile.get(finding.file) ?? { strings: 0, words: 0 };
  row.strings += 1;
  row.words += finding.words;
  byFile.set(finding.file, row);
}

const coveredWords = covered.reduce((sum, f) => sum + f.words, 0);
const hardcodedWords = hardcoded.reduce((sum, f) => sum + f.words, 0);
const pct = inventory.totals.strings === 0 ? 100 : (covered.length / inventory.totals.strings) * 100;

mkdirSync(join(ROOT, "docs/i18n"), { recursive: true });
writeFileSync(
  OUT,
  `${JSON.stringify(
    {
      $comment:
        "Reader-facing English still written into src, after subtracting anything that already exists verbatim in an English dictionary. Deterministic: no timestamp, so a diff means the code changed.",
      totals: {
        scanned: inventory.totals.strings,
        covered: covered.length,
        hardcoded: hardcoded.length,
        coveredWords,
        hardcodedWords,
        coveragePercent: Number(pct.toFixed(1)),
      },
      byFile: [...byFile.entries()]
        .map(([file, row]) => ({ file, ...row }))
        .sort((a, b) => b.strings - a.strings || a.file.localeCompare(b.file)),
      hardcoded: [...hardcoded].sort(
        (a, b) => a.file.localeCompare(b.file) || a.line - b.line,
      ),
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log("Reader-facing English still in the source\n");
for (const [file, row] of [...byFile.entries()]
  .sort((a, b) => b[1].strings - a[1].strings)
  .slice(0, 25)) {
  console.log(`  ${String(row.strings).padStart(4)} strings ${String(row.words).padStart(6)} words  ${file}`);
}
console.log(
  `\n  scanned ${inventory.totals.strings} · covered ${covered.length} (${pct.toFixed(1)}%) · hardcoded ${hardcoded.length}`,
);
console.log(`  words: covered ${coveredWords} · hardcoded ${hardcodedWords}`);
console.log(`  report written to docs/i18n/hardcoded-remaining.json`);
