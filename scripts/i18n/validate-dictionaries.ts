/**
 * Proves every translation matches the English it was made from, and writes
 * the per-locale report a reviewer actually needs.
 *
 * Run by `npm run validate:i18n` and by the main check. It exits non-zero on
 * any of the failures `coverage.ts` describes, so an incomplete language
 * cannot reach a build — which is the only thing standing between a
 * half-translated page and a reader who cannot tell.
 *
 * The report is written per locale rather than as one file, because it is read
 * by one reviewer at a time, in one language.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { LAUNCH_LOCALES, DEFAULT_LOCALE, getLocaleMeta } from "../../src/i18n/config";
import { compareNamespace, isComplete, type NamespaceCoverage } from "../../src/i18n/coverage";
import type { DictionaryNamespaceContent, Locale } from "../../src/i18n/types";

const ROOT = process.cwd();
const LOCALES_DIR = join(ROOT, "src/i18n/locales");
const REPORT_DIR = join(ROOT, "dist/reports/i18n");

function read(locale: Locale, namespace: string): DictionaryNamespaceContent | null {
  const file = join(LOCALES_DIR, locale, `${namespace}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as DictionaryNamespaceContent;
  } catch (error) {
    console.error(`  invalid JSON: ${locale}/${namespace}.json — ${String(error)}`);
    process.exitCode = 1;
    return null;
  }
}

/** Namespaces that exist in English. English is the source, so it defines them. */
function sourceNamespaces(): string[] {
  const dir = join(LOCALES_DIR, DEFAULT_LOCALE);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

const namespaces = sourceNamespaces();
if (namespaces.length === 0) {
  console.error("No English dictionaries found. Nothing to validate against.");
  process.exit(1);
}

const targets = LAUNCH_LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);
const rows: NamespaceCoverage[] = [];
let failures = 0;

console.log(`i18n dictionary validation — ${namespaces.length} namespace(s)\n`);

for (const locale of targets) {
  const meta = getLocaleMeta(locale);
  const perLocale: NamespaceCoverage[] = [];

  for (const namespace of namespaces) {
    const source = read(DEFAULT_LOCALE, namespace);
    if (!source) continue;
    const target = read(locale, namespace);

    if (!target) {
      // A namespace that exists in English and not here is the whole file
      // missing, which is worth saying plainly rather than as N missing keys.
      console.log(`  ${locale.padEnd(6)} ${namespace.padEnd(14)} FILE MISSING`);
      failures += 1;
      continue;
    }

    const coverage = compareNamespace(locale, namespace, source, target);
    perLocale.push(coverage);
    rows.push(coverage);

    const problems: string[] = [];
    if (coverage.missing.length) problems.push(`${coverage.missing.length} missing`);
    if (coverage.orphans.length) problems.push(`${coverage.orphans.length} orphan`);
    if (coverage.tokenMismatches.length) {
      problems.push(`${coverage.tokenMismatches.length} token mismatch`);
    }
    if (coverage.untranslated.length) {
      problems.push(`${coverage.untranslated.length} untranslated`);
    }

    const pct =
      coverage.requiredKeys === 0
        ? 100
        : Math.floor((coverage.translatedKeys / coverage.requiredKeys) * 100);

    console.log(
      `  ${locale.padEnd(6)} ${namespace.padEnd(14)} ` +
        `${String(pct).padStart(3)}%  ${String(coverage.words).padStart(6)} words  ` +
        (problems.length ? problems.join(", ") : "ok"),
    );

    if (!isComplete(coverage)) {
      failures += 1;
      for (const key of coverage.missing.slice(0, 5)) console.log(`         missing  ${key}`);
      for (const m of coverage.tokenMismatches.slice(0, 5)) {
        console.log(`         token    ${m.key}: expected ${m.expected.join(" ")} got ${m.found.join(" ")}`);
      }
      for (const key of coverage.untranslated.slice(0, 5)) {
        console.log(`         English  ${key}`);
      }
    }
  }

  // The report a reviewer opens: one language, everything they must look at.
  mkdirSync(REPORT_DIR, { recursive: true });
  const totals = perLocale.reduce(
    (acc, c) => ({
      requiredKeys: acc.requiredKeys + c.requiredKeys,
      translatedKeys: acc.translatedKeys + c.translatedKeys,
      words: acc.words + c.words,
    }),
    { requiredKeys: 0, translatedKeys: 0, words: 0 },
  );

  writeFileSync(
    join(REPORT_DIR, `coverage-${locale}.json`),
    `${JSON.stringify(
      {
        $comment:
          "Per-locale translation review report. Deterministic: no timestamp, so a diff means the content changed.",
        locale,
        status: meta.status,
        qualityReview: meta.qualityReview,
        reviewerName: meta.reviewerName,
        reviewedAt: meta.reviewedAt,
        sourceContentVersion: meta.sourceContentVersion,
        totals,
        namespaces: perLocale,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

const totalWords = rows.reduce((sum, r) => sum + r.words, 0);
const totalRequired = rows.reduce((sum, r) => sum + r.requiredKeys, 0);
const totalDone = rows.reduce((sum, r) => sum + r.translatedKeys, 0);

console.log(
  `\n  ${targets.length} locales · ${totalDone}/${totalRequired} keys · ${totalWords} translated words`,
);
console.log(`  reports written to dist/reports/i18n/coverage-<locale>.json`);

if (failures > 0) {
  console.error(`\n  ${failures} namespace(s) incomplete. See above.`);
  process.exit(1);
}
console.log("\n  Dictionary validation passed.");
