import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseEcbPayload, getFallbackRates, FxProviderError } from "@/features/fx/ecb-provider";
import { convertToCurrency } from "@/features/fx/use-fx";
import { Rational } from "@/lib/calculations/rational";
import { formatCurrency, supportedCurrencies } from "@/lib/calculations/format";

/**
 * FX cross-rate tests.
 *
 * The fixture is a real ECB response captured on 2026-08-17. The direction of
 * the cross-rate division is the thing most worth pinning: inverting it
 * produces plausible-looking numbers that are wrong by the square of the rate,
 * which is exactly the kind of bug that survives a casual review.
 */

const fixture = JSON.parse(
  readFileSync(join(__dirname, "..", "fixtures", "ecb-response.json"), "utf8"),
);

const FETCHED_AT = "2026-08-17T12:00:00Z";

describe("ECB payload parsing", () => {
  const rates = parseEcbPayload(fixture, FETCHED_AT);

  it("produces USD-based rates", () => {
    expect(rates.base).toBe("USD");
    expect(rates.rates.USD).toBe(1);
  });

  it("names the provider and the observation date", () => {
    expect(rates.provider).toBe("European Central Bank");
    expect(rates.observationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(rates.fetchedAt).toBe(FETCHED_AT);
  });

  it("derives USD to EUR as the reciprocal of the published EUR to USD rate", () => {
    // The fixture publishes EUR->USD = 1.1567, so USD->EUR is 1/1.1567.
    const eur = rates.rates.EUR;
    expect(eur).toBeDefined();
    expect(eur).toBeCloseTo(1 / 1.1567, 6);
  });

  it("gets the cross-rate direction right for a currency weaker than the dollar", () => {
    // GBP is worth more than USD, so one dollar buys less than one pound.
    const gbp = rates.rates.GBP;
    expect(gbp).toBeDefined();
    expect(gbp!).toBeGreaterThan(0.5);
    expect(gbp!).toBeLessThan(1);
  });

  it("gets the cross-rate direction right for a currency weaker per unit", () => {
    // One dollar buys many yen and many won; an inverted division would give
    // a fraction instead.
    expect(rates.rates.JPY!).toBeGreaterThan(50);
    expect(rates.rates.KRW!).toBeGreaterThan(500);
  });

  it.each(["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "KRW"])(
    "publishes a positive finite rate for %s",
    (code) => {
      const rate = rates.rates[code];
      expect(rate).toBeDefined();
      expect(Number.isFinite(rate)).toBe(true);
      expect(rate!).toBeGreaterThan(0);
    },
  );

  it("only publishes currencies the site claims to support", () => {
    const supported = new Set(supportedCurrencies.map((c) => c.code));
    for (const code of Object.keys(rates.rates)) {
      expect(supported.has(code)).toBe(true);
    }
  });

  it("excludes a discontinued series whose last observation predates the USD one", () => {
    // The ECB stopped publishing BGN after 2025-12-31, so it must not appear
    // alongside rates observed on a later date.
    expect(rates.rates.BGN).toBeUndefined();
  });

  it("marks recent data as not stale", () => {
    const fresh = parseEcbPayload(fixture, `${rates.observationDate}T16:00:00Z`);
    expect(fresh.stale).toBe(false);
    expect(fresh.staleReason).toBeNull();
  });

  it("marks old data as stale and says why", () => {
    const old = parseEcbPayload(fixture, "2027-01-01T00:00:00Z");
    expect(old.stale).toBe(true);
    expect(old.staleReason).toContain("days old");
  });

  it("throws a typed error when the response has no structure block", () => {
    expect(() => parseEcbPayload({}, FETCHED_AT)).toThrow(FxProviderError);
  });

  it("throws when the response contains no USD series", () => {
    const withoutUsd = structuredClone(fixture) as typeof fixture;
    const currencyDim = withoutUsd.structure.dimensions.series.find(
      (d: { id: string }) => d.id === "CURRENCY",
    );
    currencyDim.values = currencyDim.values.map((v: { id: string }) =>
      v.id === "USD" ? { id: "ZZZ" } : v,
    );
    expect(() => parseEcbPayload(withoutUsd, FETCHED_AT)).toThrow(FxProviderError);
  });
});

describe("fallback snapshot", () => {
  const fallback = getFallbackRates();

  it("is always marked stale with a reason", () => {
    expect(fallback.stale).toBe(true);
    expect(fallback.staleReason).toBeTruthy();
    expect(fallback.staleReason).toContain("stored snapshot");
  });

  it("still provides usable USD-based rates", () => {
    expect(fallback.base).toBe("USD");
    expect(fallback.rates.USD).toBe(1);
    expect(fallback.rates.GBP!).toBeGreaterThan(0);
  });

  it("records the observation date of the snapshot, not the time it was served", () => {
    expect(fallback.observationDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fallback.observationDate).not.toBe(fallback.fetchedAt.slice(0, 10));
  });
});

describe("currency conversion", () => {
  const rates = parseEcbPayload(fixture, FETCHED_AT);

  it("returns the USD value unchanged for USD", () => {
    const usd = Rational.fromDecimalString("380");
    expect(convertToCurrency(usd, "USD", rates)?.toFixed(2)).toBe("380.00");
  });

  it("converts a payout into another currency", () => {
    const usd = Rational.fromDecimalString("380");
    const gbp = convertToCurrency(usd, "GBP", rates);
    expect(gbp).not.toBeNull();
    // 380 dollars is a few hundred pounds, not a few thousand.
    expect(Number(gbp!.toFixed(2))).toBeGreaterThan(200);
    expect(Number(gbp!.toFixed(2))).toBeLessThan(380);
  });

  it("formats a zero-decimal currency without a fractional part", () => {
    const usd = Rational.fromDecimalString("380");
    const jpy = convertToCurrency(usd, "JPY", rates);
    expect(formatCurrency(jpy!, "JPY")).not.toContain(".");
  });

  it("returns null when rates are unavailable, so the caller can fall back to USD", () => {
    expect(convertToCurrency(Rational.fromDecimalString("380"), "GBP", null)).toBeNull();
  });

  it("returns null for a currency the provider did not supply", () => {
    expect(convertToCurrency(Rational.fromDecimalString("380"), "XYZ", rates)).toBeNull();
  });
});
