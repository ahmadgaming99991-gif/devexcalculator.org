/**
 * The checks themselves. Pure functions over two catalogs, so a fix can be
 * re-audited from scratch rather than remembered.
 *
 * Severity is not decoration. It decides whether a locale can ship:
 *
 *   `critical`  a wrong number, or a claim that contradicts the registry
 *   `meaning`   the translation states something English does not
 *   `blocking`  structurally broken: missing key, broken token, duplicate
 *   `quality`   reads as machine translation; wrong but not misleading
 *   `review`    cannot be settled from this repository; needs a native reader
 */

import type { Catalog, CatalogEntry } from "./catalog";
import {
  compareLabels,
  compareNumbers,
  extractLabels,
  extractNumbers,
  figuresPresent,
  type LoadBearingFigure,
  type Separators,
} from "./numbers";

export type Severity = "critical" | "meaning" | "blocking" | "quality" | "review";

export interface Finding {
  readonly severity: Severity;
  readonly check: string;
  readonly locale: string;
  readonly key: string;
  readonly file: string;
  readonly message: string;
  readonly english?: string;
  readonly translated?: string;
}

/**
 * Strings that are the same in every language and must not be flagged.
 *
 * Written out here rather than inferred, because every entry is a judgement
 * somebody should be able to argue with. Product and company names, unit codes,
 * document identifiers, and the technical vocabulary the API page prints
 * verbatim. Anything not on this list that survived translation untouched is a
 * string somebody missed.
 */
export const IDENTICAL_ALLOWLIST: readonly string[] = [
  "Roblox",
  "Robux",
  "DevEx",
  "Developer Exchange",
  "Earned Robux",
  "Creator Hub",
  "Roblox Corporation",
  "Cloudflare",
  "Next.js",
  "OpenNext",
  "Turnstile",
  "DevExCalculator.org",
  "devexcalculator.org",
  "API",
  "JSON",
  "CSV",
  "RSS",
  "Atom",
  "HTML",
  "URL",
  "SEO",
  "WCAG",
  "OpenAPI",
  "SEC",
  "ECB",
  "IndexNow",
  "GAAP",
  "EBITDA",
  "USD",
  "EUR",
  "GBP",
  "W-9",
  "W-8",
  "IRS",
  "PT",
  "CET",
  "UTC",
];

/** A value made only of allow-listed names, punctuation and digits. */
function isLegitimatelyIdentical(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return true;
  if (!/[A-Za-z]/.test(trimmed)) return true;
  if (/^https?:\/\//.test(trimmed) || trimmed.startsWith("/")) return true;

  /*
   * Longest first, and that is not a detail.
   *
   * Stripping in declaration order removed "Robux" from "Earned Robux" and
   * left the word "Earned" behind, so the term this whole site is built on was
   * reported as untranslated in all six languages — six fabricated findings a
   * reviewer would have spent an afternoon disproving.
   */
  const stripped = [...IDENTICAL_ALLOWLIST].sort((a, b) => b.length - a.length).reduce(
    (accumulator, term) =>
      accumulator.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " "),
    trimmed,
  );
  return !/[A-Za-z]{2}/.test(stripped);
}

/**
 * Keys whose numbers legitimately do not match across languages.
 *
 * One entry, and it has to name its reason. An exemption without one is how a
 * real finding gets silenced, so the list is deliberately short, deliberately
 * per-key, and sits in the file a reviewer is already reading.
 */
export const NUMERIC_EXEMPTIONS: Readonly<Record<string, string>> = {
  "calculator.home.body.howItWorks.p2":
    "The sentence contrasts what a naive floating-point calculation prints — " +
    "`91.80000000000001`, which is machine output and carries machine notation in every " +
    "language — against the correct figure, which is localized. Two notations in one " +
    "sentence is the point being made, not a defect. Verified in de and tr: the rate, the " +
    "amount and the correct value are all localized; only the artifact is not.",
};

export function tokensIn(value: string): string[] {
  return (value.match(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g) ?? []).sort();
}

// ---------------------------------------------------------------------------
// A. Key integrity
// ---------------------------------------------------------------------------

export function checkKeys(english: Catalog, target: Catalog): Finding[] {
  const findings: Finding[] = [];

  for (const [key, entry] of english.entries) {
    if (target.entries.has(key)) continue;
    findings.push({
      severity: "blocking",
      check: "missing-key",
      locale: target.locale,
      key,
      file: entry.file,
      message: "Present in English, absent here. `t` throws for it at render.",
      english: entry.value,
    });
  }

  for (const [key, entry] of target.entries) {
    if (english.entries.has(key)) continue;
    findings.push({
      severity: "quality",
      check: "orphan-key",
      locale: target.locale,
      key,
      file: entry.file,
      message: "Translated but English no longer has it. Drift from the source.",
      translated: entry.value,
    });
  }

  for (const duplicate of target.duplicates) {
    findings.push({
      severity: "blocking",
      check: "duplicate-key",
      locale: target.locale,
      key: duplicate.key,
      file: duplicate.file,
      message:
        `Declared ${duplicate.occurrences} times in the same object. JSON keeps the last ` +
        "one silently, so one of these translations is unreachable.",
    });
  }

  for (const [key, entry] of target.entries) {
    if (entry.value.trim() !== "") continue;
    findings.push({
      severity: "blocking",
      check: "empty-value",
      locale: target.locale,
      key,
      file: entry.file,
      message: "Empty or whitespace only. The page renders nothing where a sentence belongs.",
      english: english.entries.get(key)?.value,
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// B. Placeholders
// ---------------------------------------------------------------------------

export function checkTokens(english: Catalog, target: Catalog): Finding[] {
  const findings: Finding[] = [];

  for (const [key, entry] of english.entries) {
    const translated = target.entries.get(key);
    if (translated === undefined) continue;

    const wanted = tokensIn(entry.value);
    const given = tokensIn(translated.value);
    if (wanted.join(" ") === given.join(" ")) continue;

    const missing = wanted.filter((token) => !given.includes(token));
    const extra = given.filter((token) => !wanted.includes(token));
    const parts: string[] = [];
    if (missing.length > 0) {
      parts.push(
        `drops ${missing.join(" ")} — the value never reaches the reader, and the sentence ` +
          "still reads as a complete one",
      );
    }
    if (extra.length > 0) {
      parts.push(`carries ${extra.join(" ")}, which nothing fills — the reader sees the braces`);
    }
    if (parts.length === 0) {
      parts.push(`token multiset differs: expected ${wanted.join(" ")}, found ${given.join(" ")}`);
    }

    findings.push({
      severity: "blocking",
      check: "token-mismatch",
      locale: target.locale,
      key,
      file: entry.file,
      message: parts.join("; "),
      english: entry.value,
      translated: translated.value,
    });
  }

  return findings;
}

/**
 * Plural groups, against the target language's actual CLDR categories.
 *
 * The catalogs carry sibling `one` / `other` keys and the call sites choose
 * between them. This asserts the categories a locale needs are the ones it has.
 */
export function checkPlurals(english: Catalog, target: Catalog): Finding[] {
  const findings: Finding[] = [];
  const categories = new Set(new Intl.PluralRules(target.locale).resolvedOptions().pluralCategories);

  const groups = new Set<string>();
  for (const key of english.entries.keys()) {
    const match = key.match(/^(.*)\.(one|other|few|many|two|zero)$/);
    if (match?.[1] !== undefined) groups.add(match[1]);
  }

  for (const group of groups) {
    for (const category of categories) {
      // `many` in es/fr/pt applies only to compact notation, which this site
      // does not use to select a plural form. Requiring it would demand a key
      // no call site can ever reach.
      if (category === "many") continue;
      const key = `${group}.${category}`;
      if (english.entries.has(key) && !target.entries.has(key)) {
        findings.push({
          severity: "blocking",
          check: "plural-category",
          locale: target.locale,
          key,
          file: `${key.split(".")[0]}.json`,
          message: `${target.locale} requires the "${category}" category and this group lacks it.`,
        });
      }
    }
  }

  return findings;
}

// ---------------------------------------------------------------------------
// C. Numeric integrity
// ---------------------------------------------------------------------------

export function checkNumbers(
  english: Catalog,
  target: Catalog,
  englishSeparators: Separators,
  targetSeparators: Separators,
  figures: readonly LoadBearingFigure[],
): Finding[] {
  const findings: Finding[] = [];

  for (const [key, entry] of english.entries) {
    const translated = target.entries.get(key);
    if (translated === undefined) continue;
    if (key in NUMERIC_EXEMPTIONS) continue;

    /*
     * Times and quarter labels first, and out of the way.
     *
     * They carry digits and are not quantities, and every language writes them
     * differently: `16:00` becomes `16 h` in French and `16h` in Portuguese,
     * and `Q2` is spelled out in Spanish. Compared as bare numbers, six correct
     * localizations read as six numeric errors.
     */
    const englishLabels = extractLabels(entry.value);
    let translatedLabels = extractLabels(translated.value, englishLabels.times.length > 0);

    /*
     * `Q2` becomes `2º trimestre` in Portuguese and `2e trimestre` in French.
     * The label survives as an ordinal, so the digit is still in the sentence
     * and the numeric comparison sees a 2 that English does not have. One
     * occurrence of each quarter digit is removed for that reason, and only
     * when English carried the label to begin with.
     */
    if (englishLabels.quarters.length > 0 && translatedLabels.quarters.length === 0) {
      let rest = translatedLabels.rest;
      for (const quarter of englishLabels.quarters) {
        // Written with doubled backslashes: this is a template literal, where
        // a lone `\b` is the backspace character and not a word boundary.
        rest = rest.replace(new RegExp(`\\b${quarter}\\s*(?:[ºo°ª]|e\\b|\\.)`, "u"), " ");
      }
      translatedLabels = { ...translatedLabels, rest };
    }

    for (const mismatch of compareLabels(englishLabels, translatedLabels)) {
      findings.push({
        severity: mismatch.spelledOut ? "review" : "critical",
        check: `label-${mismatch.kind}`,
        locale: target.locale,
        key,
        file: entry.file,
        message: mismatch.detail,
        english: entry.value,
        translated: translated.value,
      });
    }

    const source = extractNumbers(englishLabels.rest, englishSeparators, "en");
    if (
      source.length === 0 &&
      extractNumbers(translatedLabels.rest, targetSeparators, target.locale).length === 0
    ) {
      continue;
    }

    /*
     * Read the translation every way it could reasonably be read, and judge it
     * on the best one.
     *
     * A sentence can legitimately mix notations — a localized "17.000" beside a
     * float artifact "91.80000000000001" quoted verbatim from a machine — and
     * an all-or-nothing comparison against one convention condemns the whole
     * sentence because half of it is written the other way. That produced 219
     * false criticals for French alone.
     *
     * Space is normalised because the site's own parser normalises it:
     * `number-parser.ts` accepts U+0020, U+00A0 and U+202F interchangeably,
     * since a reader pasting a French figure back into a French field pastes
     * whichever one `Intl` emitted.
     *
     * A number that is genuinely wrong is wrong under every reading, which is
     * what stops this from being a way to pass.
     */
    const spaceNormalised = translatedLabels.rest.replace(/[   ]/g, " ");
    const readings: readonly { readonly name: string; readonly text: string; readonly separators: Separators }[] = [
      { name: "locale", text: translatedLabels.rest, separators: targetSeparators },
      { name: "locale-space", text: spaceNormalised, separators: { ...targetSeparators, group: " " } },
      { name: "english", text: spaceNormalised, separators: englishSeparators },
    ];

    let best = {
      name: "locale",
      mismatches: compareNumbers(
        source,
        extractNumbers(readings[0]!.text, readings[0]!.separators, target.locale),
      ),
    };
    for (const reading of readings.slice(1)) {
      if (best.mismatches.length === 0) break;
      const candidate = compareNumbers(
        source,
        extractNumbers(reading.text, reading.separators, target.locale),
      );
      if (candidate.length < best.mismatches.length) {
        best = { name: reading.name, mismatches: candidate };
      }
    }

    if (best.mismatches.length === 0 && best.name === "english") {
      findings.push({
        severity: "quality",
        check: "english-number-notation",
        locale: target.locale,
        key,
        file: entry.file,
        message:
          "The values are right and they are written with English separators. A reader of this " +
          "locale parses those differently, and the site's own formatter would not produce them.",
        english: entry.value,
        translated: translated.value,
      });
      continue;
    }

    const mismatches = best.mismatches;

    for (const mismatch of mismatches) {
      const carriesFigure = figures.some((figure) => figure.value === mismatch.value);
      findings.push({
        severity: "critical",
        check: "number-mismatch",
        locale: target.locale,
        key,
        file: entry.file,
        message:
          mismatch.kind === "missing-in-translation"
            ? `English states ${mismatch.raw}${mismatch.percent ? "%" : ""} and the translation ` +
              `has no such value.${carriesFigure ? " This is a published figure." : ""}`
            : `The translation states ${mismatch.raw}${mismatch.percent ? "%" : ""}, which is ` +
              "not in the English.",
        english: entry.value,
        translated: translated.value,
      });
    }
  }

  return findings;
}

/**
 * Published figures written into a translated sentence instead of interpolated.
 *
 * Reported even when the value is currently correct. Seven copies of a rate is
 * seven edits when it changes, and six of them are in languages the person
 * making the edit does not read.
 */
export function checkHardcodedFigures(
  english: Catalog,
  figures: readonly LoadBearingFigure[],
  separators: Separators,
): Finding[] {
  const findings: Finding[] = [];

  for (const [key, entry] of english.entries) {
    if (tokensIn(entry.value).length > 0 && !/\d/.test(entry.value.replace(/\{[^}]*\}/g, ""))) {
      continue;
    }
    const present = figuresPresent(extractNumbers(entry.value, separators), figures);
    if (present.length === 0) continue;

    findings.push({
      severity: "quality",
      check: "hardcoded-figure",
      locale: "en",
      key,
      file: entry.file,
      message:
        `Carries ${present.map((f) => `${f.label} (${f.value})`).join(", ")} as literal text. ` +
        `Sourced from ${present[0]?.source ?? "the registry"}; interpolating it would make a ` +
        "rate change one edit rather than seven.",
      english: entry.value,
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// D. English leaks
// ---------------------------------------------------------------------------

export function checkEnglishLeaks(english: Catalog, target: Catalog): Finding[] {
  const findings: Finding[] = [];

  for (const [key, entry] of english.entries) {
    const translated = target.entries.get(key);
    if (translated === undefined) continue;
    if (translated.value !== entry.value) continue;
    if (isLegitimatelyIdentical(entry.value)) continue;
    if (target.declaredIdentical.has(key)) continue;

    findings.push({
      severity: "meaning",
      check: "untranslated",
      locale: target.locale,
      key,
      file: entry.file,
      message:
        "Byte-identical to English and not on the allow-list or this file's `$identical` list.",
      english: entry.value,
      translated: translated.value,
    });
  }

  return findings;
}

// ---------------------------------------------------------------------------
// E. Meaning-critical lexicon
// ---------------------------------------------------------------------------

/**
 * The words machine translation reverses, softens or strengthens.
 *
 * Every English string containing one of these is queued for a semantic verdict
 * rather than passed. The list is the brief's, and each term is here because it
 * carries an obligation, a limit, a negation or a hedge — the four things a
 * fluent mistranslation silently changes.
 */
export const LEXICON: readonly string[] = [
  "not",
  "never",
  "no",
  "may",
  "might",
  "can",
  "must",
  "should",
  "only",
  "at least",
  "minimum",
  "up to",
  "eligible",
  "eligibility",
  "approved",
  "approval",
  "guarantee",
  "guaranteed",
  "conditional",
  "subject to",
  "estimated",
  "estimate",
  "approximately",
  "about",
  "required",
  "discretion",
  "sole discretion",
  "reserves the right",
];

export interface LexiconItem {
  readonly key: string;
  readonly file: string;
  readonly terms: readonly string[];
  readonly english: string;
  readonly translated: string;
}

export function buildLexiconQueue(english: Catalog, target: Catalog): LexiconItem[] {
  const queue: LexiconItem[] = [];
  const patterns = LEXICON.map(
    (term) => [term, new RegExp(`\\b${term.replace(/ /g, "\\s+")}\\b`, "i")] as const,
  );

  for (const [key, entry] of english.entries) {
    const translated = target.entries.get(key);
    if (translated === undefined) continue;

    const terms = patterns.filter(([, pattern]) => pattern.test(entry.value)).map(([term]) => term);
    if (terms.length === 0) continue;

    queue.push({ key, file: entry.file, terms, english: entry.value, translated: translated.value });
  }
  return queue;
}

// ---------------------------------------------------------------------------
// Glossary
// ---------------------------------------------------------------------------

export interface GlossaryTerm {
  readonly english: string;
  /** The one approved rendering per locale. `null` means "keep the English". */
  readonly renderings: Readonly<Record<string, string | null>>;
  readonly note: string;
}

/**
 * Terminology drift, which is what makes a translated site feel unmaintained.
 *
 * Checks the direction that matters: where English uses a domain term, the
 * translation must use the approved rendering. The reverse — a locale using the
 * approved word somewhere English does not — is usually fine and would report
 * noise.
 */
export function checkGlossary(
  english: Catalog,
  target: Catalog,
  glossary: readonly GlossaryTerm[],
): Finding[] {
  const findings: Finding[] = [];

  for (const term of glossary) {
    const approved = term.renderings[target.locale];
    if (approved === undefined) continue;

    const pattern = new RegExp(`\\b${term.english.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    const expected = approved ?? term.english;

    for (const [key, entry] of english.entries) {
      if (!pattern.test(entry.value)) continue;
      const translated = target.entries.get(key);
      if (translated === undefined) continue;
      if (translated.value.toLowerCase().includes(expected.toLowerCase())) continue;

      findings.push({
        severity: "quality",
        check: "glossary",
        locale: target.locale,
        key,
        file: entry.file,
        message: `English says "${term.english}"; this locale's approved rendering is "${expected}" and it does not appear. ${term.note}`,
        english: entry.value,
        translated: translated.value,
      });
    }
  }

  return findings;
}

export function entriesOf(catalog: Catalog): CatalogEntry[] {
  return [...catalog.entries.values()];
}
