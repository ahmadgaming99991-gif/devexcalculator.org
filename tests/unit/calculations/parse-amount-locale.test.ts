import { describe, expect, it } from "vitest";
import {
  parseCurrencyAmount,
  parsePercent,
  parseRobuxAmount,
} from "@/lib/calculations/parse-amount";
import { getLocaleMeta } from "@/i18n/config";
import { LAUNCH_LOCALES } from "@/i18n/config";
import { formatRobux } from "@/lib/calculations/format";

const MAX = 100_000_000_000;

/**
 * The bug these pin, stated plainly.
 *
 * The parser read every amount with English separators. On `/de/` a reader who
 * typed `30.000` — thirty thousand, written the way German writes it, and the
 * way the site's own hint told them to — was shown a payout for thirty. Not an
 * error, not a warning: a confident answer, a thousandfold low, on a page
 * about their income. `1,5m` was rejected outright.
 *
 * Every case below was verified against the live German page before the fix
 * and is the reason the locale is now threaded from the component to the
 * parser.
 */

describe("amounts are read in the reader's own notation", () => {
  const thirtyThousand: Record<string, string> = {
    en: "30,000",
    "pt-BR": "30.000",
    es: "30.000",
    id: "30.000",
    de: "30.000",
    tr: "30.000",
    fr: "30 000",
  };

  for (const [locale, typed] of Object.entries(thirtyThousand)) {
    it(`${locale}: "${typed}" is thirty thousand`, () => {
      const result = parseRobuxAmount(typed, MAX, locale);
      expect(result.ok, `${locale} rejected its own notation`).toBe(true);
      if (result.ok) expect(result.value.robux).toBe(30_000n);
    });
  }

  it("reads back whatever the site itself printed, in every locale", () => {
    // The round trip that matters: a reader copies a figure off the page and
    // pastes it into the field. If the formatter and the parser disagree, the
    // site rejects its own output.
    for (const locale of LAUNCH_LOCALES) {
      for (const amount of [1_000, 30_000, 100_000, 1_500_000]) {
        const printed = formatRobux(locale, amount);
        const result = parseRobuxAmount(printed, MAX, locale);
        expect(result.ok, `${locale} could not read back "${printed}"`).toBe(true);
        if (result.ok) expect(result.value.robux, `${locale} "${printed}"`).toBe(BigInt(amount));
      }
    }
  });

  it("accepts the shorthand each locale's hint promises", () => {
    // `calculator.inputs.eligibleEarnedRobux.hint` tells a German reader that
    // `1,5m` works. It has to work.
    for (const locale of LAUNCH_LOCALES) {
      const decimal = getLocaleMeta(locale).decimalSeparator;
      const typed = `1${decimal}5m`;
      const result = parseRobuxAmount(typed, MAX, locale);
      expect(result.ok, `${locale} rejected "${typed}"`).toBe(true);
      if (result.ok) expect(result.value.robux, `${locale} "${typed}"`).toBe(1_500_000n);
    }
  });
});

describe("English is unchanged", () => {
  it("still reads the formats it always did", () => {
    for (const [typed, expected] of [
      ["100,000", 100_000n],
      ["100 000", 100_000n],
      ["1.5m", 1_500_000n],
      ["100k", 100_000n],
      ["30000", 30_000n],
    ] as const) {
      const result = parseRobuxAmount(typed, MAX);
      expect(result.ok, typed).toBe(true);
      if (result.ok) expect(result.value.robux, typed).toBe(expected);
    }
  });

  it("still reads a full stop as the decimal point", () => {
    const result = parseCurrencyAmount("1.50", 1000, 2);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.toFixed(2, "half-up")).toBe("1.50");
  });
});

describe("the ambiguous case is refused rather than resolved", () => {
  it("refuses a comma with exactly three digits in a comma-decimal locale", () => {
    // `1,000` is one to the parser and one thousand to most people who typed
    // it, and the two differ by a thousandfold on a payout. Guessing either way
    // is worse than asking.
    for (const locale of ["de", "es", "pt-BR", "tr", "id"]) {
      const result = parseRobuxAmount("1,000", MAX, locale);
      expect(result.ok, `${locale} silently resolved "1,000"`).toBe(false);
    }
  });

  it("still accepts it in English, where it is not ambiguous", () => {
    const result = parseRobuxAmount("1,000", MAX, "en");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.robux).toBe(1_000n);
  });
});

describe("currency and percentages follow the same rule", () => {
  it("reads a German decimal comma in a money field", () => {
    const result = parseCurrencyAmount("1.234,56", 1_000_000, 2, "de");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.toFixed(2, "half-up")).toBe("1234.56");
  });

  it("reads a French percentage written with a comma", () => {
    const result = parsePercent("2,9", 100, "fr");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.toFixed(1, "half-up")).toBe("2.9");
  });

  it("falls back to English for a tag it does not know", () => {
    const result = parseRobuxAmount("30,000", MAX, "xx-YY");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.robux).toBe(30_000n);
  });
});
