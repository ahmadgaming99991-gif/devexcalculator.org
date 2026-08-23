/**
 * What the English dictionaries now hold, per namespace.
 *
 * The counterpart to `inventory-english.ts`, which measures what is still
 * hardcoded in the source. Read together they answer the only question that
 * matters during an extraction: how much has moved, and how much has not.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { flatten } from "../../src/i18n/coverage";
import type { DictionaryNamespaceContent } from "../../src/i18n/types";

const DIR = join(process.cwd(), "src/i18n/locales/en");

let keys = 0;
let words = 0;
const rows: { namespace: string; keys: number; words: number }[] = [];

for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()) {
  const content = JSON.parse(readFileSync(join(DIR, file), "utf8")) as DictionaryNamespaceContent;
  const flat = flatten(content);
  let w = 0;
  for (const value of flat.values()) w += value.trim().split(/\s+/).filter(Boolean).length;
  rows.push({ namespace: file.replace(/\.json$/, ""), keys: flat.size, words: w });
  keys += flat.size;
  words += w;
}

console.log("English dictionaries\n");
for (const row of rows) {
  console.log(
    `  ${row.namespace.padEnd(16)} ${String(row.keys).padStart(5)} keys  ${String(row.words).padStart(6)} words`,
  );
}
console.log(`  ${"".padEnd(16)} ${"".padStart(5)}       ${"".padStart(6)}`);
console.log(
  `  ${"TOTAL".padEnd(16)} ${String(keys).padStart(5)} keys  ${String(words).padStart(6)} words  · ${rows.length} namespaces`,
);
