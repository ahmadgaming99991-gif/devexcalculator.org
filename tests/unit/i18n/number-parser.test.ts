import { describe, expect, it } from "vitest";
import { formatLocaleNumber, parseLocaleNumber } from "../../../src/i18n/number-parser";
import { LAUNCH_LOCALES, getLocaleMeta } from "../../../src/i18n/config";
import type { Locale } from "../../../src/i18n/types";

/**
 * The failure this file exists to prevent: `1.000` is one thousand in São
 * Paulo and one in London. Read the wrong way on a payout calculator, that is
 * a figure out by 1000x, in the reader's own currency, about their income.
 */

function ok(input: string, locale: Locale, maxDecimals = 0): string {
  const result = parseLocaleNumber(input, locale, maxDecimals);
  if (!result.ok) throw new Error(`"${input}" in ${locale} was rejected: ${result.reason}`);
  return result.canonical;
}

describe("the separators each locale actually uses", () => {
  it("reads a grouped thousand in every launch locale", () => {
    const cases: Record<string, string> = {
      en: "1,000",
      "pt-BR": "1.000",
      es: "1.000",
      id: "1.000",
      fr: "1 000",
      de: "1.000",
      tr: "1.000",
    };
    for (const [locale, input] of Object.entries(cases)) {
      expect(ok(input, locale as Locale), `${locale}: ${input}`).toBe("1000");
    }
  });

  it("reads a decimal amount in every launch locale", () => {
    const cases: Record<string, string> = {
      en: "1,000.50",
      "pt-BR": "1.000,50",
      es: "1.000,50",
      id: "1.000,50",
      fr: "1 000,50",
      de: "1.000,50",
      tr: "1.000,50",
    };
    for (const [locale, input] of Object.entries(cases)) {
      expect(ok(input, locale as Locale, 2), `${locale}: ${input}`).toBe("1000.50");
    }
  });

  it("accepts French's narrow no-break space, which is what Intl emits", () => {
    // A reader copying the site's own formatted figure back into the field
    // pastes U+202F. Refusing it would mean refusing our own output.
    expect(ok("1 000", "fr")).toBe("1000");
    expect(ok("1 000", "fr")).toBe("1000");
    expect(ok("1 000", "fr")).toBe("1000");
  });

  it("accepts a plain canonical number in every locale", () => {
    for (const locale of LAUNCH_LOCALES) {
      expect(ok("250000", locale)).toBe("250000");
    }
  });
});

describe("refusing rather than guessing", () => {
  it("refuses the 1000x case instead of picking a reading", () => {
    // `1,000` in a comma-decimal locale: one, or one thousand? The two
    // readings differ by 1000x on a payout, so neither is chosen.
    for (const locale of ["pt-BR", "de", "es", "id", "tr"] as const) {
      const result = parseLocaleNumber("1,000", locale, 2);
      expect(result.ok, `${locale} accepted an ambiguous "1,000"`).toBe(false);
      if (!result.ok) expect(result.reason).toBe("ambiguous");
    }
    // In English the same string is unambiguous grouping.
    expect(ok("1,000", "en", 2)).toBe("1000");
  });

  it("refuses a separator the locale uses for neither purpose", () => {
    const result = parseLocaleNumber("1'000", "de", 2);
    expect(result.ok).toBe(false);
  });

  it("refuses malformed grouping", () => {
    // `1,00` and `1,0000` are not thousands groups in any locale.
    for (const input of ["1,00", "1,0000", "12,34,567"]) {
      expect(parseLocaleNumber(input, "en", 2).ok, `accepted ${input}`).toBe(false);
    }
  });

  it("refuses more decimals than the field allows", () => {
    const robux = parseLocaleNumber("1.5", "en", 0);
    expect(robux.ok).toBe(false);
    if (!robux.ok) expect(robux.reason).toBe("too-many-decimals");

    const usd = parseLocaleNumber("1.555", "en", 2);
    expect(usd.ok).toBe(false);
  });

  it("refuses a negative amount", () => {
    const result = parseLocaleNumber("-500", "en");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("negative");
  });

  it("refuses text, and says which kind of nothing it got", () => {
    expect(parseLocaleNumber("", "en")).toEqual({ ok: false, reason: "empty" });
    expect(parseLocaleNumber("   ", "en")).toEqual({ ok: false, reason: "empty" });
    const text = parseLocaleNumber("abc", "en");
    expect(text.ok).toBe(false);
  });

  it("never returns a value with a group separator left in it", () => {
    // The canonical string feeds the exact Rational pipeline. A stray comma
    // there is a parse failure one layer down, where the message is useless.
    for (const locale of LAUNCH_LOCALES) {
      const meta = getLocaleMeta(locale);
      const formatted = new Intl.NumberFormat(meta.bcp47).format(1234567);
      const result = parseLocaleNumber(formatted, locale, 2);
      if (!result.ok) continue;
      expect(result.canonical, `${locale}`).toMatch(/^\d+(\.\d+)?$/);
      expect(result.canonical).toBe("1234567");
    }
  });
});

describe("pasted decoration", () => {
  it("survives a currency symbol or the R$ prefix", () => {
    expect(ok("$1,000.50", "en", 2)).toBe("1000.50");
    expect(ok("R$ 250000", "pt-BR")).toBe("250000");
    expect(ok("30000 Robux", "en")).toBe("30000");
  });

  it("strips leading zeros without changing the value", () => {
    expect(ok("000250000", "en")).toBe("250000");
    expect(ok("0", "en")).toBe("0");
  });
});

describe("round trip", () => {
  it("accepts everything it formats, in every launch locale", () => {
    // The failure this guards: a reader copies the site's own figure back into
    // the site's own field and is told it is invalid.
    for (const locale of LAUNCH_LOCALES) {
      for (const value of ["0", "1", "1000", "30000", "250000", "1234567"]) {
        const formatted = formatLocaleNumber(value, locale);
        const result = parseLocaleNumber(formatted, locale, 2);
        expect(result.ok, `${locale}: formatted "${formatted}" was rejected`).toBe(true);
        if (result.ok) expect(result.canonical).toBe(value);
      }
    }
  });
});
