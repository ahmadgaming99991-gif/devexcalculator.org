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

const ROOT = process.cwd();
const LOCALES = join(ROOT, "src/i18n/locales/en");

/**
 * Which namespace each page's prose belongs in, and under which key.
 *
 * Explicit rather than derived from the path: `/platform/stock/` is platform
 * prose and `/robux-tax-calculator/` is marketplace prose, and no path rule
 * gets both right. A page missing from this map is a build failure rather than
 * prose that quietly goes nowhere.
 */
const PLACEMENT: Readonly<Record<string, readonly [namespace: string, prefix: string]>> = {
  "src/app/page.tsx": ["calculator", "home.body"],
  "src/app/about/page.tsx": ["trust", "about.body"],
  "src/app/accessibility/page.tsx": ["legal", "accessibility.body"],
  "src/app/api/page.tsx": ["trust", "api.body"],
  "src/app/calculators/page.tsx": ["guides", "calculators.body"],
  "src/app/error.tsx": ["errors", "boundary.body_"],
  "src/app/layout.tsx": ["common", "shell.body"],
  "src/app/changelog/page.tsx": ["trust", "changelog.body"],
  "src/app/contact/page.tsx": ["contact", "page.body"],
  "src/app/conversions/page.tsx": ["rates", "conversions.body"],
  "src/app/conversions/[slug]/page.tsx": ["rates", "amountPage.body"],
  "src/app/corrections/page.tsx": ["trust", "corrections.body"],
  "src/app/devex-fees-and-taxes/page.tsx": ["rates", "feesAndTaxes.body"],
  "src/app/devex-rate-history/page.tsx": ["rates", "rateHistory.body"],
  "src/app/devex-rates/page.tsx": ["rates", "devexRates.body"],
  "src/app/devex-requirements/page.tsx": ["rates", "requirements.body"],
  "src/app/disclaimer/page.tsx": ["legal", "disclaimer.body"],
  "src/app/earned-robux/page.tsx": ["rates", "earnedRobux.body"],
  "src/app/editorial-policy/page.tsx": ["trust", "editorialPolicy.body"],
  "src/app/guides/page.tsx": ["guides", "index.body"],
  "src/app/how-to-cash-out-robux/page.tsx": ["guides", "cashOut.body"],
  "src/app/methodology/page.tsx": ["trust", "methodology.body"],
  "src/app/not-found.tsx": ["errors", "notFound.body_"],
  "src/app/platform/page.tsx": ["platform", "live.body"],
  "src/app/platform/stock/page.tsx": ["platform", "stock.body"],
  "src/app/privacy/page.tsx": ["legal", "privacy.body"],
  "src/app/roblox-stats/page.tsx": ["platform", "stats.body"],
  "src/app/robux-tax-calculator/page.tsx": ["rates", "robuxTax.body"],
  "src/app/robux-to-usd/page.tsx": ["rates", "robuxToUsd.body"],
  "src/app/sources/page.tsx": ["trust", "sources.body"],
  "src/app/terms/page.tsx": ["legal", "terms.body"],
  "src/app/usd-to-robux/page.tsx": ["rates", "usdToRobux.body"],
  "src/components/content/index.tsx": ["common", "content.body"],
  "src/components/content/tables.tsx": ["common", "tables.body"],
  "src/features/contact/contact-form.tsx": ["contact", "form.body"],
  "src/features/devex/calculator.tsx": ["calculator", "body"],
  "src/features/marketplace/calculator.tsx": ["marketplace", "body"],
  "src/features/devex/components/results.tsx": ["calculator", "results.body"],
  "src/features/devex/group-split.tsx": ["calculator", "groupSplit.body"],
  "src/features/devex/planner.tsx": ["calculator", "planner.body"],
  "src/features/devex/preparation-checklist.tsx": ["calculator", "preparation.body"],
  "src/components/seo/analytics-consent.tsx": ["common", "consent.body"],
  "src/components/layout/rate-source-check.tsx": ["common", "sourceCheck.body"],
  "src/components/layout/site-footer.tsx": ["common", "footer.body"],
};

interface Finding {
  readonly file: string;
  readonly line: number;
  readonly words: number;
  readonly text: string;
}

const report = JSON.parse(
  readFileSync(join(ROOT, "docs/i18n/hardcoded-remaining.json"), "utf8"),
) as { readonly hardcoded: readonly Finding[] };

/**
 * The `<Section id="…">` a line falls inside.
 *
 * Read from the component itself rather than from the report, because the
 * report has already lost the surrounding markup. Falls back to `intro` for
 * anything above the first section — every one of these pages opens with a
 * lead paragraph before its first anchor.
 */
function sectionIndex(file: string): { line: number; id: string }[] {
  const lines = readFileSync(join(ROOT, file), "utf8").split(/\r?\n/);
  const marks: { line: number; id: string }[] = [];
  lines.forEach((line, index) => {
    const match = /\bid=["']([a-z0-9-]+)["']/.exec(line);
    if (match?.[1]) marks.push({ line: index + 1, id: match[1] });
  });
  return marks;
}

/** `rate-comparison` becomes `rateComparison`, so it reads as a key. */
function camel(value: string): string {
  return value.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

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
  const marks = sectionIndex(file);
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
