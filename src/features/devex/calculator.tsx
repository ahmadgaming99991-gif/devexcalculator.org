"use client";

import { parseMessage } from "@/i18n/parse-message";
import { translatorFor, type LocaleWords } from "@/i18n/client-words";
import type { Translate } from "@/i18n/get-dictionary";
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
  formatDecimal,
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
  StickyResult,
  TargetBreakdown,
  ThresholdMeter,
} from "./components/results";
import { CopyButton, ResetButton, ShareButton } from "./components/actions";
import { earlyTypedPatch } from "./early-input";
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

/**
 * The query string as it was when the page loaded.
 *
 * Read once, when this module first evaluates in the browser, rather than on
 * every render: the calculator rewrites the address bar on each keystroke, so
 * a snapshot that re-read `location.search` would return a new value
 * constantly and `useSyncExternalStore` would never settle.
 *
 * This is what replaced the server's `searchParams`. The two pages that host
 * this component with no other dynamic input — `/` and
 * `/devex-fees-and-taxes/` — were rendering per request for that one reason,
 * and with seven published locales the homepage render crossed the Worker's
 * CPU allowance and returned `error 1102` to readers. They are prerendered now, so the
 * shared link is no longer read on the server. It is read here and adopted in
 * the hydration commit, which is the same mechanism the stored currency
 * preference below already uses.
 */
const initialSearch = typeof window === "undefined" ? "" : window.location.search;

const modeOptions = (t: Translate): readonly ModeOption[] => [
  { id: "quick", label: t("calculator.modes.quick.label"), description: t("calculator.modes.quick.description") },
  { id: "advanced", label: t("calculator.modes.advanced.label"), description: t("calculator.modes.advanced.description") },
  { id: "target", label: t("calculator.modes.target.label"), description: t("calculator.modes.target.description") },
];

export interface CalculatorProps {
  readonly initialState: CalculatorState;
  /**
   * Where the share link points, and what the address bar is rewritten to:
   * the page's own clean route, **in the reader's language**.
   *
   * It must be `localizedPath(locale, ROUTE)`, not the bare English route.
   * Every calculator view passed `ROUTE`, so on `/de/` the effect below saw a
   * pathname that never matched, rewrote the address bar to `/` on mount, and
   * every share link and every keystroke afterwards pointed at the English
   * page. A reader could not tell, because `replaceState` does not navigate —
   * until they reloaded, or sent the link, and arrived in English.
   */
  readonly pathname: string;
  /** Hides the mode tabs when a page only needs one mode. */
  readonly lockedMode?: CalculatorMode;
  readonly showHistory?: boolean;
  readonly words: LocaleWords;
  /** BCP 47 tag. Reaches `Intl` for currency names and number formats. */
  readonly locale: string;
}

export function Calculator({
  initialState,
  pathname,
  lockedMode,
  showHistory = true,
  words,
  locale,
}: CalculatorProps) {
  const t = useMemo(() => translatorFor(words), [words]);
  /*
   * Where the calculator's state comes from, in order of precedence.
   *
   * `useClientValue` renders the server snapshot — an empty query — during
   * hydration and swaps the real one in on the same commit, so the prerendered
   * HTML and the first client render agree, and a shared link still opens on
   * its own state rather than flashing defaults and correcting itself.
   *
   * `stateOverride` is the reader's own edits, in the shape the stored
   * preferences below already use: null until somebody touches something,
   * the whole state afterwards. It is written from event handlers and from
   * `popstate`, never from an effect.
   */
  const hydratedSearch = useClientValue(() => initialSearch, "");

  /**
   * Whether the client has read the address bar yet.
   *
   * `hydratedSearch` cannot answer this: its server snapshot is `""`, and `""`
   * is also what a page with no query legitimately has. The two are
   * indistinguishable, and the URL effect below treated both as "no state",
   * so on the hydration commit it rewrote a shared `/?robux=100000` to `/`
   * before the real search had arrived.
   *
   * It self-corrected a tick later, which is why it looked harmless. It was
   * not: anything that read the address bar inside that window got the
   * stripped URL — including a reload, which is how the reader loses the
   * calculation a shared link was supposed to carry. It reproduced roughly one
   * run in six once GA4 was added and there was more work on the main thread
   * to widen the gap; the race predates it.
   */
  const searchIsKnown = useClientValue(() => true, false);
  const urlState = useMemo(
    () =>
      hydratedSearch === ""
        ? initialState
        : parseCalculatorState(new URLSearchParams(hydratedSearch)),
    [hydratedSearch, initialState],
  );
  const [stateOverride, setStateOverride] = useState<CalculatorState | null>(null);

  /*
   * Anything typed before this component existed.
   *
   * Read through `useClientValue` for the same reason the stored preferences
   * below are: it renders the server's snapshot during hydration and swaps the
   * real one in on the same commit, so the markup never disagrees. An effect
   * that called `update()` would work, but it would also be the one thing this
   * component is careful never to do — overrides are written from event
   * handlers, and an effect that seeds state costs a second render besides.
   *
   * `earlyTypedPatch` memoises the claim at module scope, because
   * `useSyncExternalStore` requires a snapshot that does not change between
   * calls and `claimEarlyInput` deliberately empties itself as it is read.
   */
  const earlyTypedJson = useClientValue(earlyTypedPatch, "{}");
  const earlyTyped = useMemo(
    () => JSON.parse(earlyTypedJson) as Partial<CalculatorState>,
    [earlyTypedJson],
  );

  /*
   * The reader's own edits win; below them, whatever was typed before
   * hydration; below that, the address bar. `update` merges onto this same
   * base, so the first keystroke after hydration cannot drop the ones before
   * it.
   */
  const baseState = useMemo(() => ({ ...urlState, ...earlyTyped }), [urlState, earlyTyped]);
  const state = stateOverride ?? baseState;
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

  const [currencyChoice, setCurrencyChoice] = useState<string | null>(null);
  const [advancedOverride, setAdvancedOverride] = useState<boolean | null>(null);
  const [historyOverride, setHistoryOverride] = useState<HistoryEntry[] | null>(null);

  /*
   * A currency in the URL was explicit, so it outranks the stored default —
   * but it is read from the hydrated state rather than from a prop, because
   * the server no longer sees the query string.
   */
  const urlCurrency = urlState.currency !== "USD" ? urlState.currency : null;
  const currency =
    currencyChoice ?? urlCurrency ?? (isSupportedCurrency(storedCurrency) ? storedCurrency : "USD");
  const advancedOpen = advancedOverride ?? storedAdvancedOpen;

  const storedHistory = useMemo<HistoryEntry[]>(() => {
    try {
      return JSON.parse(storedHistoryJson) as HistoryEntry[];
    } catch {
      return [];
    }
  }, [storedHistoryJson]);
  const history = historyOverride ?? storedHistory;

  const update = useCallback(
    (patch: Partial<CalculatorState>) => {
      setStateOverride((current) => ({ ...(current ?? baseState), ...patch }));
    },
    [baseState],
  );

  const selectCurrency = useCallback((value: string) => {
    setCurrencyChoice(value);
    savePreferences({ currency: value });
  }, []);

  // ---- Parsing -----------------------------------------------------------

  const quickParse = useMemo(
    () => (state.robux.trim() === "" ? null : parseRobuxAmount(state.robux, maxRobuxInput, t.locale)),
    [state.robux, t.locale],
  );
  const standardParse = useMemo(
    () =>
      state.standardRobux.trim() === ""
        ? null
        : parseRobuxAmount(state.standardRobux, maxRobuxInput, t.locale),
    [state.standardRobux, t.locale],
  );
  const legacyParse = useMemo(
    () =>
      state.legacyRobux.trim() === "" ? null : parseRobuxAmount(state.legacyRobux, maxRobuxInput, t.locale),
    [state.legacyRobux, t.locale],
  );
  const us18Parse = useMemo(
    () => (state.us18Robux.trim() === "" ? null : parseRobuxAmount(state.us18Robux, maxRobuxInput, t.locale)),
    [state.us18Robux, t.locale],
  );
  const targetParse = useMemo(
    () =>
      state.targetUsd.trim() === ""
        ? null
        : parseCurrencyAmount(state.targetUsd, maxUsdTargetInput, minorUnitsFor(currency), t.locale),
    [state.targetUsd, currency, t.locale],
  );
  const currentParse = useMemo(
    () =>
      state.currentRobux.trim() === ""
        ? null
        : parseRobuxAmount(state.currentRobux, maxRobuxInput, t.locale),
    [state.currentRobux, t.locale],
  );
  const feeParse = useMemo(() => parsePercent(state.feePercent), [state.feePercent]);
  const flatFeeParse = useMemo(
    () => parseCurrencyAmount(state.flatFeeUsd || "0", 10_000, 2, t.locale),
    [state.flatFeeUsd, t.locale],
  );
  const taxParse = useMemo(() => parsePercent(state.taxPercent), [state.taxPercent]);

  const errorOf = (result: ReturnType<typeof parseRobuxAmount> | null): string | null =>
    parseMessage(t, result);

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
      return `${formatRobux(t.locale, targetResult.requiredRobux)} Earned Robux are needed for ${formatCurrency(t.locale, 
        targetResult.targetUsd,
        "USD",
      )}.`;
    }
    if (mode === "advanced") {
      if (splitResult.totalRobux === 0n) return "";
      const { value, currency } = convert(splitResult.grossUsd);
      return t("calculator.results.announceSplit", {
        robux: formatRobux(t.locale, splitResult.totalRobux),
        value: formatCurrency(t.locale, value, currency),
      });
    }
    if (!quickParse?.ok) return "";
    const { value, currency } = convert(quickResult.grossUsd);
    return t("calculator.results.announceQuick", {
      robux: formatRobux(t.locale, quickResult.robux),
      value: formatCurrency(t.locale, value, currency),
      rate: quickResult.rate.label,
    });
  }, [
    mode,
    quickParse,
    quickResult,
    splitResult,
    targetParse,
    targetResult,
    convert,
    t,
  ]);

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
    /*
     * Nothing is written until the client has actually read the address bar.
     * Before that the state here is the prerendered default, and writing it
     * would erase whatever the reader arrived with.
     */
    if (!searchIsKnown) return;
    const next = `${pathname}${query}`;
    if (`${window.location.pathname}${window.location.search}` === next) return;

    /*
     * Only a change the reader made pushes an entry.
     *
     * The state now arrives from the URL on the hydration commit rather than
     * from the server, so on a shared `?mode=target` link this effect sees the
     * mode go from the prerendered default to the link's mode without anybody
     * having touched anything. Pushing there would add a history entry on load
     * and make the first Back press a no-op. `stateOverride` is null until an
     * event handler writes to it, which is exactly "the reader did something".
     */
    const modeChanged = stateOverride !== null && previousMode.current !== mode;
    previousMode.current = mode;

    if (modeChanged) {
      window.history.pushState(null, "", next);
    } else {
      window.history.replaceState(null, "", next);
    }
  }, [pathname, query, mode, stateOverride, searchIsKnown]);

  // Keep the calculator in step when the reader navigates with back or forward.
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onPopState() {
      setStateOverride(parseCalculatorState(new URLSearchParams(window.location.search)));
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const summaryText = useMemo(() => {
    if (mode === "target" && targetParse?.ok) {
      return [
        t("calculator.results.summary.payoutTarget", {
          value: formatCurrency(t.locale, targetResult.targetUsd, "USD"),
        }),
        t("calculator.results.summary.rate", {
          rate: targetResult.rate.label,
          rateValue: formatRate(t.locale, targetResult.rateValue),
        }),
        t("calculator.results.summary.robuxNeeded", {
          robux: formatRobux(t.locale, targetResult.requiredRobux),
        }),
        targetResult.requirementIsBelowMinimum
          ? t("calculator.results.summary.minimumApplies", {
              robux: formatRobux(t.locale, targetResult.effectiveRobuxNeeded),
            })
          : null,
        t("calculator.results.copyDisclaimer"),
      ]
        .filter(Boolean)
        .join("\n");
    }

    if (mode === "advanced" && splitResult.totalRobux > 0n) {
      const { value, currency } = convert(splitResult.grossUsd);
      return [
        t("calculator.results.summary.earnedRobux", {
          robux: formatRobux(t.locale, splitResult.totalRobux),
        }),
        ...splitResult.buckets
          .filter((bucket) => bucket.robux > 0n)
          .map((bucket) =>
            t("calculator.results.summary.bucketLine", {
              rate: bucket.rate.label,
              robux: formatRobux(t.locale, bucket.robux),
              usd: formatCurrency(t.locale, bucket.usd, "USD"),
            }),
          ),
        t("calculator.results.summary.grossPayout", {
          value: formatCurrency(t.locale, value, currency),
        }),
        splitResult.feesApplied || splitResult.taxApplied
          ? t("calculator.results.summary.afterEstimates", {
              value: formatCurrency(t.locale, splitResult.netAfterEstimateUsd, "USD"),
            })
          : null,
        t("calculator.results.copyDisclaimer"),
      ]
        .filter(Boolean)
        .join("\n");
    }

    if (quickParse?.ok) {
      const { value, currency } = convert(quickResult.grossUsd);
      return [
        t("calculator.results.summary.earnedRobux", {
          robux: formatRobux(t.locale, quickResult.robux),
        }),
        t("calculator.results.summary.rate", {
          rate: quickResult.rate.label,
          rateValue: formatRate(t.locale, quickResult.rateValue),
        }),
        t("calculator.results.summary.estimatedPayout", {
          value: formatCurrency(t.locale, value, currency),
        }),
        quickResult.threshold.state === "meets-minimum"
          ? t("calculator.results.summary.minimumMet")
          : t("calculator.results.summary.minimumShort", {
              robux: formatRobux(t.locale, quickResult.threshold.shortfallRobux),
            }),
        t("calculator.results.copyDisclaimer"),
      ].join("\n");
    }

    return "";
  }, [
    mode,
    quickParse,
    quickResult,
    splitResult,
    targetParse,
    targetResult,
    convert,
    t,
  ]);

  const primaryValueText = useMemo(() => {
    if (mode === "target") return formatRobux(t.locale, targetResult.requiredRobux);
    const usd = mode === "advanced" ? splitResult.grossUsd : quickResult.grossUsd;
    const { value, currency } = convert(usd);
    return formatCurrency(t.locale, value, currency);
  }, [mode, quickResult, splitResult, targetResult, convert, t]);

  // ---- History -----------------------------------------------------------

  const saveToHistory = useCallback(() => {
    if (summaryText === "") return;
    const label =
      mode === "target"
        ? t("calculator.history.targetLabel", {
            amount: formatCurrency(t.locale, targetResult.targetUsd, "USD"),
          })
        : t("calculator.history.robuxLabel", {
            robux: formatRobux(
              t.locale,
              mode === "advanced" ? splitResult.totalRobux : quickResult.robux,
            ),
          });
    setHistoryOverride(addHistoryEntry({ label, result: primaryValueText, query }));
    setAnnouncement(t("calculator.history.savedAnnouncement"));
  }, [summaryText, mode, targetResult, splitResult, quickResult, primaryValueText, query, t]);

  // ---- Render ------------------------------------------------------------

  const hasData = !isEmptyState(state);
  const currentRate = getRate(state.rateId);
  /* One string for the result card and the sticky bar that repeats it. */
  const primaryLabel =
    mode === "target"
      ? t("calculator.results.robuxNeeded")
      : t("calculator.results.estimatedPayout");

  return (
    <Card className="scroll-mt-24" as="section">
      <h2 className="sr-only">{t("calculator.srHeading")}</h2>

      {!lockedMode ? (
        <ModeTabs
          t={t}
          options={modeOptions(t)}
          value={mode}
          onChange={(next) => update({ mode: next as CalculatorMode })}
        />
      ) : null}

      <StickyResult label={primaryLabel} value={primaryValueText} show={hasData} />

      <div
        id={`mode-panel-${mode}`}
        role={lockedMode ? undefined : "tabpanel"}
        aria-labelledby={lockedMode ? undefined : `mode-tab-${mode}`}
        tabIndex={lockedMode ? undefined : 0}
        className={cx("grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-2", lockedMode ? "" : "mt-4 sm:mt-5")}
      >
        {/* ---- Inputs ---- */}
        <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
          {mode === "quick" ? (
            <>
              <AmountInput
                locale={t.locale}
                label={t("calculator.inputs.eligibleEarnedRobux.label")}
                value={state.robux}
                earlyKey="robux"
                onChange={(value) => update({ robux: value })}
                error={errorOf(quickParse)}
                hint={t("calculator.inputs.eligibleEarnedRobux.hint")}
                autoFocus={false}
              />
              <QuickPresets t={t}
                activeValue={quickParse?.ok ? quickParse.value.robux.toString() : ""}
                onSelect={(value) => update({ robux: value.toString() })}
              />
              <RateSelector
                t={t}
                label={t("calculator.inputs.rateToApply.label")}
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
              <p className="text-sm text-(--color-text-muted)">{t("calculator.body.intro.p1")}</p>
              <AmountInput
                locale={t.locale}
                label={`${getRate(standardRateId).label} bucket`}
                value={state.standardRobux}
                earlyKey="standardRobux"
                onChange={(value) => update({ standardRobux: value })}
                error={errorOf(standardParse)}
                hint={t("calculator.inputs.standardBucketHint")}
              />
              <AmountInput
                locale={t.locale}
                label={`${getRate(legacyRateId).label} bucket`}
                value={state.legacyRobux}
                earlyKey="legacyRobux"
                onChange={(value) => update({ legacyRobux: value })}
                error={errorOf(legacyParse)}
                hint={t("calculator.inputs.legacyBucketHint")}
              />
              <AmountInput
                locale={t.locale}
                label={`${getRate(us18RateId).label} bucket`}
                value={state.us18Robux}
                earlyKey="us18Robux"
                onChange={(value) => update({ us18Robux: value })}
                error={errorOf(us18Parse)}
                hint={t("calculator.inputs.us18BucketHint")}
              />
            </>
          ) : null}

          {mode === "target" ? (
            <>
              <AmountInput
                locale={t.locale}
                label={t("calculator.inputs.payoutTarget.label")}
                value={state.targetUsd}
                earlyKey="targetUsd"
                onChange={(value) => update({ targetUsd: value })}
                error={parseMessage(t, targetParse)}
                hint={t("calculator.inputs.payoutTarget.hint")}
                placeholder={formatRobux(t.locale, 1_000)}
                suffix="USD"
              />
              <RateSelector
                t={t}
                label={t("calculator.inputs.rateToApply.label")}
                value={state.rateId}
                onChange={(value) => update({ rateId: value })}
              />
              <AmountInput
                locale={t.locale}
                label={t("calculator.inputs.currentBalance.label")}
                value={state.currentRobux}
                earlyKey="currentRobux"
                onChange={(value) => update({ currentRobux: value })}
                error={errorOf(currentParse)}
                hint={t("calculator.inputs.currentBalance.hint")}
                placeholder={formatRobux(t.locale, 0)}
              />
            </>
          ) : null}

          <CurrencySelector
            t={t}
            locale={locale}
            value={currency}
            onChange={selectCurrency}
          />

          <Disclosure
            summary={t("calculator.deductions.summary")}
            defaultOpen={advancedOpen}
          >
            <div className="flex flex-col gap-4">
              <p>{t("calculator.deductions.yourFiguresNote")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <PercentInput
                locale={t.locale}
                  label={t("calculator.deductions.percentageFeeLabel")}
                  value={state.feePercent}
                  earlyKey="feePercent"
                  onChange={(value) => {
                    update({ feePercent: value });
                    setAdvancedOverride(true);
                    savePreferences({ advancedOpen: true });
                  }}
                  error={parseMessage(t, feeParse)}
                  placeholder={formatDecimal(t.locale, 2.9, 1)}
                />
                <PercentInput
                locale={t.locale}
                  label={t("calculator.deductions.flatFeeLabel")}
                  value={state.flatFeeUsd}
                  earlyKey="flatFeeUsd"
                  onChange={(value) => update({ flatFeeUsd: value })}
                  error={parseMessage(t, flatFeeParse)}
                  placeholder={formatDecimal(t.locale, 0.3, 2)}
                  suffix="$"
                />
              </div>
              <PercentInput
                locale={t.locale}
                label={t("calculator.deductions.taxLabel")}
                value={state.taxPercent}
                earlyKey="taxPercent"
                onChange={(value) => update({ taxPercent: value })}
                error={parseMessage(t, taxParse)}
                hint={t("calculator.deductions.taxHint")}
                placeholder={formatRobux(t.locale, 20)}
              />
            </div>
          </Disclosure>
        </div>

        {/* ---- Results ---- */}
        <div className="flex min-w-0 flex-col gap-4 sm:gap-5">
          <ResultSummary
            primaryLabel={primaryLabel}
            primaryValue={primaryValueText}
            secondary={
              mode === "target" ? (
                t("calculator.results.announceTarget", {
                  rate: targetResult.rate.label,
                })
              ) : mode === "advanced" ? (
                t("calculator.results.announceSplitGross", {
                  robux: formatRobux(t.locale, splitResult.totalRobux),
                })
              ) : (
                t("calculator.results.announceRate", {
                  rate: currentRate.label,
                  rateValue: formatRate(t.locale, quickResult.rateValue),
                })
              )
            }
          >
            <div className="flex flex-col gap-4">
              {mode === "target" ? (
                <TargetBreakdown t={t} result={targetResult} />
              ) : (
                <ThresholdMeter
                  t={t}
                  threshold={mode === "advanced" ? splitResult.threshold : quickResult.threshold}
                />
              )}
              <FxNote t={t} rates={fx.rates} currency={currency} status={fx.status} />
            </div>
          </ResultSummary>

          {mode === "advanced" && splitResult.totalRobux > 0n ? (
            <ResultBreakdown t={t} result={splitResult} />
          ) : null}

          <div className="flex flex-wrap gap-2">
            <CopyButton
              t={t}
              label={t("calculator.results.copyResult")}
              text={primaryValueText}
              variant="primary"
              onAnnounce={setAnnouncement}
            />
            <CopyButton
              t={t}
              label={t("calculator.results.copySummary")}
              text={summaryText}
              onAnnounce={setAnnouncement}
            />
            <ShareButton
              t={t}
              url={shareUrl}
              title={t("calculator.results.summaryTitle")}
              onAnnounce={setAnnouncement}
            />
            <ResetButton
              t={t}
              hasData={hasData}
              onReset={() => setStateOverride({ ...defaultState, mode, currency })}
              onAnnounce={setAnnouncement}
            />
          </div>

          {showHistory ? (
            <HistoryPanel t={t}
              history={history}
              canSave={summaryText !== ""}
              onSave={saveToHistory}
              onClear={() => {
                clearHistory();
                setHistoryOverride([]);
                setAnnouncement(t("calculator.history.clearedAnnouncement"));
              }}
              pathname={pathname}
            />
          ) : null}
        </div>
      </div>

      {/*
        Full width rather than inside the results column. With four columns the
        table needs more room than half a 1024px grid gives it, and visual
        review found it clipping the "vs standard" column mid-figure at that
        width — a money value cut off mid-digit is worse than no table.
      */}
      {mode !== "target" && comparisonAmount > 0n ? (
        <div className="mt-6 min-w-0 border-t border-(--color-border) pt-5">
          <h3 className="text-sm font-semibold text-(--color-text)">{t("routes.home.sections.rate-comparison")}</h3>
          <p className="mb-3 mt-1 text-xs text-(--color-text-muted)">{t("calculator.body.intro.p2")}</p>
          <ScenarioComparison t={t} comparison={comparison} />
        </div>
      ) : null}

      <ResultAnnouncer message={announcement || announceResult} />

      <p className="mt-5 border-t border-(--color-border) pt-4 text-xs text-(--color-text-muted)">
        {t("calculator.body.intro.p3", {
          minimumEarnedRobux: formatRobux(t.locale, minimumEarnedRobux),
        })}
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
  t,
}: {
  history: readonly HistoryEntry[];
  canSave: boolean;
  onSave: () => void;
  onClear: () => void;
  pathname: string;
  readonly t: Translate;
}) {
  return (
    <Disclosure summary={t("calculator.history.summary", { count: history.length })}>
      <div className="flex flex-col gap-3">
        <p className="text-xs">{t("calculator.body.intro.p5")}</p>
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
          <p className="text-xs italic">{t("calculator.results.nothingSaved")}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="min-h-[44px] rounded-(--radius-control) border border-(--color-border-strong) px-3 text-sm font-semibold text-(--color-text) disabled:opacity-50"
          >
            {t("calculator.history.saveButton")}
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={history.length === 0}
            className="min-h-[44px] rounded-(--radius-control) px-3 text-sm font-semibold text-(--color-danger) disabled:opacity-50"
          >
            {t("calculator.history.clear")}
          </button>
        </div>
      </div>
    </Disclosure>
  );
}
