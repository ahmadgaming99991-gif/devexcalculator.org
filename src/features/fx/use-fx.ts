"use client";

import { useEffect, useRef, useState } from "react";
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
 *
 * `status` is derived rather than stored, so the effect never calls `setState`
 * synchronously — the only writes happen in the fetch callbacks, which is what
 * an effect subscribing to an external system should do.
 */

export type FxStatus = "idle" | "loading" | "ready" | "unavailable";

export interface FxState {
  readonly status: FxStatus;
  readonly rates: FxRates | null;
}

/*
 * There is no `error` here on purpose.
 *
 * It used to hold the message the API sends, which is English — and it was
 * rendered straight into the results panel. Every failure this hook can
 * see says the same thing to a reader anyway: local-currency estimates are
 * not available and the USD figure is unaffected. `status` already carries
 * that, and the panel says it in the reader's language.
 */

interface FxOutcome {
  readonly rates: FxRates | null;
}

export function useFxRates(enabled: boolean): FxState {
  const [outcome, setOutcome] = useState<FxOutcome | null>(null);
  // Reference rates change once a working day, so one fetch per session is
  // enough — this guards against refetching when the currency changes again.
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;

    const controller = new AbortController();

    fetch("/api/fx/latest/", { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as FxResponse;
        setOutcome({ rates: payload.ok ? payload.data : null });
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        // Allow a later attempt if this one was aborted mid-flight.
        started.current = false;
        setOutcome({ rates: null });
      });

    return () => controller.abort();
  }, [enabled]);

  if (!enabled) return { status: "idle", rates: null };
  if (outcome === null) return { status: "loading", rates: null };
  if (outcome.rates === null) return { status: "unavailable", rates: null };
  return { status: "ready", rates: outcome.rates };
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
