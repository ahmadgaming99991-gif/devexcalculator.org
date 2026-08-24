/**
 * Which dictionary key each English literal in the source became.
 *
 * The extraction copied 1,479 reader-facing strings into the English
 * dictionaries; `i18n:hardcoded` proves every one of them landed. It does not
 * say *where*, and without that the second half — replacing each literal with
 * a lookup — is 66 files of reading a sentence and searching for it by hand,
 * which is where a wrong key silently substitutes a plausible neighbouring
 * sentence.
 *
 * So this joins the two inventories on normalised text and writes the answer
 * down: file, line, the literal, and the `namespace.dotted.key` that now holds
 * it. Ambiguities are reported rather than resolved — when one sentence exists
 * under two keys, only the page's own context can say which one it is, and a
 * script picking the first would be guessing.
 *
 * Run by `npm run i18n:wiring`. Deterministic and sorted, so a diff means the
 * source changed.
 */

import { execSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { flatten } from "../../src/i18n/coverage";
import type { DictionaryNamespaceContent } from "../../src/i18n/types";

const ROOT = process.cwd();
const INVENTORY = join(ROOT, "docs/i18n/current-string-inventory.json");
const LOCALES = join(ROOT, "src/i18n/locales/en");
const OUT = join(ROOT, "docs/i18n/wiring-map.json");

interface Finding {
  readonly file: string;
  readonly line: number;
  readonly category: string;
  readonly words: number;
  readonly text: string;
}

interface Inventory {
  readonly findings: readonly Finding[];
}

/** Identical to the detector's, so the two reports can never disagree. */
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

execSync("npx tsx scripts/i18n/inventory-english.ts", { cwd: ROOT, stdio: "ignore" });

const inventory = JSON.parse(readFileSync(INVENTORY, "utf8")) as Inventory;

/** normalised text -> every key that holds it. */
const index = new Map<string, string[]>();
for (const file of readdirSync(LOCALES).filter((f) => f.endsWith(".json")).sort()) {
  const namespace = file.replace(/\.json$/, "");
  const content = JSON.parse(
    readFileSync(join(LOCALES, file), "utf8"),
  ) as DictionaryNamespaceContent;
  for (const [key, value] of flatten(content)) {
    const slot = index.get(normalise(value));
    const qualified = `${namespace}.${key}`;
    if (slot) slot.push(qualified);
    else index.set(normalise(value), [qualified]);
  }
}

interface Wiring extends Finding {
  readonly key: string | null;
  readonly candidates: readonly string[];
}

const wired: Wiring[] = [];
const ambiguous: Wiring[] = [];
const unmatched: Wiring[] = [];

for (const finding of inventory.findings) {
  const candidates = index.get(normalise(finding.text)) ?? [];
  const row: Wiring = {
    ...finding,
    key: candidates.length === 1 ? (candidates[0] as string) : null,
    candidates: [...candidates].sort(),
  };
  if (candidates.length === 1) wired.push(row);
  else if (candidates.length > 1) ambiguous.push(row);
  else unmatched.push(row);
}

const byFile = new Map<string, { total: number; wired: number; ambiguous: number; unmatched: number }>();
for (const row of [...wired, ...ambiguous, ...unmatched]) {
  const acc = byFile.get(row.file) ?? { total: 0, wired: 0, ambiguous: 0, unmatched: 0 };
  acc.total += 1;
  if (row.key) acc.wired += 1;
  else if (row.candidates.length > 0) acc.ambiguous += 1;
  else acc.unmatched += 1;
  byFile.set(row.file, acc);
}

const order = (a: Wiring, b: Wiring) => a.file.localeCompare(b.file) || a.line - b.line;

mkdirSync(join(ROOT, "docs/i18n"), { recursive: true });
writeFileSync(
  OUT,
  `${JSON.stringify(
    {
      $comment:
        "Every reader-facing English literal in src, joined to the English dictionary key that now holds the same text. `key` is set only when exactly one key matches; `candidates` lists them all when more than one does. Deterministic: no timestamp.",
      totals: {
        findings: inventory.findings.length,
        wired: wired.length,
        ambiguous: ambiguous.length,
        unmatched: unmatched.length,
      },
      byFile: [...byFile.entries()]
        .map(([file, row]) => ({ file, ...row }))
        .sort((a, b) => b.total - a.total || a.file.localeCompare(b.file)),
      ambiguous: [...ambiguous].sort(order),
      unmatched: [...unmatched].sort(order),
      wired: [...wired].sort(order),
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log("English literal -> dictionary key\n");
console.log(`  findings   ${inventory.findings.length}`);
console.log(`  wired      ${wired.length}`);
console.log(`  ambiguous  ${ambiguous.length}`);
console.log(`  unmatched  ${unmatched.length}`);
console.log(`\n  report written to docs/i18n/wiring-map.json`);
