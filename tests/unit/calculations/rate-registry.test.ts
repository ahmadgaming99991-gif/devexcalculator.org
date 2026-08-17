import { describe, expect, it } from "vitest";
import {
  allRates,
  getMarketplaceScheme,
  getRate,
  getRateValue,
  getSource,
  getSources,
  findRate,
  maxRobuxInput,
  minimumEarnedRobux,
  rateRegistry,
  registryAgeInDays,
  registryFreshness,
  selectableRates,
  sources,
} from "@/lib/calculations/rate-registry";
import { Rational } from "@/lib/calculations/rational";

describe("rate registry integrity", () => {
  it("loads without throwing, which is the build-time validation gate", () => {
    expect(rateRegistry.schemaVersion).toBe(1);
    expect(allRates.length).toBeGreaterThan(0);
  });

  it("defines the three documented rates with the verified values", () => {
    expect(getRate("standard-current").usdPerRobux).toBe("0.0038");
    expect(getRate("legacy-pre-2025-09-05").usdPerRobux).toBe("0.0035");
    expect(getRate("us-18-plus-qualified").usdPerRobux).toBe("0.0054");
  });

  it("keeps usdPerThousandRobux consistent with usdPerRobux for every rate", () => {
    for (const rate of allRates) {
      const perRobux = Rational.fromDecimalString(rate.usdPerRobux);
      const perThousand = Rational.fromDecimalString(rate.usdPerThousandRobux);
      expect(perRobux.mul(Rational.fromInt(1000)).eq(perThousand)).toBe(true);
    }
  });

  it("gives every rate at least one resolvable official source", () => {
    for (const rate of allRates) {
      expect(rate.sourceIds.length).toBeGreaterThan(0);
      for (const id of rate.sourceIds) {
        expect(() => getSource(id)).not.toThrow();
      }
    }
  });

  it("gives every rate a lastVerifiedAt date", () => {
    for (const rate of allRates) {
      expect(Number.isNaN(Date.parse(rate.lastVerifiedAt))).toBe(false);
    }
  });

  it("has exactly one active standard rate", () => {
    const active = allRates.filter((r) => r.status === "active");
    expect(active).toHaveLength(1);
    expect(active[0]?.id).toBe("standard-current");
  });

  it("records the legacy rate as ending at the documented transition moment", () => {
    const legacy = getRate("legacy-pre-2025-09-05");
    expect(legacy.effectiveTo).toBe("2025-09-05T10:00:00-07:00");
    expect(legacy.status).toBe("legacy");
  });

  it("records the standard rate as starting at the same transition moment", () => {
    const standard = getRate("standard-current");
    expect(standard.effectiveFrom).toBe("2025-09-05T10:00:00-07:00");
    expect(standard.effectiveTo).toBeNull();
  });

  it("marks the U.S. 18+ rate as conditional and not creator-selectable", () => {
    const us18 = getRate("us-18-plus-qualified");
    expect(us18.status).toBe("conditional");
    expect(us18.conditionNote).toBeTruthy();
    expect(us18.conditionNote).toContain("not selectable");
  });

  it("uses the documented minimum of 30,000 Earned Robux", () => {
    expect(minimumEarnedRobux).toBe(30_000);
  });

  it("labels the input cap as an application limit, never a Roblox limit", () => {
    expect(maxRobuxInput).toBeGreaterThan(0);
    expect(rateRegistry.limits.note).toContain("not Roblox limits");
  });
});

describe("rate lookups", () => {
  it("returns rate values as exact rationals", () => {
    expect(getRateValue("standard-current").eq(Rational.fromDecimalString("0.0038"))).toBe(true);
  });

  it("throws for an unknown rate id", () => {
    expect(() => getRate("nope")).toThrow(/unknown rate id/);
  });

  it("returns null from findRate for unknown or empty ids instead of throwing", () => {
    expect(findRate("nope")).toBeNull();
    expect(findRate(null)).toBeNull();
    expect(findRate(undefined)).toBeNull();
    expect(findRate("standard-current")?.id).toBe("standard-current");
  });

  it("excludes retired rates from the selectable set", () => {
    expect(selectableRates.every((r) => r.status !== "retired")).toBe(true);
  });

  it("resolves marketplace schemes", () => {
    expect(getMarketplaceScheme("in-experience").creatorSharePercent).toBe("70");
    expect(() => getMarketplaceScheme("nope")).toThrow();
  });
});

describe("source registry", () => {
  it("uses absolute HTTPS URLs everywhere", () => {
    for (const source of sources.sources) {
      expect(source.url.startsWith("https://")).toBe(true);
    }
  });

  it("has no duplicate source ids", () => {
    const ids = sources.sources.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("records at least one supported fact per source", () => {
    for (const source of sources.sources) {
      expect(source.factsSupported.length).toBeGreaterThan(0);
    }
  });

  it("labels every source with an allowed evidence label", () => {
    const allowed = new Set([
      "Observed in repository",
      "Derived from supplied CSV",
      "Observed on public competitor page",
      "Verified through official source",
      "Reasonable inference",
      "New implementation decision",
    ]);
    for (const source of sources.sources) {
      expect(allowed.has(source.evidenceLabel)).toBe(true);
    }
  });

  it("resolves a list of source ids in order", () => {
    const resolved = getSources(["roblox-devex-program", "ecb-exchange-rates"]);
    expect(resolved.map((s) => s.id)).toEqual([
      "roblox-devex-program",
      "ecb-exchange-rates",
    ]);
  });

  it("cites the Roblox DevEx documentation for the standard rate", () => {
    const source = getSource("roblox-devex-program");
    expect(source.publisher).toBe("Roblox Corporation");
    expect(source.url).toContain("create.roblox.com");
  });
});

describe("freshness tracking", () => {
  const verifiedAt = new Date(rateRegistry.lastVerifiedAt);
  const daysAfter = (days: number) =>
    new Date(verifiedAt.getTime() + days * 86_400_000);

  it("reports zero age on the verification date", () => {
    expect(registryAgeInDays(verifiedAt)).toBe(0);
    expect(registryFreshness(verifiedAt).state).toBe("fresh");
  });

  it("stays fresh inside the review cadence", () => {
    expect(registryFreshness(daysAfter(rateRegistry.reviewCadenceDays - 1)).state).toBe("fresh");
  });

  it("flags a review once the cadence has elapsed", () => {
    expect(registryFreshness(daysAfter(rateRegistry.reviewCadenceDays)).state).toBe("review-due");
  });

  it("escalates to critical past the critical threshold", () => {
    expect(registryFreshness(daysAfter(rateRegistry.criticalReviewAgeDays)).state).toBe("critical");
  });
});
