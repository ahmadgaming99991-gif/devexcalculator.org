"use client";

import { useEffect, useState } from "react";
import { Button, Container } from "@/components/ui";

/**
 * Consent prompt for cookie-setting analytics.
 *
 * Rendered only when GA4 is configured. Cloudflare Web Analytics is cookieless
 * and needs no prompt, so a deployment using it alone never shows this banner.
 *
 * Accept and decline are given equal visual weight — a decline button styled to
 * be hard to find is a dark pattern, and the specification forbids deceptive
 * placement.
 */
const STORAGE_KEY = "devex:consent";

export function AnalyticsConsent() {
  const [decision, setDecision] = useState<"unknown" | "granted" | "denied">("granted");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      setDecision(stored === "granted" ? "granted" : stored === "denied" ? "denied" : "unknown");
    } catch {
      // Storage unavailable: treat as denied rather than assuming consent.
      setDecision("denied");
    }
  }, []);

  function record(value: "granted" | "denied") {
    setDecision(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* nothing to persist */
    }
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    gtag?.("consent", "update", {
      analytics_storage: value === "granted" ? "granted" : "denied",
    });
  }

  if (decision !== "unknown") return null;

  return (
    <div
      role="dialog"
      aria-labelledby="consent-heading"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[--color-border] bg-[--color-surface] pb-[--spacing-safe-bottom] shadow-[--shadow-raised]"
    >
      <Container>
        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="consent-heading" className="text-sm font-semibold text-[--color-text]">
              Analytics cookies
            </h2>
            <p className="mt-1 text-sm text-[--color-text-muted]">
              We would like to measure which pages get used, which needs a cookie.
              The calculator works identically either way, and your calculations
              are never sent anywhere.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" onClick={() => record("denied")}>
              Decline
            </Button>
            <Button onClick={() => record("granted")}>Accept</Button>
          </div>
        </div>
      </Container>
    </div>
  );
}
