"use client";

import type { ReactNode } from "react";
import type { ComparisonResult, SplitResult, TargetResult, ThresholdStatus } from "@/lib/calculations/devex";
import { Rational } from "@/lib/calculations/rational";
import {
  formatCurrency,
  formatPercent,
  formatRate,
  formatRobux,
  formatSignedCurrency,
  formatSignedPercent,
} from "@/lib/calculations/format";
import { Badge, Table, TableWrapper, Td, Th, cx } from "@/components/ui";
import type { FxRates } from "@/features/fx/types";
import { formatDate } from "@/lib/calculations/format";

/**
 * Result presentation.
 *
 * The primary value is the largest thing on the page and stays readable at
 * 320px and at 200% zoom — it uses `overflow-wrap: anywhere` through
 * `.numeric-display` so a ten-digit payout wraps rather than pushing the
 * layout sideways.
 *
 * No result is ever communicated by colour alone. The threshold meter, the
 * rate comparison and the stale-rate warning each carry a text label that says
 * the same thing the colour does.
 */

// ---------------------------------------------------------------------------
// Primary result
// ---------------------------------------------------------------------------

export function ResultSummary({
  primaryLabel,
  primaryValue,
  secondary,
  children,
}: {
  primaryLabel: string;
  primaryValue: string;
  secondary?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-[--radius-card] border border-[--color-border] bg-[--color-surface-subtle] p-4 sm:p-5">
      <p className="text-sm font-medium text-[--color-text-muted]">{primaryLabel}</p>
      <p className="numeric-display mt-1 text-3xl font-bold leading-tight text-[--color-text] sm:text-4xl">
        {primaryValue}
      </p>
      {secondary ? <div className="mt-1.5 text-sm text-[--color-text-muted]">{secondary}</div> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

/**
 * Live region for result and status announcements.
 *
 * `aria-live="polite"` with `aria-atomic` so the whole sentence is read as one
 * update rather than digit by digit as the reader types. The text is a
 * summary, not the full breakdown, to avoid drowning a screen-reader user in
 * announcements on every keystroke.
 */
export function ResultAnnouncer({ message }: { message: string }) {
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Threshold meter
// ---------------------------------------------------------------------------

/**
 * Progress toward the documented minimum.
 *
 * The wording is chosen with care: reaching 30,000 is described as meeting the
 * stated minimum, never as being eligible. Roblox decides eligibility, and a
 * meter on a third-party site saying "you are eligible" would be a false
 * promise to someone planning around real money.
 */
export function ThresholdMeter({ threshold }: { threshold: ThresholdStatus }) {
  if (threshold.state === "empty") return null;

  const meets = threshold.state === "meets-minimum";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[--color-text]">
          {meets ? "Meets the stated minimum" : "Below the stated minimum"}
        </p>
        <Badge tone={meets ? "success" : "warning"}>
          {meets
            ? `${formatRobux(threshold.minimumRobux)} minimum reached`
            : `${formatRobux(threshold.shortfallRobux)} more needed`}
        </Badge>
      </div>

      <div
        role="progressbar"
        aria-valuenow={Math.round(threshold.progressPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress toward the ${formatRobux(threshold.minimumRobux)} Earned Robux minimum`}
        className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[--color-border]"
      >
        <div
          className={cx(
            "h-full rounded-full transition-[width]",
            meets ? "bg-[--color-success]" : "bg-[--color-warning]",
          )}
          style={{ width: `${threshold.progressPercent}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-[--color-text-muted]">
        Roblox requires {formatRobux(threshold.minimumRobux)} Earned Robux to submit a
        request. Reaching that number is a requirement, not an approval — Roblox
        reviews every request and decides which Robux qualify.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rate comparison
// ---------------------------------------------------------------------------

export function ScenarioComparison({
  comparison,
  currency = "USD",
}: {
  comparison: ComparisonResult;
  currency?: string;
}) {
  return (
    <TableWrapper label="What each DevEx rate would pay for this amount">
      <Table caption={`Comparison of DevEx rates for ${formatRobux(comparison.robux)} Earned Robux`}>
        <thead>
          <tr>
            <Th>Rate</Th>
            <Th numeric>Per Robux</Th>
            <Th numeric>Payout</Th>
            <Th numeric>vs standard</Th>
          </tr>
        </thead>
        <tbody>
          {comparison.rows.map((row) => (
            <tr key={row.rate.id}>
              <Td>
                <span className="font-medium text-[--color-text]">{row.rate.label}</span>
                {row.isBaseline ? (
                  <span className="ml-2 text-xs text-[--color-text-muted]">(baseline)</span>
                ) : null}
              </Td>
              <Td numeric>${formatRate(row.rateValue)}</Td>
              <Td numeric className="font-semibold">
                {formatCurrency(row.usd, currency)}
              </Td>
              <Td numeric>
                {row.isBaseline ? (
                  <span className="text-[--color-text-muted]">—</span>
                ) : (
                  <span
                    className={
                      row.differenceVsStandardUsd.gt(Rational.ZERO)
                        ? "text-[--color-success]"
                        : "text-[--color-text-muted]"
                    }
                  >
                    {formatSignedCurrency(row.differenceVsStandardUsd, currency)}
                    <span className="ml-1 text-xs">
                      ({formatSignedPercent(row.differenceVsStandardPercent, 1)})
                    </span>
                  </span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </TableWrapper>
  );
}

// ---------------------------------------------------------------------------
// Split breakdown
// ---------------------------------------------------------------------------

export function ResultBreakdown({
  result,
  currency = "USD",
}: {
  result: SplitResult;
  currency?: string;
}) {
  const populated = result.buckets.filter((bucket) => bucket.robux > 0n);
  if (populated.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <TableWrapper label="Payout broken down by rate bucket">
        <Table caption="DevEx payout by rate bucket">
          <thead>
            <tr>
              <Th>Bucket</Th>
              <Th numeric>Earned Robux</Th>
              <Th numeric>Rate</Th>
              <Th numeric>Subtotal</Th>
              <Th numeric>Share</Th>
            </tr>
          </thead>
          <tbody>
            {populated.map((bucket) => (
              <tr key={bucket.rate.id}>
                <Td>{bucket.rate.label}</Td>
                <Td numeric>{formatRobux(bucket.robux)}</Td>
                <Td numeric>${formatRate(bucket.rateValue)}</Td>
                <Td numeric className="font-semibold">
                  {formatCurrency(bucket.usd, currency)}
                </Td>
                <Td numeric>{formatPercent(bucket.shareOfGrossPercent, 1)}</Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[--color-surface-subtle]">
              <Th scope="row">Total</Th>
              <Td numeric className="font-semibold">
                {formatRobux(result.totalRobux)}
              </Td>
              <Td numeric>${formatRate(result.blendedRateUsdPerRobux, 5)}</Td>
              <Td numeric className="font-bold">
                {formatCurrency(result.grossUsd, currency)}
              </Td>
              <Td numeric>100.0%</Td>
            </tr>
          </tfoot>
        </Table>
      </TableWrapper>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <SummaryRow
          term="Blended effective rate"
          detail={`$${formatRate(result.blendedRateUsdPerRobux, 5)} per Robux across all buckets`}
        />
        <SummaryRow
          term="If it were all standard rate"
          detail={`${formatCurrency(result.standardOnlyUsd, currency)} (${formatSignedCurrency(
            result.differenceVsStandardOnlyUsd.neg(),
            currency,
          )} difference)`}
        />
      </dl>

      {result.feesApplied || result.taxApplied ? (
        <div className="rounded-[--radius-control] border border-[--color-border] bg-[--color-surface] p-4">
          <h3 className="text-sm font-semibold text-[--color-text]">Your estimated deductions</h3>
          <dl className="mt-2 flex flex-col gap-1.5 text-sm">
            <DeductionRow label="Gross payout" value={formatCurrency(result.grossUsd, currency)} />
            {result.feesApplied ? (
              <>
                <DeductionRow
                  label="Percentage fee"
                  value={`−${formatCurrency(result.percentageFeeUsd, currency)}`}
                />
                {!result.flatFeeUsd.isZero() ? (
                  <DeductionRow
                    label="Flat fee"
                    value={`−${formatCurrency(result.flatFeeUsd, currency)}`}
                  />
                ) : null}
              </>
            ) : null}
            {result.taxApplied ? (
              <DeductionRow
                label="Your tax estimate"
                value={`−${formatCurrency(result.estimatedTaxUsd, currency)}`}
              />
            ) : null}
            <div className="mt-1 border-t border-[--color-border] pt-1.5">
              <DeductionRow
                label="Estimated net"
                value={formatCurrency(result.netAfterEstimateUsd, currency)}
                emphasis
              />
            </div>
          </dl>
          <p className="mt-2 text-xs text-[--color-text-muted]">
            These are the figures you entered, not amounts Roblox or any provider
            has quoted. This site gives no tax advice.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SummaryRow({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="rounded-[--radius-control] border border-[--color-border] bg-[--color-surface] p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-[--color-text-muted]">
        {term}
      </dt>
      <dd className="mt-1 font-semibold text-[--color-text]">{detail}</dd>
    </div>
  );
}

function DeductionRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={cx(emphasis ? "font-semibold text-[--color-text]" : "text-[--color-text-muted]")}>
        {label}
      </dt>
      <dd className={cx("tabular", emphasis ? "font-bold text-[--color-text]" : "text-[--color-text]")}>
        {value}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Target result
// ---------------------------------------------------------------------------

export function TargetBreakdown({
  result,
  currency = "USD",
}: {
  result: TargetResult;
  currency?: string;
}) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-[--color-text-muted]">
        {formatCurrency(result.targetUsd, currency)} ÷ ${formatRate(result.rateValue)} per Robux ={" "}
        <span className="tabular">{result.exactRequiredRobux.toFixed(2)}</span>, rounded up to{" "}
        <strong className="text-[--color-text]">{formatRobux(result.requiredRobux)}</strong> whole
        Earned Robux. That pays {formatCurrency(result.payoutAtRequiredRobux, currency)}, which is
        the first whole-Robux amount that reaches your target rather than falling just short.
      </p>

      {result.requirementIsBelowMinimum ? (
        <div className="rounded-[--radius-control] border border-[--color-border] border-l-4 border-l-[--color-warning] bg-[--color-surface] p-3">
          <p className="font-semibold text-[--color-text]">The minimum applies first</p>
          <p className="mt-1 text-[--color-text-muted]">
            {formatRobux(result.requiredRobux)} Earned Robux would reach your target
            arithmetically, but Roblox requires {formatRobux(result.minimumRobux)} before a request
            can be submitted. You would need{" "}
            <strong className="text-[--color-text]">
              {formatRobux(result.effectiveRobuxNeeded)}
            </strong>{" "}
            in practice.
          </p>
        </div>
      ) : null}

      {result.progressPercent !== null && result.currentRobux !== null ? (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-[--color-text]">
              {result.progressPercent}% of the way there
            </p>
            <Badge tone={result.remainingRobux === 0n ? "success" : "info"}>
              {result.remainingRobux === 0n
                ? "Target reached"
                : `${formatRobux(result.remainingRobux ?? 0n)} to go`}
            </Badge>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(result.progressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progress toward your payout target"
            className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[--color-border]"
          >
            <div
              className="h-full rounded-full bg-[--color-primary] transition-[width]"
              style={{ width: `${result.progressPercent}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FX status
// ---------------------------------------------------------------------------

/**
 * Provenance for a converted figure.
 *
 * Always states the provider and the observation date, and says outright that
 * these are reference rates rather than the rate a bank will actually give.
 * A stale figure is labelled as stale rather than quietly shown as current.
 */
export function FxNote({
  rates,
  currency,
  status,
  error,
}: {
  rates: FxRates | null;
  currency: string;
  status: string;
  error: string | null;
}) {
  if (currency === "USD") return null;

  if (status === "loading") {
    return (
      <p className="text-xs text-[--color-text-muted]" aria-live="polite">
        Loading reference rates…
      </p>
    );
  }

  if (status === "unavailable" || !rates) {
    return (
      <p
        role="status"
        className="rounded-[--radius-control] border border-[--color-border] border-l-4 border-l-[--color-warning] bg-[--color-surface] p-3 text-xs text-[--color-text-muted]"
      >
        {error ??
          "Local-currency estimates are temporarily unavailable."}{" "}
        The USD figure above is calculated locally and is unaffected.
      </p>
    );
  }

  return (
    <div className="text-xs text-[--color-text-muted]">
      {rates.stale ? (
        <p className="mb-1 font-semibold text-[--color-warning]">
          Stale rates. {rates.staleReason}
        </p>
      ) : null}
      <p>
        {currency} figures use {rates.provider} reference rates observed{" "}
        {formatDate(`${rates.observationDate}T00:00:00Z`)}. These are reference
        rates, not bank quotes — your payment provider will apply its own rate
        and may add a fee.
      </p>
    </div>
  );
}
