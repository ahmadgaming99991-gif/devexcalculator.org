import Link from "next/link";
import { allRates, getRateValue, minimumEarnedRobux } from "@/lib/calculations/rate-registry";
import { legacyRateId, standardRateId, us18RateId } from "@/lib/calculations/devex";
import { Rational } from "@/lib/calculations/rational";
import { formatCurrency, formatDate, formatRate, formatRobux } from "@/lib/calculations/format";
import { approvedAmountValues, amountPageRoute } from "@/lib/content/amount-pages";
import { Badge, Table, TableWrapper, Td, Th } from "@/components/ui";

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

export function RateTable({ showExamples = true }: { showExamples?: boolean }) {
  return (
    <TableWrapper label="Current DevEx rates with effective dates">
      <Table caption="DevEx rates documented by Roblox, with effective dates and worked examples">
        <thead>
          <tr>
            <Th>Rate</Th>
            <Th numeric>Per Robux</Th>
            <Th numeric>Per 1,000</Th>
            {showExamples ? <Th numeric>Per 30,000</Th> : null}
            <Th>Applies to</Th>
          </tr>
        </thead>
        <tbody>
          {allRates.map((rate) => {
            const value = Rational.fromDecimalString(rate.usdPerRobux);
            return (
              <tr key={rate.id}>
                <Th scope="row">
                  <span className="font-semibold text-[--color-text]">{rate.label}</span>
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
                      {rate.status === "active"
                        ? "Current"
                        : rate.status === "conditional"
                          ? "Conditional"
                          : "Legacy"}
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
                <Td className="text-[--color-text-muted]">
                  {rate.eligibilitySummary}
                  {rate.effectiveFrom ? (
                    <span className="mt-1 block text-xs">
                      From {formatDate(rate.effectiveFrom)}.
                    </span>
                  ) : null}
                  {rate.effectiveTo ? (
                    <span className="mt-1 block text-xs">
                      Balances earned before {formatDate(rate.effectiveTo)}.
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
 * The default list runs below the minimum on purpose. A creator with 10,000
 * Earned Robux searches for what it is worth, and the honest answer includes
 * that it cannot be cashed out yet — so the row is shown and flagged rather
 * than hidden.
 */
const DEFAULT_AMOUNTS: readonly number[] = [
  1_000, 5_000, 10_000, 17_000, 20_000, 30_000, 50_000, 100_000, 200_000, 300_000, 500_000,
  1_000_000, 10_000_000,
];

export function AmountTable({
  amounts = DEFAULT_AMOUNTS,
  linkApproved = true,
}: {
  amounts?: readonly number[];
  linkApproved?: boolean;
}) {
  const standard = getRateValue(standardRateId);
  const legacy = getRateValue(legacyRateId);
  const us18 = getRateValue(us18RateId);

  return (
    <TableWrapper label="Common Earned Robux amounts converted to US dollars">
      <Table caption="Earned Robux amounts valued at the standard, legacy and conditional U.S. 18+ DevEx rates">
        <thead>
          <tr>
            <Th>Earned Robux</Th>
            <Th numeric>Standard</Th>
            <Th numeric>Legacy</Th>
            <Th numeric>U.S. 18+</Th>
            <Th>Minimum</Th>
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
                      className="font-semibold text-[--color-primary] underline underline-offset-2"
                    >
                      {formatRobux(amount)}
                    </Link>
                  ) : (
                    <span className="font-semibold text-[--color-text]">
                      {formatRobux(amount)}
                    </span>
                  )}
                </Th>
                <Td numeric className="font-semibold">
                  {formatCurrency(robux.mul(standard), "USD")}
                </Td>
                <Td numeric className="text-[--color-text-muted]">
                  {formatCurrency(robux.mul(legacy), "USD")}
                </Td>
                <Td numeric className="text-[--color-text-muted]">
                  {formatCurrency(robux.mul(us18), "USD")}
                </Td>
                <Td>
                  {meetsMinimum ? (
                    <Badge tone="success">Meets minimum</Badge>
                  ) : (
                    <Badge tone="warning">Below minimum</Badge>
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
export function FormulaBlock({ className }: { className?: string }) {
  const standard = getRateValue(standardRateId);
  const example = Rational.fromInt(100_000).mul(standard);

  return (
    <div
      className={`rounded-[--radius-control] border border-[--color-border] bg-[--color-surface] p-4 ${className ?? ""}`}
    >
      <p className="text-sm font-semibold text-[--color-text]">The calculation</p>
      <p className="numeric-display mt-2 text-sm text-[--color-text]">
        eligible Earned Robux × rate per Robux = estimated USD payout
      </p>
      <p className="numeric-display mt-2 text-sm text-[--color-text-muted]">
        100,000 × ${formatRate(standard)} = {formatCurrency(example, "USD")}
      </p>
      <p className="mt-3 text-sm text-[--color-text-muted]">
        Working backwards divides instead, and always rounds up: a target of{" "}
        {formatCurrency(Rational.fromInt(1_000), "USD")} needs{" "}
        {formatRobux(Rational.fromInt(1_000).div(standard).ceilToBigInt())} Earned
        Robux, because {formatRobux(Rational.fromInt(1_000).div(standard).floorToBigInt())} would
        fall a fraction short.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Requirements list
// ---------------------------------------------------------------------------

export const DEVEX_REQUIREMENTS: readonly { title: string; detail: string }[] = [
  {
    title: `At least ${formatRobux(minimumEarnedRobux)} Earned Robux`,
    detail:
      "Earned Robux specifically — a balance made up of purchased Robux does not qualify however large it is.",
  },
  {
    title: "Minimum age of 13",
    detail: "Roblox documents 13 as the minimum age to participate in the programme.",
  },
  {
    title: "A Roblox-verified email address",
    detail: "The address on the account must be verified before a request can proceed.",
  },
  {
    title: "A valid DevEx portal account",
    detail: "Requests are submitted through the official DevEx portal, not through the site.",
  },
  {
    title: "A tax form on file",
    detail:
      "An IRS form W-9 for United States taxpayers, or a W-8 for non-United States taxpayers.",
  },
  {
    title: "Compliance with the Roblox rules",
    detail:
      "The account must comply with the Roblox Terms of Use and Community Standards.",
  },
];

export function RequirementsList({ className }: { className?: string }) {
  return (
    <ul className={`grid gap-3 sm:grid-cols-2 ${className ?? ""}`}>
      {DEVEX_REQUIREMENTS.map((requirement) => (
        <li
          key={requirement.title}
          className="rounded-[--radius-control] border border-[--color-border] bg-[--color-surface] p-4"
        >
          <p className="font-semibold text-[--color-text]">{requirement.title}</p>
          <p className="mt-1 text-sm text-[--color-text-muted]">{requirement.detail}</p>
        </li>
      ))}
    </ul>
  );
}
