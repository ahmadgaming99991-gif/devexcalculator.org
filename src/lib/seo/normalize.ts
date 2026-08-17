/**
 * Keyword normalisation.
 *
 * Two rules govern everything here:
 *   1. The raw keyword is never destroyed. Every normalised field is additive,
 *      so any grouping decision can be audited back to the exact source cell.
 *   2. Formatting variants collapse; intents do not. `100,000`, `100 000` and
 *      `100k` are one amount entity, but `robux to usd` and `usd to robux`
 *      stay apart because they are different tasks.
 */

/** Collapses Unicode width/diacritic variants and whitespace runs. */
export function normalizeKeyword(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[​-‍﻿­]/g, "")
    .replace(/[‐-―]/g, "-")
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Lowercase key used for grouping and duplicate detection. */
export function comparisonKey(raw: string): string {
  return normalizeKeyword(raw)
    .toLowerCase()
    .replace(/[?!.]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Spelling families
// ---------------------------------------------------------------------------

/**
 * Token-level spelling normalisation.
 *
 * Search users type `dev ex`, `dev x`, `devx` and `devexchange` for the same
 * thing. These collapse into one family so the homepage can own all of them
 * instead of tempting us into a page per spelling.
 */
const SPELLING_RULES: ReadonlyArray<{ pattern: RegExp; replacement: string }> = [
  // Developer Exchange family.
  { pattern: /\bdeveloper exchange\b/g, replacement: "devex" },
  { pattern: /\bdev(?:eloper)? exchange\b/g, replacement: "devex" },
  { pattern: /\bdevexchange\b/g, replacement: "devex" },
  { pattern: /\bdev ex\b/g, replacement: "devex" },
  { pattern: /\bdev x\b/g, replacement: "devex" },
  { pattern: /\bdevx\b/g, replacement: "devex" },
  // Robux misspellings observed in the supplied exports.
  { pattern: /\brob(?:us|ix|ucks|uxs|ux)\b/g, replacement: "robux" },
  { pattern: /\brubux\b/g, replacement: "robux" },
  { pattern: /\brbx\b/g, replacement: "robux" },
  // Tool-word variants.
  { pattern: /\bcalculater\b/g, replacement: "calculator" },
  { pattern: /\bcalc\b/g, replacement: "calculator" },
  { pattern: /\bconvertor\b/g, replacement: "converter" },
  { pattern: /\btranslator\b/g, replacement: "converter" },
  // Currency wording. The bare dollar sign is folded first so that
  // "robux to $" reaches the same rule as "robux to usd".
  { pattern: /(?<![a-z])\$/g, replacement: "usd" },
  { pattern: /\bus dollars?\b/g, replacement: "usd" },
  { pattern: /\bdollars?\b/g, replacement: "usd" },
  { pattern: /\bisd\b/g, replacement: "usd" },
  { pattern: /\breal money\b/g, replacement: "money" },
  { pattern: /\birl money\b/g, replacement: "money" },
  // "cash" alone means money, but "cash out" is a process, not a currency.
  // Folding it would turn a cash-out query into a conversion query.
  { pattern: /\bcash\b(?! ?out)/g, replacement: "money" },
];

/**
 * Comparison key with spelling variants folded but sentence structure intact.
 *
 * This is what the classifier reads. Folding first means `robus to usd`,
 * `rubux to usd` and `robux to isd` classify identically to `robux to usd`
 * instead of falling through to manual review, which is the whole point of
 * having a spelling-family concept.
 */
export function classificationKey(raw: string): string {
  let text = ` ${comparisonKey(raw)} `;
  for (const { pattern, replacement } of SPELLING_RULES) {
    text = text.replace(pattern, replacement);
  }
  return text.replace(/\s+/g, " ").trim();
}

/**
 * The canonical spelling-family key for a keyword: the comparison key with
 * spelling variants folded and filler words removed.
 */
export function spellingFamily(raw: string): string {
  let text = ` ${comparisonKey(raw)} `;
  for (const { pattern, replacement } of SPELLING_RULES) {
    text = text.replace(pattern, replacement);
  }
  return text
    .replace(/\broblox\b/g, "")
    .replace(/\bhow (?:much|many) (?:is|money is|dollars is|does)?\b/g, "")
    .replace(/\b(?:in|to|into|is|the|a|of|for|convert|cost|value|worth)\b/g, " ")
    .replace(/\d+(?:[.,]\d+)?\s*(?:k|m|b|mil|million|billion|trillion|thousand)?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Amount extraction
// ---------------------------------------------------------------------------

const SCALE_WORDS: Readonly<Record<string, number>> = {
  k: 1_000,
  thousand: 1_000,
  m: 1_000_000,
  mil: 1_000_000,
  million: 1_000_000,
  b: 1_000_000_000,
  bil: 1_000_000_000,
  billion: 1_000_000_000,
  t: 1_000_000_000_000,
  trillion: 1_000_000_000_000,
};

export interface ExtractedAmount {
  /** Whole Robux. */
  readonly amount: number;
  /** The exact substring the amount came from, for auditing. */
  readonly matchedText: string;
  /** Canonical entity id shared by every formatting variant. */
  readonly entityId: string;
}

/**
 * Extracts a Robux amount from a keyword.
 *
 * Requires the number to sit next to a Robux word so that a year in
 * `devex rates 2023` is not mistaken for an amount. Returns `null` when the
 * keyword names no specific amount.
 */
export function extractAmount(raw: string): ExtractedAmount | null {
  const text = comparisonKey(raw);

  // Number, optional scale suffix, then a Robux word within a short window.
  // The window allows "1 million robux" and "how much is 100k robux in usd".
  const pattern =
    /(\d{1,3}(?:,\d{3})+|\d+(?:\s\d{3})+|\d+(?:\.\d+)?)\s*(k|m|b|t|mil|bil|thousand|million|billion|trillion)?\s*(?:rob(?:ux|us|ix|ucks)|rubux|rbx)\b/;

  const match = text.match(pattern);
  if (!match) return null;

  const [matchedText, numberPart, scaleWord] = match;
  if (numberPart === undefined) return null;

  const digits = numberPart.replace(/[,\s]/g, "");
  const base = Number(digits);
  if (!Number.isFinite(base) || base <= 0) return null;

  const scale = scaleWord ? (SCALE_WORDS[scaleWord] ?? 1) : 1;
  const amount = base * scale;

  // Reject a non-integer result (e.g. "2.5 robux") and anything implausible.
  if (!Number.isInteger(amount) || amount <= 0 || amount > 1e15) return null;

  return { amount, matchedText, entityId: amountEntityId(amount) };
}

/** One entity id per amount, regardless of how it was written. */
export function amountEntityId(amount: number): string {
  return `robux-${amount}`;
}

/** Human display form for an amount, e.g. `100,000`. */
export function formatAmountDisplay(amount: number): string {
  return amount.toLocaleString("en-US");
}

/** URL slug for an approved amount page, e.g. `100000-robux-to-usd`. */
export function amountSlug(amount: number): string {
  return `${amount}-robux-to-usd`;
}

// ---------------------------------------------------------------------------
// Currency and entity signals
// ---------------------------------------------------------------------------

const CURRENCY_TOKENS: ReadonlyArray<{ pattern: RegExp; code: string }> = [
  { pattern: /\b(?:usd|us dollars?|dollars?|\$|bucks)\b/, code: "USD" },
  { pattern: /\b(?:gbp|pounds?|sterling)\b/, code: "GBP" },
  { pattern: /\b(?:eur|euros?)\b/, code: "EUR" },
  { pattern: /\b(?:cad|canadian dollars?)\b/, code: "CAD" },
  { pattern: /\b(?:aud|australian dollars?)\b/, code: "AUD" },
  { pattern: /\b(?:php|pesos?|philippines? pesos?)\b/, code: "PHP" },
  { pattern: /\b(?:idr|rupiah)\b/, code: "IDR" },
  { pattern: /\b(?:inr|rupees?)\b/, code: "INR" },
  { pattern: /\b(?:jpy|yen)\b/, code: "JPY" },
  { pattern: /\b(?:brl|reais|real brasileiro)\b/, code: "BRL" },
  { pattern: /\b(?:mxn|mexican pesos?)\b/, code: "MXN" },
  { pattern: /\b(?:zar|rands?)\b/, code: "ZAR" },
];

/** Detects an explicit target currency in a keyword. */
export function extractCurrency(raw: string): string | null {
  const text = comparisonKey(raw);
  for (const { pattern, code } of CURRENCY_TOKENS) {
    if (pattern.test(text)) return code;
  }
  return null;
}

/** True when the keyword names a currency other than USD. */
export function isNonUsdCurrency(raw: string): boolean {
  const currency = extractCurrency(raw);
  return currency !== null && currency !== "USD";
}

const ENTITY_PATTERNS: ReadonlyArray<{ pattern: RegExp; entity: string }> = [
  { pattern: /\bdevex\b|\bdev ex\b|\bdev x\b|\bdevx\b|\bdeveloper exchange\b|\bdev exchange\b|\bdevexchange\b/, entity: "Developer Exchange Program" },
  { pattern: /\brobux\b|\brobus\b|\brobix\b|\brobucks\b|\brubux\b/, entity: "Robux" },
  { pattern: /\broblox\b/, entity: "Roblox" },
  { pattern: /\bearned robux\b/, entity: "Earned Robux" },
  { pattern: /\btax\b/, entity: "Marketplace fee" },
  { pattern: /\busd\b|\bdollars?\b|\bus dollars?\b/, entity: "USD" },
];

/** Named entities referenced by a keyword, used to build the entity map. */
export function extractEntities(raw: string): string[] {
  const text = comparisonKey(raw);
  const found = new Set<string>();
  for (const { pattern, entity } of ENTITY_PATTERNS) {
    if (pattern.test(text)) found.add(entity);
  }
  return [...found];
}

/**
 * Detects whether the keyword contains a non-Latin script.
 * Such queries need native-quality localisation rather than a machine
 * translation bolted onto an English page, so they are excluded at launch.
 */
export function hasNonLatinScript(raw: string): boolean {
  return /[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/u.test(raw);
}
