import { describe, expect, it } from "vitest";
import {
  formatCompactRobux,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPercent,
  formatRate,
  formatRobux,
  formatSignedCurrency,
  formatSignedPercent,
  getCurrency,
  isSupportedCurrency,
  minorUnitsFor,
  supportedCurrencies,
} from "@/lib/calculations/format";
import { Rational } from "@/lib/calculations/rational";

const r = (value: string) => Rational.fromDecimalString(value);

describe("currency metadata", () => {
  it("exposes USD as the base currency", () => {
    const usd = getCurrency("USD");
    expect(usd?.isBase).toBe(true);
    expect(usd?.minorUnits).toBe(2);
  });

  it("records zero-decimal currencies correctly", () => {
    expect(minorUnitsFor("JPY")).toBe(0);
    expect(minorUnitsFor("KRW")).toBe(0);
    expect(minorUnitsFor("ISK")).toBe(0);
    expect(minorUnitsFor("EUR")).toBe(2);
  });

  it("recognises supported currencies case-insensitively", () => {
    expect(isSupportedCurrency("gbp")).toBe(true);
    expect(isSupportedCurrency("GBP")).toBe(true);
    expect(isSupportedCurrency("XYZ")).toBe(false);
  });

  it("lists no duplicate currency codes", () => {
    const codes = supportedCurrencies.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe("formatCurrency", () => {
  it("formats USD with two minor units", () => {
    expect(formatCurrency(r("380"), "USD")).toBe("$380.00");
    expect(formatCurrency(r("114"), "USD")).toBe("$114.00");
  });

  it("groups thousands", () => {
    expect(formatCurrency(r("3800"), "USD")).toBe("$3,800.00");
    expect(formatCurrency(r("38000000"), "USD")).toBe("$38,000,000.00");
  });

  it("formats a zero-decimal currency without a fractional part", () => {
    const formatted = formatCurrency(r("56789.4"), "JPY");
    expect(formatted).not.toContain(".");
    expect(formatted).toContain("56,789");
  });

  it("rounds half-up at the display boundary", () => {
    expect(formatCurrency(r("380.005"), "USD")).toBe("$380.01");
    expect(formatCurrency(r("380.004"), "USD")).toBe("$380.00");
  });

  it("can omit the currency symbol", () => {
    expect(formatCurrency(r("380"), "USD", { showSymbol: false })).toBe("380.00");
  });

  it("never renders a negative zero", () => {
    expect(formatCurrency(r("-0.001"), "USD")).toBe("$0.00");
  });
});

describe("formatRate", () => {
  it("preserves the full precision of a DevEx rate", () => {
    expect(formatRate(r("0.0038"))).toBe("0.0038");
    expect(formatRate(r("0.0035"))).toBe("0.0035");
    expect(formatRate(r("0.0054"))).toBe("0.0054");
  });

  it("keeps trailing zeros on a per-thousand rate", () => {
    expect(formatRate(r("3.80"), 2)).toBe("3.80");
    expect(formatRate(r("5.40"), 2)).toBe("5.40");
  });
});

describe("formatRobux", () => {
  it("groups large Robux counts", () => {
    expect(formatRobux(100_000n)).toBe("100,000");
    expect(formatRobux(1_000_000n)).toBe("1,000,000");
    expect(formatRobux(0n)).toBe("0");
  });

  it("handles values beyond Number.MAX_SAFE_INTEGER exactly", () => {
    expect(formatRobux(90_071_992_547_409_930n)).toBe("90,071,992,547,409,930");
  });
});

describe("formatCompactRobux", () => {
  it("compacts exact multiples only", () => {
    expect(formatCompactRobux(1_000n)).toBe("1K");
    expect(formatCompactRobux(30_000n)).toBe("30K");
    expect(formatCompactRobux(500_000n)).toBe("500K");
    expect(formatCompactRobux(1_000_000n)).toBe("1M");
    expect(formatCompactRobux(1_000_000_000n)).toBe("1B");
  });

  it("falls back to the grouped form when compaction would misrepresent the value", () => {
    expect(formatCompactRobux(17_500n)).toBe("17,500");
    expect(formatCompactRobux(999n)).toBe("999");
  });
});

describe("percentages and signed values", () => {
  it("formats percentages", () => {
    expect(formatPercent(r("42.105"), 2)).toBe("42.11%");
    expect(formatPercent(r("0"), 2)).toBe("0.00%");
  });

  it("shows an explicit plus sign for positive differences only", () => {
    expect(formatSignedCurrency(r("160"), "USD")).toBe("+$160.00");
    expect(formatSignedCurrency(r("-30"), "USD")).toBe("-$30.00");
    expect(formatSignedCurrency(r("0"), "USD")).toBe("$0.00");
    expect(formatSignedPercent(r("42.1"), 1)).toBe("+42.1%");
    expect(formatSignedPercent(r("-7.9"), 1)).toBe("-7.9%");
  });
});

describe("dates", () => {
  it("formats an ISO instant as a readable UTC date", () => {
    expect(formatDate("2026-08-17T00:00:00Z")).toBe("17 August 2026");
    expect(formatDate("2025-09-05T10:00:00-07:00")).toBe("5 September 2025");
  });

  it("formats an instant with time and an explicit UTC marker", () => {
    expect(formatDateTime("2026-08-17T12:00:00Z")).toBe("17 Aug 2026, 12:00 UTC");
  });

  it("returns the input unchanged when it is not a date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});
