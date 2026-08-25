import { describe, expect, it } from "vitest";
import { interpolate, translator } from "@/i18n/get-dictionary";
import type { Dictionary } from "@/i18n/types";

/**
 * What `t()` does when it cannot answer.
 *
 * The lookups that succeed are the uninteresting half — every page proves
 * those by rendering. What is worth holding down is the behaviour on a key
 * that is missing or a namespace that was never loaded, because the two
 * tempting alternatives both ship a broken page silently: returning the key
 * shows a reader `rates.devexRates.body.changes.p1`, and falling back to
 * English puts an English sentence inside a Portuguese paragraph, which
 * renders perfectly and is exactly the failure this system exists to prevent.
 */

const dictionary = {
  rates: {
    devexRates: {
      body: {
        changes: { p1: "Roblox moved the standard rate on {date}." },
      },
    },
    minimum: "{amount} Earned Robux is the threshold.",
  },
} as unknown as Partial<Dictionary>;

describe("translator", () => {
  const t = translator(dictionary, "en");

  it("reads a dotted path inside a namespace", () => {
    expect(t("rates.devexRates.body.changes.p1")).toBe(
      "Roblox moved the standard rate on {date}.",
    );
  });

  it("fills named tokens", () => {
    expect(t("rates.minimum", { amount: "30,000" })).toBe("30,000 Earned Robux is the threshold.");
  });

  it("throws for a key that does not exist, naming the key", () => {
    expect(() => t("rates.devexRates.body.changes.p2")).toThrow(
      /rates\.devexRates\.body\.changes\.p2/,
    );
  });

  it("throws for a namespace the page did not load, naming the namespace", () => {
    expect(() => t("platform.live.body.how.p1")).toThrow(/"platform" namespace/);
  });

  it("throws rather than returning an object for a partial path", () => {
    expect(() => t("rates.devexRates.body")).toThrow(/No string/);
  });

  it("never returns the key itself as the value", () => {
    let returned: unknown;
    try {
      returned = t("rates.nothing.here");
    } catch {
      returned = undefined;
    }
    expect(returned).toBeUndefined();
  });
});

describe("interpolate", () => {
  it("fills by name, not by position", () => {
    // German puts the verb where English puts the object; a positional `%s`
    // would swap these two silently.
    expect(interpolate("{second} vor {first}", { first: "a", second: "b" })).toBe("b vor a");
  });

  it("leaves an unknown token visible rather than writing undefined", () => {
    // A visible `{amount}` is a bug report. The word "undefined" in a payout
    // sentence is a wrong figure.
    expect(interpolate("pays {amount}", {})).toBe("pays {amount}");
  });

  it("fills every occurrence of a repeated token", () => {
    expect(interpolate("{n} and {n}", { n: 2 })).toBe("2 and 2");
  });
});
