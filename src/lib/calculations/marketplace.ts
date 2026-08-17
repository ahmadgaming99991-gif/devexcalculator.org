import type { MarketplaceScheme } from "@/types/rates";
import { Rational } from "./rational";
import { getMarketplaceScheme, rateRegistry } from "./rate-registry";

/**
 * Roblox platform fee ("Robux tax") calculations.
 *
 * This is a separate product from DevEx and the two are never chained
 * automatically: the platform fee applies when Robux are earned, DevEx applies
 * when Earned Robux are converted to cash. Combining them silently would
 * misstate both. See docs/calculation-methodology.md § Marketplace fees.
 */

const HUNDRED = Rational.fromInt(100);

export const marketplaceSchemes: readonly MarketplaceScheme[] =
  rateRegistry.marketplace.schemes;

export const defaultSchemeId = "in-experience";

export interface AfterFeeResult {
  readonly scheme: MarketplaceScheme;
  readonly grossRobux: bigint;
  readonly creatorSharePercent: Rational;
  readonly platformSharePercent: Rational;
  /** Robux the creator keeps. Rounded DOWN — Roblox pays whole Robux. */
  readonly creatorRobux: bigint;
  /** Exact unrounded share, retained so the UI can explain the rounding. */
  readonly exactCreatorRobux: Rational;
  readonly platformRobux: bigint;
  /** Present only for the avatar-item-in-experience scheme. */
  readonly experienceOwnerRobux: bigint | null;
  /** Which progressive tier applied, when the scheme is progressive. */
  readonly appliedTierMultiple: string | null;
}

/**
 * Resolves the creator share for a scheme.
 *
 * For the progressive Marketplace scheme the share depends on the item's price
 * expressed as a multiple of the applicable price floor. The floor differs by
 * item category, so it is a caller-supplied value rather than a constant.
 */
function resolveCreatorShare(
  scheme: MarketplaceScheme,
  priceFloorMultiple: Rational | null,
): { percent: Rational; tierMultiple: string | null } {
  if (!scheme.progressive || !scheme.progressiveTiers || priceFloorMultiple === null) {
    return {
      percent: Rational.fromDecimalString(scheme.creatorSharePercent),
      tierMultiple: null,
    };
  }

  // Walk the tiers and keep the highest one the price actually reaches.
  let applied = scheme.progressiveTiers[0];
  for (const tier of scheme.progressiveTiers) {
    if (priceFloorMultiple.gte(Rational.fromDecimalString(tier.priceFloorMultiple))) {
      applied = tier;
    } else {
      break;
    }
  }

  if (!applied) {
    return {
      percent: Rational.fromDecimalString(scheme.creatorSharePercent),
      tierMultiple: null,
    };
  }

  return {
    percent: Rational.fromDecimalString(applied.creatorSharePercent),
    tierMultiple: applied.priceFloorMultiple,
  };
}

export interface AfterFeeInput {
  readonly grossRobux: bigint;
  readonly schemeId: string;
  /** Item price as a multiple of the price floor; progressive schemes only. */
  readonly priceFloorMultiple?: Rational | null;
}

/** How much of a sale price the creator keeps after the platform fee. */
export function calculateAfterFee(input: AfterFeeInput): AfterFeeResult {
  const scheme = getMarketplaceScheme(input.schemeId);
  const grossRobux = input.grossRobux < 0n ? 0n : input.grossRobux;
  const { percent, tierMultiple } = resolveCreatorShare(
    scheme,
    input.priceFloorMultiple ?? null,
  );

  const gross = Rational.of(grossRobux, 1n);
  const exactCreatorRobux = gross.mul(percent).div(HUNDRED);
  // Round down: a creator should never see a payout figure they cannot receive.
  const creatorRobux = exactCreatorRobux.floorToBigInt();

  const experienceOwnerRobux =
    scheme.experienceOwnerSharePercent !== undefined
      ? gross
          .mul(Rational.fromDecimalString(scheme.experienceOwnerSharePercent))
          .div(HUNDRED)
          .floorToBigInt()
      : null;

  const platformRobux =
    grossRobux - creatorRobux - (experienceOwnerRobux === null ? 0n : experienceOwnerRobux);

  return {
    scheme,
    grossRobux,
    creatorSharePercent: percent,
    platformSharePercent: HUNDRED.sub(percent),
    creatorRobux,
    exactCreatorRobux,
    platformRobux,
    experienceOwnerRobux,
    appliedTierMultiple: tierMultiple,
  };
}

export interface BeforeFeeResult {
  readonly scheme: MarketplaceScheme;
  readonly targetNetRobux: bigint;
  readonly creatorSharePercent: Rational;
  /** Listing price needed. Rounded UP so the creator always clears the target. */
  readonly requiredGrossRobux: bigint;
  readonly exactRequiredGrossRobux: Rational;
  /** What the creator actually nets at `requiredGrossRobux`. */
  readonly actualNetRobux: bigint;
  readonly appliedTierMultiple: string | null;
}

export interface BeforeFeeInput {
  readonly targetNetRobux: bigint;
  readonly schemeId: string;
  readonly priceFloorMultiple?: Rational | null;
}

/**
 * The listing price required to clear a target net amount.
 * `requiredGross = ceil(targetNet / creatorShare)`
 */
export function calculateBeforeFee(input: BeforeFeeInput): BeforeFeeResult {
  const scheme = getMarketplaceScheme(input.schemeId);
  const targetNetRobux = input.targetNetRobux < 0n ? 0n : input.targetNetRobux;
  const { percent, tierMultiple } = resolveCreatorShare(
    scheme,
    input.priceFloorMultiple ?? null,
  );

  if (percent.isZero()) {
    return {
      scheme,
      targetNetRobux,
      creatorSharePercent: percent,
      requiredGrossRobux: 0n,
      exactRequiredGrossRobux: Rational.ZERO,
      actualNetRobux: 0n,
      appliedTierMultiple: tierMultiple,
    };
  }

  const exact = Rational.of(targetNetRobux, 1n).mul(HUNDRED).div(percent);
  const requiredGrossRobux = exact.ceilToBigInt();
  const actualNetRobux = Rational.of(requiredGrossRobux, 1n)
    .mul(percent)
    .div(HUNDRED)
    .floorToBigInt();

  return {
    scheme,
    targetNetRobux,
    creatorSharePercent: percent,
    requiredGrossRobux,
    exactRequiredGrossRobux: exact,
    actualNetRobux,
    appliedTierMultiple: tierMultiple,
  };
}
