"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  calculateComparison,
  calculateQuick,
  calculateSplit,
  calculateTarget,
  legacyRateId,
  standardRateId,
  us18RateId,
} from "@/lib/calculations/devex";
import { Rational } from "@/lib/calculations/rational";
import {
  parseCurrencyAmount,
  parsePercent,
  parseRobuxAmount,
} from "@/lib/calculations/parse-amount";
import {
  getRate,
  maxRobuxInput,
  maxUsdTargetInput,
  minimumEarnedRobux,
} from "@/lib/calculations/rate-registry";
import {
  formatCurrency,
  formatRate,
  formatRobux,
  isSupportedCurrency,
  minorUnitsFor,
} from "@/lib/calculations/format";
import { Card, Disclosure, cx } from "@/components/ui";
import { useClientValue } from "@/lib/utilities/use-client-value";
import { convertToCurrency, useFxRates } from "@/features/fx/use-fx";
import {
  AmountInput,
  CurrencySelector,
  ModeTabs,
  PercentInput,
  QuickPresets,
  RateSelector,
  type ModeOption,
} from "./components/controls";
import {
  FxNote,
  ResultAnnouncer,
  ResultBreakdown,
  ResultSummary,
  ScenarioComparison,
  TargetBreakdown,
  ThresholdMeter,
} from "./components/results";
import { CopyButton, ResetButton, ShareButton } from "./components/actions";
import {
  addHistoryEntry,
  clearHistory,
  loadHistory,
  loadPreferences,
  savePreferences,
  type HistoryEntry,
} from "./storage";
import {
  defaultState,
  isEmptyState,
  parseCalculatorState,
  serialiseCalculatorState,
  type CalculatorMode,
  type CalculatorState,
} from "./url-state";

/**
 * The calculator island.
 *
 * This is the only substantial client component on the site. Everything around
 * it — headings, rate tables, formulas, examples, FAQs, links — is server
 * rendered, so the page still explains itself completely with JavaScript
 * disabled. What is lost without JS is live recalculation, not comprehension.
 *
 * `initialState` is parsed and validated on the server from the query string,
 * so a shared link renders its state into the initial HTML rather than
 * flashing defaults and then correcting itself.
 *
 * No arithmetic happens here. Every figure comes from the engine in
 * src/lib/calculations, which is where the formulas are tested.
 */

const MODE_OPTIONS: readonly ModeOption[] = [
  { id: "quick", label: "Quick", description: "One amount, one rate" },
  { id: "advanced", label: "Split", description: "Mixed balance across rate buckets" },
  { id: "target", label: "Target", description: "Work back from a payout goal" },
];

export interface CalculatorProps {
  readonly initialState: CalculatorState;
  /** Where the share link points; the page's own clean route. */
  readonly pathname: string;
  /** Hides the mode tabs when a page only needs one mode. */
  readonly lockedMode?: CalculatorMode;
  readonly showHistory?: boolean;
}

export function Calculator({
  initialState,
  pathname,
  lockedMode,
  showHistory = true,
}: CalculatorProps) {
  const [state, setState] = useState<CalculatorState>(initialState);
  const [announcement, setAnnouncement] = useState("");

  const mode = lockedMode ?? state.mode;

  /*
   * Stored preferences are read through `useClientValue`, which renders the
   * server snapshot during hydration and swaps in the real value in the same
   * commit. Seeding them with `useState` plus a mount effect would cause a
   * cascading render, and reading storage during render would make the server
   * and client markup disagree.
   *
   * Each preference pairs a stored value with an optional in-session override.
   * The override is written only from an event handler, never from an effect.
   */
  const storedCurrency = useClientValue(() => loadPreferences().currency ?? "", "");
  const storedAdvancedOpen = useClientValue(() => loadPreferences().advancedOpen === true, false);
  const storedHistoryJson = useClientValue(
    () => (showHistory ? JSON.stringify(loadHistory()) : "[]"),
    "[]",
  );

  const [currencyChoice, setCurrencyChoice] = useState<string | null>(
    // A currency in the URL was explicit, so it outranks the stored default.
    initialState.currency !== "USD" ? initialState.currency : null,
  );
  const [advancedOverride, setAdvancedOverride] = useState<boolean | null>(null);
  const [historyOverride, setHistoryOverride] = useState<HistoryEntry[] | null>(null);

  const currency =
    currencyChoice ?? (isSupportedCurrency(storedCurrency) ? storedCurrency : "USD");
  const advancedOpen = advancedOverride ?? storedAdvancedOpen;

  const storedHistory = useMemo<HistoryEntry[]>(() => {
    try {
      return JSON.parse(storedHistoryJson) as HistoryEntry[];
    } catch {
      return [];
    }
  }, [storedHistoryJson]);
  const history = historyOverride ?? storedHistory;

  const update = useCallback((patch: Partial<CalculatorState>) => {
    setState((current) => ({ ...current, ...patch }));
  }, []);

  const selectCurrency = useCallback((value: string) => {
    setCurrencyChoice(value);
    savePreferences({ currency: value });
  }, []);

  // ---- Parsing -----------------------------------------------------------

  const quickParse = useMemo(
    () => (state.robux.trim() === "" ? null : parseRobuxAmount(state.robux, maxRobuxInput)),
    [state.robux],
  );
  const standardParse = useMemo(
    () =>
      state.standardRobux.trim() === ""
        ? null
        : parseRobuxAmount(state.standardRobux, maxRobuxInput),
    [state.standardRobux],
  );
  const legacyParse = useMemo(
    () =>
      state.legacyRobux.trim() === "" ? null : parseRobuxAmount(state.legacyRobux, maxRobuxInput),
    [state.legacyRobux],
  );
  const us18Parse = useMemo(
    () => (state.us18Robux.trim() === "" ? null : parseRobuxAmount(state.us18Robux, maxRobuxInput)),
    [state.us18Robux],
  );
  const targetParse = useMemo(
    () =>
      state.targetUsd.trim() === ""
        ? null
        : parseCurrencyAmount(state.targetUsd, maxUsdTargetInput, minorUnitsFor(currency)),
    [state.targetUsd, currency],
  );
  const currentParse = useMemo(
    () =>
      state.currentRobux.trim() === ""
        ? null
        : parseRobuxAmount(state.currentRobux, maxRobuxInput),
    [state.currentRobux],
  );
  const feeParse = useMemo(() => parsePercent(state.feePercent), [state.feePercent]);
  const flatFeeParse = useMemo(
    () => parseCurrencyAmount(state.flatFeeUsd || "0", 10_000, 2),
    [state.flatFeeUsd],
  );
  const taxParse = useMemo(() => parsePercent(state.taxPercent), [state.taxPercent]);

  const errorOf = (result: ReturnType<typeof parseRobuxAmount> | null): string | null =>
    result && !result.ok ? result.message : null;

  // ---- Currency ----------------------------------------------------------

  const needsFx = currency !== "USD";
  const fx = useFxRates(needsFx);
  const convert = useCallback(
    (usd: Rational): { value: Rational; currency: string } => {
      const converted = convertToCurrency(usd, currency, fx.rates);
      // Fall back to USD rather than showing a blank or a wrong-currency figure.
      return converted === null
        ? { value: usd, currency: "USD" }
        : { value: converted, currency };
    },
    [currency, fx.rates],
  );

  // ---- Results -----------------------------------------------------------

  const quickResult = useMemo(() => {
    const robux = quickParse?.ok ? quickParse.value.robux : 0n;
    return calculateQuick({ robux, rateId: state.rateId });
  }, [quickParse, state.rateId]);

  const fees = useMemo(
    () => ({
      feePercent: feeParse.ok ? feeParse.value : Rational.ZERO,
      flatFeeUsd: flatFeeParse.ok ? flatFeeParse.value : Rational.ZERO,
      taxPercent: taxParse.ok ? taxParse.value : Rational.ZERO,
    }),
    [feeParse, flatFeeParse, taxParse],
  );

  const splitResult = useMemo(
    () =>
      calculateSplit(
        {
          standardRobux: standardParse?.ok ? standardParse.value.robux : 0n,
          legacyRobux: legacyParse?.ok ? legacyParse.value.robux : 0n,
          us18Robux: us18Parse?.ok ? us18Parse.value.robux : 0n,
        },
        fees,
      ),
    [standardParse, legacyParse, us18Parse, fees],
  );

  const targetResult = useMemo(
    () =>
      calculateTarget({
        targetUsd: targetParse?.ok ? targetParse.value : Rational.ZERO,
        rateId: state.rateId,
        ...(currentParse?.ok ? { currentRobux: currentParse.value.robux } : {}),
      }),
    [targetParse, state.rateId, currentParse],
  );

  const comparisonAmount =
    mode === "advanced" ? splitResult.totalRobux : quickResult.robux;
  const comparison = useMemo(() => calculateComparison(comparisonAmount), [comparisonAmount]);

  // ---- Announcements -----------------------------------------------------

  const announceResult = useMemo(() => {
    if (mode === "target") {
      if (!targetParse?.ok) return "";
      return `${formatRobux(targetResult.requiredRobux)} Earned Robux are needed for ${formatCurrency(
        targetResult.targetUsd,
        "USD",
      )}.`;
    }
    if (mode === "advanced") {
      if (splitResult.totalRobux === 0n) return "";
      const { value, currency } = convert(splitResult.grossUsd);
      return `${formatRobux(splitResult.totalRobux)} Earned Robux across all buckets is about ${formatCurrency(value, currency)}.`;
    }
    if (!quickParse?.ok) return "";
    const { value, currency } = convert(quickResult.grossUsd);
    return `${formatRobux(quickResult.robux)} Earned Robux is about ${formatCurrency(value, currency)} at the ${quickResult.rate.label}.`;
  }, [mode, quickParse, quickResult, splitResult, targetParse, targetResult, convert]);

  // ---- Share and copy ----------------------------------------------------

  const query = useMemo(
    () => serialiseCalculatorState({ ...state, currency, mode }),
    [state, currency, mode],
  );

  // Empty during hydration, which is correct: a share link is only meaningful
  // once there is a real origin to build it from.
  const origin = useClientValue(() => window.location.origin, "");
  const shareUrl = `${origin}${pathname}${query}`;

  /*
   * Reflect state in the address bar so a reload keeps the calculation and the
   * back button does something sensible.
   *
   * Typing uses `replaceState`, because pushing an entry per keystroke would
   * make the back button walk backwards through "10000", "1000", "100". A mode
   * change pushes a real entry, since switching tabs is a deliberate step a
   * reader expects to be able to undo.
   */
  const previousMode = useRef(mode);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = `${pathname}${query}`;
    if (`${window.location.pathname}${window.location.search}` === next) return;

    const modeChanged = previousMode.current !== mode;
    previousMode.current = mode;

    if (modeChanged) {
      window.history.pushState(null, "", next);
    } else {
      window.history.replaceState(null, "", next);
    }
  }, [pathname, query, mode]);

  // Keep the calculator in step when the reader navigates with back or forward.
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onPopState() {
      setState(parseCalculatorState(new URLSearchParams(window.location.search)));
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const summaryText = useMemo(() => {
    if (mode === "target" && targetParse?.ok) {
      return [
        `Payout target: ${formatCurrency(targetResult.targetUsd, "USD")}`,
        `Rate: ${targetResult.rate.label} ($${formatRate(targetResult.rateValue)} per Robux)`,
        `Earned Robux needed: ${formatRobux(targetResult.requiredRobux)}`,
        targetResult.requirementIsBelowMinimum
          ? `Minimum applies: ${formatRobux(targetResult.effectiveRobuxNeeded)} in practice`
          : null,
        `Estimate from devexcalculator.org — not a guarantee of approval.`,
      ]
        .filter(Boolean)
        .join("\n");
    }

    if (mode === "advanced" && splitResult.totalRobux > 0n) {
      const { value, currency } = convert(splitResult.grossUsd);
      return [
        `Earned Robux: ${formatRobux(splitResult.totalRobux)}`,
        ...splitResult.buckets
          .filter((bucket) => bucket.robux > 0n)
          .map(
            (bucket) =>
              `  ${bucket.rate.label}: ${formatRobux(bucket.robux)} = ${formatCurrency(bucket.usd, "USD")}`,
          ),
        `Gross payout: ${formatCurrency(value, currency)}`,
        splitResult.feesApplied || splitResult.taxApplied
          ? `After your fee and tax estimates: ${formatCurrency(splitResult.netAfterEstimateUsd, "USD")}`
          : null,
        `Estimate from devexcalculator.org — not a guarantee of approval.`,
      ]
        .filter(Boolean)
        .join("\n");
    }

    if (quickParse?.ok) {
      const { value, currency } = convert(quickResult.grossUsd);
      return [
        `Earned Robux: ${formatRobux(quickResult.robux)}`,
        `Rate: ${quickResult.rate.label} ($${formatRate(quickResult.rateValue)} per Robux)`,
        `Estimated payout: ${formatCurrency(value, currency)}`,
        `Minimum: ${quickResult.threshold.state === "meets-minimum" ? "met" : `${formatRobux(quickResult.threshold.shortfallRobux)} short`}`,
        `Estimate from devexcalculator.org — not a guarantee of approval.`,
      ].join("\n");
    }

    return "";
  }, [mode, quickParse, quickResult, splitResult, targetParse, targetResult, convert]);

  const primaryValueText = useMemo(() => {
    if (mode === "target") return formatRobux(targetResult.requiredRobux);
    const usd = mode === "advanced" ? splitResult.grossUsd : quickResult.grossUsd;
    const { value, currency } = convert(usd);
    return formatCurrency(value, currency);
  }, [mode, quickResult, splitResult, targetResult, convert]);

  // ---- History -----------------------------------------------------------

  const saveToHistory = useCallback(() => {
    if (summaryText === "") return;
    const label =
      mode === "target"
        ? `Target ${formatCurrency(targetResult.targetUsd, "USD")}`
        : `${formatRobux(mode === "advanced" ? splitResult.totalRobux : quickResult.robux)} Robux`;
    setHistoryOverride(addHistoryEntry({ label, result: primaryValueText, query }));
    setAnnouncement("Calculation saved to this browser.");
  }, [summaryText, mode, targetResult, splitResult, quickResult, primaryValueText, query]);

  // ---- Render ------------------------------------------------------------

  const hasData = !isEmptyState(state);
  const currentRate = getRate(state.rateId);

  return (
    <Card className="scroll-mt-24" as="section">
      <h2 className="sr-only">DevEx payout calculator</h2>

      {!lockedMode ? (
        <ModeTabs
          options={MODE_OPTIONS}
          value={mode}
          onChange={(next) => update({ mode: next as CalculatorMode })}
        />
      ) : null}

      <div
        id={`mode-panel-${mode}`}
        role={lockedMode ? undefined : "tabpanel"}
        aria-labelledby={lockedMode ? undefined : `mode-tab-${mode}`}
        tabIndex={lockedMode ? undefined : 0}
        className={cx("grid min-w-0 gap-6 lg:grid-cols-2", lockedMode ? "" : "mt-5")}
      >
        {/* ---- Inputs ---- */}
        <div className="flex min-w-0 flex-col gap-5">
          {mode === "quick" ? (
            <>
              <AmountInput
                label="Eligible Earned Robux"
                value={state.robux}
                onChange={(value) => update({ robux: value })}
                error={errorOf(quickParse)}
                hint="Type or paste an amount. 100,000, 100k and 1.5m all work."
                autoFocus={false}
              />
              <QuickPresets
                activeValue={quickParse?.ok ? quickParse.value.robux.toString() : ""}
                onSelect={(value) => update({ robux: value.toString() })}
              />
              <RateSelector
                value={state.rateId}
                onChange={(value) => {
                  update({ rateId: value });
                  savePreferences({ lastRateId: value });
                }}
              />
            </>
          ) : null}

          {mode === "advanced" ? (
            <>
              <p className="text-sm text-(--color-text-muted)">
                Enter each part of your balance separately. Nothing is counted
                twice — every Robux belongs to exactly one bucket, and you are
                the one who decides which. Roblox makes the real split.
              </p>
              <AmountInput
                label={`${getRate(standardRateId).label} bucket`}
                value={state.standardRobux}
                onChange={(value) => update({ standardRobux: value })}
                error={errorOf(standardParse)}
                hint="Earned after 5 September 2025."
              />
              <AmountInput
                label={`${getRate(legacyRateId).label} bucket`}
                value={state.legacyRobux}
                onChange={(value) => update({ legacyRobux: value })}
                error={errorOf(legacyParse)}
                hint="Earned before the September 2025 transition."
              />
              <AmountInput
                label={`${getRate(us18RateId).label} bucket`}
                value={state.us18Robux}
                onChange={(value) => update({ us18Robux: value })}
                error={errorOf(us18Parse)}
                hint="Only the portion Roblox has qualified at this rate."
              />
            </>
          ) : null}

          {mode === "target" ? (
            <>
              <AmountInput
                label="Payout target"
                value={state.targetUsd}
                onChange={(value) => update({ targetUsd: value })}
                error={targetParse && !targetParse.ok ? targetParse.message : null}
                hint="How much you want to receive, before fees and tax."
                placeholder="1,000"
                suffix="USD"
              />
              <RateSelector
                value={state.rateId}
                onChange={(value) => update({ rateId: value })}
              />
              <AmountInput
                label="Your current balance (optional)"
                value={state.currentRobux}
                onChange={(value) => update({ currentRobux: value })}
                error={errorOf(currentParse)}
                hint="Add this to see how far along you are."
                placeholder="0"
              />
            </>
          ) : null}

          <CurrencySelector value={currency} onChange={selectCurrency} />

          <Disclosure
            summary="Optional: payment fees and your own tax estimate"
            defaultOpen={advancedOpen}
          >
            <div className="flex flex-col gap-4">
              <p>
                These are your figures, not amounts Roblox or any provider has
                quoted. This site gives no tax advice.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <PercentInput
                  label="Payment provider fee"
                  value={state.feePercent}
                  onChange={(value) => {
                    update({ feePercent: value });
                    setAdvancedOverride(true);
                    savePreferences({ advancedOpen: true });
                  }}
                  error={feeParse.ok ? null : feeParse.message}
                  placeholder="2.9"
                />
                <PercentInput
                  label="Flat fee per payout"
                  value={state.flatFeeUsd}
                  onChange={(value) => update({ flatFeeUsd: value })}
                  error={flatFeeParse.ok ? null : flatFeeParse.message}
                  placeholder="0.30"
                  suffix="$"
                />
              </div>
              <PercentInput
                label="Your own tax estimate"
                value={state.taxPercent}
                onChange={(value) => update({ taxPercent: value })}
                error={taxParse.ok ? null : taxParse.message}
                hint="Whatever rate applies to you. Check with a qualified adviser."
                placeholder="20"
              />
            </div>
          </Disclosure>
        </div>

        {/* ---- Results ---- */}
        <div className="flex min-w-0 flex-col gap-5">
          <ResultSummary
            primaryLabel={
              mode === "target" ? "Eligible Earned Robux needed" : "Estimated DevEx payout"
            }
            primaryValue={primaryValueText}
            secondary={
              mode === "target" ? (
                <>at the {targetResult.rate.label}, rounded up to whole Robux</>
              ) : mode === "advanced" ? (
                <>
                  gross, before fees and tax, from{" "}
                  {formatRobux(splitResult.totalRobux)} Earned Robux
                </>
              ) : (
                <>
                  at the {currentRate.label} of ${formatRate(quickResult.rateValue)} per Robux
                </>
              )
            }
          >
            <div className="flex flex-col gap-4">
              {mode === "target" ? (
                <TargetBreakdown result={targetResult} />
              ) : (
                <ThresholdMeter
                  threshold={mode === "advanced" ? splitResult.threshold : quickResult.threshold}
                />
              )}
              <FxNote rates={fx.rates} currency={currency} status={fx.status} error={fx.error} />
            </div>
          </ResultSummary>

          {mode === "advanced" && splitResult.totalRobux > 0n ? (
            <ResultBreakdown result={splitResult} />
          ) : null}

          {mode !== "target" && comparisonAmount > 0n ? (
            <div>
              <h3 className="text-sm font-semibold text-(--color-text)">
                What each rate would pay
              </h3>
              <p className="mb-2 mt-1 text-xs text-(--color-text-muted)">
                Roblox decides which rate applies to which part of your balance.
                This is not a choice you can make.
              </p>
              <ScenarioComparison comparison={comparison} />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <CopyButton
              label="Copy result"
              text={primaryValueText}
              variant="primary"
              onAnnounce={setAnnouncement}
            />
            <CopyButton label="Copy summary" text={summaryText} onAnnounce={setAnnouncement} />
            <ShareButton
              url={shareUrl}
              title="DevEx payout estimate"
              onAnnounce={setAnnouncement}
            />
            <ResetButton
              hasData={hasData}
              onReset={() => setState({ ...defaultState, mode, currency })}
              onAnnounce={setAnnouncement}
            />
          </div>

          {showHistory ? (
            <HistoryPanel
              history={history}
              canSave={summaryText !== ""}
              onSave={saveToHistory}
              onClear={() => {
                clearHistory();
                setHistoryOverride([]);
                setAnnouncement("Saved calculations cleared.");
              }}
              pathname={pathname}
            />
          ) : null}
        </div>
      </div>

      <ResultAnnouncer message={announcement || announceResult} />

      <p className="mt-5 border-t border-(--color-border) pt-4 text-xs text-(--color-text-muted)">
        Estimates use the rates Roblox currently documents. The{" "}
        {formatRobux(minimumEarnedRobux)} Earned Robux minimum is a requirement
        to submit a request, not an approval. Roblox decides which Robux qualify
        and whether any request succeeds.
      </p>
    </Card>
  );
}

function HistoryPanel({
  history,
  canSave,
  onSave,
  onClear,
  pathname,
}: {
  history: readonly HistoryEntry[];
  canSave: boolean;
  onSave: () => void;
  onClear: () => void;
  pathname: string;
}) {
  return (
    <Disclosure summary={`Saved calculations (${history.length})`}>
      <div className="flex flex-col gap-3">
        <p className="text-xs">
          Saved only in this browser. Nothing is uploaded, and clearing your
          browser data removes them.
        </p>
        {history.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {history.map((entry) => (
              <li key={entry.id}>
                <a
                  href={`${pathname}${entry.query}`}
                  className="flex min-h-[44px] items-center justify-between gap-3 rounded-(--radius-control) border border-(--color-border) px-3 py-2 hover:bg-(--color-surface-subtle)"
                >
                  <span className="text-(--color-text)">{entry.label}</span>
                  <span className="tabular font-semibold text-(--color-text)">{entry.result}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs italic">Nothing saved yet.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="min-h-[44px] rounded-(--radius-control) border border-(--color-border-strong) px-3 text-sm font-semibold text-(--color-text) disabled:opacity-50"
          >
            Save this calculation
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={history.length === 0}
            className="min-h-[44px] rounded-(--radius-control) px-3 text-sm font-semibold text-(--color-danger) disabled:opacity-50"
          >
            Clear history
          </button>
        </div>
      </div>
    </Disclosure>
  );
}
