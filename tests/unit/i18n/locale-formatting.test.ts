import { describe, expect, it } from "vitest";
import { LAUNCH_LOCALES, getLocaleMeta } from "@/i18n/config";
import { parseLocaleNumber } from "@/i18n/number-parser";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  formatRate,
  formatRobux,
} from "@/lib/calculations/format";
import { Rational } from "@/lib/calculations/rational";

/**
 * That a figure is formatted for the language it is sitting in — and that the
 * site can read back what it printed.
 *
 * The input side was locale-aware from the start: `number-parser` reads
 * "1.234,56" as one thousand in German and refuses to guess where a value is
 * genuinely ambiguous. The output side was not — every figure went through
 * `Intl.NumberFormat("en-US")`. The result was a French page rendering
 * "1,234.56" into a field whose own parser rejects it, on a page about
 * somebody's income.
 *
 * So the assertion that matters here is not "German uses a comma". It is the
 * round trip: format a number for a locale, hand the output straight back to
 * that locale's parser, and get the same number. If that ever fails, a reader
 * copying a figure from the page into the calculator gets an error message
 * about their own currency.
 */

const r = (value: string) => Rational.fromDecimalString(value);

describe("numbers are formatted for the reader's language", () => {
  it("groups thousands the way each locale does", () => {
    expect(formatRobux("en", 1_234_567n)).toBe("1,234,567");
    expect(formatRobux("de", 1_234_567n)).toBe("1.234.567");
    expect(formatRobux("pt-BR", 1_234_567n)).toBe("1.234.567");
    expect(formatRobux("id", 1_234_567n)).toBe("1.234.567");
    expect(formatRobux("tr", 1_234_567n)).toBe("1.234.567");
    // French uses a narrow no-break space, U+202F, not a plain one.
    expect(formatRobux("fr", 1_234_567n)).toBe("1 234 567");
  });

  it("separates the fraction the way each locale does", () => {
    expect(formatRate("en", r("0.0038"))).toBe("0.0038");
    expect(formatRate("de", r("0.0038"))).toBe("0,0038");
    expect(formatRate("fr", r("0.0038"))).toBe("0,0038");
    expect(formatPercent("es", r("42.11"), 2)).toBe("42,11%");
  });

  it("places the currency symbol where each locale places it", () => {
    expect(formatCurrency("en", r("1234.5"), "USD")).toBe("$1,234.50");
    // German puts the symbol after the amount; the exact spacing is Intl's.
    expect(formatCurrency("de", r("1234.5"), "USD")).toMatch(/^1\.234,50\s?\$$/u);
  });

  it("keeps British date order on English pages", () => {
    // Changing this would alter every date on the English site, which is a
    // content change and not an internationalisation one.
    expect(formatDate("en", "2026-08-17T00:00:00Z")).toBe("17 August 2026");
  });

  it("writes the month in the reader's language", () => {
    expect(formatDate("de", "2026-08-17T00:00:00Z")).toBe("17. August 2026");
    expect(formatDate("fr", "2026-08-17T00:00:00Z")).toBe("17 août 2026");
    expect(formatDate("pt-BR", "2026-08-17T00:00:00Z")).toBe("17 de agosto de 2026");
  });
});

describe("the site can read back the figures it printed", () => {
  /*
   * Amounts chosen for the shapes that break parsers: a bare thousand, where
   * "1.000" is ambiguous between a group and three decimal places; a value
   * with both separators; and one large enough to carry several groups.
   */
  const amounts = [1_000n, 30_000n, 1_234_567n, 100_000_000n];

  for (const locale of LAUNCH_LOCALES) {
    const tag = getLocaleMeta(locale).bcp47;

    it(`round-trips a Robux count in ${locale}`, () => {
      for (const amount of amounts) {
        const printed = formatRobux(tag, amount);
        const parsed = parseLocaleNumber(printed, locale, 0);
        expect(parsed.ok, `${locale}: ${printed}`).toBe(true);
        if (parsed.ok) expect(BigInt(parsed.canonical)).toBe(amount);
      }
    });

    it(`round-trips a decimal amount in ${locale}`, () => {
      const printed = formatCurrency(tag, r("1234.56"), "USD", { showSymbol: false });
      const parsed = parseLocaleNumber(printed, locale, 2);
      expect(parsed.ok, `${locale}: ${printed}`).toBe(true);
      if (parsed.ok) expect(Number(parsed.canonical)).toBeCloseTo(1234.56, 2);
    });
  }
});
