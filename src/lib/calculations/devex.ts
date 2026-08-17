import type { RateRecord } from "@/types/rates";
import { Rational } from "./rational";
import {
  allRates,
  getRate,
  getRateValue,
  minimumEarnedRobux,
  rateRegistry,
} from "./rate-registry";

/**
 * The DevEx calculation engine.
 *
 * Framework-independent and side-effect free. Every formula the site displays
 * lives here exactly once; React components read results from these functions
 * and never re-implement arithmetic. Formulas are documented in
 * docs/calculation-methodology.md and pinned by tests in
 * tests/unit/calculations/.
 */

const HUNDRED = Rational.fromInt(100);

// ---------------------------------------------------------------------------
// Threshold
// ---------------------------------------------------------------------------

/**
 * Where an amount sits relative to the documented minimum.
 *
 * `meets-minimum` deliberately does NOT mean "eligible". Roblox decides
 * eligibility; a number on this page cannot. The UI must never render this
 * state as approval.
 */
export type ThresholdState = "empty" | "below-minimum" | "meets-minimum";

export interface ThresholdStatus {
  readonly state: ThresholdState;
  readonly minimumRobux: number;
  /** Robux still required to reach the minimum; 0 once the minimum is met. */
  readonly shortfallRobux: bigint;
  /** Progress toward the minimum, clamped to 0–100 for meter rendering. */
  readonly progressPercent: number;
  /** True in every non-empty state: the numeric threshold is not approval. */
  readonly subjectToOfficialReview: boolean;
}

export function evaluateThreshold(totalRobux: bigint): ThresholdStatus {
  const minimum = BigInt(minimumEarnedRobux);

  if (totalRobux <= 0n) {
    return {
      state: "empty",
      minimumRobux: minimumEarnedRobux,
      shortfallRobux: minimum,
      progressPercent: 0,
      subjectToOfficialReview: true,
    };
  }

  const meets = totalRobux >= minimum;
  const progress = Rational.of(totalRobux * 100n, minimum);

  return {
    state: meets ? "meets-minimum" : "below-minimum",
    minimumRobux: minimumEarnedRobux,
    shortfallRobux: meets ? 0n : minimum - totalRobux,
    progressPercent: Math.min(100, Number(progress.toFixed(2, "floor"))),
    subjectToOfficialReview: true,
  };
}

// ---------------------------------------------------------------------------
// Quick mode
// ---------------------------------------------------------------------------

export interface QuickInput {
  readonly robux: bigint;
  readonly rateId: string;
}

export interface QuickResult {
  readonly robux: bigint;
  readonly rate: RateRecord;
  readonly rateValue: Rational;
  readonly grossUsd: Rational;
  readonly threshold: ThresholdStatus;
}

/** `grossUsd = robux x rate` */
export function calculateQuick(input: QuickInput): QuickResult {
  const rate = getRate(input.rateId);
  const rateValue = Rational.fromDecimalString(rate.usdPerRobux);
  const robux = input.robux < 0n ? 0n : input.robux;

  return {
    robux,
    rate,
    rateValue,
    grossUsd: Rational.of(robux, 1n).mul(rateValue),
    threshold: evaluateThreshold(robux),
  };
}

// ---------------------------------------------------------------------------
// Advanced split mode
// ---------------------------------------------------------------------------

export interface SplitBuckets {
  readonly standardRobux: bigint;
  readonly legacyRobux: bigint;
  readonly us18Robux: bigint;
}

export interface FeeAndTaxInput {
  /** Payment-provider percentage fee applied to the gross payout. */
  readonly feePercent: Rational;
  /** Flat per-payout fee in USD. */
  readonly flatFeeUsd: Rational;
  /** User's own tax estimate. This site gives no tax advice. */
  readonly taxPercent: Rational;
}

export const NO_FEES: FeeAndTaxInput = {
  feePercent: Rational.ZERO,
  flatFeeUsd: Rational.ZERO,
  taxPercent: Rational.ZERO,
};

export interface BucketBreakdown {
  readonly rate: RateRecord;
  readonly robux: bigint;
  readonly rateValue: Rational;
  readonly usd: Rational;
  /** Share of the gross payout, 0 when the gross is zero. */
  readonly shareOfGrossPercent: Rational;
}

export interface SplitResult {
  readonly buckets: readonly BucketBreakdown[];
  readonly totalRobux: bigint;
  readonly grossUsd: Rational;
  /** Weighted average USD per Robux across the entered buckets. */
  readonly blendedRateUsdPerRobux: Rational;
  /** What the same total would pay at the standard rate alone. */
  readonly standardOnlyUsd: Rational;
  readonly differenceVsStandardOnlyUsd: Rational;
  readonly percentageFeeUsd: Rational;
  readonly flatFeeUsd: Rational;
  readonly netBeforeTaxUsd: Rational;
  readonly estimatedTaxUsd: Rational;
  readonly netAfterEstimateUsd: Rational;
  readonly threshold: ThresholdStatus;
  readonly feesApplied: boolean;
  readonly taxApplied: boolean;
}

const SPLIT_RATE_IDS = {
  standard: "standard-current",
  legacy: "legacy-pre-2025-09-05",
  us18: "us-18-plus-qualified",
} as const;

/**
 * Advanced split calculation.
 *
 * Each bucket is a separate user-entered amount, so the same Robux can never
 * be counted under two rates: the engine has no path that reuses one input
 * across buckets. The caller is responsible for classifying their own balance,
 * which the UI states explicitly.
 */
export function calculateSplit(
  buckets: SplitBuckets,
  fees: FeeAndTaxInput = NO_FEES,
): SplitResult {
  const entries: Array<{ rateId: string; robux: bigint }> = [
    { rateId: SPLIT_RATE_IDS.standard, robux: nonNegative(buckets.standardRobux) },
    { rateId: SPLIT_RATE_IDS.legacy, robux: nonNegative(buckets.legacyRobux) },
    { rateId: SPLIT_RATE_IDS.us18, robux: nonNegative(buckets.us18Robux) },
  ];

  let grossUsd = Rational.ZERO;
  let totalRobux = 0n;

  const partial = entries.map((entry) => {
    const rate = getRate(entry.rateId);
    const rateValue = Rational.fromDecimalString(rate.usdPerRobux);
    const usd = Rational.of(entry.robux, 1n).mul(rateValue);
    grossUsd = grossUsd.add(usd);
    totalRobux += entry.robux;
    return { rate, rateValue, robux: entry.robux, usd };
  });

  const bucketList: BucketBreakdown[] = partial.map((bucket) => ({
    ...bucket,
    shareOfGrossPercent: grossUsd.isZero()
      ? Rational.ZERO
      : bucket.usd.div(grossUsd).mul(HUNDRED),
  }));

  // Fees, then tax on the post-fee amount, matching the documented order.
  const percentageFeeUsd = grossUsd.mul(fees.feePercent).div(HUNDRED);
  const flatFeeUsd = fees.flatFeeUsd.clampNonNegative();
  const netBeforeTaxUsd = grossUsd.sub(percentageFeeUsd).sub(flatFeeUsd).clampNonNegative();
  const estimatedTaxUsd = netBeforeTaxUsd.mul(fees.taxPercent).div(HUNDRED).clampNonNegative();
  const netAfterEstimateUsd = netBeforeTaxUsd.sub(estimatedTaxUsd).clampNonNegative();

  const standardRateValue = getRateValue(SPLIT_RATE_IDS.standard);
  const standardOnlyUsd = Rational.of(totalRobux, 1n).mul(standardRateValue);

  return {
    buckets: bucketList,
    totalRobux,
    grossUsd,
    blendedRateUsdPerRobux:
      totalRobux === 0n ? Rational.ZERO : grossUsd.div(Rational.of(totalRobux, 1n)),
    standardOnlyUsd,
    differenceVsStandardOnlyUsd: grossUsd.sub(standardOnlyUsd),
    percentageFeeUsd,
    flatFeeUsd,
    netBeforeTaxUsd,
    estimatedTaxUsd,
    netAfterEstimateUsd,
    threshold: evaluateThreshold(totalRobux),
    feesApplied: !fees.feePercent.isZero() || !flatFeeUsd.isZero(),
    taxApplied: !fees.taxPercent.isZero(),
  };
}

function nonNegative(value: bigint): bigint {
  return value < 0n ? 0n : value;
}

// ---------------------------------------------------------------------------
// Reverse target mode
// ---------------------------------------------------------------------------

export interface TargetInput {
  /** Desired payout in USD. */
  readonly targetUsd: Rational;
  readonly rateId: string;
  /** Optional current balance, used to show progress toward the target. */
  readonly currentRobux?: bigint;
}

export interface TargetResult {
  readonly targetUsd: Rational;
  readonly rate: RateRecord;
  readonly rateValue: Rational;
  /** Whole Robux required, always rounded up — a partial Robux cannot exist. */
  readonly requiredRobux: bigint;
  /** Exact unrounded requirement, kept so the UI can explain the rounding. */
  readonly exactRequiredRobux: Rational;
  /** USD actually produced by `requiredRobux`, i.e. slightly above target. */
  readonly payoutAtRequiredRobux: Rational;
  /** How the requirement compares with the documented minimum. */
  readonly minimumRobux: number;
  readonly requirementIsBelowMinimum: boolean;
  readonly effectiveRobuxNeeded: bigint;
  /** Progress fields, present only when a current balance was supplied. */
  readonly currentRobux: bigint | null;
  readonly remainingRobux: bigint | null;
  readonly progressPercent: number | null;
}

/** `requiredRobux = ceil(targetUsd / rate)` */
export function calculateTarget(input: TargetInput): TargetResult {
  const rate = getRate(input.rateId);
  const rateValue = Rational.fromDecimalString(rate.usdPerRobux);
  const targetUsd = input.targetUsd.clampNonNegative();

  const exact = targetUsd.div(rateValue);
  const requiredRobux = exact.ceilToBigInt();

  const minimum = BigInt(minimumEarnedRobux);
  const requirementIsBelowMinimum = requiredRobux < minimum;
  // A creator cannot cash out below the minimum, so the amount they actually
  // need is whichever is larger.
  const effectiveRobuxNeeded = requirementIsBelowMinimum ? minimum : requiredRobux;

  const current = input.currentRobux ?? null;
  const hasCurrent = current !== null && current >= 0n;

  return {
    targetUsd,
    rate,
    rateValue,
    requiredRobux,
    exactRequiredRobux: exact,
    payoutAtRequiredRobux: Rational.of(requiredRobux, 1n).mul(rateValue),
    minimumRobux: minimumEarnedRobux,
    requirementIsBelowMinimum,
    effectiveRobuxNeeded,
    currentRobux: hasCurrent ? current : null,
    remainingRobux: hasCurrent
      ? current >= effectiveRobuxNeeded
        ? 0n
        : effectiveRobuxNeeded - current
      : null,
    progressPercent: hasCurrent
      ? effectiveRobuxNeeded === 0n
        ? 100
        : Math.min(
            100,
            Number(Rational.of(current * 100n, effectiveRobuxNeeded).toFixed(2, "floor")),
          )
      : null,
  };
}

// ---------------------------------------------------------------------------
// Comparison mode
// ---------------------------------------------------------------------------

export interface ComparisonRow {
  readonly rate: RateRecord;
  readonly rateValue: Rational;
  readonly usd: Rational;
  /** USD difference against the standard rate. */
  readonly differenceVsStandardUsd: Rational;
  /** Percentage difference against the standard rate. */
  readonly differenceVsStandardPercent: Rational;
  readonly isBaseline: boolean;
}

export interface ComparisonResult {
  readonly robux: bigint;
  readonly rows: readonly ComparisonRow[];
  readonly baselineRateId: string;
}

/**
 * Values the same amount under every documented rate.
 *
 * This is presented as "what each rate would pay", never as a menu. Roblox
 * decides which rate applies to which portion of a balance.
 */
export function calculateComparison(robux: bigint): ComparisonResult {
  const amount = nonNegative(robux);
  const baselineRateId = SPLIT_RATE_IDS.standard;
  const baselineValue = getRateValue(baselineRateId);
  const baselineUsd = Rational.of(amount, 1n).mul(baselineValue);

  const rows = allRates
    .filter((rate) => rate.status !== "retired")
    .map<ComparisonRow>((rate) => {
      const rateValue = Rational.fromDecimalString(rate.usdPerRobux);
      const usd = Rational.of(amount, 1n).mul(rateValue);
      const difference = usd.sub(baselineUsd);
      return {
        rate,
        rateValue,
        usd,
        differenceVsStandardUsd: difference,
        differenceVsStandardPercent: baselineUsd.isZero()
          ? // With no amount entered, compare the rates themselves so the table
            // is still informative before the user types anything.
            baselineValue.isZero()
            ? Rational.ZERO
            : rateValue.sub(baselineValue).div(baselineValue).mul(HUNDRED)
          : difference.div(baselineUsd).mul(HUNDRED),
        isBaseline: rate.id === baselineRateId,
      };
    });

  return { robux: amount, rows, baselineRateId };
}

// ---------------------------------------------------------------------------
// Local currency
// ---------------------------------------------------------------------------

/** `localValue = usdValue x usdToTargetRate` */
export function convertUsd(usd: Rational, usdToTargetRate: Rational): Rational {
  return usd.mul(usdToTargetRate);
}

// ---------------------------------------------------------------------------
// Registry re-exports used across the calculator UI
// ---------------------------------------------------------------------------

export { minimumEarnedRobux, rateRegistry };
export const standardRateId = SPLIT_RATE_IDS.standard;
export const legacyRateId = SPLIT_RATE_IDS.legacy;
export const us18RateId = SPLIT_RATE_IDS.us18;
