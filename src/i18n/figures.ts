import { formatCurrency, formatDecimal, formatRate, formatRobux } from "@/lib/calculations/format";
import { getRateValue, minimumEarnedRobux } from "@/lib/calculations/rate-registry";
import { Rational } from "@/lib/calculations/rational";

/**
 * The published figures, computed from the registry, written the way this
 * language writes a number.
 *
 * **Why this exists.** Forty-five strings in the English catalog stated a rate
 * as literal text, and twenty-one of those also stated a figure *derived* from
 * it: `0.0038` and, in the same sentence, `114 USD per 30,000`. Translating
 * them copied both into six more files. That is 45 × 7 places a rate lives and
 * 21 × 7 places its arithmetic lives, and none of them move when the registry
 * does. A rate change would leave the calculator right and the prose around it
 * wrong — the same sentence telling a reader two different numbers.
 *
 * Grepping for the old rate would not have found it either. `263,157.89` is
 * `1000 ÷ 0.0038`; nothing in that string contains `0.0038`, so a search for
 * the figure that changed returns nothing and the quotient stays stale
 * silently. Tokenising the rate alone would have been a half-fix for exactly
 * that reason.
 *
 * So every one of these is derived here, once, from `rateRegistry`, and the
 * catalogs carry `{rateStandard}` and `{payout30000}` instead of digits. A
 * rate change is a one-line edit to `src/data/rates.json` and every sentence
 * on the site follows it, in seven languages.
 *
 * **Why it is merged into the translator rather than passed by callers.** A
 * token supplied at the call site is a token some other call site forgets. The
 * strings that carry these figures are read from four places — `t()`, the
 * route record, the page metadata, the registry prose — and a figure that
 * resolves on the page but not in the `<title>` is worse than one that never
 * resolved at all, because only one of the two is visible.
 *
 * **What is not here.** Operands a reader chose rather than the registry did —
 * the 1,000-dollar target, the 17,000 Robux in the floating-point example —
 * are the author's illustration and do not go stale when a rate moves. They
 * stay as translated text. What *is* derived from them is here, because the
 * quotient does move.
 */

/** The amounts with a conversion page of their own. */
const CONVERSION_AMOUNTS = [
  30_000, 50_000, 100_000, 200_000, 300_000, 500_000, 1_000_000, 10_000_000,
] as const;

/** The dollar target `/usd-to-robux/` works through. */
const USD_TARGET = 1_000;

const STANDARD = "standard-current";
const LEGACY = "legacy-pre-2025-09-05";
const US_18_PLUS = "us-18-plus-qualified";

function payout(amount: number, rateId: string): Rational {
  return Rational.fromInt(amount).mul(getRateValue(rateId));
}

/**
 * Computed per call rather than cached per locale.
 *
 * The registry is read at module load and the arithmetic is a few dozen
 * `BigInt` operations, so this is cheaper than the cache invalidation it would
 * need to stay correct across a rate change in a long-lived Worker isolate.
 */
export function figures(locale: string): Readonly<Record<string, string>> {
  const standard = getRateValue(STANDARD);
  const legacy = getRateValue(LEGACY);
  const us18 = getRateValue(US_18_PLUS);

  const values: Record<string, string> = {
    // The rates themselves.
    rateStandard: formatRate(locale, standard),
    rateLegacy: formatRate(locale, legacy),
    rateUs18: formatRate(locale, us18),

    // The same rates stated per thousand, which is how Roblox publishes them.
    rateStandardPerThousand: formatCurrency(locale, standard.mul(Rational.fromInt(1000)), "USD", {
      showSymbol: false,
    }),
    rateLegacyPerThousand: formatCurrency(locale, legacy.mul(Rational.fromInt(1000)), "USD", {
      showSymbol: false,
    }),
    rateUs18PerThousand: formatCurrency(locale, us18.mul(Rational.fromInt(1000)), "USD", {
      showSymbol: false,
    }),

    minimumRobux: formatRobux(locale, minimumEarnedRobux),
  };

  for (const amount of CONVERSION_AMOUNTS) {
    const atStandard = payout(amount, STANDARD);
    const atLegacy = payout(amount, LEGACY);

    values[`robux${amount}`] = formatRobux(locale, amount);
    // With the symbol, for the sentences that write "$114.00" …
    values[`payout${amount}`] = formatCurrency(locale, atStandard, "USD");
    values[`payoutLegacy${amount}`] = formatCurrency(locale, atLegacy, "USD");
    values[`payoutDifference${amount}`] = formatCurrency(locale, atStandard.sub(atLegacy), "USD");
    // … and without, for the ones that write "about 114 US dollars".
    values[`payout${amount}Plain`] = formatCurrency(locale, atStandard, "USD", {
      showSymbol: false,
      maximumFractionDigits: 0,
    });
    values[`payoutLegacy${amount}Plain`] = formatCurrency(locale, atLegacy, "USD", {
      showSymbol: false,
      maximumFractionDigits: 0,
    });
  }

  /*
   * The payout-target arithmetic on `/usd-to-robux/`.
   *
   * All three come from one division and the page explains why they differ, so
   * they have to be computed together or the explanation stops matching the
   * numbers: the exact quotient, the whole number below it that falls short,
   * and the rounded-up figure that clears the target.
   */
  const exact = Rational.fromInt(USD_TARGET).div(standard);
  const up = exact.ceilToBigInt();
  const down = up - 1n;

  values.targetUsd = formatCurrency(locale, Rational.fromInt(USD_TARGET), "USD", {
    showSymbol: false,
    maximumFractionDigits: 0,
  });
  values.targetRobuxExact = formatDecimal(locale, Number(exact.toFixed(2, "half-up")), 2);
  values.targetRobuxUp = formatRobux(locale, up);
  values.targetRobuxDown = formatRobux(locale, down);
  values.targetPayoutUp = formatCurrency(locale, Rational.fromInt(up).mul(standard), "USD");
  values.targetPayoutDown = formatCurrency(locale, Rational.fromInt(down).mul(standard), "USD");

  return values;
}

/**
 * Fills the registry figures into one string.
 *
 * Separate from `interpolate` so the merge order is stated in one place:
 * caller-supplied values win, because a page rendering a reader's own amount
 * must not have it replaced by a published one that happens to share a token
 * name.
 */
export function withFigures(
  locale: string,
  values?: Readonly<Record<string, string | number>>,
): Readonly<Record<string, string | number>> {
  return values === undefined ? figures(locale) : { ...figures(locale), ...values };
}
