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
 * `getSnapshot` must return a primitive, or a value that is referentially
 * stable between calls. Returning a fresh object each time makes React loop.
 */

/** No-op subscribe: these values do not change after the page has loaded. */
const neverChanges = () => () => {};

export function useClientValue<T extends string | number | boolean>(
  getSnapshot: () => T,
  serverSnapshot: T,
): T {
  return useSyncExternalStore(neverChanges, getSnapshot, () => serverSnapshot);
}
