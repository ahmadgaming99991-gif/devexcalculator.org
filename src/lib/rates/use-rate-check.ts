"use client";

import { useSyncExternalStore } from "react";

/**
 * The result of the last automatic source check, read once per page.
 *
 * Written as a real external store rather than `useState` in an effect. The
 * project already avoids that pattern — see `useClientValue` — because React
 * 19's `set-state-in-effect` rule exists to discourage the cascading render it
 * causes. Here it buys something else as well: the check is shown in two
 * places in the footer, and a module-level store means two mounts share one
 * request rather than each making their own.
 *
 * `snapshot` is a stable reference. It is null until the response lands and
 * then the same object forever, which is what `useSyncExternalStore` requires
 * — returning a freshly built object each call makes React loop.
 *
 * Nothing here is a tracker. It is a same-origin GET to this site's own
 * endpoint, sends nothing about the reader, and is the only network request
 * the footer makes.
 */

export type RateCheckStatus = "unchanged" | "changed" | "unreadable" | "unknown";

export interface RateCheckView {
  readonly status: RateCheckStatus;
  /** When the scheduled job last compared the document to the registry. */
  readonly checkedAt: string | null;
  /** Roblox's own statement of when it last changed that page. */
  readonly sourceUpdatedAt: string | null;
}

const ENDPOINT = "/api/rate-check/";

const STATUSES: readonly RateCheckStatus[] = ["unchanged", "changed", "unreadable", "unknown"];

let snapshot: RateCheckView | null = null;
let started = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function optionalIso(value: unknown): string | null {
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
}

/** Trusts nothing about the response shape; an unusable body stays null. */
function toView(body: unknown): RateCheckView | null {
  if (typeof body !== "object" || body === null) return null;
  const data = (body as Record<string, unknown>).data;
  if (typeof data !== "object" || data === null) return null;

  const record = data as Record<string, unknown>;
  const status = record.status;
  if (typeof status !== "string" || !STATUSES.includes(status as RateCheckStatus)) return null;

  return {
    status: status as RateCheckStatus,
    checkedAt: optionalIso(record.checkedAt),
    sourceUpdatedAt: optionalIso(record.sourceUpdatedAt),
  };
}

async function load(): Promise<void> {
  try {
    const response = await fetch(ENDPOINT, { headers: { accept: "application/json" } });
    if (!response.ok) return;
    const view = toView(await response.json());
    if (!view) return;
    snapshot = view;
    emit();
  } catch {
    /*
     * Swallowed. A footer line that could not load is a footer line that is not
     * shown; it is not worth an error in a reader's console, and there is
     * nothing they could do about it.
     */
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!started) {
    started = true;
    void load();
  }
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): RateCheckView | null {
  return snapshot;
}

/** Null on the server and during hydration, so the markup matches. */
function getServerSnapshot(): RateCheckView | null {
  return null;
}

export function useRateCheck(): RateCheckView | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
