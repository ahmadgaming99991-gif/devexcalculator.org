/**
 * Comparing the numbers in a translated sentence against the English one.
 *
 * This is the check the whole audit exists for. The site publishes a rate of
 * 0.0038 USD per Earned Robux and a minimum of 30,000; a translation that
 * writes `0.038`, or reads `30,000` as a decimal and renders `30`, has changed
 * what somebody will be paid. Machine translation does exactly this, because
 * the comma means one thing in English and another in German.
 *
 * The comparison is on **value**, not on text. `30,000` in English and `30.000`
 * in German are the same number written by the conventions of two languages,
 * and flagging that pair would make the check unusable. `30,000` and `30.0`
 * are not, and that pair has to be caught.
 *
 * So each side is parsed into a multiset of numeric values under its own
 * locale's conventions, and the multisets are compared. What comes back is a
 * value present on one side and missing on the other — which is the only shape
 * of this defect that matters.
 */

/**
 * A number as it appeared, and what it is worth.
 *
 * `raw` is kept so a report can quote the text a reviewer will search for.
 */
export interface ParsedNumber {
  readonly raw: string;
  readonly value: number;
  /** True when the token carried a percent sign. Compared separately. */
  readonly percent: boolean;
}

/** Separators a locale uses, taken from the registry rather than guessed. */
export interface Separators {
  readonly decimal: string;
  readonly group: string;
}

/**
 * Every number-shaped token in a string.
 *
 * Deliberately greedy about what counts as a number and careful about what
 * counts as a separator: the locale's own group separator is consumed inside a
 * number, and any other punctuation ends it. That is what lets `30.000` be
 * thirty thousand in German and thirty in English without either being a
 * special case.
 *
 * Years, version strings and dates are extracted too. They are numbers, they
 * can be corrupted the same way, and excluding them by shape would exclude
 * real findings — `2025` becoming `2015` is exactly the class of error this
 * looks for.
 */
export function extractNumbers(
  text: string,
  separators: Separators,
  locale = "en",
): ParsedNumber[] {
  const decimal = separators.decimal;
  const group = separators.group;

  const found: ParsedNumber[] = [];
  const escape = (character: string): string => character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Digits, optionally grouped by this locale's separator, optionally with a
  // fraction after this locale's decimal mark.
  const pattern = new RegExp(
    `\\d+(?:${escape(group)}\\d{3})*(?:${escape(decimal)}\\d+)?|\\d+(?:${escape(decimal)}\\d+)?`,
    "g",
  );

  for (const match of text.matchAll(pattern)) {
    const raw = match[0];
    const normalised = raw.split(group).join("").split(decimal).join(".");
    const value = Number(normalised);
    if (!Number.isFinite(value)) continue;

    const after = text.slice(match.index + raw.length).trimStart();
    const before = text.slice(0, match.index).trimEnd();
    const percent = after.startsWith("%") || before.endsWith("%");

    // A magnitude word after the digits is part of the number's meaning.
    const scale = scaleAfter(text, match.index + raw.length, locale);

    found.push({ raw: scale === 1 ? raw : `${raw} ×${scale}`, value: value * scale, percent });
  }
  return found;
}

// ---------------------------------------------------------------------------
// Scale words
// ---------------------------------------------------------------------------

/**
 * The magnitude a number is quoted in, in each shipped language.
 *
 * This exists because of one string and the class of error it represents.
 * English says Roblox paid "1.503 billion USD"; the Spanish says "1.503
 * millones de USD" — and both are right. Spanish groups with a full stop, so
 * `1.503` is one thousand five hundred and three, and `1.503 millones` is
 * 1.503 billion. The translator also avoided *billón*, which in Spanish means
 * a million million. That is a careful, correct translation, and comparing the
 * bare digits calls it a factual error.
 *
 * Comparing `value × scale` instead makes the check agree with the reader. It
 * also keeps its teeth: a genuine thousandfold slip changes the product, and
 * the product is what is compared.
 *
 * Long-scale traps are the point of the per-language lists. Portuguese
 * *bilhão* is 10⁹ and Spanish *billón* is 10¹², and a table that treated them
 * as cognates would be wrong in exactly the direction that matters.
 */
const SCALE_WORDS: Readonly<Record<string, readonly (readonly [string, number])[]>> = {
  en: [
    ["thousand", 1e3],
    ["million", 1e6],
    ["billion", 1e9],
    ["trillion", 1e12],
  ],
  // Longest stem first everywhere, so `milyar` is tested before `mil`.
  "pt-BR": [
    ["bilh", 1e9],
    ["milh", 1e6],
    ["mil", 1e3],
  ],
  es: [
    ["bill", 1e12],
    ["mill", 1e6],
    ["mil", 1e3],
  ],
  id: [
    ["triliun", 1e12],
    ["miliar", 1e9],
    ["juta", 1e6],
    ["ribu", 1e3],
  ],
  fr: [
    ["milliard", 1e9],
    ["million", 1e6],
    // `millier` before `mille`: French quotes SEC figures in thousands, and
    // "477 240 milliers USD" is not "477 240 mille".
    ["millier", 1e3],
    ["mille", 1e3],
  ],
  de: [
    ["milliard", 1e9],
    ["million", 1e6],
    ["tausend", 1e3],
  ],
  tr: [
    ["trilyon", 1e12],
    ["milyar", 1e9],
    ["milyon", 1e6],
    ["bin", 1e3],
  ],
};

/**
 * The scale word immediately after a number, if there is one.
 *
 * Only the next two words are considered. Spanish writes "1.503 millones de
 * USD" and Portuguese "1.503 milhões de USD", so one filler word has to be
 * allowed; more than that and the word almost certainly belongs to a different
 * clause.
 */
function scaleAfter(text: string, from: number, locale: string): number {
  const table = SCALE_WORDS[locale] ?? SCALE_WORDS.en ?? [];

  /*
   * Stop at the next digit, which is not optional.
   *
   * Scanning for letters alone stepped straight over the number in between:
   * in "…ended 30 June 2026, and 316 million USD…" the first two words after
   * `2026` are "and" and "million", so the year was multiplied by a million
   * and every earnings sentence in every language became a critical finding.
   * A scale word belongs to the number it follows, and another number ends
   * that claim.
   */
  const window = text.slice(from, from + 40);
  /*
   * The scan stops at the next number **or the end of the sentence**.
   *
   * Turkish writes "…aradaki fark 150,00 $. Yarım milyon Robux…" — the
   * magnitude word opens the following sentence and belongs to a different
   * figure entirely, so without the sentence boundary the difference of a
   * hundred and fifty dollars was read as a hundred and fifty million.
   */
  const boundary = window.search(/[.!?;:\n]\s|\d/);
  const following = (boundary === -1 ? window : window.slice(0, boundary))
    .toLowerCase()
    .match(/[\p{L}]+/gu);
  if (following === null) return 1;

  /*
   * Matched by stem, because these languages inflect the word.
   *
   * Turkish alone writes `milyon`, `milyona`, `milyonluk` and `milyarlık` in
   * this content; Portuguese and Spanish switch between singular and plural.
   * Requiring the exact form reported every one of them as a missing figure.
   * The stems are ordered longest first so `milyar` cannot be read as `mil`.
   */
  for (const word of following.slice(0, 2)) {
    for (const [stem, scale] of table) {
      if (word.startsWith(stem)) return scale;
    }
  }
  return 1;
}

export interface NumberMismatch {
  readonly kind: "missing-in-translation" | "invented-in-translation";
  readonly value: number;
  readonly raw: string;
  readonly percent: boolean;
}

/**
 * The numeric difference between two versions of the same sentence.
 *
 * A multiset comparison, so a value repeated twice in English and once in the
 * translation is reported. Percent-ness travels with the value: 30 and 30%
 * are different claims and pairing them would hide a real change.
 */
export function compareNumbers(
  english: readonly ParsedNumber[],
  translated: readonly ParsedNumber[],
): NumberMismatch[] {
  const signature = (n: ParsedNumber): string => `${n.value}|${n.percent ? "%" : ""}`;

  const remaining = new Map<string, ParsedNumber[]>();
  for (const number of translated) {
    const key = signature(number);
    const bucket = remaining.get(key) ?? [];
    bucket.push(number);
    remaining.set(key, bucket);
  }

  const mismatches: NumberMismatch[] = [];

  for (const number of english) {
    const key = signature(number);
    const bucket = remaining.get(key);
    if (bucket !== undefined && bucket.length > 0) {
      bucket.pop();
      continue;
    }
    mismatches.push({
      kind: "missing-in-translation",
      value: number.value,
      raw: number.raw,
      percent: number.percent,
    });
  }

  for (const bucket of remaining.values()) {
    for (const number of bucket) {
      mismatches.push({
        kind: "invented-in-translation",
        value: number.value,
        raw: number.raw,
        percent: number.percent,
      });
    }
  }

  return mismatches;
}

/**
 * Values that must never appear altered, whatever else a sentence says.
 *
 * Built from the rate registry by the caller rather than written down here, so
 * a rate change moves the check with the site. A translated string carrying one
 * of these is also a maintainability finding in its own right: the figure
 * should be interpolated, so that changing it is one edit rather than seven.
 */
export interface LoadBearingFigure {
  readonly label: string;
  readonly value: number;
  readonly source: string;
}

export function figuresPresent(
  numbers: readonly ParsedNumber[],
  figures: readonly LoadBearingFigure[],
): LoadBearingFigure[] {
  const values = new Set(numbers.map((n) => n.value));
  return figures.filter((figure) => values.has(figure.value));
}

// ---------------------------------------------------------------------------
// Labels that contain digits but are not quantities
// ---------------------------------------------------------------------------

/**
 * A clock time, wherever a language happens to put the separator.
 *
 * English writes `16:00`, French writes `16 h`, Portuguese writes `16h`. All
 * three are the same instant and all three are correct in their own language,
 * so comparing them as bare digits reports a missing `00` and calls a correct
 * localization a numeric error. They are lifted out and compared as times.
 */
/**
 * A clock time, in the two shapes these languages actually write.
 *
 * English writes `16:00`, French writes `16 h`, Portuguese writes `16h`. All
 * three are the same instant and all three are correct in their own language,
 * so comparing them as bare digits reports a missing `00` and calls a correct
 * localization a numeric error.
 *
 * A full stop is deliberately **not** a time separator here even though German
 * writes `16.00 Uhr`. It is also the German thousands separator and the English
 * decimal point, so accepting it would turn `0.0038` into a time and delete the
 * most important number on the site from the comparison. A time that only
 * appears with a full stop is a time this check does not see, which is the
 * safer of the two failures.
 */
const TIME_COLON = /\b(\d{1,2}):(\d{2})\b/g;
const TIME_H = /\b(\d{1,2})\s*h(?![a-z\u00c0-\u024f])(?:\s*(\d{2})\b)?/gi;

/**
 * The dotted time, which Indonesian, Turkish and German all write: `10.00`.
 *
 * Only ever looked for when the English side carried a time, and only with
 * exactly two digits after the stop and an hour that can be one. `0.0038` has
 * four digits after the stop and `30.000` has three, so neither can be read as
 * a time \u2014 which is the whole reason for those two conditions.
 */
const TIME_DOT = /\b(\d{1,2})\.(\d{2})\b/g;

/**
 * A quarter label — `Q2`, `Q4`. An identifier, not a count.
 *
 * Spanish and French spell these out ("segundo trimestre"), which removes the
 * digit entirely. Demanding it back would be demanding a worse translation.
 */
const QUARTER = /\bQ([1-4])\b/g;

export interface Labels {
  readonly times: readonly string[];
  readonly quarters: readonly string[];
  /** The text with those labels removed, ready for numeric extraction. */
  readonly rest: string;
}

/**
 * Lifts labels out of a string so the numeric comparison never sees them.
 *
 * `allowHourLetter` is false for English, which never writes `16h`, and true
 * for a translation — but only when the English side actually carried a time.
 * Without that condition `24h` in a sentence about a chart window would be read
 * as a time, and the number 24 would vanish from the comparison.
 */
export function extractLabels(text: string, allowHourLetter = false): Labels {
  const times: string[] = [];
  const quarters: string[] = [];

  let rest = text.replace(TIME_COLON, (whole, hour: string, minute: string) => {
    times.push(`${Number(hour)}:${minute}`);
    return " ";
  });

  if (allowHourLetter) {
    rest = rest.replace(TIME_H, (whole, hour: string, minute: string | undefined) => {
      times.push(`${Number(hour)}:${minute ?? "00"}`);
      return " ";
    });
    rest = rest.replace(TIME_DOT, (whole, hour: string, minute: string) => {
      if (Number(hour) > 23 || Number(minute) > 59) return whole;
      times.push(`${Number(hour)}:${minute}`);
      return " ";
    });
  }

  rest = rest.replace(QUARTER, (whole, quarter: string) => {
    quarters.push(quarter);
    return " ";
  });

  return { times, quarters, rest };
}

export interface LabelMismatch {
  readonly kind: "time" | "quarter";
  readonly detail: string;
  /** True when the translation spelled the label out rather than changing it. */
  readonly spelledOut: boolean;
}

export function compareLabels(english: Labels, translated: Labels): LabelMismatch[] {
  const mismatches: LabelMismatch[] = [];

  const englishTimes = [...english.times].sort();
  const translatedTimes = [...translated.times].sort();
  if (englishTimes.join(" ") !== translatedTimes.join(" ")) {
    mismatches.push({
      kind: "time",
      detail: `English states ${englishTimes.join(", ") || "no time"}; the translation states ${
        translatedTimes.join(", ") || "no time"
      }`,
      spelledOut: false,
    });
  }

  const englishQuarters = [...english.quarters].sort();
  const translatedQuarters = [...translated.quarters].sort();
  if (englishQuarters.join(" ") !== translatedQuarters.join(" ")) {
    // No quarter label at all usually means the translation wrote it in words,
    // which is right and which this cannot verify without reading the language.
    mismatches.push({
      kind: "quarter",
      detail:
        translatedQuarters.length === 0
          ? `English states quarter ${englishQuarters.join(", ")}; the translation spells it out ` +
            "and the wording cannot be checked from here"
          : `English states quarter ${englishQuarters.join(", ")}; the translation states ${translatedQuarters.join(", ")}`,
      spelledOut: translatedQuarters.length === 0,
    });
  }

  return mismatches;
}
