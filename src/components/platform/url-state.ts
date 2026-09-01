"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * The dashboard's state, kept in the address bar and nowhere else.
 *
 * `?ranking`, `?days` and `?experience` used to be read on the server, which is
 * what made `/platform/` a dynamic route: a page that reads `searchParams`
 * cannot be prerendered. They are read here instead, so the document is one
 * static file for every combination and the query string only ever changes what
 * the browser draws.
 *
 * The URL is treated as what it is — an external store the page subscribes to.
 * That is why this uses `useSyncExternalStore` rather than an effect that
 * copies the query string into React state: the server snapshot is "no query
 * string", which is exactly what the prerendered HTML contains, so the first
 * client render agrees with it and there is no hydration mismatch to paper over.
 *
 * Two things this deliberately does not use. Next's `useSearchParams` opts the
 * page back into a dynamic render unless it is wrapped in Suspense, and its
 * router would fetch an RSC payload for a URL whose document has not changed.
 * `history.pushState` changes the address and nothing else, which is the whole
 * requirement — the URL stays shareable, Back and Forward still work, and no
 * navigation is issued.
 */

/** The ranges offered. The widest is the retention window. */
export const RANGES = [1, 3, 7, 14] as const;
export const DEFAULT_RANGE = 14;

export interface DashboardState {
  readonly ranking: string | null;
  readonly days: number;
  readonly experience: number | null;
}

function parse(search: string): DashboardState {
  const params = new URLSearchParams(search);

  const ranking = params.get("ranking");
  const days = Number(params.get("days"));
  const experience = Number(params.get("experience"));

  return {
    // Not validated against a list here: Roblox owns the ranking ids, and the
    // data plane falls back to its own default for one it did not publish.
    ranking: ranking !== null && ranking !== "" ? ranking : null,
    days: (RANGES as readonly number[]).includes(days) ? days : DEFAULT_RANGE,
    experience: Number.isSafeInteger(experience) && experience > 0 ? experience : null,
  };
}

/**
 * Serialises state back to a query string, omitting anything at its default.
 *
 * Defaults are omitted rather than written out so the plain `/platform/` URL
 * stays the canonical one instead of collecting a redundant query string that a
 * reader might then share or a crawler follow.
 */
export function toQuery(state: DashboardState): string {
  const params = new URLSearchParams();
  if (state.ranking !== null) params.set("ranking", state.ranking);
  if (state.days !== DEFAULT_RANGE) params.set("days", String(state.days));
  if (state.experience !== null) params.set("experience", String(state.experience));
  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}

// ---------------------------------------------------------------------------
// The URL as an external store
// ---------------------------------------------------------------------------

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener("popstate", notify);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("popstate", notify);
  };
}

/** A plain string, so React's identity check settles rather than looping. */
const getSnapshot = () => window.location.search;

/** What the prerendered document actually contains: no query string. */
const getServerSnapshot = () => "";

export function useDashboardState(): [DashboardState, (next: Partial<DashboardState>) => void] {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const state = useMemo(() => parse(search), [search]);

  const update = useCallback(
    (next: Partial<DashboardState>) => {
      const merged = { ...parse(window.location.search), ...next };
      // `pushState` and not `replaceState`: each selection is a place a reader
      // can come back to, and Back should undo one choice rather than leave
      // the page entirely.
      window.history.pushState(null, "", `${window.location.pathname}${toQuery(merged)}${window.location.hash}`);
      notify();
    },
    [],
  );

  return [state, update];
}
