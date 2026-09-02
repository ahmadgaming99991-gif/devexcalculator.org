"use client";

import { parseMessage } from "@/i18n/parse-message";
import { translatorFor, type LocaleWords } from "@/i18n/client-words";
import type { Translate } from "@/i18n/get-dictionary";
import { rateLabel } from "@/i18n/data-text";
import { useId, useMemo, useState } from "react";
import {
  PACE_PERIOD_DAYS,
  planEarnings,
  planScenarios,
  type PacePeriod,
  type PlanHorizon,
} from "@/lib/calculations/planner";
import { Rational } from "@/lib/calculations/rational";
import { allRates, maxRobuxInput, maxUsdTargetInput } from "@/lib/calculations/rate-registry";
import { standardRateId } from "@/lib/calculations/devex";
import {
  parseCurrencyAmount,
  parsePercent,
  parseRobuxAmount,
} from "@/lib/calculations/parse-amount";
import { formatCurrency, formatRobux } from "@/lib/calculations/format";
import { useClientValue } from "@/lib/utilities/use-client-value";
import { track } from "@/lib/analytics/track";
import {
  Badge,
  Callout,
  Card,
  Disclosure,
  Table,
  TableWrapper,
  Td,
  Th,
  cx,
} from "@/components/ui";
import { plural } from "@/i18n/plural";

/**
 * The earnings goal planner.
 *
 * The target calculator answers "how much Earned Robux does $500 need". This
 * answers the question that follows it — *when* — in whichever direction the
 * reader is actually asking:
 *
 *   - "I earn about this much a week." → the date that reaches the target.
 *   - "I need it by this date." → what has to be earned each day to get there.
 *
 * Both run through `planEarnings`, which is exact-arithmetic and pure; nothing
 * in this file computes money or dates itself.
 *
 * A separate module rather than a fourth mode in the main calculator, for the
 * same reason the group split is separate: the shared calculator is this
 * site's most-tested component, and threading a second time dimension through
 * its state to arrive at the same place would put that at risk for nothing.
 *
 * Three rules the copy here follows without exception, because the arithmetic
 * cannot enforce them:
 *
 *   - A date is a projection at a pace the reader supplied, never a date
 *     Roblox will pay on.
 *   - Reaching the minimum is not approval, and is never worded as though it
 *     were.
 *   - Tax is zero until the reader types a number. This site does not know
 *     their country and will not guess at one.
 */

/**
 * Today on the reader's own calendar, as `YYYY-MM-DD`.
 *
 * Deliberately local rather than UTC. `<input type="date">` hands back a local
 * calendar date, so anchoring the plan to a UTC day puts the two out of step
 * for anyone east or west of Greenwich — at 02:00 in Karachi the UTC day is
 * still yesterday, and a deadline of "tomorrow" would be counted as two days
 * away. Both ends are then treated as plain calendar dates, which is what a
 * plan measured in days actually is.
 */
export function localDay(now: Date): string {
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}


export function Planner({ words }: { readonly words: LocaleWords }) {
  const t = useMemo(() => translatorFor(words), [words]);
  const fieldId = useId();

  /*
   * The server's day, computed here so there is one definition of "today".
   *
   * It used to be computed by the page, in UTC, and handed down as a prop —
   * while this module's own `localDay` exists precisely because a UTC day is
   * the wrong anchor for a plan. Two contradictory definitions of the same
   * thing in two files, and the one that rendered first was the wrong one.
   *
   * Read once per render rather than inside `getServerSnapshot`: that
   * callback is invoked more than once and must return the same value each
   * time, and `new Date()` would not.
   */
  const serverToday = localDay(new Date());

  /*
   * The plan starts from the reader's own day, not the build's.
   *
   * Every page here is prerendered, so a date computed at build time would be
   * weeks stale by the time anyone read it — and reading the clock during
   * render is neither pure nor safe to hydrate. The server's day renders
   * first and the browser's replaces it in the same commit.
   */
  const startIso = useClientValue(() => localDay(new Date()), serverToday);

  /*
   * Whether the reader's own calendar is known yet.
   *
   * Until it is, `startIso` is the server's day, and the server has no
   * timezone to speak of — on Workers it is UTC. Using that as the date
   * picker's floor rejects the reader's real today for everyone west of
   * Greenwich after their afternoon, and with scripting off it rejects it
   * permanently. A floor that is sometimes wrong is worse than no floor: a
   * date in the past is caught by the plan itself, which says so.
   */
  const knowsReaderDay = useClientValue(() => true, false);
  const startDate = useMemo(() => new Date(`${startIso}T00:00:00Z`), [startIso]);

  const [targetUsd, setTargetUsd] = useState("500");
  const [rateId, setRateId] = useState<string>(standardRateId);
  const [currentRobux, setCurrentRobux] = useState("0");
  const [mode, setMode] = useState<"pace" | "deadline">("pace");
  const [paceAmount, setPaceAmount] = useState("5,000");
  const [pacePeriod, setPacePeriod] = useState<PacePeriod>("week");
  const [deadline, setDeadline] = useState("");
  const [feePercent, setFeePercent] = useState("");
  const [flatFee, setFlatFee] = useState("");
  const [taxPercent, setTaxPercent] = useState("");

  const parsedTarget = parseCurrencyAmount(targetUsd, maxUsdTargetInput, 2, t.locale);
  const parsedCurrent = parseRobuxAmount(currentRobux || "0", maxRobuxInput, t.locale);
  const parsedPace = parseRobuxAmount(paceAmount || "0", maxRobuxInput, t.locale);
  const parsedFee = parsePercent(feePercent, 100, t.locale);
  const parsedFlat = parseCurrencyAmount(flatFee || "0", 10_000, 2, t.locale);
  const parsedTax = parsePercent(taxPercent, 100, t.locale);

  const horizon: PlanHorizon | null =
    mode === "pace"
      ? { kind: "pace", amountRobux: parsedPace.ok ? parsedPace.value.robux : 0n, period: pacePeriod }
      : deadline.trim() === ""
        ? null
        : { kind: "deadline", date: deadline };

  const input = {
    targetUsd: parsedTarget.ok ? parsedTarget.value : Rational.ZERO,
    rateId,
    currentRobux: parsedCurrent.ok ? parsedCurrent.value.robux : 0n,
    horizon,
    fees: {
      feePercent: parsedFee.ok ? parsedFee.value : Rational.ZERO,
      flatFeeUsd: parsedFlat.ok ? parsedFlat.value : Rational.ZERO,
      taxPercent: parsedTax.ok ? parsedTax.value : Rational.ZERO,
    },
    startDate,
  };

  const plan = planEarnings(input);
  const scenarios = planScenarios(input);
  const { requirement, payout } = plan;

  const targetInvalid = targetUsd.trim() !== "" && !parsedTarget.ok;

  return (
    <div className="min-w-0">
      <Card>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            id={`${fieldId}-target`}
            label={t("calculator.planner.targetLabel")}
            suffix="USD"
            value={targetUsd}
            onChange={setTargetUsd}
            invalid={targetInvalid}
            hint={
              targetInvalid
                ? (parseMessage(t, parsedTarget) ?? undefined)
                : t("calculator.planner.targetHint")
            }
          />

          <div>
            <label
              htmlFor={`${fieldId}-rate`}
              className="block text-sm font-semibold text-(--color-text)"
            >
              {t("calculator.planner.rateToPlanAgainst")}
            </label>
            <select
              id={`${fieldId}-rate`}
              value={rateId}
              onChange={(event) => setRateId(event.target.value)}
              className="mt-2 min-h-[44px] w-full rounded-(--radius-control) border border-(--color-border-strong) bg-(--color-surface) px-3 py-2.5 text-(--color-text)"
            >
              {allRates
                .filter((rate) => rate.status !== "retired")
                .map((rate) => (
                  <option key={rate.id} value={rate.id}>
                    {rate.label} — ${rate.usdPerRobux} per Robux
                  </option>
                ))}
            </select>
            <p className="mt-2 text-sm text-(--color-text-muted)">{t("calculator.planner.body.intro.p1")}</p>
          </div>

          <Field
            id={`${fieldId}-current`}
            label={t("calculator.planner.currentBalanceLabel")}
            suffix="R$"
            value={currentRobux}
            onChange={setCurrentRobux}
            invalid={currentRobux.trim() !== "" && !parsedCurrent.ok}
            hint={
              currentRobux.trim() !== "" && !parsedCurrent.ok
                ? (parseMessage(t, parsedCurrent) ?? undefined)
                : t("calculator.planner.earnedOnlyNote")
            }
          />

          <fieldset className="min-w-0">
            <legend className="text-sm font-semibold text-(--color-text)">{t("calculator.planner.whatDoYouKnow")}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              <ModeButton
                selected={mode === "pace"}
                onClick={() => {
                  setMode("pace");
                  track("planner_mode_selected", { planner_mode: "pace" });
                }}
                label={t("calculator.planner.modeEarn")}
              />
              <ModeButton
                selected={mode === "deadline"}
                onClick={() => {
                  setMode("deadline");
                  track("planner_mode_selected", { planner_mode: "deadline" });
                }}
                label={t("calculator.planner.modeDate")}
              />
            </div>
            <p className="mt-2 text-sm text-(--color-text-muted)">
              {mode === "pace"
                ? t("calculator.planner.worksOutDate")
                : t("calculator.planner.worksOutPace")}
            </p>
          </fieldset>

          {mode === "pace" ? (
            <>
              <Field
                id={`${fieldId}-pace`}
                label={t("calculator.planner.expectedEarningsLabel")}
                suffix="R$"
                value={paceAmount}
                onChange={setPaceAmount}
                invalid={paceAmount.trim() !== "" && !parsedPace.ok}
                hint={
                  paceAmount.trim() !== "" && !parsedPace.ok
                    ? (parseMessage(t, parsedPace) ?? undefined)
                    : t("calculator.planner.paceHint")
                }
              />
              <div>
                <label
                  htmlFor={`${fieldId}-period`}
                  className="block text-sm font-semibold text-(--color-text)"
                >
                  {t("calculator.planner.perLabel")}
                </label>
                <select
                  id={`${fieldId}-period`}
                  value={pacePeriod}
                  onChange={(event) => setPacePeriod(event.target.value as PacePeriod)}
                  className="mt-2 min-h-[44px] w-full rounded-(--radius-control) border border-(--color-border-strong) bg-(--color-surface) px-3 py-2.5 text-(--color-text)"
                >
                  {(Object.keys(PACE_PERIOD_DAYS) as PacePeriod[]).map((period) => (
                    <option key={period} value={period}>
                      {t(`calculator.planner.pacePeriod.${period}`)}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2">
              <label
                htmlFor={`${fieldId}-deadline`}
                className="block text-sm font-semibold text-(--color-text)"
              >
                {t("calculator.planner.deadlineLabel")}
              </label>
              <input
                id={`${fieldId}-deadline`}
                type="date"
                value={deadline}
                min={knowsReaderDay ? startIso : undefined}
                onChange={(event) => setDeadline(event.target.value)}
                className="tabular mt-2 min-h-[44px] w-full rounded-(--radius-control) border border-(--color-border-strong) bg-(--color-surface) px-3 py-2.5 text-(--color-text) sm:w-64"
              />
              <p className="mt-2 text-sm text-(--color-text-muted)">{t("calculator.planner.body.intro.p2")}</p>
            </div>
          )}
        </div>

        <Disclosure summary={t("calculator.planner.feesAndTax")} className="mt-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              id={`${fieldId}-fee`}
              label={t("calculator.deductions.percentageFeeLabel")}
              suffix="%"
              value={feePercent}
              onChange={setFeePercent}
              placeholder="0"
              invalid={!parsedFee.ok}
              hint={parseMessage(t, parsedFee) ?? undefined}
              compact
            />
            <Field
              id={`${fieldId}-flat`}
              label={t("calculator.deductions.flatFeeLabel")}
              suffix="USD"
              value={flatFee}
              onChange={setFlatFee}
              placeholder="0"
              invalid={flatFee.trim() !== "" && !parsedFlat.ok}
              hint={
                flatFee.trim() === "" || parsedFlat.ok
                  ? undefined
                  : (parseMessage(t, parsedFlat) ?? undefined)
              }
              compact
            />
            <Field
              id={`${fieldId}-tax`}
              label={t("calculator.deductions.taxLabel")}
              suffix="%"
              value={taxPercent}
              onChange={setTaxPercent}
              placeholder="0"
              invalid={!parsedTax.ok}
              hint={parseMessage(t, parsedTax) ?? undefined}
              compact
            />
          </div>
          <p className="mt-3">{t("calculator.planner.body.intro.p3")}</p>
        </Disclosure>
      </Card>

      {/* ------------------------------------------------------------------ */}

      <Card className="mt-6">
        <h3 className="text-sm font-semibold tracking-wide text-(--color-text-muted) uppercase">
          {t("calculator.planner.planHeading")}
        </h3>

        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          <Figure
            label={t("calculator.planner.totalNeeded")}
            value={`${formatRobux(t.locale, requirement.effectiveRobuxNeeded)} R$`}
            note={
              requirement.requirementIsBelowMinimum
                ? t("calculator.planner.belowMinimumNote", {
                    required: formatRobux(t.locale, requirement.requiredRobux),
                    minimum: formatRobux(t.locale, BigInt(requirement.minimumRobux)),
                  })
                : undefined
            }
          />
          <Figure
            label={t("calculator.planner.stillToEarn")}
            value={`${formatRobux(t.locale, requirement.remainingRobux)} R$`}
            note={
              requirement.alreadyReached
                ? t("calculator.planner.alreadyEnoughHeadline")
                : t("calculator.planner.progressNote", {
                    progressPercent: String(requirement.progressPercent),
                  })
            }
          />
          <Figure
            label={t("calculator.groupSplit.columnEstimatedPayout")}
            value={formatCurrency(t.locale, payout.grossUsd, "USD")}
            note={t("calculator.planner.payoutNote", {
              rate: rateLabel(t, requirement.rate),
            })}
          />
        </div>

        {/* The answer the planner exists to give. */}
        <div className="mt-6 rounded-(--radius-card) bg-(--color-surface-subtle) p-5">
          {mode === "pace" ? (
            <PaceOutcome plan={plan} t={t} knowsReaderDay={knowsReaderDay} />
          ) : (
            <DeadlineOutcome plan={plan} t={t} />
          )}
        </div>

        {(payout.feesApplied || payout.taxApplied) && (
          <TableWrapper label={t("calculator.planner.reductionHeading")} className="mt-6">
            <Table caption={t("calculator.planner.reductionDescription")}>
              <thead>
                <tr>
                  <Th>{t("calculator.planner.columnStage")}</Th>
                  <Th numeric>{t("calculator.planner.columnAmount")}</Th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <Td>{t("calculator.planner.grossPayout")}</Td>
                  <Td numeric className="tabular">
                    {formatCurrency(t.locale, payout.grossUsd, "USD")}
                  </Td>
                </tr>
                {payout.feesApplied && (
                  <>
                    <tr>
                      <Td>{t("calculator.planner.percentageFeeEntered")}</Td>
                      <Td numeric className="tabular">
                        −{formatCurrency(t.locale, payout.percentageFeeUsd, "USD")}
                      </Td>
                    </tr>
                    <tr>
                      <Td>{t("calculator.planner.flatFeeEntered")}</Td>
                      <Td numeric className="tabular">
                        −{formatCurrency(t.locale, payout.flatFeeUsd, "USD")}
                      </Td>
                    </tr>
                  </>
                )}
                {payout.taxApplied && (
                  <tr>
                    <Td>{t("calculator.planner.taxEntered")}{" "}</Td>
                    <Td numeric className="tabular">
                      −{formatCurrency(t.locale, payout.estimatedTaxUsd, "USD")}
                    </Td>
                  </tr>
                )}
                <tr>
                  <Td>
                    <strong className="font-semibold text-(--color-text)">{t("calculator.planner.body.intro.p4")}</strong>
                  </Td>
                  <Td numeric className="tabular font-semibold">
                    {formatCurrency(t.locale, payout.netAfterEstimateUsd, "USD")}
                  </Td>
                </tr>
              </tbody>
            </Table>
          </TableWrapper>
        )}

        <TableWrapper label={t("calculator.planner.underEachRateHeading")} className="mt-6">
          <Table caption={t("calculator.planner.underEachRateDescription")}>
            <thead>
              <tr>
                <Th>{t("calculator.planner.columnRate")}</Th>
                <Th numeric>{t("calculator.planner.columnRobuxNeeded")}</Th>
                <Th numeric>{t("calculator.planner.columnStillToEarn")}</Th>
                <Th>
                  {mode === "pace"
                    ? t("calculator.planner.columnReachedIn")
                    : t("calculator.planner.columnNeededEachDay")}
                </Th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((row) => (
                <tr key={row.rate.id}>
                  <Td>
                    {row.rate.label}
                    {row.isBaseline ? (
                      <>
                        {" "}
                        <Badge tone="info">{t("calculator.planner.planningAgainst")}{" "}</Badge>
                      </>
                    ) : null}
                  </Td>
                  <Td numeric className="tabular">
                    {formatRobux(t.locale, row.effectiveRobuxNeeded)}
                  </Td>
                  <Td numeric className="tabular">
                    {formatRobux(t.locale, row.remainingRobux)}
                  </Td>
                  <Td className="tabular">
                    {mode === "pace"
                      ? row.projected === null
                        ? t("calculator.planner.notAtThisPace")
                        : row.projected.days === 0
                          ? t("calculator.planner.alreadyReached")
                          : days(t, row.projected.days)
                      : row.requiredPace === null
                        ? t("calculator.planner.pickFutureDate")
                        : row.remainingRobux === 0n
                          ? t("calculator.planner.alreadyReached")
                          : `${formatRobux(t.locale, row.requiredPace.perDayRobux)} R$`}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>

        <Callout tone="warning" title={t("calculator.planner.whatThisIsNot")} className="mt-6">
          <p>
            {t("calculator.planner.prose.estimateNotice", {
              minimumRobux: formatRobux(t.locale, BigInt(requirement.minimumRobux)),
            })}
          </p>
        </Callout>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------

/**
 * A count of days, weeks or months, in words.
 *
 * Separate keys for one and for many rather than an `s` appended in code:
 * Turkish and Indonesian have one form, French counts zero as singular, and
 * no amount of concatenation makes that work.
 */
function days(t: Translate, count: number): string {
  return plural(t, t.locale, "common.spans.days", count, { days: String(count) });
}

function weeks(t: Translate, count: number): string {
  return plural(t, t.locale, "common.spans.weeks", count, { weeks: String(count) });
}

function months(t: Translate, count: number): string {
  return plural(t, t.locale, "common.spans.months", count, { months: String(count) });
}
function PaceOutcome({
  plan,
  t,
  knowsReaderDay,
}: {
  plan: ReturnType<typeof planEarnings>;
  readonly t: Translate;
  /**
   * Whether the reader's own calendar is known yet.
   *
   * The projected date is `startDate + days`, and before hydration
   * `startDate` is the *build's* day — this page is prerendered. The number of
   * days does not depend on the start, so it is true either way; the date is
   * not, and a date that is weeks out is worse than no date. It appears in the
   * same commit the reader's day does.
   */
  readonly knowsReaderDay: boolean;
}) {
  const { projected, requirement, suppliedPerDayRobux } = plan;

  if (requirement.alreadyReached) {
    return (
      <Outcome
        headline={t("calculator.planner.alreadyEnoughHeadline")}
        detail={t("calculator.planner.alreadyEnoughDetail", {
          current: formatRobux(t.locale, requirement.currentRobux),
          needed: formatRobux(t.locale, requirement.effectiveRobuxNeeded),
        })}
      />
    );
  }

  if (projected === null) {
    return (
      <Outcome
        headline={t("calculator.planner.zeroEarningsHeadline")}
        detail={t("calculator.planner.zeroEarnings")}
        muted
      />
    );
  }

  return (
    <Outcome
      headline={
        knowsReaderDay
          ? t("calculator.planner.paceHeadline", {
              days: days(t, projected.days),
              date: formatPlanDate(projected.date),
            })
          : t("calculator.planner.paceHeadlineNoDate", { days: days(t, projected.days) })
      }
      detail={t("calculator.planner.paceDetail", {
        perDay: formatRobux(t.locale, suppliedPerDayRobux ?? 0n),
        weeks: weeks(t, projected.weeks),
        months: months(t, projected.months),
      })}
    />
  );
}

function DeadlineOutcome({
  plan,
  t,
}: {
  plan: ReturnType<typeof planEarnings>;
  readonly t: Translate;
}) {
  const { required, requirement, deadlineHasPassed } = plan;

  if (requirement.alreadyReached) {
    return (
      <Outcome
        headline={t("calculator.planner.alreadyEnoughHeadline")}
        detail={t("calculator.planner.alreadyThere")}
      />
    );
  }

  if (deadlineHasPassed) {
    return (
      <Outcome
        headline={t("calculator.planner.datePassedHeadline")}
        detail={t("calculator.planner.pickFutureDate")}
        muted
      />
    );
  }

  if (required === null) {
    return (
      <Outcome
        headline={t("calculator.planner.pickDateHeadline")}
        detail={t("calculator.planner.withADate")}
        muted
      />
    );
  }

  return (
    <Outcome
      headline={t("calculator.planner.requiredHeadline", {
        perDay: formatRobux(t.locale, required.perDayRobux),
      })}
      detail={t("calculator.planner.requiredDetail", {
        perWeek: formatRobux(t.locale, required.perWeekRobux),
        perMonth: formatRobux(t.locale, required.perMonthRobux),
      })}
    />
  );
}

function Outcome({
  headline,
  detail,
  muted = false,
}: {
  headline: string;
  detail: string;
  muted?: boolean;
}) {
  return (
    <>
      {/*
        Announced as one settled result rather than on every keystroke. The
        region is polite and holds a whole sentence, so a screen reader hears
        the answer, not a running commentary on the digits being typed.
      */}
      <p
        aria-live="polite"
        className={cx(
          "text-xl font-bold text-balance",
          muted ? "text-(--color-text-muted)" : "text-(--color-text)",
        )}
      >
        {headline}
      </p>
      <p className="mt-2 text-sm text-(--color-text-muted)">{detail}</p>
    </>
  );
}

function Figure({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium tracking-wide text-(--color-text-muted) uppercase">
        {label}
      </p>
      <p className="tabular mt-1 text-lg font-bold text-(--color-text)">{value}</p>
      {note ? <p className="mt-1 text-sm text-(--color-text-muted)">{note}</p> : null}
    </div>
  );
}

function ModeButton({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cx(
        "min-h-[44px] rounded-(--radius-control) border px-4 text-sm font-semibold",
        selected
          ? "border-(--color-primary) bg-(--color-primary) text-(--color-on-primary)"
          : "border-(--color-border-strong) bg-(--color-surface) text-(--color-text)",
      )}
    >
      {label}
    </button>
  );
}

function Field({
  id,
  label,
  suffix,
  value,
  onChange,
  hint,
  invalid = false,
  placeholder,
  compact = false,
}: {
  id: string;
  label: string;
  suffix: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  invalid?: boolean;
  placeholder?: string;
  compact?: boolean;
}) {
  const hintId = `${id}-hint`;
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className={cx(
          "block font-semibold text-(--color-text)",
          compact ? "text-sm" : "text-sm",
        )}
      >
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2">
        <input
          id={id}
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid}
          aria-describedby={hint ? hintId : undefined}
          className="tabular min-h-[44px] w-full min-w-0 rounded-(--radius-control) border border-(--color-border-strong) bg-(--color-surface) px-3 py-2.5 text-(--color-text)"
        />
        <span aria-hidden="true" className="shrink-0 text-sm text-(--color-text-muted)">
          {suffix}
        </span>
      </div>
      {hint ? (
        <p id={hintId} className="mt-2 text-sm text-(--color-text-muted)">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** A plan date, written the way the rest of the site writes dates. */
function formatPlanDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
