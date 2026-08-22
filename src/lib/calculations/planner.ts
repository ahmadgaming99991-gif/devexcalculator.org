import type { RateRecord } from "@/types/rates";
import { Rational } from "./rational";
import { allRates, getRate, minimumEarnedRobux } from "./rate-registry";
import {
  calculateTarget,
  evaluateThreshold,
  type FeeAndTaxInput,
  type ThresholdStatus,
  NO_FEES,
} from "./devex";

/**
 * The earnings goal planner.
 *
 * The target calculator already answers "how much Earned Robux does $500
 * need". The question it cannot answer is the one a creator actually asks
 * next: *when*. This turns a target and an earning pace into a date, or a
 * target and a date into a required pace, and it does so with the same exact
 * arithmetic as everything else on the site.
 *
 * Four things this deliberately refuses to do:
 *
 * It assumes no tax rate. A default percentage here would be tax advice
 * dressed as arithmetic, for a reader whose country this site does not know.
 * Tax is whatever the reader types, and zero until they do.
 *
 * It never says a plan succeeds. Reaching the minimum is not approval, and a
 * projected date is a division, not a promise from Roblox. Every field here is
 * named so the UI cannot accidentally present it as either.
 *
 * It does not model earnings growth. A creator entering "5,000 a week" is
 * describing what they earn now; compounding that into a curve would invent
 * a trajectory nobody supplied. The projection is deliberately linear, and
 * says so.
 *
 * And it does not silently pick a direction. A plan is either paced (a rate of
 * earning, producing a date) or dated (a deadline, producing a required pace).
 * Supplying both would let the two disagree, so the caller chooses one.
 */

const HUNDRED = Rational.fromInt(100);
const DAY_MS = 24 * 60 * 60 * 1000;

/** Days in the earning period a creator quoted their pace in. */
export const PACE_PERIOD_DAYS = {
  day: 1,
  week: 7,
  /** A month here is 30 days, stated wherever a month is shown. */
  month: 30,
} as const;

export type PacePeriod = keyof typeof PACE_PERIOD_DAYS;

export interface PlanEarningPace {
  readonly kind: "pace";
  /** Earned Robux the creator expects to earn in one period. */
  readonly amountRobux: bigint;
  readonly period: PacePeriod;
}

export interface PlanDeadline {
  readonly kind: "deadline";
  /** The date the creator wants the payout by, as an ISO date. */
  readonly date: string;
}

export type PlanHorizon = PlanEarningPace | PlanDeadline;

export interface PlanInput {
  /** Desired payout in USD, before any fee or tax. */
  readonly targetUsd: Rational;
  readonly rateId: string;
  /** Eligible Earned Robux already held. */
  readonly currentRobux: bigint;
  /** Either an earning pace or a deadline. Never both. */
  readonly horizon: PlanHorizon | null;
  readonly fees?: FeeAndTaxInput;
  /** The day the plan starts from. Passed in so this stays pure. */
  readonly startDate: Date;
}

/** What a plan needs in Robux, independent of any timing. */
export interface PlanRequirement {
  readonly rate: RateRecord;
  readonly rateValue: Rational;
  /** Robux the target alone needs, rounded up. */
  readonly requiredRobux: bigint;
  /** Whichever is larger: the target's requirement or the DevEx minimum. */
  readonly effectiveRobuxNeeded: bigint;
  readonly requirementIsBelowMinimum: boolean;
  readonly minimumRobux: number;
  readonly currentRobux: bigint;
  readonly remainingRobux: bigint;
  readonly progressPercent: number;
  /** Whether the balance already held would clear the submission minimum. */
  readonly currentMeetsMinimum: boolean;
  readonly threshold: ThresholdStatus;
  /** True when the current balance already covers the whole plan. */
  readonly alreadyReached: boolean;
}

/** What the plan pays out, once the required Robux are reached. */
export interface PlanPayout {
  readonly grossUsd: Rational;
  readonly percentageFeeUsd: Rational;
  readonly flatFeeUsd: Rational;
  readonly netBeforeTaxUsd: Rational;
  readonly estimatedTaxUsd: Rational;
  readonly netAfterEstimateUsd: Rational;
  readonly feesApplied: boolean;
  readonly taxApplied: boolean;
}

/** The pace half of a plan: what has to be earned, and how often. */
export interface PlanPace {
  readonly perDayRobux: bigint;
  readonly perWeekRobux: bigint;
  readonly perMonthRobux: bigint;
  /** Exact per-day figure, kept so the UI can explain the rounding up. */
  readonly exactPerDayRobux: Rational;
}

export interface PlanTiming {
  /** Whole days from the start date, always rounded up. */
  readonly days: number;
  /** The projected date, at the same clock time as the start date. */
  readonly date: Date;
  /** Days expressed as whole weeks and months, for readable prose. */
  readonly weeks: number;
  readonly months: number;
}

export interface PlanResult {
  readonly requirement: PlanRequirement;
  readonly payout: PlanPayout;
  /**
   * Present when the plan is paced: the date that pace reaches the target.
   * Null when no pace was given, or when the pace is zero — earning nothing
   * per day reaches the target on no date at all, which is a fact the UI must
   * state rather than a number it can round.
   */
  readonly projected: PlanTiming | null;
  /**
   * Present when the plan is dated: what must be earned to make the deadline.
   * Null when no deadline was given, or when the deadline has already passed.
   */
  readonly required: PlanPace | null;
  /** True when a deadline was supplied and is not in the future. */
  readonly deadlineHasPassed: boolean;
  /** The pace a creator supplied, normalised to whole Robux per day. */
  readonly suppliedPerDayRobux: bigint | null;
}

/**
 * Values the same plan under each documented rate.
 *
 * Presented as "what each rate would need", never as a menu — Roblox decides
 * which rate applies to which part of a balance.
 */
export interface PlanScenario {
  readonly rate: RateRecord;
  readonly requiredRobux: bigint;
  readonly effectiveRobuxNeeded: bigint;
  readonly remainingRobux: bigint;
  /** When the plan is paced: the date this rate reaches the target. */
  readonly projected: PlanTiming | null;
  /** When the plan is dated: what this rate would need earning each day. */
  readonly requiredPace: PlanPace | null;
  readonly isBaseline: boolean;
}

export function planEarnings(input: PlanInput): PlanResult {
  const fees = input.fees ?? NO_FEES;
  const requirement = describeRequirement(input);
  const payout = describePayout(requirement, fees);

  let projected: PlanTiming | null = null;
  let required: PlanPace | null = null;
  let deadlineHasPassed = false;
  let suppliedPerDayRobux: bigint | null = null;

  if (input.horizon?.kind === "pace") {
    const perDay = perDayFromPace(input.horizon);
    suppliedPerDayRobux = perDay;
    projected = projectFromPace(requirement.remainingRobux, perDay, input.startDate);
  } else if (input.horizon?.kind === "deadline") {
    const days = wholeDaysUntil(input.startDate, input.horizon.date);
    if (days === null || days <= 0) {
      deadlineHasPassed = days !== null;
    } else {
      required = paceForDays(requirement.remainingRobux, days);
    }
  }

  return { requirement, payout, projected, required, deadlineHasPassed, suppliedPerDayRobux };
}

export function planScenarios(input: PlanInput): readonly PlanScenario[] {
  const perDay = input.horizon?.kind === "pace" ? perDayFromPace(input.horizon) : null;

  // A deadline is the same question asked from the other end, so the scenario
  // table answers it the same way rather than falling back to prose.
  const deadlineDays =
    input.horizon?.kind === "deadline"
      ? wholeDaysUntil(input.startDate, input.horizon.date)
      : null;
  const daysAvailable = deadlineDays !== null && deadlineDays > 0 ? deadlineDays : null;

  return allRates
    .filter((rate) => rate.status !== "retired")
    .map((rate) => {
      const requirement = describeRequirement({ ...input, rateId: rate.id });
      return {
        rate,
        requiredRobux: requirement.requiredRobux,
        effectiveRobuxNeeded: requirement.effectiveRobuxNeeded,
        remainingRobux: requirement.remainingRobux,
        projected:
          perDay === null
            ? null
            : projectFromPace(requirement.remainingRobux, perDay, input.startDate),
        requiredPace:
          daysAvailable === null
            ? null
            : paceForDays(requirement.remainingRobux, daysAvailable),
        isBaseline: rate.id === input.rateId,
      };
    });
}

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------

function describeRequirement(input: PlanInput): PlanRequirement {
  const current = input.currentRobux < 0n ? 0n : input.currentRobux;

  // The target calculator already owns this arithmetic, including rounding a
  // partial Robux up and raising the requirement to the DevEx minimum. Calling
  // it rather than repeating it is what keeps the two pages agreeing.
  const target = calculateTarget({
    targetUsd: input.targetUsd,
    rateId: input.rateId,
    currentRobux: current,
  });

  const remaining = target.remainingRobux ?? 0n;

  return {
    rate: target.rate,
    rateValue: target.rateValue,
    requiredRobux: target.requiredRobux,
    effectiveRobuxNeeded: target.effectiveRobuxNeeded,
    requirementIsBelowMinimum: target.requirementIsBelowMinimum,
    minimumRobux: target.minimumRobux,
    currentRobux: current,
    remainingRobux: remaining,
    progressPercent: target.progressPercent ?? 0,
    currentMeetsMinimum: current >= BigInt(minimumEarnedRobux),
    threshold: evaluateThreshold(current),
    alreadyReached: remaining === 0n && target.effectiveRobuxNeeded > 0n,
  };
}

/**
 * What the plan pays.
 *
 * Computed from the Robux actually needed rather than from the typed target,
 * because rounding up to a whole Robux and rising to meet the minimum both
 * change the answer — a $50 target at the standard rate cannot pay $50, it
 * pays what 30,000 Robux pays.
 */
function describePayout(requirement: PlanRequirement, fees: FeeAndTaxInput): PlanPayout {
  const grossUsd = Rational.of(requirement.effectiveRobuxNeeded, 1n).mul(requirement.rateValue);

  // Fees first, then tax on what is left, matching the documented order.
  const percentageFeeUsd = grossUsd.mul(fees.feePercent).div(HUNDRED).clampNonNegative();
  const flatFeeUsd = fees.flatFeeUsd.clampNonNegative();
  const netBeforeTaxUsd = grossUsd.sub(percentageFeeUsd).sub(flatFeeUsd).clampNonNegative();
  const estimatedTaxUsd = netBeforeTaxUsd.mul(fees.taxPercent).div(HUNDRED).clampNonNegative();

  return {
    grossUsd,
    percentageFeeUsd,
    flatFeeUsd,
    netBeforeTaxUsd,
    estimatedTaxUsd,
    netAfterEstimateUsd: netBeforeTaxUsd.sub(estimatedTaxUsd).clampNonNegative(),
    feesApplied: !percentageFeeUsd.isZero() || !flatFeeUsd.isZero(),
    taxApplied: !fees.taxPercent.isZero(),
  };
}

/** A quoted pace as whole Robux per day, rounded down. */
function perDayFromPace(pace: PlanEarningPace): bigint {
  const amount = pace.amountRobux < 0n ? 0n : pace.amountRobux;
  // Rounded down, so a projection is never optimistic about what is earned.
  return Rational.of(amount, BigInt(PACE_PERIOD_DAYS[pace.period])).floorToBigInt();
}

function projectFromPace(
  remainingRobux: bigint,
  perDayRobux: bigint,
  startDate: Date,
): PlanTiming | null {
  if (remainingRobux <= 0n) return timingFromDays(0, startDate);
  // Earning nothing per day never arrives. Returning null makes the UI say so
  // instead of printing a date derived from a division by zero.
  if (perDayRobux <= 0n) return null;

  const days = Rational.of(remainingRobux, perDayRobux).ceilToBigInt();
  return timingFromDays(Number(days), startDate);
}

function paceForDays(remainingRobux: bigint, days: number): PlanPace {
  const dayCount = BigInt(Math.max(1, Math.trunc(days)));
  const exactPerDay = Rational.of(remainingRobux, dayCount);

  // Rounded up in every period: earning the rounded-down amount would miss the
  // deadline, which is the one thing a required pace must not do.
  return {
    perDayRobux: exactPerDay.ceilToBigInt(),
    perWeekRobux: exactPerDay.mul(Rational.fromInt(PACE_PERIOD_DAYS.week)).ceilToBigInt(),
    perMonthRobux: exactPerDay.mul(Rational.fromInt(PACE_PERIOD_DAYS.month)).ceilToBigInt(),
    exactPerDayRobux: exactPerDay,
  };
}

function timingFromDays(days: number, startDate: Date): PlanTiming {
  const whole = Math.max(0, Math.ceil(days));
  return {
    days: whole,
    date: new Date(startDate.getTime() + whole * DAY_MS),
    weeks: Math.ceil(whole / PACE_PERIOD_DAYS.week),
    months: Math.ceil(whole / PACE_PERIOD_DAYS.month),
  };
}

/**
 * Whole days from the start to an ISO date, or null if it cannot be read.
 *
 * Both ends are taken at UTC midnight so a plan does not gain or lose a day
 * from the clock time the page happened to be rendered at.
 */
export function wholeDaysUntil(startDate: Date, isoDate: string): number | null {
  const target = Date.parse(`${isoDate.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(target)) return null;

  const start = Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate(),
  );
  return Math.round((target - start) / DAY_MS);
}

/** Re-exported so the planner UI reads rates the same way the engine does. */
export { getRate, minimumEarnedRobux };
