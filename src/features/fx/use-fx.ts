"use client";

import { useEffect, useState } from "react";
import { Rational } from "@/lib/calculations/rational";
import type { FxRates, FxResponse } from "./types";

/**
 * Loads reference rates for the currency selector.
 *
 * Three rules this hook exists to enforce:
 *   1. It never blocks the USD calculation. The fetch starts only when a
 *      non-USD currency is actually selected, and USD needs no network at all.
 *   2. A failure is a state, not an exception. The UI shows the USD result
 *      plus an explanation instead of an error boundary.
 *   3. Stale data is labelled as stale, always. A rate that came from the
 *      fallback snapshot is never displayed as if it were current.
 */

export type FxStatus = "idle" | "loading" | "ready" | "unavailable";

export interface FxState {
  readonly status: FxStatus;
  readonly rates: FxRates | null;
  readonly error: string | null;
}

const initialState: FxState = { status: "idle", rates: null, error: null };

export function useFxRates(enabled: boolean): FxState {
  const [state, setState] = useState<FxState>(initialState);

  useEffect(() => {
    if (!enabled) return;
    // Already loaded or in flight: reference rates change once a working day,
    // so there is no reason to refetch within a session.
    if (state.status === "ready" || state.status === "loading") return;

    const controller = new AbortController();
    setState({ status: "loading", rates: null, error: null });

    fetch("/api/fx/latest/", { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as FxResponse;
        if (!payload.ok) {
          setState({ status: "unavailable", rates: null, error: payload.error.message });
          return;
        }
        setState({ status: "ready", rates: payload.data, error: null });
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setState({
          status: "unavailable",
          rates: null,
          error:
            "Local-currency estimates are temporarily unavailable. The USD figures above are unaffected.",
        });
      });

    return () => controller.abort();
  }, [enabled, state.status]);

  return state;
}

/**
 * Converts a USD amount into the target currency.
 *
 * The provider's rate arrives as a JavaScript number, so it is converted to an
 * exact rational at a fixed precision before being multiplied. That keeps the
 * multiplication itself exact and the rounding decision explicit, rather than
 * inheriting whatever the float happened to be.
 */
export function convertToCurrency(
  usd: Rational,
  currency: string,
  rates: FxRates | null,
): Rational | null {
  if (currency === "USD") return usd;
  if (!rates) return null;
  const rate = rates.rates[currency];
  if (rate === undefined || !Number.isFinite(rate) || rate <= 0) return null;
  return usd.mul(Rational.fromDecimalString(rate.toFixed(8)));
}
