/**
 * The i18n audit: every catalog check, run from scratch, every time.
 *
 * `npm run i18n:audit`
 *
 * Writes `dist/reports/i18n/audit-<locale>.json` for machines and
 * `docs/i18n/audit-report.md` for people, and exits non-zero while any locale
 * still carries a critical, meaning-changing or blocking finding.
 *
 * Nothing here trusts an earlier run. The load-bearing figures are read out of
 * the rate registry, the locale list out of the config, the separators out of
 * each locale's own registry entry — so a rate change or a new language moves
 * the audit with the site rather than leaving it asserting last month's facts.
 *
 * What this cannot do is read a language. It finds a number that changed, a
 * token that vanished, an English sentence that never got translated, and a
 * sentence whose English carries an obligation worth checking — and it puts
 * that last group in a queue for a person. A verdict on the queue is recorded
 * in `docs/i18n/critical-claims.md`, by hand, and this script never invents one.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LAUNCH_LOCALES, DEFAULT_LOCALE, getLocaleMeta } from "../../../src/i18n/config";
import { rateRegistry } from "../../../src/lib/calculations/rate-registry";
import { loadCatalog } from "./catalog";
import {
  buildLexiconQueue,
  checkEnglishLeaks,
  checkGlossary,
  checkHardcodedFigures,
  checkKeys,
  checkNumbers,
  checkPlurals,
  checkTokens,
  type Finding,
  type GlossaryTerm,
  type LexiconItem,
} from "./checks";
import type { LoadBearingFigure, Separators } from "./numbers";

const ROOT = process.cwd();
const LOCALES_DIR = join(ROOT, "src/i18n/locales");
const REPORT_DIR = join(ROOT, "dist/reports/i18n");
const MARKDOWN = join(ROOT, "docs/i18n/audit-report.md");

// ---------------------------------------------------------------------------
// What must never be wrong, read from the registry
// ---------------------------------------------------------------------------

function loadBearingFigures(): LoadBearingFigure[] {
  const figures: LoadBearingFigure[] = [];

  for (const rate of rateRegistry.rates) {
    figures.push({
      label: `${rate.id} USD per Robux`,
      value: Number(rate.usdPerRobux),
      source: "src/data/rates.json rates[].usdPerRobux",
    });
    figures.push({
      label: `${rate.id} USD per 1,000`,
      value: Number(rate.usdPerThousandRobux),
      source: "src/data/rates.json rates[].usdPerThousandRobux",
    });
  }

  figures.push({
    label: "minimum eligible Earned Robux",
    value: rateRegistry.minimum.eligibleEarnedRobux,
    source: "src/data/rates.json minimum.eligibleEarnedRobux",
  });

  for (const scheme of rateRegistry.marketplace.schemes) {
    figures.push({
      label: `${scheme.id} creator share %`,
      value: Number(scheme.creatorSharePercent),
      source: "src/data/rates.json marketplace.schemes[].creatorSharePercent",
    });
  }

  // De-duplicated by value: two rates that share a percentage would otherwise
  // report the same literal twice and say nothing extra.
  const seen = new Set<number>();
  return figures.filter((figure) => {
    if (seen.has(figure.value)) return false;
    seen.add(figure.value);
    return true;
  });
}

function separatorsFor(locale: string): Separators {
  const meta = getLocaleMeta(locale as never);
  return { decimal: meta.decimalSeparator, group: meta.groupSeparator };
}

// ---------------------------------------------------------------------------
// Glossary
// ---------------------------------------------------------------------------

/**
 * One approved rendering per domain term per locale.
 *
 * `null` means the term stays in English, which is the right answer for a
 * product name. Everything else is a word this site uses in a specific sense
 * that a general-purpose translation will not preserve — most of all "Earned
 * Robux", which is a different thing from Robux and which several of these
 * languages have no natural way to distinguish.
 *
 * Kept here rather than in a JSON file so each entry can carry the reason it
 * exists next to the value it enforces.
 */
export const GLOSSARY: readonly GlossaryTerm[] = [
  {
    english: "Earned Robux",
    renderings: { "pt-BR": null, es: null, id: null, fr: null, de: null, tr: null },
    note:
      "A distinct balance from ordinary Robux and the only kind DevEx converts. Translating it " +
      "collapses the distinction the whole site rests on, so every locale keeps the English term.",
  },
  {
    english: "Robux",
    renderings: { "pt-BR": null, es: null, id: null, fr: null, de: null, tr: null },
    note: "Product name.",
  },
  {
    english: "DevEx",
    renderings: { "pt-BR": null, es: null, id: null, fr: null, de: null, tr: null },
    note: "Programme name.",
  },
  {
    english: "Developer Exchange",
    renderings: { "pt-BR": null, es: null, id: null, fr: null, de: null, tr: null },
    note: "Programme name, as Roblox writes it.",
  },
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

interface LocaleResult {
  readonly locale: string;
  readonly strings: number;
  readonly findings: readonly Finding[];
  readonly lexiconQueue: readonly LexiconItem[];
  readonly counts: Readonly<Record<string, number>>;
}

const english = loadCatalog(LOCALES_DIR, DEFAULT_LOCALE);
const figures = loadBearingFigures();
const englishSeparators = separatorsFor(DEFAULT_LOCALE);
const targets = LAUNCH_LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);

const results: LocaleResult[] = [];

// English is audited too, for the one thing that is its own problem: figures
// written into a sentence rather than interpolated.
const englishFindings = checkHardcodedFigures(english, figures, englishSeparators);

for (const locale of targets) {
  const target = loadCatalog(LOCALES_DIR, locale);
  const separators = separatorsFor(locale);

  const findings: Finding[] = [
    ...checkKeys(english, target),
    ...checkTokens(english, target),
    ...checkPlurals(english, target),
    ...checkNumbers(english, target, englishSeparators, separators, figures),
    ...checkEnglishLeaks(english, target),
    ...checkGlossary(english, target, GLOSSARY),
  ];

  const counts: Record<string, number> = {};
  for (const finding of findings) {
    counts[finding.check] = (counts[finding.check] ?? 0) + 1;
    counts[finding.severity] = (counts[finding.severity] ?? 0) + 1;
  }

  results.push({
    locale,
    strings: target.entries.size,
    findings,
    lexiconQueue: buildLexiconQueue(english, target),
    counts,
  });
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

mkdirSync(REPORT_DIR, { recursive: true });

for (const result of results) {
  writeFileSync(
    join(REPORT_DIR, `audit-${result.locale}.json`),
    `${JSON.stringify(
      {
        $comment:
          "Written by scripts/i18n/audit/run.ts. Deterministic: no timestamp, so a diff means " +
          "the content changed. Counts are re-derived every run and never carried forward.",
        locale: result.locale,
        status: getLocaleMeta(result.locale as never).status,
        qualityReview: getLocaleMeta(result.locale as never).qualityReview,
        reviewerName: getLocaleMeta(result.locale as never).reviewerName,
        stringsChecked: result.strings,
        counts: result.counts,
        findings: result.findings,
        lexiconQueueSize: result.lexiconQueue.length,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

const SEVERITIES = ["critical", "meaning", "blocking", "quality", "review"] as const;

function table(): string {
  const header =
    "| Locale | Strings | Critical | Meaning | Blocking | Quality | Lexicon queue |\n" +
    "| --- | --- | --- | --- | --- | --- | --- |\n";
  const rows = results
    .map(
      (result) =>
        `| \`${result.locale}\` | ${result.strings} | ${result.counts.critical ?? 0} | ` +
        `${result.counts.meaning ?? 0} | ${result.counts.blocking ?? 0} | ` +
        `${result.counts.quality ?? 0} | ${result.lexiconQueue.length} |`,
    )
    .join("\n");
  return `${header}${rows}\n`;
}

function detail(result: LocaleResult): string {
  if (result.findings.length === 0) {
    return `### \`${result.locale}\`\n\nNo catalog findings.\n`;
  }
  const lines: string[] = [`### \`${result.locale}\`\n`];
  for (const severity of SEVERITIES) {
    const matching = result.findings.filter((finding) => finding.severity === severity);
    if (matching.length === 0) continue;
    lines.push(`**${severity}** — ${matching.length}\n`);
    for (const finding of matching.slice(0, 40)) {
      lines.push(`- \`${finding.key}\` (${finding.check}) — ${finding.message}`);
      if (finding.english !== undefined) {
        lines.push(`  - en: ${JSON.stringify(finding.english.slice(0, 220))}`);
      }
      if (finding.translated !== undefined) {
        lines.push(`  - ${finding.locale}: ${JSON.stringify(finding.translated.slice(0, 220))}`);
      }
    }
    if (matching.length > 40) lines.push(`- …and ${matching.length - 40} more in the JSON report.`);
    lines.push("");
  }
  return lines.join("\n");
}

const totalBlocking = results.reduce(
  (sum, result) =>
    sum + (result.counts.critical ?? 0) + (result.counts.meaning ?? 0) + (result.counts.blocking ?? 0),
  0,
);

writeFileSync(
  MARKDOWN,
  [
    "# i18n audit report",
    "",
    "Generated by `npm run i18n:audit`. Every figure is re-derived from the",
    "repository on each run: the locale list from `src/i18n/config.ts`, the",
    "published rates and thresholds from `src/data/rates.json`, the separators",
    "from each locale's own registry entry. Nothing is carried forward from a",
    "previous run.",
    "",
    "What this report is evidence for: keys, tokens, plural categories, numeric",
    "values, untranslated strings and glossary adherence. What it is **not**",
    "evidence for: whether a sentence means in Portuguese what it means in",
    "English. That verdict lives in `docs/i18n/critical-claims.md` and is",
    "recorded by a person.",
    "",
    "## Summary",
    "",
    table(),
    "",
    `**Blocking total across all locales: ${totalBlocking}** (critical + meaning + blocking).`,
    "",
    "## English-side findings",
    "",
    englishFindings.length === 0
      ? "No published figure is hardcoded in an English string."
      : [
          `${englishFindings.length} English string(s) carry a published figure as literal text`,
          "rather than interpolating it. Each is correct today and each is an edit somebody",
          "has to remember in seven languages when a rate moves.",
          "",
          ...englishFindings
            .slice(0, 40)
            .map(
              (finding) =>
                `- \`${finding.key}\` — ${finding.message}\n  - ${JSON.stringify(
                  (finding.english ?? "").slice(0, 200),
                )}`,
            ),
          englishFindings.length > 40
            ? `- …and ${englishFindings.length - 40} more.`
            : "",
        ].join("\n"),
    "",
    "## Per locale",
    "",
    ...results.map(detail),
    "",
    "## Lexicon review queue",
    "",
    "Strings whose English carries a negation, an obligation, a limit or a hedge.",
    "These are the sentences machine translation reverses or softens, so each one",
    "gets a semantic verdict rather than an automated pass. Verdicts are recorded",
    "in `docs/i18n/critical-claims.md`.",
    "",
    ...results.map(
      (result) => `- \`${result.locale}\`: ${result.lexiconQueue.length} string(s) queued`,
    ),
    "",
  ].join("\n"),
  "utf8",
);

// ---------------------------------------------------------------------------
// Console
// ---------------------------------------------------------------------------

console.log(`i18n audit — ${english.entries.size} English string(s), ${targets.length} locale(s)\n`);

for (const result of results) {
  const critical = result.counts.critical ?? 0;
  const meaning = result.counts.meaning ?? 0;
  const blocking = result.counts.blocking ?? 0;
  const quality = result.counts.quality ?? 0;
  const verdict = critical + meaning + blocking === 0 ? "PASS" : "FAIL";

  console.log(
    `  ${result.locale.padEnd(6)} ${String(result.strings).padStart(5)} strings  ` +
      `critical ${String(critical).padStart(3)}  meaning ${String(meaning).padStart(3)}  ` +
      `blocking ${String(blocking).padStart(3)}  quality ${String(quality).padStart(3)}  ${verdict}`,
  );

  for (const finding of result.findings
    .filter((item) => item.severity === "critical" || item.severity === "blocking" || item.severity === "meaning")
    .slice(0, 8)) {
    console.log(`      ${finding.check}  ${finding.key}`);
    console.log(`        ${finding.message}`);
  }
}

if (englishFindings.length > 0) {
  console.log(`\n  en     ${englishFindings.length} hardcoded published figure(s) — see the report`);
}

console.log(`\n  reports: dist/reports/i18n/audit-<locale>.json`);
console.log(`           docs/i18n/audit-report.md`);

if (totalBlocking > 0) {
  console.error(`\n${totalBlocking} finding(s) block publication.`);
  process.exit(1);
}
console.log("\nCatalog audit clean. Semantic verdicts are in docs/i18n/critical-claims.md.");
