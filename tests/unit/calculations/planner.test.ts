import { describe, expect, it } from "vitest";
import {
  PACE_PERIOD_DAYS,
  planEarnings,
  planScenarios,
  wholeDaysUntil,
  type PlanInput,
} from "../../../src/lib/calculations/planner";
import { Rational } from "../../../src/lib/calculations/rational";
import { calculateTarget, standardRateId, legacyRateId } from "../../../src/lib/calculations/devex";
import { minimumEarnedRobux } from "../../../src/lib/calculations/rate-registry";

/**
 * The planner turns a target and a pace into a date. Everything that can be
 * wrong about it is a rounding direction or a division that should not have
 * happened, so that is what these pin.
 */

const START = new Date("2026-08-23T00:00:00Z");

function plan(overrides: Partial<PlanInput> = {}) {
  return planEarnings({
    targetUsd: Rational.fromInt(500),
    rateId: standardRateId,
    currentRobux: 0n,
    horizon: null,
    startDate: START,
    ...overrides,
  });
}

describe("plan requirement", () => {
  it("needs exactly what the target calculator says it needs", () => {
    // The two pages must never disagree about the same question, so the
    // planner calls the target engine rather than repeating its arithmetic.
    const target = calculateTarget({
      targetUsd: Rational.fromInt(500),
      rateId: standardRateId,
    });
    expect(plan().requirement.requiredRobux).toBe(target.requiredRobux);
  });

  it("raises the requirement to the DevEx minimum when the target is small", () => {
    const result = plan({ targetUsd: Rational.fromInt(50) });

    expect(result.requirement.requirementIsBelowMinimum).toBe(true);
    expect(result.requirement.effectiveRobuxNeeded).toBe(BigInt(minimumEarnedRobux));
    // A $50 target cannot pay $50: it pays whatever the minimum pays.
    expect(result.payout.grossUsd.toFixed(2)).toBe("114.00");
  });

  it("subtracts a balance already held", () => {
    const result = plan({ currentRobux: 50_000n });
    expect(result.requirement.remainingRobux).toBe(
      result.requirement.effectiveRobuxNeeded - 50_000n,
    );
  });

  it("reports a plan already reached rather than a negative remainder", () => {
    const result = plan({ targetUsd: Rational.fromInt(100), currentRobux: 500_000n });
    expect(result.requirement.remainingRobux).toBe(0n);
    expect(result.requirement.alreadyReached).toBe(true);
  });

  it("separates holding the minimum from having reached the target", () => {
    const result = plan({ targetUsd: Rational.fromInt(500), currentRobux: 30_000n });
    expect(result.requirement.currentMeetsMinimum).toBe(true);
    expect(result.requirement.alreadyReached).toBe(false);
  });
});

describe("projecting from a pace", () => {
  it("rounds the days up, because a part day earns nothing", () => {
    // 131,579 needed, 1,000 a day: 131.579 days is 132, not 131.
    const result = plan({
      horizon: { kind: "pace", amountRobux: 1_000n, period: "day" },
    });
    expect(result.requirement.effectiveRobuxNeeded).toBe(131_579n);
    expect(result.projected?.days).toBe(132);
  });

  it("dates the projection from the day the plan starts", () => {
    const result = plan({
      targetUsd: Rational.fromInt(114),
      horizon: { kind: "pace", amountRobux: 10_000n, period: "day" },
    });
    // 30,000 at 10,000 a day is three days.
    expect(result.projected?.days).toBe(3);
    expect(result.projected?.date.toISOString().slice(0, 10)).toBe("2026-08-26");
  });

  it("rounds a weekly or monthly pace down to whole Robux a day", () => {
    // 1,000 a week is 142.857 a day, and a projection must never assume the
    // extra fraction is earned.
    const result = plan({
      horizon: { kind: "pace", amountRobux: 1_000n, period: "week" },
    });
    expect(result.suppliedPerDayRobux).toBe(142n);
  });

  it("gives no date at all for a pace of zero", () => {
    const result = plan({
      horizon: { kind: "pace", amountRobux: 0n, period: "day" },
    });
    // Earning nothing arrives on no date. A number here would be a division
    // by zero wearing a calendar.
    expect(result.projected).toBeNull();
  });

  it("projects zero days when the balance already covers the plan", () => {
    const result = plan({
      targetUsd: Rational.fromInt(114),
      currentRobux: 40_000n,
      horizon: { kind: "pace", amountRobux: 100n, period: "day" },
    });
    expect(result.projected?.days).toBe(0);
  });

  it("counts a month as thirty days, the same way it says it does", () => {
    expect(PACE_PERIOD_DAYS.month).toBe(30);
    const result = plan({
      horizon: { kind: "pace", amountRobux: 30_000n, period: "month" },
    });
    expect(result.suppliedPerDayRobux).toBe(1_000n);
  });
});

describe("working back from a deadline", () => {
  it("rounds the required pace up, so the deadline is actually met", () => {
    const result = plan({
      targetUsd: Rational.fromInt(114),
      horizon: { kind: "deadline", date: "2026-09-22" },
    });

    // 30,000 Robux across 30 days is exactly 1,000 a day.
    expect(result.required?.perDayRobux).toBe(1_000n);
    expect(result.required?.perWeekRobux).toBe(7_000n);
    expect(result.required?.perMonthRobux).toBe(30_000n);
  });

  it("never rounds a required pace down", () => {
    // 30,000 across 7 days is 4,285.71 a day. Earning 4,285 misses it.
    const result = plan({
      targetUsd: Rational.fromInt(114),
      horizon: { kind: "deadline", date: "2026-08-30" },
    });
    expect(result.required?.perDayRobux).toBe(4_286n);
    expect(result.required?.exactPerDayRobux.toFixed(2)).toBe("4285.71");
  });

  it("says a deadline has passed rather than inventing a pace", () => {
    const result = plan({ horizon: { kind: "deadline", date: "2026-08-01" } });
    expect(result.deadlineHasPassed).toBe(true);
    expect(result.required).toBeNull();
  });

  it("treats today as passed: there is no time left to earn in", () => {
    const result = plan({ horizon: { kind: "deadline", date: "2026-08-23" } });
    expect(result.deadlineHasPassed).toBe(true);
  });

  it("measures whole days from UTC midnight at both ends", () => {
    // Rendered late in the day, a plan must not lose a day to the clock.
    const lateInTheDay = new Date("2026-08-23T23:59:00Z");
    expect(wholeDaysUntil(lateInTheDay, "2026-08-24")).toBe(1);
    expect(wholeDaysUntil(START, "2026-08-24")).toBe(1);
  });

  it("reads an unparseable date as no deadline rather than as zero", () => {
    expect(wholeDaysUntil(START, "not-a-date")).toBeNull();
  });
});

describe("payout, fees and tax", () => {
  it("assumes no tax and no fee until the reader enters one", () => {
    const result = plan({ targetUsd: Rational.fromInt(1_000) });
    expect(result.payout.taxApplied).toBe(false);
    expect(result.payout.feesApplied).toBe(false);
    expect(result.payout.netAfterEstimateUsd.eq(result.payout.grossUsd)).toBe(true);
  });

  it("takes fees first and taxes what is left", () => {
    const result = plan({
      targetUsd: Rational.fromInt(1_000),
      fees: {
        feePercent: Rational.fromInt(2),
        flatFeeUsd: Rational.fromInt(5),
        taxPercent: Rational.fromInt(10),
      },
    });

    const gross = result.payout.grossUsd;
    const expectedFee = gross.mul(Rational.fromInt(2)).div(Rational.fromInt(100));
    const expectedNet = gross.sub(expectedFee).sub(Rational.fromInt(5));
    const expectedTax = expectedNet.mul(Rational.fromInt(10)).div(Rational.fromInt(100));

    expect(result.payout.percentageFeeUsd.eq(expectedFee)).toBe(true);
    expect(result.payout.netBeforeTaxUsd.eq(expectedNet)).toBe(true);
    expect(result.payout.estimatedTaxUsd.eq(expectedTax)).toBe(true);
  });

  it("never returns a negative payout, however large the fees", () => {
    const result = plan({
      targetUsd: Rational.fromInt(200),
      fees: {
        feePercent: Rational.fromInt(50),
        flatFeeUsd: Rational.fromInt(10_000),
        taxPercent: Rational.fromInt(40),
      },
    });
    expect(result.payout.netAfterEstimateUsd.isZero()).toBe(true);
    expect(result.payout.netAfterEstimateUsd.isNegative()).toBe(false);
  });

  it("holds exactly at a scale that would drift in floating point", () => {
    const result = plan({ targetUsd: Rational.fromInt(1_000_000) });
    // 1,000,000 / 0.0038 rounded up, then multiplied back.
    expect(result.requirement.requiredRobux).toBe(263_157_895n);
    expect(result.payout.grossUsd.toFixed(4)).toBe("1000000.0010");
  });
});

describe("scenarios across rates", () => {
  it("prices the same plan under every live rate and marks the chosen one", () => {
    const scenarios = planScenarios({
      targetUsd: Rational.fromInt(500),
      rateId: standardRateId,
      currentRobux: 0n,
      horizon: { kind: "pace", amountRobux: 1_000n, period: "day" },
      startDate: START,
    });

    expect(scenarios.length).toBeGreaterThan(1);
    expect(scenarios.filter((row) => row.isBaseline)).toHaveLength(1);

    const legacy = scenarios.find((row) => row.rate.id === legacyRateId);
    const standard = scenarios.find((row) => row.rate.id === standardRateId);
    // The legacy rate pays less per Robux, so the same target needs more of
    // them and takes longer.
    expect(legacy!.requiredRobux).toBeGreaterThan(standard!.requiredRobux);
    expect(legacy!.projected!.days).toBeGreaterThan(standard!.projected!.days);
  });
});

describe("scenarios from a deadline", () => {
  it("gives each rate its own required pace", () => {
    const scenarios = planScenarios({
      targetUsd: Rational.fromInt(114),
      rateId: standardRateId,
      currentRobux: 0n,
      // Thirty days from the start date.
      horizon: { kind: "deadline", date: "2026-09-22" },
      startDate: START,
    });

    const standard = scenarios.find((row) => row.rate.id === standardRateId);
    const legacy = scenarios.find((row) => row.rate.id === legacyRateId);

    expect(standard?.requiredPace?.perDayRobux).toBe(1_000n);
    // The legacy rate pays less, so the same target demands a harder pace.
    expect(legacy!.requiredPace!.perDayRobux).toBeGreaterThan(
      standard!.requiredPace!.perDayRobux,
    );
    expect(standard?.projected).toBeNull();
  });

  it("asks for no pace at all when the deadline has passed", () => {
    const scenarios = planScenarios({
      targetUsd: Rational.fromInt(114),
      rateId: standardRateId,
      currentRobux: 0n,
      horizon: { kind: "deadline", date: "2026-08-01" },
      startDate: START,
    });
    expect(scenarios.every((row) => row.requiredPace === null)).toBe(true);
  });
});
