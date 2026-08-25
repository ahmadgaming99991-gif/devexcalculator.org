"use client";

import type { Translate } from "@/i18n/get-dictionary";
import { rich } from "@/i18n/rich";
import { rateLabel } from "@/i18n/data-text";
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
    <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-subtle) p-4 sm:p-5">
      <p className="text-sm font-medium text-(--color-text-muted)">{primaryLabel}</p>
      <p className="numeric-display mt-1 text-3xl font-bold leading-tight text-(--color-text) sm:text-4xl">
        {primaryValue}
      </p>
      {secondary ? <div className="mt-1.5 text-sm text-(--color-text-muted)">{secondary}</div> : null}
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
 * meter on a third-party site asserting eligibility outright would be a false
 * promise to someone planning around real money.
 */
export function ThresholdMeter({
  threshold,
  t,
}: {
  threshold: ThresholdStatus;
  readonly t: Translate;
}) {
  if (threshold.state === "empty") return null;

  const meets = threshold.state === "meets-minimum";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-(--color-text)">
          {t(meets ? "calculator.results.meetsMinimumTitle" : "calculator.results.belowMinimumTitle")}
        </p>
        <Badge tone={meets ? "success" : "warning"}>
          {meets
            ? t("calculator.results.minimumReachedBadge", {
                minimum: formatRobux(threshold.minimumRobux),
              })
            : t("calculator.results.moreNeededBadge", {
                shortfall: formatRobux(threshold.shortfallRobux),
              })}
        </Badge>
      </div>

      <div
        role="progressbar"
        aria-valuenow={Math.round(threshold.progressPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t("calculator.results.progressAriaLabel", {
          minimum: formatRobux(threshold.minimumRobux),
        })}
        className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-(--color-border)"
      >
        <div
          className={cx(
            "h-full rounded-full transition-[width]",
            meets ? "bg-(--color-success)" : "bg-(--color-warning)",
          )}
          style={{ width: `${threshold.progressPercent}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-(--color-text-muted)">
        {t("calculator.results.body.intro.p1", {
          minimumRobux: formatRobux(threshold.minimumRobux),
        })}
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
  t,
}: {
  comparison: ComparisonResult;
  currency?: string;
  readonly t: Translate;
}) {
  return (
    <TableWrapper label={t("calculator.results.comparisonTableLabel")}>
      <Table
        caption={t("calculator.results.comparisonTableCaption", {
          robux: formatRobux(comparison.robux),
        })}
      >
        <thead>
          <tr>
            <Th>{t("common.columns.rate")}</Th>
            <Th numeric>{t("common.columns.perRobux")}</Th>
            <Th numeric>{t("common.columns.payout")}</Th>
            <Th numeric>{t("common.columns.vsStandard")}</Th>
          </tr>
        </thead>
        <tbody>
          {comparison.rows.map((row) => (
            <tr key={row.rate.id}>
              <Td>
                <span className="font-medium text-(--color-text)">{rateLabel(t, row.rate)}</span>
                {row.isBaseline ? (
                  <span className="ml-2 text-xs text-(--color-text-muted)">
                    {t("common.units.baselineParenthetical")}
                  </span>
                ) : null}
              </Td>
              <Td numeric>${formatRate(row.rateValue)}</Td>
              <Td numeric className="font-semibold">
                {formatCurrency(row.usd, currency)}
              </Td>
              <Td numeric>
                {row.isBaseline ? (
                  <span className="text-(--color-text-muted)">—</span>
                ) : (
                  <span
                    className={
                      row.differenceVsStandardUsd.gt(Rational.ZERO)
                        ? "text-(--color-success)"
                        : "text-(--color-text-muted)"
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
  t,
}: {
  result: SplitResult;
  currency?: string;
  readonly t: Translate;
}) {
  const populated = result.buckets.filter((bucket) => bucket.robux > 0n);
  if (populated.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <TableWrapper label={t("calculator.results.bucketTableLabel")}>
        <Table caption={t("calculator.results.bucketTableCaption")}>
          <thead>
            <tr>
              <Th>{t("common.columns.bucket")}</Th>
              <Th numeric>{t("common.columns.earnedRobux")}</Th>
              <Th numeric>{t("common.columns.rate")}</Th>
              <Th numeric>{t("common.columns.subtotal")}</Th>
              <Th numeric>{t("common.columns.share")}</Th>
            </tr>
          </thead>
          <tbody>
            {populated.map((bucket) => (
              <tr key={bucket.rate.id}>
                <Td>{rateLabel(t, bucket.rate)}</Td>
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
            <tr className="bg-(--color-surface-subtle)">
              <Th scope="row">{t("common.columns.total")}</Th>
              <Td numeric className="font-semibold">
                {formatRobux(result.totalRobux)}
              </Td>
              <Td numeric>${formatRate(result.blendedRateUsdPerRobux, 5)}</Td>
              <Td numeric className="font-bold">
                {formatCurrency(result.grossUsd, currency)}
              </Td>
              <Td numeric>{t("calculator.results.totalShare")}</Td>
            </tr>
          </tfoot>
        </Table>
      </TableWrapper>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <SummaryRow
          term={t("calculator.results.blendedRate")}
          detail={t("calculator.results.blendedRateDetail", {
            rate: `$${formatRate(result.blendedRateUsdPerRobux, 5)}`,
          })}
        />
        <SummaryRow
          term={t("calculator.results.ifAllStandard")}
          detail={t("calculator.results.ifAllStandardDetail", {
            amount: formatCurrency(result.standardOnlyUsd, currency),
            difference: formatSignedCurrency(result.differenceVsStandardOnlyUsd.neg(), currency),
          })}
        />
      </dl>

      {result.feesApplied || result.taxApplied ? (
        <div className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4">
          <h3 className="text-sm font-semibold text-(--color-text)">{t("calculator.deductions.heading")}{" "}</h3>
          <dl className="mt-2 flex flex-col gap-1.5 text-sm">
            <DeductionRow label={t("calculator.deductions.grossPayout")} value={formatCurrency(result.grossUsd, currency)} />
            {result.feesApplied ? (
              <>
                <DeductionRow
                  label={t("calculator.deductions.percentageFee")}
                  value={`−${formatCurrency(result.percentageFeeUsd, currency)}`}
                />
                {!result.flatFeeUsd.isZero() ? (
                  <DeductionRow
                    label={t("calculator.deductions.flatFee")}
                    value={`−${formatCurrency(result.flatFeeUsd, currency)}`}
                  />
                ) : null}
              </>
            ) : null}
            {result.taxApplied ? (
              <DeductionRow
                label={t("calculator.deductions.taxEstimate")}
                value={`−${formatCurrency(result.estimatedTaxUsd, currency)}`}
              />
            ) : null}
            <div className="mt-1 border-t border-(--color-border) pt-1.5">
              <DeductionRow
                label={t("calculator.deductions.estimatedNet")}
                value={formatCurrency(result.netAfterEstimateUsd, currency)}
                emphasis
              />
            </div>
          </dl>
          <p className="mt-2 text-xs text-(--color-text-muted)">{t("calculator.results.body.intro.p3")}</p>
        </div>
      ) : null}
    </div>
  );
}

function SummaryRow({ term, detail }: { term: string; detail: string }) {
  return (
    <div className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-(--color-text-muted)">
        {term}
      </dt>
      <dd className="mt-1 font-semibold text-(--color-text)">{detail}</dd>
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
      <dt className={cx(emphasis ? "font-semibold text-(--color-text)" : "text-(--color-text-muted)")}>
        {label}
      </dt>
      <dd className={cx("tabular", emphasis ? "font-bold text-(--color-text)" : "text-(--color-text)")}>
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
  t,
}: {
  result: TargetResult;
  currency?: string;
  readonly t: Translate;
}) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-(--color-text-muted)">
        {rich(t("calculator.results.targetArithmetic"), {
          target: formatCurrency(result.targetUsd, currency),
          rate: `$${formatRate(result.rateValue)}`,
          exact: <span className="tabular">{result.exactRequiredRobux.toFixed(2)}</span>,
          required: <strong className="text-(--color-text)">{formatRobux(result.requiredRobux)}</strong>,
        })}
          {t("calculator.results.body.intro.p4", {
            currency: formatCurrency(result.payoutAtRequiredRobux, currency),
          })}
        </p>

      {result.requirementIsBelowMinimum ? (
        <div className="rounded-(--radius-control) border border-(--color-border) border-l-4 border-l-(--color-warning) bg-(--color-surface) p-3">
          <p className="font-semibold text-(--color-text)">{t("calculator.target.minimumAppliesFirstTitle")}</p>
          <p className="mt-1 text-(--color-text-muted)">
            {t("calculator.results.body.intro.p5", {
              requiredRobux: formatRobux(result.requiredRobux),
              minimumRobux: formatRobux(result.minimumRobux),
            })}
          <strong className="text-(--color-text)">
                    {formatRobux(result.effectiveRobuxNeeded)}
                  </strong>{" "}
                  in practice.
                </p>
              </div>
            ) : null}
      
            {result.progressPercent !== null && result.currentRobux !== null ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-(--color-text)">
            {t("calculator.results.body.intro.p7", {
              progressPercent: result.progressPercent,
            })}
          </p>
            <Badge tone={result.remainingRobux === 0n ? "success" : "info"}>
              {result.remainingRobux === 0n
                ? t("calculator.results.targetReachedBadge")
                : t("calculator.results.toGoBadge", {
                    remaining: formatRobux(result.remainingRobux ?? 0n),
                  })}
            </Badge>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(result.progressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("calculator.target.progressLabel")}
            className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-(--color-border)"
          >
            <div
              className="h-full rounded-full bg-(--color-primary) transition-[width]"
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
  t,
}: {
  rates: FxRates | null;
  currency: string;
  status: string;
  readonly t: Translate;
}) {
  if (currency === "USD") return null;

  if (status === "loading") {
    return (
      <p className="text-xs text-(--color-text-muted)" aria-live="polite">{t("calculator.currency.loading")}</p>
    );
  }

  if (status === "unavailable" || !rates) {
    return (
      <p
        role="status"
        className="rounded-(--radius-control) border border-(--color-border) border-l-4 border-l-(--color-warning) bg-(--color-surface) p-3 text-xs text-(--color-text-muted)"
      >
        {t("calculator.currency.unavailable")}
      </p>
    );
  }

  return (
    <div className="text-xs text-(--color-text-muted)">
      {rates.stale ? (
        <p className="mb-1 font-semibold text-(--color-warning)">
          {t("calculator.currency.staleHeading")}{" "}
          {rates.staleCode === "aged"
            ? t("calculator.currency.staleAged", {
                ageDays: String(rates.staleAgeDays ?? 0),
              })
            : t("calculator.currency.staleSnapshot")}
        </p>
      ) : null}
      <p>
        {t("calculator.currency.provenance", {
          currency,
          provider: rates.provider,
          date: formatDate(`${rates.observationDate}T00:00:00Z`),
        })}
      </p>
    </div>
  );
}
