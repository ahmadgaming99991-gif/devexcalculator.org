import { describe, expect, it } from "vitest";
import errors from "../../../src/i18n/locales/en/errors.json";
import {
  parseCurrencyAmount,
  parsePercent,
  parseRobuxAmount,
} from "@/lib/calculations/parse-amount";
import { maxRobuxInput, maxUsdTargetInput } from "@/lib/calculations/rate-registry";

const parse = (input: string) => parseRobuxAmount(input, maxRobuxInput);

function expectRobux(input: string, expected: bigint) {
  const result = parse(input);
  if (!result.ok) throw new Error(`expected "${input}" to parse, got ${result.code}`);
  expect(result.value.robux).toBe(expected);
}

function expectFailure(input: string, code: string) {
  const result = parse(input);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.code).toBe(code);
}

describe("parseRobuxAmount", () => {
  it("parses plain digits", () => {
    expectRobux("100000", 100_000n);
    expectRobux("0", 0n);
    expectRobux("30000", 30_000n);
  });

  it("parses comma thousands separators", () => {
    expectRobux("100,000", 100_000n);
    expectRobux("1,000,000", 1_000_000n);
    expectRobux("30,000", 30_000n);
  });

  it("parses space-separated large numbers, including non-breaking spaces", () => {
    expectRobux("100 000", 100_000n);
    expectRobux("1 000 000", 1_000_000n);
    expectRobux("15 000", 15_000n);
  });

  it("parses apostrophe and underscore grouping", () => {
    expectRobux("1'000'000", 1_000_000n);
    expectRobux("1_000_000", 1_000_000n);
  });

  it("parses K, M and B shorthand in either case", () => {
    expectRobux("1k", 1_000n);
    expectRobux("30K", 30_000n);
    expectRobux("1m", 1_000_000n);
    expectRobux("10M", 10_000_000n);
    expectRobux("1b", 1_000_000_000n);
  });

  it("parses fractional shorthand because the result is still whole", () => {
    expectRobux("1.5m", 1_500_000n);
    expectRobux("2.5k", 2_500n);
    expectRobux("0.5m", 500_000n);
  });

  it("strips currency and unit decoration pasted alongside the number", () => {
    expectRobux("R$ 250000", 250_000n);
    expectRobux("250000 robux", 250_000n);
    expectRobux("$100,000", 100_000n);
  });

  it("strips invisible characters that survive copy-paste", () => {
    expectRobux("100​000", 100_000n);
    expectRobux("﻿100000", 100_000n);
    expectRobux("100000‬", 100_000n);
  });

  it("rejects an empty value", () => {
    expectFailure("", "empty");
    expectFailure("   ", "empty");
  });

  it("rejects negative amounts", () => {
    expectFailure("-100", "negative");
    expectFailure("-1,000", "negative");
  });

  it("rejects non-numeric input", () => {
    expectFailure("abc", "not-a-number");
    expectFailure("--", "negative");
    expectFailure(".", "not-a-number");
  });

  it("rejects scientific notation rather than silently accepting a huge value", () => {
    expectFailure("1e9", "not-a-number");
    expectFailure("1E12", "not-a-number");
  });

  it("rejects excessively long strings", () => {
    expectFailure("1".repeat(41), "too-long");
  });

  it("rejects malformed thousands separators", () => {
    expectFailure("1,00,000", "malformed-separators");
    expectFailure("1,0000", "malformed-separators");
    expectFailure("1.000,50", "malformed-separators");
    expectFailure("1.2.3", "malformed-separators");
  });

  it("rejects a fractional Robux amount", () => {
    expectFailure("100.5", "fractional-robux");
    expectFailure("0.5", "fractional-robux");
  });

  it("rejects values beyond the documented application limit", () => {
    const result = parse((maxRobuxInput + 1).toString());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("exceeds-limit");
      /*
       * The sentence must not present the cap as a Roblox rule. It lives in
       * the dictionary now, so the assertion follows it there — a key that
       * pointed at different words would pass a check on the key alone.
       */
      expect(result.messageKey).toBe("errors.input.robuxLimit");
      expect(errors.input.robuxLimit).toContain("not a Roblox limit");
    }
  });

  it("accepts exactly the documented limit", () => {
    expectRobux(maxRobuxInput.toString(), BigInt(maxRobuxInput));
  });

  it("returns a canonical digits-only form for share URLs", () => {
    const result = parse("1.5m");
    expect(result.ok && result.canonical).toBe("1500000");
  });
});

describe("parseCurrencyAmount", () => {
  it("parses whole and fractional amounts", () => {
    const whole = parseCurrencyAmount("1000", maxUsdTargetInput);
    expect(whole.ok && whole.value.toFixed(2)).toBe("1000.00");

    const fractional = parseCurrencyAmount("1,250.75", maxUsdTargetInput);
    expect(fractional.ok && fractional.value.toFixed(2)).toBe("1250.75");
  });

  it("accepts shorthand for currency targets", () => {
    const result = parseCurrencyAmount("10k", maxUsdTargetInput);
    expect(result.ok && result.value.toFixed(2)).toBe("10000.00");
  });

  it("rejects more decimal places than the currency supports", () => {
    const result = parseCurrencyAmount("10.123", maxUsdTargetInput, 2);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("too-many-decimals");
  });

  it("respects a zero-decimal currency", () => {
    const result = parseCurrencyAmount("1000.5", maxUsdTargetInput, 0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("too-many-decimals");
  });

  it("rejects values above the documented limit", () => {
    const result = parseCurrencyAmount((maxUsdTargetInput + 1).toString(), maxUsdTargetInput);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("exceeds-limit");
  });
});

describe("parsePercent", () => {
  it("treats blank input as zero so an untouched control is not an error", () => {
    const result = parsePercent("");
    expect(result.ok && result.value.isZero()).toBe(true);
  });

  it("parses percentages with and without a sign", () => {
    const plain = parsePercent("2.9");
    expect(plain.ok && plain.value.toFixed(1)).toBe("2.9");
    const withSign = parsePercent("20%");
    expect(withSign.ok && withSign.value.toFixed(0)).toBe("20");
  });

  it("rejects a percentage above the allowed maximum", () => {
    const result = parsePercent("150");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("exceeds-limit");
  });

  it("rejects a negative percentage", () => {
    const result = parsePercent("-5");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("negative");
  });
});
