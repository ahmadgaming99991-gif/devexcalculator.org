import type { Translate } from "@/i18n/get-dictionary";
import Link from "next/link";
import { allRates, getRateValue, minimumEarnedRobux } from "@/lib/calculations/rate-registry";
import { legacyRateId, standardRateId, us18RateId } from "@/lib/calculations/devex";
import { Rational } from "@/lib/calculations/rational";
import { formatCurrency, formatDate, formatRate, formatRobux } from "@/lib/calculations/format";
import { approvedAmountValues, amountPageRoute } from "@/lib/content/amount-pages";
import { Badge, Table, TableWrapper, Td, Th } from "@/components/ui";
import { rateLabel, rateShortLabel, rateSummary } from "@/i18n/data-text";

/**
 * Server-rendered rate and conversion tables.
 *
 * These exist so the page's substance survives with JavaScript disabled: the
 * rates, the formula and worked examples are all in the initial HTML. The
 * calculator island adds live recalculation on top of content that already
 * stands on its own.
 *
 * Every figure here is computed through the same engine the calculator uses,
 * so a table and the tool can never disagree.
 */

// ---------------------------------------------------------------------------
// Rate table
// ---------------------------------------------------------------------------

export function RateTable({ showExamples = true,
  t,
}: { showExamples?: boolean;
  readonly t: Translate;
}) {
  return (
    <TableWrapper label={t("accessibility.tables.currentRates")}>
      <Table caption={t("accessibility.tables.currentRatesCaption")}>
        <thead>
          <tr>
            <Th>{t("common.columns.rate")}</Th>
            <Th numeric>{t("common.columns.perRobux")}</Th>
            <Th numeric>{t("common.columns.perAmount", { amount: formatRobux(1_000) })}</Th>
            {showExamples ? (
              <Th numeric>{t("common.columns.perAmount", { amount: formatRobux(30_000) })}</Th>
            ) : null}
            <Th>{t("common.units.appliesTo")}</Th>
          </tr>
        </thead>
        <tbody>
          {allRates.map((rate) => {
            const value = Rational.fromDecimalString(rate.usdPerRobux);
            return (
              <tr key={rate.id}>
                <Th scope="row">
                  <span className="font-semibold text-(--color-text)">{rateLabel(t, rate)}</span>
                  <span className="mt-1 block">
                    <Badge
                      tone={
                        rate.status === "active"
                          ? "success"
                          : rate.status === "conditional"
                            ? "info"
                            : "neutral"
                      }
                    >
                      {t(`common.rateStatus.${rate.status}`)}
                    </Badge>
                  </span>
                </Th>
                <Td numeric className="font-semibold">
                  ${formatRate(value)}
                </Td>
                <Td numeric>
                  {formatCurrency(value.mul(Rational.fromInt(1_000)), "USD")}
                </Td>
                {showExamples ? (
                  <Td numeric>
                    {formatCurrency(value.mul(Rational.fromInt(30_000)), "USD")}
                  </Td>
                ) : null}
                <Td className="text-(--color-text-muted)">
                  {rateSummary(t, rate)}
                  {rate.effectiveFrom ? (
                    <span className="mt-1 block text-xs">
                      {t("common.tables.effectiveFrom", {
                        effectiveFrom: formatDate(rate.effectiveFrom),
                      })}
                    </span>
                  ) : null}
                  {rate.effectiveTo ? (
                    <span className="mt-1 block text-xs">
                      {t("common.tables.legacyAppliesTo", {
                        effectiveTo: formatDate(rate.effectiveTo),
                      })}
                    </span>
                  ) : null}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </TableWrapper>
  );
}

// ---------------------------------------------------------------------------
// Amount table
// ---------------------------------------------------------------------------

/**
 * Common amounts converted at all three rates.
 *
 * The list runs below the minimum on purpose. A creator with 10,000 Earned
 * Robux searches for what it is worth, and the honest answer includes that it
 * cannot be cashed out yet — so the row is shown and flagged rather than hidden.
 *
 * Every amount here is one people actually search for, taken from the keyword
 * dataset rather than chosen for roundness. The short list this replaced held
 * thirteen of the seventy-one amounts with recorded demand, and the rationale
 * recorded against the other fifty-eight said they were "served by the
 * conversion hub" — which was not true of a hub that did not list them. One
 * table answers all of them without a page per number, which is the pattern the
 * specification rules out.
 */
const DEFAULT_AMOUNTS: readonly number[] = [
  // Below the 30,000 minimum: searched, and answerable, but not cashable.
  1, 25, 50, 150, 200, 250, 300, 600, 700, 800, 1_000, 1_200, 1_500, 2_000, 2_300, 2_400,
  2_500, 2_700, 3_000, 3_500, 4_000, 5_000, 6_000, 7_000, 8_000, 8_500, 9_000, 10_000,
  11_000, 12_000, 13_000, 14_000, 15_000, 17_000, 18_000, 20_000, 25_000,
  // At or above the minimum.
  30_000, 31_000, 35_000, 40_000, 48_000, 50_000, 60_000, 70_000, 75_000, 80_000, 90_000,
  100_000, 130_000, 150_000, 160_000, 200_000, 300_000, 400_000, 500_000, 1_000_000,
  1_500_000, 2_000_000, 3_000_000, 5_000_000, 7_000_000, 10_000_000, 14_000_000,
  18_000_000, 100_000_000, 200_000_000, 600_000_000, 1_000_000_000,
];

/*
 * Two searched amounts are deliberately absent: 3.6 billion and one trillion
 * Robux. The arithmetic would be correct and the rows would be nonsense — no
 * balance of that size exists — and a reference table that answers a joke with
 * a billion-dollar figure reads as unserious. The converter above handles any
 * amount typed into it, including those, so the answer is available without the
 * table claiming they are ordinary cases.
 */

export function AmountTable({
  amounts = DEFAULT_AMOUNTS,
  linkApproved = true,
  t,
}: {
  amounts?: readonly number[];
  linkApproved?: boolean;
  readonly t: Translate;
}) {
  const standard = getRateValue(standardRateId);
  const legacy = getRateValue(legacyRateId);
  const us18 = getRateValue(us18RateId);

  return (
    <TableWrapper label={t("accessibility.tables.commonAmounts")}>
      <Table caption={t("accessibility.tables.commonAmountsCaption")}>
        <thead>
          <tr>
            <Th>{t("common.columns.earnedRobux")}</Th>
            <Th numeric>{rateShortLabel(t, { id: standardRateId })}</Th>
            <Th numeric>{rateShortLabel(t, { id: legacyRateId })}</Th>
            <Th numeric>{rateShortLabel(t, { id: us18RateId })}</Th>
            <Th>{t("common.columns.minimum")}</Th>
          </tr>
        </thead>
        <tbody>
          {amounts.map((amount) => {
            const robux = Rational.fromInt(amount);
            const meetsMinimum = amount >= minimumEarnedRobux;
            const hasPage = linkApproved && approvedAmountValues.includes(amount);

            return (
              <tr key={amount}>
                <Th scope="row">
                  {hasPage ? (
                    <Link
                      href={amountPageRoute(amount)}
                      className="font-semibold text-(--color-primary) underline underline-offset-2"
                    >
                      {formatRobux(amount)}
                    </Link>
                  ) : (
                    <span className="font-semibold text-(--color-text)">
                      {formatRobux(amount)}
                    </span>
                  )}
                </Th>
                <Td numeric className="font-semibold">
                  {formatCurrency(robux.mul(standard), "USD")}
                </Td>
                <Td numeric className="text-(--color-text-muted)">
                  {formatCurrency(robux.mul(legacy), "USD")}
                </Td>
                <Td numeric className="text-(--color-text-muted)">
                  {formatCurrency(robux.mul(us18), "USD")}
                </Td>
                <Td>
                  {meetsMinimum ? (
                    <Badge tone="success">{t("common.badges.meetsMinimum")}</Badge>
                  ) : (
                    <Badge tone="warning">{t("common.badges.belowMinimum")}</Badge>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </TableWrapper>
  );
}

// ---------------------------------------------------------------------------
// Formula
// ---------------------------------------------------------------------------

/**
 * The calculation, stated openly.
 *
 * Showing the arithmetic is the difference between a tool a creator can check
 * and one they have to trust. It is also the clearest possible answer to
 * "how is this calculated", which is a real query in the keyword data.
 */
export function FormulaBlock({
  className,
  t,
}: {
  className?: string;
  readonly t: Translate;
}) {
  const standard = getRateValue(standardRateId);
  const example = Rational.fromInt(100_000).mul(standard);

  return (
    <div
      className={`rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4 ${className ?? ""}`}
    >
      <p className="text-sm font-semibold text-(--color-text)">
        {t("common.sections.theCalculation")}
      </p>
      <p className="numeric-display mt-2 text-sm text-(--color-text)">
        {t("common.tables.calculationFormula")}
      </p>
      <p className="numeric-display mt-2 text-sm text-(--color-text-muted)">
        100,000 × ${formatRate(standard)} = {formatCurrency(example, "USD")}
      </p>
      <p className="mt-3 text-sm text-(--color-text-muted)">
        {t("common.tables.prose.workingBackwards", {
          target: formatCurrency(Rational.fromInt(1_000), "USD"),
          required: formatRobux(Rational.fromInt(1_000).div(standard).ceilToBigInt()),
          shortfall: formatRobux(Rational.fromInt(1_000).div(standard).floorToBigInt()),
        })}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Requirements list
// ---------------------------------------------------------------------------

const devexRequirements = (t: Translate): readonly { title: string; detail: string }[] => [
  {
    title: `At least ${formatRobux(minimumEarnedRobux)} Earned Robux`,
    detail: t("rates.requirements.items.earnedOnly"),
  },
  {
    title: t("rates.requirements.items.minimumAgeTitle"),
    detail: t("rates.requirements.items.minimumAgeDetail"),
  },
  {
    title: t("rates.requirements.items.verifiedEmailTitle"),
    detail: t("rates.requirements.items.verifiedEmailDetail"),
  },
  {
    title: t("rates.requirements.items.portalAccountTitle"),
    detail: t("rates.requirements.items.portalAccountDetail"),
  },
  {
    title: t("rates.requirements.items.taxFormTitle"),
    detail: t("rates.requirements.items.taxFormDetail"),
  },
  {
    title: t("rates.requirements.items.complianceTitle"),
    detail: t("rates.requirements.items.complianceDetail"),
  },
];

export function RequirementsList({
  className,
  t,
}: {
  className?: string;
  readonly t: Translate;
}) {
  return (
    <ul className={`grid gap-3 sm:grid-cols-2 ${className ?? ""}`}>
      {devexRequirements(t).map((requirement) => (
        <li
          key={requirement.title}
          className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4"
        >
          <p className="font-semibold text-(--color-text)">{requirement.title}</p>
          <p className="mt-1 text-sm text-(--color-text-muted)">{requirement.detail}</p>
        </li>
      ))}
    </ul>
  );
}
