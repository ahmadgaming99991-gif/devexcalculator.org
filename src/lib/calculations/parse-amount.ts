import { Rational } from "./rational";

/**
 * Tolerant, bounded parsing of user-entered amounts.
 *
 * Creators paste values from the Roblox site, from spreadsheets and from chat.
 * The parser accepts the formats they actually type — `100,000`, `100 000`,
 * `100k`, `1.5m`, `R$ 250000` — while refusing anything ambiguous or unbounded
 * rather than guessing. A refusal always preserves the user's original text so
 * the UI can explain the problem without clearing the field.
 */

export type ParseErrorCode =
  | "empty"
  | "too-long"
  | "not-a-number"
  | "negative"
  | "malformed-separators"
  | "fractional-robux"
  | "exceeds-limit"
  | "too-many-decimals";

export interface ParseSuccess<T> {
  readonly ok: true;
  readonly value: T;
  /** Canonical digits-only form, used for share URLs and analytics buckets. */
  readonly canonical: string;
}

export interface ParseFailure {
  readonly ok: false;
  readonly code: ParseErrorCode;
  /**
   * The dictionary key for what to tell the reader, and what to fill it with.
   *
   * A key rather than a sentence because this module is pure arithmetic with
   * no locale, and a sentence written here is a sentence in one language for
   * every reader. The component rendering the field has the translator.
   */
  readonly messageKey: string;
  readonly messageValues?: Readonly<Record<string, string>>;
}

export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

/** Longest input we will even attempt to parse. Guards against paste bombs. */
const MAX_INPUT_LENGTH = 40;

/**
 * Characters stripped before parsing: zero-width and bidi control characters
 * that survive copy-paste from styled web pages and would otherwise make an
 * apparently valid number fail.
 */
const INVISIBLE_CHARACTERS = /[­​-‏‪-‮⁠-⁤﻿]/g;

/** Separators treated as thousands grouping, including non-breaking spaces. */
const GROUPING_CHARACTERS = /[\s  '_]/g;

const SHORTHAND_MULTIPLIERS: Readonly<Record<string, bigint>> = {
  k: 1_000n,
  m: 1_000_000n,
  b: 1_000_000_000n,
};

function fail(
  code: ParseErrorCode,
  messageKey: string,
  messageValues?: Readonly<Record<string, string>>,
): ParseFailure {
  return { ok: false, code, messageKey, messageValues };
}

interface Cleaned {
  readonly digits: string;
  readonly multiplier: bigint;
}

/**
 * Shared normalisation: strips noise, resolves shorthand suffixes and validates
 * separator placement. Returns a plain decimal string plus a multiplier.
 */
function clean(input: string): ParseResult<Cleaned> {
  const stripped = input.replace(INVISIBLE_CHARACTERS, "").trim();
  if (stripped === "") {
    return fail("empty", "errors.input.empty");
  }
  if (stripped.length > MAX_INPUT_LENGTH) {
    return fail("too-long", "errors.input.tooLong");
  }
  if (/[eE]/.test(stripped.replace(/[^0-9eE.]/g, ""))) {
    return fail("not-a-number", "errors.input.scientificNotation");
  }

  let working = stripped.toLowerCase();

  // Drop currency and unit decoration that users routinely paste along with
  // the number. Order matters: strip the longer words before the symbols.
  working = working
    .replace(/robux/g, "")
    .replace(/\br\$/g, "")
    .replace(/[$€£¥]/g, "")
    .replace(/\busd\b/g, "")
    .trim();

  if (working.startsWith("-")) {
    return fail("negative", "errors.input.positiveOnly");
  }
  working = working.replace(/^\+/, "");

  // Shorthand suffix: k, m or b, optionally followed by a stray plural.
  let multiplier = 1n;
  const shorthandMatch = working.match(/([kmb])$/);
  if (shorthandMatch) {
    const suffix = shorthandMatch[1];
    if (suffix !== undefined) {
      multiplier = SHORTHAND_MULTIPLIERS[suffix] ?? 1n;
      working = working.slice(0, -1).trim();
    }
  }

  working = working.replace(GROUPING_CHARACTERS, "");

  if (working === "") {
    return fail("not-a-number", "errors.input.numberExample");
  }

  // Comma handling. A comma is a thousands separator in this locale; a comma
  // used as a decimal point is ambiguous, so reject rather than guess.
  if (working.includes(",")) {
    if (working.includes(".")) {
      // Both present: the comma must come before the decimal point.
      if (working.lastIndexOf(",") > working.indexOf(".")) {
        return fail("malformed-separators", "errors.input.mixedSeparators");
      }
    }
    const [integerSection = ""] = working.split(".");
    const groups = integerSection.split(",");
    const wellFormed =
      groups.length > 1 &&
      groups[0] !== undefined &&
      groups[0].length >= 1 &&
      groups[0].length <= 3 &&
      groups.slice(1).every((g) => g.length === 3);
    if (!wellFormed) {
      return fail("malformed-separators", "errors.input.thousandsSeparators");
    }
    working = working.replace(/,/g, "");
  }

  // Check separator placement before the general shape test, so that a value
  // like "1.2.3" is reported as a separator problem rather than as gibberish.
  if ((working.match(/\./g) ?? []).length > 1) {
    return fail("malformed-separators", "errors.input.multipleDecimalPoints");
  }
  if (!/^\d*\.?\d*$/.test(working) || working === "." || working === "") {
    return fail("not-a-number", "errors.input.digitsOnly");
  }

  return { ok: true, value: { digits: working, multiplier }, canonical: working };
}

export interface ParsedRobux {
  /** Whole Earned Robux. `bigint` so very large balances stay exact. */
  readonly robux: bigint;
  readonly rational: Rational;
}

/**
 * Parses an Earned Robux amount. Robux are indivisible, so the result after
 * applying any shorthand multiplier must be a whole number: `1.5m` is fine
 * (1,500,000) but `100.5` is not.
 */
export function parseRobuxAmount(input: string, maxRobux: number): ParseResult<ParsedRobux> {
  const cleaned = clean(input);
  if (!cleaned.ok) return cleaned;

  const { digits, multiplier } = cleaned.value;
  let value: Rational;
  try {
    value = Rational.fromDecimalString(digits);
  } catch {
    return fail("not-a-number", "errors.input.digitsOnly");
  }

  const scaled = value.mul(Rational.of(multiplier, 1n));

  if (scaled.floorToBigInt() !== scaled.ceilToBigInt()) {
    return fail("fractional-robux", "errors.input.robuxWholeUnits");
  }

  const robux = scaled.floorToBigInt();
  if (robux > BigInt(maxRobux)) {
    return fail("exceeds-limit", "errors.input.robuxLimit", { limit: String(maxRobux) });
  }

  return {
    ok: true,
    value: { robux, rational: Rational.of(robux, 1n) },
    canonical: robux.toString(),
  };
}

/**
 * Parses a currency amount such as a target payout. Allows up to `maxDecimals`
 * fractional digits so a user can enter `1,250.75`.
 */
export function parseCurrencyAmount(
  input: string,
  maxValue: number,
  maxDecimals = 2,
): ParseResult<Rational> {
  const cleaned = clean(input);
  if (!cleaned.ok) return cleaned;

  const { digits, multiplier } = cleaned.value;
  const fractionDigits = digits.includes(".") ? (digits.split(".")[1] ?? "").length : 0;
  if (multiplier === 1n && fractionDigits > maxDecimals) {
    return fail(
      "too-many-decimals",
      maxDecimals === 1 ? "errors.input.tooManyDecimalsOne" : "errors.input.tooManyDecimals",
      { max: String(maxDecimals) },
    );
  }

  let value: Rational;
  try {
    value = Rational.fromDecimalString(digits);
  } catch {
    return fail("not-a-number", "errors.input.amountExample");
  }

  const scaled = value.mul(Rational.of(multiplier, 1n));
  if (scaled.gt(Rational.fromInt(maxValue))) {
    return fail("exceeds-limit", "errors.input.valueLimit", { limit: String(maxValue) });
  }

  return { ok: true, value: scaled, canonical: scaled.toFixed(maxDecimals, "half-up") };
}

/**
 * Parses a percentage (fee or tax rate) in the range 0–100 inclusive.
 * Returns `Rational.ZERO` for blank input so an untouched optional control
 * behaves as "not applied" rather than as an error.
 */
export function parsePercent(input: string, maxPercent = 100): ParseResult<Rational> {
  if (input.trim() === "") {
    return { ok: true, value: Rational.ZERO, canonical: "0" };
  }
  const cleaned = clean(input.replace(/%/g, ""));
  if (!cleaned.ok) return cleaned;

  let value: Rational;
  try {
    value = Rational.fromDecimalString(cleaned.value.digits);
  } catch {
    return fail("not-a-number", "errors.input.percentExample");
  }
  const scaled = value.mul(Rational.of(cleaned.value.multiplier, 1n));
  if (scaled.gt(Rational.fromInt(maxPercent))) {
    return fail("exceeds-limit", "errors.input.percentRange", { max: String(maxPercent) });
  }
  return { ok: true, value: scaled, canonical: scaled.toFixed(4, "half-up") };
}
