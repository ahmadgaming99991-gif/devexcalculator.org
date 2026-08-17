import { describe, expect, it } from "vitest";
import {
  defaultState,
  isEmptyState,
  parseCalculatorState,
  serialiseCalculatorState,
  buildShareUrl,
} from "@/features/devex/url-state";
import { maxRobuxInput } from "@/lib/calculations/rate-registry";

const parse = (query: string) => parseCalculatorState(new URLSearchParams(query));

describe("parsing shared calculator state", () => {
  it("reads a quick-mode link", () => {
    const state = parse("robux=100000&rate=standard-current&currency=USD");
    expect(state.mode).toBe("quick");
    expect(state.robux).toBe("100000");
    expect(state.rateId).toBe("standard-current");
    expect(state.currency).toBe("USD");
  });

  it("reads an advanced split link", () => {
    const state = parse("standard=80000&legacy=20000&currency=CAD&mode=advanced");
    expect(state.mode).toBe("advanced");
    expect(state.standardRobux).toBe("80000");
    expect(state.legacyRobux).toBe("20000");
    expect(state.currency).toBe("CAD");
  });

  it("reads a target link", () => {
    const state = parse("target=1000&rate=standard-current&mode=target");
    expect(state.mode).toBe("target");
    expect(state.targetUsd).toBe("1000");
  });

  it("infers the mode when a link supplies state but no explicit mode", () => {
    expect(parse("target=1000").mode).toBe("target");
    expect(parse("standard=50000").mode).toBe("advanced");
    expect(parse("robux=50000").mode).toBe("quick");
  });

  it("strips grouping characters from a pasted value", () => {
    expect(parse("robux=100,000").robux).toBe("100000");
  });

  describe("hostile and malformed input", () => {
    it("falls back to the default rate for an unknown rate id", () => {
      expect(parse("rate=made-up-rate").rateId).toBe("standard-current");
    });

    it("falls back to USD for an unsupported currency", () => {
      expect(parse("currency=XYZ").currency).toBe("USD");
      expect(parse("currency=%3Cscript%3E").currency).toBe("USD");
    });

    it("rejects a non-numeric amount rather than passing it through", () => {
      expect(parse("robux=alert(1)").robux).toBe("");
      expect(parse("robux=%3Cimg%20src%3Dx%3E").robux).toBe("");
    });

    it("rejects a negative amount", () => {
      expect(parse("robux=-5000").robux).toBe("");
    });

    it("rejects an amount beyond the documented limit", () => {
      expect(parse(`robux=${maxRobuxInput + 1}`).robux).toBe("");
    });

    it("rejects an over-long parameter without attempting to parse it", () => {
      expect(parse(`robux=${"9".repeat(200)}`).robux).toBe("");
    });

    it("rejects an out-of-range percentage", () => {
      expect(parse("fee=150").feePercent).toBe("");
      expect(parse("tax=-5").taxPercent).toBe("");
    });

    it("falls back to quick mode for an unknown mode", () => {
      expect(parse("mode=hack").mode).toBe("quick");
    });

    it("takes the first value when a parameter is repeated", () => {
      expect(parse("robux=1000&robux=2000").robux).toBe("1000");
    });
  });

  it("accepts a plain object of search params, as Next.js supplies", () => {
    const state = parseCalculatorState({ robux: "50000", mode: "quick", currency: ["GBP"] });
    expect(state.robux).toBe("50000");
    expect(state.currency).toBe("GBP");
  });
});

describe("serialising calculator state", () => {
  it("omits everything left at its default", () => {
    expect(serialiseCalculatorState(defaultState)).toBe("");
  });

  it("emits only the fields relevant to the current mode", () => {
    const query = serialiseCalculatorState({
      ...defaultState,
      mode: "quick",
      robux: "100000",
      // Set but irrelevant to quick mode, so it must not appear.
      standardRobux: "50000",
    });
    expect(query).toBe("?robux=100000");
  });

  it("emits split buckets in advanced mode", () => {
    const query = serialiseCalculatorState({
      ...defaultState,
      mode: "advanced",
      standardRobux: "80000",
      legacyRobux: "20000",
    });
    expect(query).toContain("mode=advanced");
    expect(query).toContain("standard=80000");
    expect(query).toContain("legacy=20000");
  });

  it("omits the rate in advanced mode, where every bucket has its own", () => {
    const query = serialiseCalculatorState({
      ...defaultState,
      mode: "advanced",
      rateId: "legacy-pre-2025-09-05",
      standardRobux: "1000",
    });
    expect(query).not.toContain("rate=");
  });

  it("round-trips every mode without losing state", () => {
    for (const state of [
      { ...defaultState, robux: "100000", currency: "GBP" },
      {
        ...defaultState,
        mode: "advanced" as const,
        standardRobux: "80000",
        legacyRobux: "20000",
        us18Robux: "5000",
      },
      { ...defaultState, mode: "target" as const, targetUsd: "1000", currentRobux: "50000" },
      { ...defaultState, robux: "1000", feePercent: "2.9", flatFeeUsd: "0.30", taxPercent: "20" },
    ]) {
      const query = serialiseCalculatorState(state);
      const parsed = parseCalculatorState(new URLSearchParams(query));
      expect(parsed.mode).toBe(state.mode);
      expect(parsed.robux).toBe(state.robux);
      expect(parsed.standardRobux).toBe(state.standardRobux);
      expect(parsed.targetUsd).toBe(state.targetUsd);
      expect(parsed.currency).toBe(state.currency);
      expect(parsed.feePercent).toBe(state.feePercent);
    }
  });

  it("carries no personal data", () => {
    const query = serialiseCalculatorState({
      ...defaultState,
      robux: "100000",
      currency: "GBP",
      feePercent: "2.9",
    });
    // Only amounts, a rate id and a currency code. Nothing identifying.
    const keys = [...new URLSearchParams(query.slice(1)).keys()].sort();
    expect(keys).toEqual(["currency", "fee", "robux"]);
  });
});

describe("share URLs", () => {
  it("builds an absolute URL on the owning route", () => {
    const url = buildShareUrl("https://devexcalculator.org", "/", {
      ...defaultState,
      robux: "100000",
    });
    expect(url).toBe("https://devexcalculator.org/?robux=100000");
  });

  it("produces a bare route when nothing has been entered", () => {
    expect(buildShareUrl("https://devexcalculator.org", "/robux-to-usd/", defaultState)).toBe(
      "https://devexcalculator.org/robux-to-usd/",
    );
  });
});

describe("isEmptyState", () => {
  it("reports an untouched calculator as empty", () => {
    expect(isEmptyState(defaultState)).toBe(true);
    // Choosing a currency alone is not data worth confirming a reset over.
    expect(isEmptyState({ ...defaultState, currency: "GBP" })).toBe(true);
  });

  it("reports any entered amount as non-empty", () => {
    expect(isEmptyState({ ...defaultState, robux: "1000" })).toBe(false);
    expect(isEmptyState({ ...defaultState, targetUsd: "100" })).toBe(false);
    expect(isEmptyState({ ...defaultState, taxPercent: "20" })).toBe(false);
  });
});
