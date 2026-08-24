/**
 * Lifts the body paragraphs out of the page components into the dictionaries.
 *
 * Run by `npm run i18n:extract-prose`. Deterministic: the same components in,
 * the same bytes out.
 *
 * **Why this is a script.** The registry extractor already proved the point on
 * titles and FAQs: six thousand words of paragraph prose copied by hand is six
 * thousand chances to drop a sentence, and a dropped sentence fails silently —
 * the page still renders, it just no longer says the thing that stopped a
 * reader believing the DevEx rate is a choice. Extracting mechanically means
 * the English dictionary is provably the component's own words.
 *
 * **How a key is chosen.** Every one of these pages is built from
 * `<Section id="…">`, and that id is already the anchor in the URL. A
 * paragraph's key is therefore its section's id plus its position inside that
 * section: `about.purpose.p1`. Editing a paragraph does not move the key;
 * inserting one renumbers only the paragraphs after it in that one section,
 * and the coverage validator reports exactly which keys changed. A key derived
 * from the text itself would change on every typo fix, and a key numbered per
 * file would renumber the whole page whenever a section was added.
 *
 * **What is not touched.** Anything the line scanner already covers — headings,
 * captions, labels, attributes — is left alone; those live in hand-written keys
 * with names that mean something. This handles only the runs the line scanner
 * cannot see, which are the wrapped body paragraphs.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PLACEMENT, camel, sectionMarks } from "./placement";

const ROOT = process.cwd();
const LOCALES = join(ROOT, "src/i18n/locales/en");


interface Finding {
  readonly file: string;
  readonly line: number;
  readonly words: number;
  readonly text: string;
}

const report = JSON.parse(
  readFileSync(join(ROOT, "docs/i18n/hardcoded-remaining.json"), "utf8"),
) as { readonly hardcoded: readonly Finding[] };


function setDeep(target: Record<string, unknown>, dotted: string, value: string): void {
  const parts = dotted.split(".");
  let node = target;
  for (const key of parts.slice(0, -1)) {
    const next = node[key];
    node = (typeof next === "object" && next !== null ? next : (node[key] = {})) as Record<
      string,
      unknown
    >;
  }
  node[parts[parts.length - 1] as string] = value;
}

const byFile = new Map<string, Finding[]>();
for (const finding of report.hardcoded) {
  byFile.set(finding.file, [...(byFile.get(finding.file) ?? []), finding]);
}

const dictionaries = new Map<string, Record<string, unknown>>();
function dictionary(namespace: string): Record<string, unknown> {
  const existing = dictionaries.get(namespace);
  if (existing) return existing;
  const loaded = JSON.parse(
    readFileSync(join(LOCALES, `${namespace}.json`), "utf8"),
  ) as Record<string, unknown>;
  dictionaries.set(namespace, loaded);
  return loaded;
}

let added = 0;
let words = 0;
const unplaced: string[] = [];

for (const [file, findings] of [...byFile.entries()].sort()) {
  const placement = PLACEMENT[file];
  if (!placement) {
    unplaced.push(file);
    continue;
  }
  const [namespace, prefix] = placement;
  const target = dictionary(namespace);
  const marks = sectionMarks(join(ROOT, file));
  const counters = new Map<string, number>();

  for (const finding of [...findings].sort((a, b) => a.line - b.line)) {
    let section = "intro";
    for (const mark of marks) {
      if (mark.line <= finding.line) section = mark.id;
      else break;
    }
    const key = camel(section);
    const ordinal = (counters.get(key) ?? 0) + 1;
    counters.set(key, ordinal);
    setDeep(target, `${prefix}.${key}.p${ordinal}`, finding.text);
    added += 1;
    words += finding.words;
  }
}

if (unplaced.length > 0) {
  console.error("No placement declared for:");
  for (const file of unplaced) console.error(`  ${file}`);
  console.error("\nAdd each to PLACEMENT so its prose has somewhere to go.");
  process.exit(1);
}

for (const [namespace, content] of dictionaries) {
  writeFileSync(
    join(LOCALES, `${namespace}.json`),
    `${JSON.stringify(content, null, 2)}\n`,
    "utf8",
  );
}

console.log(`page prose: ${added} paragraphs · ${words} words`);
console.log(`  into ${dictionaries.size} namespaces`);
