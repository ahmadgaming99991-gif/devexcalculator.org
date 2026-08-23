import type { DictionaryNamespaceContent, DictionaryValue, Locale } from "./types";

/**
 * Comparing a translation against the English it was made from.
 *
 * Pure functions over two plain objects, so the validator script, the unit
 * tests and the per-locale review report all reach the same verdict rather
 * than each implementing its own idea of "complete".
 *
 * What counts as a failure, and why each one matters more than it looks:
 *
 *   **Missing key** — the page renders nothing where a sentence belongs, or
 *   throws. There is no English fallback by design: falling back would put an
 *   English sentence inside a Portuguese paragraph where no test would see it.
 *
 *   **Orphan key** — a translation for a string English no longer has. Harmless
 *   to render and a reliable sign the translation is drifting from its source.
 *
 *   **Token mismatch** — `{amount}` translated into `{quantidade}`, or dropped.
 *   The interpolator fills tokens by name, so a renamed token is never filled:
 *   the reader sees the literal word `{quantidade}` where their payout should
 *   be. A dropped token is worse — the sentence reads fine and the number is
 *   simply gone.
 *
 *   **Untranslated value** — the English string copied through unchanged. Some
 *   of those are correct: "API", "Roblox", "DevEx", "Earned Robux" are
 *   protected names that must not be translated. The rest are the "translated
 *   navigation around an English article" failure, caught one string at a time.
 */

/** Names that are identical in every language and must not be flagged. */
export const PROTECTED_TERMS: readonly string[] = [
  "Roblox",
  "Robux",
  "DevEx",
  "Developer Exchange",
  "Earned Robux",
  "Creator Hub",
  "Cloudflare",
  "Next.js",
  "OpenNext",
  "API",
  "JSON",
  "CSV",
  "USD",
  "RSS",
  "Atom",
  "SEO",
  "URL",
  "HTML",
  "WCAG",
  "OpenAPI",
  "SEC",
  "ECB",
  "IndexNow",
  "DevExCalculator.org",
];

/** Flattens a namespace into dotted key paths, so nesting cannot hide a gap. */
export function flatten(
  content: DictionaryNamespaceContent | DictionaryValue,
  prefix = "",
): Map<string, string> {
  const out = new Map<string, string>();

  const visit = (value: DictionaryValue, path: string): void => {
    if (typeof value === "string") {
      out.set(path, value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    for (const [key, child] of Object.entries(value as Record<string, DictionaryValue>)) {
      // Metadata for translators and this validator, never rendered.
      if (key === "$comment" || key === "$identical") continue;
      visit(child, path === "" ? key : `${path}.${key}`);
    }
  };

  visit(content as DictionaryValue, prefix);
  return out;
}

/** Interpolation tokens in a string, as a sorted, deduplicated list. */
export function tokensIn(value: string): readonly string[] {
  const found = value.match(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g) ?? [];
  return [...new Set(found)].sort();
}

/**
 * Whether a value that matches its English source is legitimately unchanged.
 *
 * A protected name, a bare number, a URL, or a string with no letters at all
 * is expected to be identical. Anything else that survived translation
 * untouched is a string somebody missed.
 */
export function isLegitimatelyIdentical(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return true;
  if (!/[A-Za-z]/.test(trimmed)) return true;
  if (/^https?:\/\//.test(trimmed) || trimmed.startsWith("/")) return true;
  if (PROTECTED_TERMS.some((term) => term.toLowerCase() === trimmed.toLowerCase())) return true;
  // A short phrase built only from protected names, punctuation and digits.
  const stripped = PROTECTED_TERMS.reduce(
    (acc, term) => acc.replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), " "),
    trimmed,
  );
  return !/[A-Za-z]{2}/.test(stripped);
}

export interface NamespaceCoverage {
  readonly locale: Locale;
  readonly namespace: string;
  readonly requiredKeys: number;
  readonly translatedKeys: number;
  readonly words: number;
  readonly missing: readonly string[];
  readonly orphans: readonly string[];
  readonly tokenMismatches: readonly {
    readonly key: string;
    readonly expected: readonly string[];
    readonly found: readonly string[];
  }[];
  readonly untranslated: readonly string[];
  /** Keys the translator declared as legitimately the same word in English. */
  readonly declaredIdentical: readonly string[];
}

/** Compares one namespace in one locale against the English source. */
export function compareNamespace(
  locale: Locale,
  namespace: string,
  source: DictionaryNamespaceContent,
  target: DictionaryNamespaceContent,
): NamespaceCoverage {
  const english = flatten(source);
  const translated = flatten(target);
  /*
   * Keys whose translation really is the English word.
   *
   * "Contact" is French. "Platform" is Indonesian and Turkish. "Legal" is
   * Spanish. A leak detector that flags every Latin-script word as untranslated
   * is a detector nobody can keep green, and one nobody keeps green stops being
   * read — so the escape hatch is an explicit, per-key, per-file list that a
   * reviewer sees sitting next to the value it excuses.
   *
   * It is a list of keys and not a flag on the value, so adding one is a
   * deliberate act that shows up in a diff.
   */
  const identical = new Set(
    Array.isArray((target as Record<string, unknown>).$identical)
      ? ((target as Record<string, unknown>).$identical as string[])
      : [],
  );

  const missing: string[] = [];
  const orphans: string[] = [];
  const tokenMismatches: NamespaceCoverage["tokenMismatches"] = [];
  const untranslated: string[] = [];
  let words = 0;

  for (const [key, englishValue] of english) {
    const value = translated.get(key);
    if (value === undefined) {
      missing.push(key);
      continue;
    }

    words += value.trim().split(/\s+/).filter(Boolean).length;

    const expected = tokensIn(englishValue);
    const found = tokensIn(value);
    if (expected.join("|") !== found.join("|")) {
      (tokenMismatches as { key: string; expected: readonly string[]; found: readonly string[] }[]).push(
        { key, expected, found },
      );
    }

    if (value === englishValue && !isLegitimatelyIdentical(value) && !identical.has(key)) {
      untranslated.push(key);
    }
  }

  for (const key of translated.keys()) {
    if (!english.has(key)) orphans.push(key);
  }

  return {
    locale,
    namespace,
    requiredKeys: english.size,
    translatedKeys: english.size - missing.length,
    words,
    missing: missing.sort(),
    orphans: orphans.sort(),
    tokenMismatches,
    untranslated: untranslated.sort(),
    declaredIdentical: [...identical].sort(),
  };
}

/** Whether a namespace is complete enough to count towards publication. */
export function isComplete(coverage: NamespaceCoverage): boolean {
  return (
    coverage.missing.length === 0 &&
    coverage.tokenMismatches.length === 0 &&
    coverage.untranslated.length === 0
  );
}
