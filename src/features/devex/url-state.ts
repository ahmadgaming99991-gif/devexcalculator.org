import { findRate } from "@/lib/calculations/rate-registry";
import { isSupportedCurrency } from "@/lib/calculations/format";
import { maxRobuxInput, maxUsdTargetInput } from "@/lib/calculations/rate-registry";
import { standardRateId } from "@/lib/calculations/devex";

/**
 * Shareable calculator state, encoded in the query string.
 *
 * Deliberately human-readable — `?robux=100000&rate=standard-current` — so a
 * shared link is self-explanatory and obviously carries nothing personal.
 * Every parameter is validated on the way in: a hostile or malformed value
 * falls back to the default rather than reaching the engine.
 *
 * These URLs are never canonical. The page always self-canonicalises to its
 * clean route, so query states cannot become a crawl space.
 */

export type CalculatorMode = "quick" | "advanced" | "target";

export interface CalculatorState {
  readonly mode: CalculatorMode;
  readonly robux: string;
  readonly rateId: string;
  readonly currency: string;
  readonly standardRobux: string;
  readonly legacyRobux: string;
  readonly us18Robux: string;
  readonly targetUsd: string;
  readonly currentRobux: string;
  readonly feePercent: string;
  readonly flatFeeUsd: string;
  readonly taxPercent: string;
}

export const defaultState: CalculatorState = {
  mode: "quick",
  robux: "",
  rateId: standardRateId,
  currency: "USD",
  standardRobux: "",
  legacyRobux: "",
  us18Robux: "",
  targetUsd: "",
  currentRobux: "",
  feePercent: "",
  flatFeeUsd: "",
  taxPercent: "",
};

/** Longest query value accepted, before any parsing is attempted. */
const MAX_PARAM_LENGTH = 24;

function sanitiseNumeric(value: string | null, max: number): string {
  if (value === null) return "";
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.length > MAX_PARAM_LENGTH) return "";
  // Only digits, one decimal point and grouping characters may appear.
  if (!/^[\d.,\s]+$/.test(trimmed)) return "";
  const numeric = Number(trimmed.replace(/[,\s]/g, ""));
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > max) return "";
  return trimmed.replace(/[,\s]/g, "");
}

function sanitisePercent(value: string | null): string {
  if (value === null) return "";
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.length > 8) return "";
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return "";
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) return "";
  return trimmed;
}

function sanitiseMode(value: string | null): CalculatorMode {
  return value === "advanced" || value === "target" || value === "quick" ? value : "quick";
}

/** Parses and validates calculator state from a query string. */
export function parseCalculatorState(
  params: URLSearchParams | Readonly<Record<string, string | string[] | undefined>>,
): CalculatorState {
  const read = (key: string): string | null => {
    if (params instanceof URLSearchParams) return params.get(key);
    const value = params[key];
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
  };

  const rateCandidate = read("rate");
  const rate = findRate(rateCandidate);

  const currencyCandidate = (read("currency") ?? "").toUpperCase();
  const currency = isSupportedCurrency(currencyCandidate) ? currencyCandidate : "USD";

  const standardRobux = sanitiseNumeric(read("standard"), maxRobuxInput);
  const legacyRobux = sanitiseNumeric(read("legacy"), maxRobuxInput);
  const us18Robux = sanitiseNumeric(read("us18"), maxRobuxInput);
  const targetUsd = sanitiseNumeric(read("target"), maxUsdTargetInput);

  // Infer the mode when the caller supplied state but no explicit mode, so a
  // hand-written link with only `?target=1000` still opens the right tab.
  const explicitMode = read("mode");
  let mode = sanitiseMode(explicitMode);
  if (explicitMode === null) {
    if (targetUsd !== "") mode = "target";
    else if (standardRobux !== "" || legacyRobux !== "" || us18Robux !== "") mode = "advanced";
  }

  return {
    mode,
    robux: sanitiseNumeric(read("robux"), maxRobuxInput),
    rateId: rate?.id ?? standardRateId,
    currency,
    standardRobux,
    legacyRobux,
    us18Robux,
    targetUsd,
    currentRobux: sanitiseNumeric(read("current"), maxRobuxInput),
    feePercent: sanitisePercent(read("fee")),
    flatFeeUsd: sanitiseNumeric(read("flatfee"), 10_000),
    taxPercent: sanitisePercent(read("tax")),
  };
}

/**
 * Serialises state to a query string, omitting anything left at its default.
 * A shared link therefore contains only what the sender actually set.
 */
export function serialiseCalculatorState(state: CalculatorState): string {
  const params = new URLSearchParams();

  if (state.mode !== "quick") params.set("mode", state.mode);

  if (state.mode === "quick") {
    if (state.robux) params.set("robux", state.robux);
  } else if (state.mode === "advanced") {
    if (state.standardRobux) params.set("standard", state.standardRobux);
    if (state.legacyRobux) params.set("legacy", state.legacyRobux);
    if (state.us18Robux) params.set("us18", state.us18Robux);
  } else {
    if (state.targetUsd) params.set("target", state.targetUsd);
    if (state.currentRobux) params.set("current", state.currentRobux);
  }

  if (state.mode !== "advanced" && state.rateId !== standardRateId) {
    params.set("rate", state.rateId);
  }
  if (state.currency !== "USD") params.set("currency", state.currency);
  if (state.feePercent) params.set("fee", state.feePercent);
  if (state.flatFeeUsd) params.set("flatfee", state.flatFeeUsd);
  if (state.taxPercent) params.set("tax", state.taxPercent);

  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}

/** Builds an absolute shareable URL for the current state. */
export function buildShareUrl(origin: string, pathname: string, state: CalculatorState): string {
  return `${origin}${pathname}${serialiseCalculatorState(state)}`;
}

/**
 * True when the state carries nothing worth losing.
 * Used to decide whether a reset needs confirming.
 */
export function isEmptyState(state: CalculatorState): boolean {
  return (
    state.robux === "" &&
    state.standardRobux === "" &&
    state.legacyRobux === "" &&
    state.us18Robux === "" &&
    state.targetUsd === "" &&
    state.currentRobux === "" &&
    state.feePercent === "" &&
    state.flatFeeUsd === "" &&
    state.taxPercent === ""
  );
}
