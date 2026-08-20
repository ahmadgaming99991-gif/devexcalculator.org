import { describe, expect, it } from "vitest";
import {
  calculateComparison,
  calculateGroupSplit,
  calculateQuick,
  calculateSplit,
  calculateTarget,
  convertUsd,
  evaluateThreshold,
  legacyRateId,
  minimumEarnedRobux,
  NO_FEES,
  standardRateId,
  us18RateId,
} from "@/lib/calculations/devex";
import { Rational } from "@/lib/calculations/rational";

const usd = (result: { toFixed(dp: number): string }) => result.toFixed(2);

describe("quick mode", () => {
  it("matches the figure Roblox publishes: 30,000 Robux is 114.00 USD", () => {
    const result = calculateQuick({ robux: 30_000n, rateId: standardRateId });
    expect(usd(result.grossUsd)).toBe("114.00");
  });

  it("calculates the legacy rate: 30,000 Robux is 105.00 USD", () => {
    const result = calculateQuick({ robux: 30_000n, rateId: legacyRateId });
    expect(usd(result.grossUsd)).toBe("105.00");
  });

  it("calculates the conditional U.S. 18+ rate: 30,000 Robux is 162.00 USD", () => {
    const result = calculateQuick({ robux: 30_000n, rateId: us18RateId });
    expect(usd(result.grossUsd)).toBe("162.00");
  });

  it.each([
    [1_000n, "3.80"],
    [5_000n, "19.00"],
    [10_000n, "38.00"],
    [17_000n, "64.60"],
    [20_000n, "76.00"],
    [50_000n, "190.00"],
    [100_000n, "380.00"],
    [200_000n, "760.00"],
    [500_000n, "1900.00"],
    [1_000_000n, "3800.00"],
    [10_000_000n, "38000.00"],
  ])("converts %s Robux to %s USD at the standard rate", (robux, expected) => {
    expect(usd(calculateQuick({ robux, rateId: standardRateId }).grossUsd)).toBe(expected);
  });

  it("returns zero for zero Robux", () => {
    const result = calculateQuick({ robux: 0n, rateId: standardRateId });
    expect(usd(result.grossUsd)).toBe("0.00");
    expect(result.threshold.state).toBe("empty");
  });

  it("clamps a negative amount to zero rather than producing a negative payout", () => {
    const result = calculateQuick({ robux: -5_000n, rateId: standardRateId });
    expect(result.robux).toBe(0n);
    expect(usd(result.grossUsd)).toBe("0.00");
  });

  it("stays exact at the top of the supported input range", () => {
    const result = calculateQuick({ robux: 100_000_000_000n, rateId: standardRateId });
    expect(usd(result.grossUsd)).toBe("380000000.00");
  });

  it("throws for an unknown rate id rather than silently defaulting", () => {
    expect(() => calculateQuick({ robux: 1n, rateId: "not-a-rate" })).toThrow();
  });
});

describe("threshold", () => {
  it("reports below-minimum just under the boundary", () => {
    const status = evaluateThreshold(BigInt(minimumEarnedRobux) - 1n);
    expect(status.state).toBe("below-minimum");
    expect(status.shortfallRobux).toBe(1n);
  });

  it("reports meets-minimum exactly at the boundary", () => {
    const status = evaluateThreshold(BigInt(minimumEarnedRobux));
    expect(status.state).toBe("meets-minimum");
    expect(status.shortfallRobux).toBe(0n);
    expect(status.progressPercent).toBe(100);
  });

  it("reports meets-minimum above the boundary and caps progress at 100", () => {
    const status = evaluateThreshold(BigInt(minimumEarnedRobux) * 10n);
    expect(status.state).toBe("meets-minimum");
    expect(status.progressPercent).toBe(100);
  });

  it("always flags that the number is still subject to official review", () => {
    for (const amount of [0n, 1n, 30_000n, 10_000_000n]) {
      expect(evaluateThreshold(amount).subjectToOfficialReview).toBe(true);
    }
  });

  it("computes partial progress proportionally", () => {
    const status = evaluateThreshold(15_000n);
    expect(status.state).toBe("below-minimum");
    expect(status.progressPercent).toBe(50);
    expect(status.shortfallRobux).toBe(15_000n);
  });
});

describe("advanced split mode", () => {
  it("sums buckets without double counting", () => {
    const result = calculateSplit({
      standardRobux: 80_000n,
      legacyRobux: 20_000n,
      us18Robux: 0n,
    });
    // 80,000 x 0.0038 = 304.00 and 20,000 x 0.0035 = 70.00
    expect(usd(result.grossUsd)).toBe("374.00");
    expect(result.totalRobux).toBe(100_000n);
  });

  it("counts each bucket exactly once across all three rates", () => {
    const result = calculateSplit({
      standardRobux: 50_000n,
      legacyRobux: 30_000n,
      us18Robux: 20_000n,
    });
    // 190.00 + 105.00 + 108.00
    expect(usd(result.grossUsd)).toBe("403.00");
    expect(result.totalRobux).toBe(100_000n);
    const bucketTotal = result.buckets.reduce((sum, b) => sum + b.robux, 0n);
    expect(bucketTotal).toBe(result.totalRobux);
  });

  it("computes the blended effective rate", () => {
    const result = calculateSplit({
      standardRobux: 80_000n,
      legacyRobux: 20_000n,
      us18Robux: 0n,
    });
    // 374 / 100,000 = 0.00374
    expect(result.blendedRateUsdPerRobux.toFixed(5)).toBe("0.00374");
  });

  it("compares against a standard-only payout for the same total", () => {
    const result = calculateSplit({
      standardRobux: 80_000n,
      legacyRobux: 20_000n,
      us18Robux: 0n,
    });
    expect(usd(result.standardOnlyUsd)).toBe("380.00");
    expect(usd(result.differenceVsStandardOnlyUsd)).toBe("-6.00");
  });

  it("reports each bucket's share of the gross", () => {
    const result = calculateSplit({
      standardRobux: 80_000n,
      legacyRobux: 20_000n,
      us18Robux: 0n,
    });
    const [standard, legacy] = result.buckets;
    expect(standard?.shareOfGrossPercent.toFixed(4)).toBe("81.2834");
    expect(legacy?.shareOfGrossPercent.toFixed(4)).toBe("18.7166");
  });

  it("treats negative bucket entries as zero", () => {
    const result = calculateSplit({
      standardRobux: -1_000n,
      legacyRobux: 10_000n,
      us18Robux: 0n,
    });
    expect(result.totalRobux).toBe(10_000n);
    expect(usd(result.grossUsd)).toBe("35.00");
  });

  it("applies a percentage fee, a flat fee and a tax estimate in order", () => {
    const result = calculateSplit(
      { standardRobux: 80_000n, legacyRobux: 20_000n, us18Robux: 0n },
      {
        feePercent: Rational.fromDecimalString("2.9"),
        flatFeeUsd: Rational.fromDecimalString("0.30"),
        taxPercent: Rational.fromDecimalString("20"),
      },
    );
    expect(usd(result.grossUsd)).toBe("374.00");
    // 374 x 2.9% = 10.846
    expect(result.percentageFeeUsd.toFixed(3)).toBe("10.846");
    // 374 - 10.846 - 0.30 = 362.854
    expect(result.netBeforeTaxUsd.toFixed(3)).toBe("362.854");
    // 362.854 x 20% = 72.5708
    expect(result.estimatedTaxUsd.toFixed(4)).toBe("72.5708");
    // 362.854 - 72.5708 = 290.2832
    expect(result.netAfterEstimateUsd.toFixed(4)).toBe("290.2832");
    expect(result.feesApplied).toBe(true);
    expect(result.taxApplied).toBe(true);
  });

  it("does not mark fees or tax as applied when none were entered", () => {
    const result = calculateSplit(
      { standardRobux: 30_000n, legacyRobux: 0n, us18Robux: 0n },
      NO_FEES,
    );
    expect(result.feesApplied).toBe(false);
    expect(result.taxApplied).toBe(false);
    expect(usd(result.netAfterEstimateUsd)).toBe("114.00");
  });

  it("clamps to zero when fees exceed the gross rather than showing a negative payout", () => {
    const result = calculateSplit(
      { standardRobux: 1_000n, legacyRobux: 0n, us18Robux: 0n },
      {
        feePercent: Rational.fromDecimalString("50"),
        flatFeeUsd: Rational.fromDecimalString("100"),
        taxPercent: Rational.fromDecimalString("30"),
      },
    );
    expect(usd(result.grossUsd)).toBe("3.80");
    expect(usd(result.netBeforeTaxUsd)).toBe("0.00");
    expect(usd(result.estimatedTaxUsd)).toBe("0.00");
    expect(usd(result.netAfterEstimateUsd)).toBe("0.00");
  });

  it("returns an all-zero result for empty buckets", () => {
    const result = calculateSplit({ standardRobux: 0n, legacyRobux: 0n, us18Robux: 0n });
    expect(result.totalRobux).toBe(0n);
    expect(usd(result.grossUsd)).toBe("0.00");
    expect(result.blendedRateUsdPerRobux.isZero()).toBe(true);
    expect(result.threshold.state).toBe("empty");
  });
});

describe("reverse target mode", () => {
  it("rounds the requirement up to a whole Robux", () => {
    const result = calculateTarget({
      targetUsd: Rational.fromDecimalString("1000"),
      rateId: standardRateId,
    });
    // 1000 / 0.0038 = 263,157.894... so 263,158 Robux are needed.
    expect(result.requiredRobux).toBe(263_158n);
    expect(result.payoutAtRequiredRobux.gte(result.targetUsd)).toBe(true);
  });

  it("does not round up when the division is exact", () => {
    const result = calculateTarget({
      targetUsd: Rational.fromDecimalString("114"),
      rateId: standardRateId,
    });
    expect(result.requiredRobux).toBe(30_000n);
    expect(usd(result.payoutAtRequiredRobux)).toBe("114.00");
  });

  it("flags a requirement that falls below the documented minimum", () => {
    const result = calculateTarget({
      targetUsd: Rational.fromDecimalString("50"),
      rateId: standardRateId,
    });
    expect(result.requiredRobux).toBe(13_158n);
    expect(result.requirementIsBelowMinimum).toBe(true);
    // The creator still cannot cash out below the minimum.
    expect(result.effectiveRobuxNeeded).toBe(BigInt(minimumEarnedRobux));
  });

  it("does not flag a requirement at or above the minimum", () => {
    const result = calculateTarget({
      targetUsd: Rational.fromDecimalString("114"),
      rateId: standardRateId,
    });
    expect(result.requirementIsBelowMinimum).toBe(false);
    expect(result.effectiveRobuxNeeded).toBe(30_000n);
  });

  it("computes progress against a current balance", () => {
    const result = calculateTarget({
      targetUsd: Rational.fromDecimalString("1000"),
      rateId: standardRateId,
      currentRobux: 131_579n,
    });
    expect(result.progressPercent).toBe(50);
    expect(result.remainingRobux).toBe(131_579n);
  });

  it("caps progress at 100 once the balance covers the target", () => {
    const result = calculateTarget({
      targetUsd: Rational.fromDecimalString("114"),
      rateId: standardRateId,
      currentRobux: 500_000n,
    });
    expect(result.progressPercent).toBe(100);
    expect(result.remainingRobux).toBe(0n);
  });

  it("omits progress fields when no balance was supplied", () => {
    const result = calculateTarget({
      targetUsd: Rational.fromDecimalString("1000"),
      rateId: standardRateId,
    });
    expect(result.currentRobux).toBeNull();
    expect(result.progressPercent).toBeNull();
    expect(result.remainingRobux).toBeNull();
  });

  it("uses the selected rate, not always the standard rate", () => {
    const legacy = calculateTarget({
      targetUsd: Rational.fromDecimalString("105"),
      rateId: legacyRateId,
    });
    expect(legacy.requiredRobux).toBe(30_000n);
  });

  it("clamps a negative target to zero", () => {
    const result = calculateTarget({
      targetUsd: Rational.fromDecimalString("-100"),
      rateId: standardRateId,
    });
    expect(result.requiredRobux).toBe(0n);
  });
});

describe("comparison mode", () => {
  it("values one amount under every documented rate", () => {
    const result = calculateComparison(100_000n);
    const byId = Object.fromEntries(result.rows.map((r) => [r.rate.id, r]));
    expect(usd(byId[standardRateId]!.usd)).toBe("380.00");
    expect(usd(byId[legacyRateId]!.usd)).toBe("350.00");
    expect(usd(byId[us18RateId]!.usd)).toBe("540.00");
  });

  it("expresses differences against the standard rate", () => {
    const result = calculateComparison(100_000n);
    const byId = Object.fromEntries(result.rows.map((r) => [r.rate.id, r]));

    expect(byId[standardRateId]!.isBaseline).toBe(true);
    expect(usd(byId[standardRateId]!.differenceVsStandardUsd)).toBe("0.00");

    expect(usd(byId[legacyRateId]!.differenceVsStandardUsd)).toBe("-30.00");
    // -30 / 380 = -7.894...%
    expect(byId[legacyRateId]!.differenceVsStandardPercent.toFixed(2)).toBe("-7.89");

    expect(usd(byId[us18RateId]!.differenceVsStandardUsd)).toBe("160.00");
    // 160 / 380 = 42.105...%
    expect(byId[us18RateId]!.differenceVsStandardPercent.toFixed(2)).toBe("42.11");
  });

  it("compares the rates themselves when no amount has been entered", () => {
    const result = calculateComparison(0n);
    const byId = Object.fromEntries(result.rows.map((r) => [r.rate.id, r]));
    expect(byId[legacyRateId]!.differenceVsStandardPercent.toFixed(2)).toBe("-7.89");
    expect(byId[us18RateId]!.differenceVsStandardPercent.toFixed(2)).toBe("42.11");
  });
});

describe("local currency conversion", () => {
  it("multiplies the USD value by the USD-to-target rate", () => {
    const result = convertUsd(
      Rational.fromDecimalString("380"),
      Rational.fromDecimalString("0.8645"),
    );
    expect(usd(result)).toBe("328.51");
  });

  it("returns the same value for a rate of 1", () => {
    const value = Rational.fromDecimalString("380");
    expect(usd(convertUsd(value, Rational.ONE))).toBe("380.00");
  });
});

/**
 * Group revenue split.
 *
 * The arithmetic is easy; the honesty is not. Each of these guards a specific
 * way a split calculator can mislead the people using it to divide real money.
 */
describe("group revenue split", () => {
  const shares = (...pairs: [string, string][]) =>
    pairs.map(([name, percent]) => ({ name, percent }));

  it("divides a balance by the stated percentages", () => {
    const result = calculateGroupSplit(
      100_000n,
      shares(["Ana", "60"], ["Ben", "25"], ["Cass", "15"]),
      standardRateId,
    );

    expect(result.members.map((m) => m.robux)).toEqual([60_000n, 25_000n, 15_000n]);
    expect(result.unallocatedRobux).toBe(0n);
    expect(result.percentagesUnbalanced).toBe(false);
  });

  it("floors each share and reports the remainder instead of hiding it", () => {
    // 10 Robux three ways is 3.33 each. Rounding any of them up would pay out
    // Robux the group does not have; handing the spare to the first member
    // would be a silent decision nobody made.
    const result = calculateGroupSplit(
      10n,
      shares(["A", "33.3333"], ["B", "33.3333"], ["C", "33.3334"]),
      standardRateId,
    );

    expect(result.members.map((m) => m.robux)).toEqual([3n, 3n, 3n]);
    expect(result.unallocatedRobux).toBe(1n);
  });

  it("refuses to normalise percentages that do not reach 100", () => {
    // Three people at 30% is a mistake in the arrangement. Scaling them to
    // 33.3% each would produce numbers nobody agreed to.
    const result = calculateGroupSplit(
      90_000n,
      shares(["A", "30"], ["B", "30"], ["C", "30"]),
      standardRateId,
    );

    expect(result.percentagesUnbalanced).toBe(true);
    expect(result.members.map((m) => m.robux)).toEqual([27_000n, 27_000n, 27_000n]);
    expect(result.unallocatedRobux).toBe(9_000n);
  });

  it("applies the DevEx minimum to each member, never to the group total", () => {
    const met = (result: ReturnType<typeof calculateGroupSplit>) =>
      result.members.map((m) => m.threshold.shortfallRobux === 0n);

    /*
     * 90,000 clears the 30,000 minimum three times over, and a 34/33/33 split
     * leaves two of the three members unable to submit anything: 33% of 90,000
     * is 29,700. This is the whole reason the threshold is evaluated per
     * member. A calculator that checked the group total would have told all
     * three they were fine.
     */
    const uneven = calculateGroupSplit(90_000n, shares(["A", "34"], ["B", "33"], ["C", "33"]), standardRateId);
    expect(uneven.totalRobux).toBeGreaterThan(BigInt(minimumEarnedRobux) * 2n);
    expect(met(uneven)).toEqual([true, false, false]);

    const clears = calculateGroupSplit(120_000n, shares(["A", "34"], ["B", "33"], ["C", "33"]), standardRateId);
    expect(met(clears)).toEqual([true, true, true]);

    // The group total clears the minimum twice over and neither member does.
    const neither = calculateGroupSplit(45_000n, shares(["A", "50"], ["B", "50"]), standardRateId);
    expect(neither.totalRobux).toBeGreaterThan(BigInt(minimumEarnedRobux));
    expect(met(neither)).toEqual([false, false]);
  });

  it("treats an unreadable or negative percentage as zero rather than throwing", () => {
    const result = calculateGroupSplit(
      1_000n,
      shares(["A", "50"], ["B", "nonsense"], ["C", "-20"]),
      standardRateId,
    );
    expect(result.members.map((m) => m.robux)).toEqual([500n, 0n, 0n]);
  });

  it("returns zero for a negative balance instead of a negative payout", () => {
    const result = calculateGroupSplit(-5_000n, shares(["A", "100"]), standardRateId);
    expect(result.totalRobux).toBe(0n);
    expect(result.members[0]?.robux).toBe(0n);
  });

  it("values each share through the same engine as every other figure", () => {
    const result = calculateGroupSplit(100_000n, shares(["A", "100"]), standardRateId);
    const direct = calculateQuick({ robux: 100_000n, rateId: standardRateId });
    expect(result.members[0]?.grossUsd.toFixed(2, "half-up")).toBe(
      direct.grossUsd.toFixed(2, "half-up"),
    );
  });
});
