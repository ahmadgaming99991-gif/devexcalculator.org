import { describe, expect, it } from "vitest";
import {
  EVENT_NAMES,
  isEventName,
  sanitiseEvent,
  sanitisePath,
} from "../../../src/lib/analytics/events";

/**
 * Every value typed into this site is a fact about someone's income. The
 * natural way to write an analytics event is to attach the number that just
 * changed, which is the one thing that must never happen — so these tests feed
 * the sanitiser exactly the payloads a careless call site would produce.
 */

describe("event property allowlist", () => {
  it("keeps the categories an event is allowed to carry", () => {
    expect(
      sanitiseEvent({
        mode: "target",
        rate_id: "standard-current",
        currency: "GBP",
        minimum_state: "below",
        range_days: 14,
      }),
    ).toEqual({
      mode: "target",
      rate_id: "standard-current",
      currency: "GBP",
      minimum_state: "below",
      range_days: 14,
    });
  });

  it("drops every amount a call site might attach", () => {
    const leaked = sanitiseEvent({
      mode: "quick",
      // All of these are real fields from the calculator's own state.
      robux: 250_000,
      targetUsd: "1500.00",
      currentRobux: 30_000,
      taxPercent: "20",
      feePercent: 2.9,
      grossUsd: "950.00",
      savedCalculations: [{ robux: 1_000 }],
      email: "someone@example.com",
      message: "my balance is 250000",
    });

    expect(leaked).toEqual({ mode: "quick" });
  });

  it("drops a number arriving where a category belongs", () => {
    // This is the shape a leaked balance would take: the right key, the wrong
    // type. Coercing it to a string would send the amount.
    expect(sanitiseEvent({ currency: 250_000 })).toEqual({});
    expect(sanitiseEvent({ rate_id: 38 })).toEqual({});
  });

  it("drops a value long enough to hide something in", () => {
    expect(sanitiseEvent({ ranking: "x".repeat(65) })).toEqual({});
    expect(sanitiseEvent({ ranking: "x".repeat(64) })).toEqual({ ranking: "x".repeat(64) });
  });

  it("accepts only a plausible chart range as its one number", () => {
    expect(sanitiseEvent({ range_days: 7 })).toEqual({ range_days: 7 });
    // A balance dressed as a range.
    expect(sanitiseEvent({ range_days: 250_000 })).toEqual({});
    expect(sanitiseEvent({ range_days: 0 })).toEqual({});
    expect(sanitiseEvent({ range_days: -14 })).toEqual({});
    expect(sanitiseEvent({ range_days: 7.5 })).toEqual({});
  });

  it("drops blank and whitespace values rather than sending empties", () => {
    expect(sanitiseEvent({ currency: "   ", mode: "quick" })).toEqual({ mode: "quick" });
  });
});

describe("page paths", () => {
  it("strips the query string, which is where a shared calculation lives", () => {
    expect(sanitisePath("https://devexcalculator.org/?robux=250000&rate=legacy")).toBe("/");
    expect(sanitisePath("/usd-to-robux/?targetUsd=1500")).toBe("/usd-to-robux/");
  });

  it("strips a fragment too", () => {
    expect(sanitisePath("/platform/?ranking=top#history")).toBe("/platform/");
  });

  it("never returns a query or a fragment, whatever it is given", () => {
    // The guarantee is not "recognises paths" — it is that nothing a reader
    // typed can ride along. `new URL` resolves most rubbish against the base
    // rather than throwing, so the invariant is asserted directly.
    for (const input of ["::::", "", "?robux=1", "#top", "//evil.example/?robux=1"]) {
      const path = sanitisePath(input);
      expect(path.startsWith("/"), `${input} produced ${path}`).toBe(true);
      expect(path).not.toContain("?");
      expect(path).not.toContain("#");
      expect(path).not.toContain("robux");
    }
  });
});

describe("event names", () => {
  it("recognises only declared names", () => {
    expect(isEventName("result_copied")).toBe(true);
    expect(isEventName("calculation_completed_on_keystroke")).toBe(false);
    expect(isEventName("")).toBe(false);
  });

  it("declares no event that fires on a value changing", () => {
    // Named for committed actions, not for keystrokes. An event called
    // something like `robux_entered` would be a per-keystroke event by
    // construction, and would defeat everything above it.
    for (const name of EVENT_NAMES) {
      expect(name, `${name} reads like a per-keystroke event`).not.toMatch(
        /_(entered|typed|changed|input)$/,
      );
    }
  });
});
