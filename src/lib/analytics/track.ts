"use client";

import { analyticsConfig } from "@/config/site";
import { isEventName, sanitiseEvent, type EventName, type EventProperties } from "./events";

/**
 * Sending an event, if there is anywhere to send it.
 *
 * Four gates, in order, and the first three are all "do nothing":
 *
 *   1. No GA4 measurement ID configured — the current state, and the default.
 *      Cloudflare Web Analytics is page-view only and takes no events, so GA4
 *      is the only destination there has ever been.
 *   2. Not running in a browser.
 *   3. Consent not granted. GA4 sets cookies, so it is loaded behind the
 *      consent prompt and `gtag` simply is not there until then.
 *   4. The event name is not one of the declared ones.
 *
 * Then the properties are sanitised — see `events.ts`. A field that was not
 * declared is dropped rather than forwarded, which is what stops an amount
 * reaching an analytics provider by way of a well-meaning call site.
 *
 * Failure is silent by design. An analytics call that threw would break a
 * calculator interaction, and no measurement is worth that.
 */
export function track(name: EventName, properties: Readonly<Record<string, unknown>> = {}): void {
  if (!analyticsConfig.ga4Id) return;
  if (typeof window === "undefined") return;
  if (!isEventName(name)) return;

  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  // Absent until consent loads the script, which is the consent gate itself
  // rather than a second copy of it that could disagree.
  if (typeof gtag !== "function") return;

  const payload: EventProperties = sanitiseEvent(properties);

  try {
    gtag("event", name, payload);
  } catch {
    // Deliberately swallowed.
  }
}
