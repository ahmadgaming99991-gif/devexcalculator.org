import { Rational } from "@/lib/calculations/rational";
import { DISPLAY_LOCALE, formatCurrency, formatRobux } from "@/lib/calculations/format";
import { getRateValue, minimumEarnedRobux } from "@/lib/calculations/rate-registry";
import { legacyRateId, standardRateId, us18RateId } from "@/lib/calculations/devex";

/**
 * The curated set of standalone amount pages.
 *
 * These are the only numeric amounts with their own indexable route. Every
 * other amount from the keyword data is served by the conversion hub or by
 * calculator query state. The list is deliberately short and manually
 * approved in seo/overrides/publication-overrides.json; it is not generated
 * from demand alone, because a page per number is exactly the scaled-content
 * pattern the specification forbids.
 *
 * Each entry carries its own context sentence. That sentence is the reason the
 * page exists: it says something true about that specific amount that the hub
 * does not say, so the page is not one number substituted into a template.
 */

export interface AmountPageDefinition {
  readonly amount: number;
  /** Original, amount-specific framing. Never templated boilerplate. */
  readonly context: string;
  /** Neighbouring approved amounts, for meaningful sibling links. */
  readonly relatedAmounts: readonly number[];
}

export const APPROVED_AMOUNTS: readonly AmountPageDefinition[] = [
  {
    amount: 30_000,
    context:
      "30,000 is the amount that matters most, because it is the minimum Earned Robux balance Roblox requires before a DevEx request can be submitted at all. Below this figure the question is not what the payout would be but whether a request can be made.",
    relatedAmounts: [50_000, 100_000],
  },
  {
    amount: 50_000,
    context:
      "50,000 Earned Robux clears the minimum with room to spare, so it is a common first cash-out for a creator whose experience has just started earning consistently.",
    relatedAmounts: [30_000, 100_000],
  },
  {
    amount: 100_000,
    context:
      "100,000 is the most searched round figure in this range, and it is the point where the gap between the current and legacy rates becomes large enough to notice: thirty dollars separates them.",
    relatedAmounts: [50_000, 200_000],
  },
  {
    amount: 200_000,
    context:
      "At 200,000 Earned Robux a creator is usually cashing out on a schedule rather than as a one-off, which makes the difference between rate buckets worth tracking rather than estimating.",
    relatedAmounts: [100_000, 300_000],
  },
  {
    amount: 300_000,
    context:
      "300,000 Earned Robux is ten times the DevEx minimum. It is a useful reference point for a creator working out how many cash-out cycles a year of earnings represents.",
    relatedAmounts: [200_000, 500_000],
  },
  {
    amount: 500_000,
    context:
      "Half a million Earned Robux is the scale at which payment-provider fees and personal tax obligations stop being rounding errors, which is why this page links directly to the fees and taxes guide.",
    relatedAmounts: [300_000, 1_000_000],
  },
  {
    amount: 1_000_000,
    context:
      "A million Robux is the headline milestone creators actually search for, and it is the clearest illustration of why purchase price and DevEx payout are not the same number.",
    relatedAmounts: [500_000, 10_000_000],
  },
  {
    amount: 10_000_000,
    context:
      "Ten million Earned Robux represents sustained earnings from a large experience. At this scale the split between standard and legacy balances, and any qualifying U.S. 18+ portion, changes the total by thousands of dollars.",
    relatedAmounts: [1_000_000, 500_000],
  },
];

export const approvedAmountValues: readonly number[] = APPROVED_AMOUNTS.map((a) => a.amount);

export function findAmountPage(amount: number): AmountPageDefinition | null {
  return APPROVED_AMOUNTS.find((a) => a.amount === amount) ?? null;
}

export function amountPageSlug(amount: number): string {
  return `${amount}-robux-to-usd`;
}

export function amountPageRoute(amount: number): string {
  return `/conversions/${amountPageSlug(amount)}/`;
}

/** Parses a slug back to an approved amount, or null if it is not approved. */
export function parseAmountSlug(slug: string): number | null {
  const match = slug.match(/^(\d+)-robux-to-usd$/);
  if (!match || match[1] === undefined) return null;
  const amount = Number(match[1]);
  return approvedAmountValues.includes(amount) ? amount : null;
}

export interface AmountValues {
  readonly amount: number;
  readonly display: string;
  readonly standardUsd: string;
  readonly legacyUsd: string;
  readonly us18Usd: string;
  readonly standardVsLegacyUsd: string;
  readonly meetsMinimum: boolean;
  readonly multipleOfMinimum: string;
}

/** Computes every figure an amount page displays, through the shared engine. */
export function computeAmountValues(amount: number): AmountValues {
  const robux = Rational.fromInt(amount);
  const standard = robux.mul(getRateValue(standardRateId));
  const legacy = robux.mul(getRateValue(legacyRateId));
  const us18 = robux.mul(getRateValue(us18RateId));

  return {
    amount,
    display: formatRobux(DISPLAY_LOCALE, amount),
    standardUsd: formatCurrency(DISPLAY_LOCALE, standard, "USD"),
    legacyUsd: formatCurrency(DISPLAY_LOCALE, legacy, "USD"),
    us18Usd: formatCurrency(DISPLAY_LOCALE, us18, "USD"),
    standardVsLegacyUsd: formatCurrency(DISPLAY_LOCALE, standard.sub(legacy), "USD"),
    meetsMinimum: amount >= minimumEarnedRobux,
    multipleOfMinimum: robux
      .div(Rational.fromInt(minimumEarnedRobux))
      .toFixed(1, "half-up"),
  };
}
