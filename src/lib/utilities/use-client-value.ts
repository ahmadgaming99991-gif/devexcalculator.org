"use client";

import { useSyncExternalStore } from "react";

/**
 * Reads a browser-only value without a hydration mismatch.
 *
 * The obvious approach — `useState` plus a `useEffect` that sets it on mount —
 * causes a cascading render and is what React 19's `set-state-in-effect` rule
 * exists to discourage. `useSyncExternalStore` is the API built for exactly
 * this: it renders `serverSnapshot` on the server and during hydration, then
 * swaps to the real value in the same commit.
 *
 * `getSnapshot` must return the **same value on every call**. A primitive is
 * not enough on its own: React reads it during the render and reads it again to
 * check the store did not move underneath, so anything that changes between two
 * consecutive calls is treated as the store changing mid-render.
 *
 * `Date.now()` is the trap, and it was in this codebase. Passed here directly
 * it returns a different number whenever the two reads straddle a millisecond,
 * and during hydration React answers that by discarding the entire
 * server-rendered document and re-rendering it in the browser — `Minified React
 * error #418`, on roughly one cold load in three, on every route, because the
 * component was in the shared footer. It never reproduced locally, where both
 * reads land in the same millisecond.
 *
 * Read the clock once outside the component and pass the constant, or derive a
 * value that only changes on a coarse boundary — `ageInDays` and
 * `getUTCFullYear` are stable for a day and a year, which is what makes them
 * safe here. `tests/unit/components/client-value-snapshots.test.ts` fails the
 * build on a call site that reads the clock inline.
 *
 * Returning a fresh object each time makes React loop, for the same reason.
 */

/** No-op subscribe: these values do not change after the page has loaded. */
const neverChanges = () => () => {};

export function useClientValue<T extends string | number | boolean>(
  getSnapshot: () => T,
  serverSnapshot: T,
): T {
  return useSyncExternalStore(neverChanges, getSnapshot, () => serverSnapshot);
}
