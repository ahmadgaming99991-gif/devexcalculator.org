import { getLocaleMeta } from "./config";
import type { Locale } from "./types";

/**
 * Reading a number the way the reader wrote it.
 *
 * `1.000` is one thousand in São Paulo, Berlin and Jakarta, and one in
 * London. `1,50` is one and a half in Paris and one hundred and fifty in New
 * York. A calculator that guesses wrong here does not show a slightly wrong
 * figure — it shows a payout out by a factor of a thousand, in the reader's
 * own currency, on a page about their income.
 *
 * So this never guesses. It parses against the separators the reader's own
 * locale uses, and where a value is genuinely ambiguous it refuses and says
 * so, rather than picking the friendlier reading.
 *
 * **What "ambiguous" means, precisely.** A single separator with exactly three
 * digits after it — `1.000`, `1,000`, `1 000` — could be a thousands group or
 * a three-place decimal, and the two readings differ by 1000x. In a locale
 * where that separator is the group separator, the grouping reading is taken:
 * that is what the locale's own `Intl.NumberFormat` would have produced, so it
 * is what the reader most likely typed. Where the separator is the locale's
 * *decimal* separator, three decimal places on a money field is not a value
 * this calculator accepts, and it is rejected rather than silently multiplied.
 *
 * Nothing here does arithmetic. It returns a canonical string — digits and at
 * most one `.` — which the existing exact `Rational` pipeline consumes
 * unchanged. Money never passes through a float, in any language.
 */

export type ParseFailure =
  /** Nothing usable in the input at all. */
  | "empty"
  /** Characters that are not digits, separators or sign. */
  | "not-a-number"
  /** Could be a group or a decimal, and the two readings differ. */
  | "ambiguous"
  /** More decimal places than the field allows. */
  | "too-many-decimals"
  /** A negative amount, which no field here accepts. */
  | "negative";

export type ParseResult =
  | { readonly ok: true; readonly canonical: string }
  | { readonly ok: false; readonly reason: ParseFailure };

/**
 * Every separator any supported locale uses, plus the ones people actually
 * type when their keyboard disagrees with their locale.
 *
 * U+202F narrow no-break space and U+00A0 no-break space are what `Intl`
 * emits for French; a reader copying a formatted figure back into the field
 * pastes exactly those, so refusing them would mean refusing the site's own
 * output.
 */
const SPACE_SEPARATORS = [" ", " ", " ", " "];

function isGroupSpace(char: string): boolean {
  return SPACE_SEPARATORS.includes(char);
}

/**
 * Strips the decoration people paste along with a figure.
 *
 * Word before symbol, deliberately. Stripping symbols first with `R` in the
 * character class turned "30000 Robux" into "30000 obux" — the `R` of the
 * "R$" prefix ate the first letter of the word, and what was left parsed as
 * nothing. Caught by a test that pasted exactly what the site's own copy
 * button produces.
 */
function clean(input: string): string {
  return input
    .trim()
    .replace(/robux/gi, "")
    // "R$" as a unit, then the bare symbols. Never a lone `R`.
    .replace(/R\$/g, "")
    .replace(/[$€£¥₺₹¤]/g, "")
    .trim();
}

interface Shape {
  readonly digits: string;
  readonly separators: readonly { readonly char: string; readonly after: number }[];
}

/** Splits a cleaned value into its digits and where each separator fell. */
function shapeOf(value: string): Shape | null {
  const separators: { char: string; after: number }[] = [];
  let digits = "";

  for (const char of value) {
    if (char >= "0" && char <= "9") {
      digits += char;
      continue;
    }
    if (char === "." || char === "," || isGroupSpace(char)) {
      separators.push({ char: isGroupSpace(char) ? " " : char, after: digits.length });
      continue;
    }
    return null;
  }

  return { digits, separators };
}

/** Whether every group between separators is a valid thousands group. */
function groupsAreWellFormed(shape: Shape, digitCount: number): boolean {
  const positions = shape.separators.map((s) => s.after);
  // Last group must be exactly three digits.
  const last = positions[positions.length - 1];
  if (last === undefined || digitCount - last !== 3) return false;
  // Every interior group must be exactly three.
  for (let i = 1; i < positions.length; i += 1) {
    const prev = positions[i - 1];
    const current = positions[i];
    if (prev === undefined || current === undefined) return false;
    if (current - prev !== 3) return false;
  }
  // The leading group is 1–3 digits.
  const first = positions[0];
  return first !== undefined && first >= 1 && first <= 3;
}

/**
 * Parses a value the reader typed, in their locale, into a canonical string.
 *
 * `maxDecimals` of 0 means an integer field — Robux, which are never
 * fractional.
 */
export function parseLocaleNumber(
  input: string,
  locale: Locale,
  maxDecimals = 0,
): ParseResult {
  const meta = getLocaleMeta(locale);
  const value = clean(input);

  if (value === "") return { ok: false, reason: "empty" };
  if (value.startsWith("-")) return { ok: false, reason: "negative" };

  const shape = shapeOf(value);
  if (!shape || shape.digits === "") return { ok: false, reason: "not-a-number" };

  const { digits, separators } = shape;

  // No separators at all: unambiguous, whatever the locale.
  if (separators.length === 0) {
    return { ok: true, canonical: digits.replace(/^0+(?=\d)/, "") };
  }

  const decimalChar = meta.decimalSeparator;
  /*
   * Normalised through the same test `shapeOf` uses. French's separator is a
   * narrow no-break space (U+202F), which `shapeOf` records as a plain space —
   * comparing the raw registry value against that produced "unknown separator"
   * for every French number the site itself had formatted.
   */
  const groupChar = isGroupSpace(meta.groupSeparator) ? " " : meta.groupSeparator;

  const decimals = separators.filter((s) => s.char === decimalChar);
  const groups = separators.filter((s) => s.char === groupChar && s.char !== decimalChar);
  const unknown = separators.filter((s) => s.char !== decimalChar && s.char !== groupChar);

  // A separator this locale uses for neither purpose.
  if (unknown.length > 0) return { ok: false, reason: "ambiguous" };
  // Two decimal points is not a number in any locale.
  if (decimals.length > 1) return { ok: false, reason: "not-a-number" };

  const decimal = decimals[0];

  // Groups must come before the decimal point and be well formed.
  if (groups.length > 0) {
    const beforeDecimal = decimal ? groups.every((g) => g.after < decimal.after) : true;
    if (!beforeDecimal) return { ok: false, reason: "not-a-number" };
    const boundary = decimal ? decimal.after : digits.length;
    if (!groupsAreWellFormed({ digits, separators: groups }, boundary)) {
      return { ok: false, reason: "not-a-number" };
    }
  }

  if (!decimal) {
    return { ok: true, canonical: digits.replace(/^0+(?=\d)/, "") };
  }

  const fractionLength = digits.length - decimal.after;

  /*
   * The ambiguous case, and the whole reason this file exists. One decimal
   * separator with exactly three digits after it and no grouping anywhere:
   * `1,000` in a comma-decimal locale reads as 1.000 to the parser and as one
   * thousand to most people who typed it. Those differ by 1000x on a payout
   * figure, so it is refused rather than resolved.
   */
  if (groups.length === 0 && fractionLength === 3 && maxDecimals < 3) {
    return { ok: false, reason: "ambiguous" };
  }

  if (fractionLength > maxDecimals) {
    return { ok: false, reason: "too-many-decimals" };
  }

  const whole = digits.slice(0, decimal.after).replace(/^0+(?=\d)/, "") || "0";
  const fraction = digits.slice(decimal.after);
  return { ok: true, canonical: fraction === "" ? whole : `${whole}.${fraction}` };
}

/**
 * Formats a canonical value back into the reader's locale.
 *
 * Round-trips with `parseLocaleNumber`: whatever this produces, that accepts.
 * A test asserts it, because the failure mode is a reader copying the site's
 * own figure back into the site's own field and being told it is invalid.
 */
export function formatLocaleNumber(
  canonical: string,
  locale: Locale,
  maxDecimals = 0,
): string {
  const meta = getLocaleMeta(locale);
  const [whole = "0", fraction = ""] = canonical.split(".");
  const grouped = new Intl.NumberFormat(meta.bcp47, { useGrouping: true }).format(
    BigInt(whole || "0"),
  );
  if (fraction === "" || maxDecimals === 0) return grouped;
  return `${grouped}${meta.decimalSeparator}${fraction.slice(0, maxDecimals)}`;
}
