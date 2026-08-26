import { describe, expect, it } from "vitest";
import { figures } from "@/i18n/figures";
import { translatorFor } from "@/i18n/client-words";
import { getRateValue } from "@/lib/calculations/rate-registry";
import { Rational } from "@/lib/calculations/rational";
import { formatCurrency, formatRobux } from "@/lib/calculations/format";
import { LAUNCH_LOCALES, getLocaleMeta } from "@/i18n/config";

/**
 * The published figures, and the two translators that fill them in.
 *
 * These exist because forty-five English strings used to state the rate as
 * literal text and twenty-one of those also stated a figure derived from it.
 * The tests that matter are therefore not "does `figures` return something" but
 * "does every derived figure still equal the arithmetic it claims to be", and
 * "does a reader ever see a brace".
 */

describe("figures", () => {
  it("derives every payout from the registry rather than restating it", () => {
    const standard = getRateValue("standard-current");
    const legacy = getRateValue("legacy-pre-2025-09-05");

    for (const amount of [30_000, 100_000, 1_000_000]) {
      const f = figures("en");
      expect(f[`payout${amount}`]).toBe(
        formatCurrency("en", Rational.fromInt(amount).mul(standard), "USD"),
      );
      expect(f[`payoutLegacy${amount}`]).toBe(
        formatCurrency("en", Rational.fromInt(amount).mul(legacy), "USD"),
      );
      expect(f[`robux${amount}`]).toBe(formatRobux("en", amount));
    }
  });

  it("keeps the payout-target quotient, its floor and its ceiling consistent", () => {
    const standard = getRateValue("standard-current");
    const f = figures("en");

    // The page explains why the three differ; if they stop coming from one
    // division, the explanation stops describing the numbers beside it.
    const up = Rational.fromInt(1000).div(standard).ceilToBigInt();
    expect(f.targetRobuxUp).toBe(formatRobux("en", up));
    expect(f.targetRobuxDown).toBe(formatRobux("en", up - 1n));

    // Rounding up must clear the target; the whole number below must not.
    expect(Rational.fromInt(up).mul(standard).gte(Rational.fromInt(1000))).toBe(true);
    expect(Rational.fromInt(up - 1n).mul(standard).lt(Rational.fromInt(1000))).toBe(true);
  });

  it("writes each figure the way its own language writes a number", () => {
    // The defect this whole layer exists for: the rate stated with an English
    // decimal point on a page that writes commas.
    expect(figures("en").rateStandard).toContain(".");
    for (const locale of ["de", "fr", "pt-BR", "es", "tr"]) {
      const tag = getLocaleMeta(locale as never).bcp47;
      expect(figures(tag).rateStandard, `${locale} rate`).toContain(",");
    }
  });

  it("gives every launch locale a value for every figure", () => {
    const names = Object.keys(figures("en"));
    for (const locale of LAUNCH_LOCALES) {
      const f = figures(getLocaleMeta(locale).bcp47);
      for (const name of names) {
        expect(f[name], `${locale}.${name}`).toBeTruthy();
      }
    }
  });
});

describe("the client translator", () => {
  /*
   * A Client Component is handed its strings by key, and fills its own
   * placeholders in the browser. Three of those strings carry `{minimumRobux}`
   * — the results summary and the planner's estimate notice — and the server
   * translator supplied it while this one did not, so the token survived
   * hydration and the reader saw a brace where the minimum should be.
   */
  it("fills a registry figure the call site never passes", () => {
    const t = translatorFor({
      "$locale": "de",
      "test.key": "Mindestens {minimumRobux} Earned Robux.",
    });
    const out = t("test.key");
    expect(out).not.toContain("{");
    expect(out).toBe(`Mindestens ${figures("de").minimumRobux} Earned Robux.`);
  });

  it("lets a caller's own value win over a published one", () => {
    const t = translatorFor({
      "$locale": "en",
      "test.key": "{minimumRobux} Robux.",
    });
    expect(t("test.key", { minimumRobux: "one" })).toBe("one Robux.");
  });
});
