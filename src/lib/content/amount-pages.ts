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
      "{minimumRobux} is the amount that matters most, because it is the minimum Earned Robux balance Roblox requires before a DevEx request can be submitted at all. Below this figure the question is not what the payout would be but whether a request can be made.",
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

/* -------------------------------------------------------------------------
 * The other direction.
 *
 * Everything above answers "what is this Robux balance worth". These answer
 * "what balance does this payout need", which is the question a creator
 * planning a cash-out actually asks and which this site had no page for at
 * all: eight amount pages existed and every one of them ran Robux to dollars.
 * Search Console had already recorded the gap - `700 usd to robux`, with
 * nothing to land on.
 *
 * The DevEx minimum is what stops this being the first list mirrored. Roblox
 * requires 30,000 Earned Robux before a request can be submitted, which at the
 * standard rate is $114 - so every dollar target below $114 is unreachable as
 * a first payout, and a page about one has something true and specific to say
 * rather than a number substituted into a sentence. $100 is here for exactly
 * that reason.
 * ---------------------------------------------------------------------- */

export interface UsdPageDefinition {
  /** The payout target, in whole US dollars. */
  readonly amount: number;
  /** Original, amount-specific framing. Never templated boilerplate. */
  readonly context: string;
  /** Neighbouring approved targets, for meaningful sibling links. */
  readonly relatedAmounts: readonly number[];
}

export const APPROVED_USD_AMOUNTS: readonly UsdPageDefinition[] = [
  {
    amount: 100,
    context:
      "100 dollars is below the smallest payout the Developer Exchange can produce. The balance it corresponds to is under the {minimumRobux} Earned Robux Roblox requires before a request can be submitted at all, so the honest answer to this one is not a conversion but a threshold: the smallest first payout available is the value of the minimum balance itself.",
    relatedAmounts: [250, 500],
  },
  {
    amount: 250,
    context:
      "250 dollars is the first target on this list that a single cash-out can actually reach. It sits a little over twice the minimum balance, which is why it tends to be the figure a creator names once their experience has started earning steadily rather than occasionally.",
    relatedAmounts: [100, 500],
  },
  {
    amount: 500,
    context:
      "At 500 dollars the deductions stop being rounding errors. A payment-provider percentage and an income-tax estimate are worth entering rather than ignoring at this scale, which is why this page links directly to the fees and taxes guide instead of leaving the gross figure to stand alone.",
    relatedAmounts: [250, 1_000],
  },
  {
    amount: 1_000,
    context:
      "A thousand dollars is the round figure creators plan around. It is a little under nine times the smallest payout the programme can produce, which is the more useful way to read it: most creators arrive at this total over several cash-outs rather than holding one balance that covers it.",
    relatedAmounts: [500, 2_500],
  },
  {
    amount: 2_500,
    context:
      "2,500 dollars is past the point where one balance covers it comfortably for most creators, so the useful reading is not the single number but how many cash-out cycles it represents - it is more than twenty-one times the minimum balance.",
    relatedAmounts: [1_000, 5_000],
  },
  {
    amount: 5_000,
    context:
      "5,000 dollars is where the qualifying U.S. 18+ rate makes its largest difference on this list. The same five thousand dollars needs 389,864 fewer Earned Robux if the balance qualifies for that rate than if it is paid at the standard one - and Roblox, not the creator, decides which applies.",
    relatedAmounts: [2_500, 1_000],
  },
];

export const approvedUsdValues: readonly number[] = APPROVED_USD_AMOUNTS.map((a) => a.amount);

export function findUsdPage(amount: number): UsdPageDefinition | null {
  return APPROVED_USD_AMOUNTS.find((a) => a.amount === amount) ?? null;
}

export function usdPageSlug(amount: number): string {
  return `${amount}-usd-to-robux`;
}

export function usdPageRoute(amount: number): string {
  return `/conversions/${usdPageSlug(amount)}/`;
}

/** Parses a slug back to an approved dollar target, or null if not approved. */
export function parseUsdSlug(slug: string): number | null {
  const match = slug.match(/^(\d+)-usd-to-robux$/);
  if (!match || match[1] === undefined) return null;
  const amount = Number(match[1]);
  return approvedUsdValues.includes(amount) ? amount : null;
}

export interface UsdValues {
  readonly amount: number;
  /** The dollar target, formatted. */
  readonly display: string;
  /** Earned Robux needed at each rate, rounded up to a whole Robux. */
  readonly standardRobux: string;
  readonly legacyRobux: string;
  readonly us18Robux: string;
  /** How many more Robux the legacy rate costs for the same payout. */
  readonly legacyExtraRobux: string;
  /** How many fewer the qualifying U.S. 18+ rate needs. */
  readonly us18SavedRobux: string;
  /** Whether the standard-rate balance clears the documented minimum. */
  readonly clearsMinimum: boolean;
  /** The raw standard-rate requirement, for comparisons. */
  readonly standardRobuxValue: bigint;
}

/**
 * Every figure a payout-target page displays, through the shared engine.
 *
 * Rounded **up** at every rate, for the reason the calculator's target mode
 * rounds up: a balance one Robux short of the requirement does not pay the
 * target, so rounding to nearest would print a number that is sometimes wrong
 * in the direction that costs the reader money.
 */
export function computeUsdValues(amount: number): UsdValues {
  const usd = Rational.fromInt(amount);
  const standard = usd.div(getRateValue(standardRateId)).ceilToBigInt();
  const legacy = usd.div(getRateValue(legacyRateId)).ceilToBigInt();
  const us18 = usd.div(getRateValue(us18RateId)).ceilToBigInt();

  return {
    amount,
    display: formatCurrency(DISPLAY_LOCALE, usd, "USD"),
    standardRobux: formatRobux(DISPLAY_LOCALE, standard),
    legacyRobux: formatRobux(DISPLAY_LOCALE, legacy),
    us18Robux: formatRobux(DISPLAY_LOCALE, us18),
    legacyExtraRobux: formatRobux(DISPLAY_LOCALE, legacy - standard),
    us18SavedRobux: formatRobux(DISPLAY_LOCALE, standard - us18),
    clearsMinimum: standard >= BigInt(minimumEarnedRobux),
    standardRobuxValue: standard,
  };
}

/* -------------------------------------------------------------------------
 * One slug space, two directions.
 *
 * Both page types live under `/conversions/[slug]/`, so the route has to be
 * able to say which one a slug is without either page file knowing about the
 * other. These three functions are that answer, and they exist so the English
 * and localized route files stay identical to each other - the previous shape
 * had the approved list named twice, once per file, which is one edit away
 * from a locale serving a different set of pages than English does.
 * ---------------------------------------------------------------------- */

export type ConversionDirection = "robux-to-usd" | "usd-to-robux";

export interface ResolvedConversion {
  readonly direction: ConversionDirection;
  readonly amount: number;
  readonly route: string;
}

/** Every approved slug, in both directions. */
export function allConversionSlugs(): readonly string[] {
  return [
    ...APPROVED_AMOUNTS.map((definition) => amountPageSlug(definition.amount)),
    ...APPROVED_USD_AMOUNTS.map((definition) => usdPageSlug(definition.amount)),
  ];
}

/** Which page a slug names, or null when it names none. */
export function resolveConversionSlug(slug: string): ResolvedConversion | null {
  const robux = parseAmountSlug(slug);
  if (robux !== null) {
    return { direction: "robux-to-usd", amount: robux, route: amountPageRoute(robux) };
  }
  const usd = parseUsdSlug(slug);
  if (usd !== null) {
    return { direction: "usd-to-robux", amount: usd, route: usdPageRoute(usd) };
  }
  return null;
}
