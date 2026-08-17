import { describe, expect, it } from "vitest";
import {
  calculateAfterFee,
  calculateBeforeFee,
  marketplaceSchemes,
} from "@/lib/calculations/marketplace";
import { Rational } from "@/lib/calculations/rational";

describe("in-experience purchases", () => {
  it("pays the creator 70% of a developer product sale", () => {
    const result = calculateAfterFee({ grossRobux: 1_000n, schemeId: "in-experience" });
    expect(result.creatorRobux).toBe(700n);
    expect(result.platformRobux).toBe(300n);
    expect(result.creatorSharePercent.toFixed(0)).toBe("70");
    expect(result.platformSharePercent.toFixed(0)).toBe("30");
  });

  it("rounds the creator share down so a payout is never overstated", () => {
    // 101 x 70% = 70.7
    const result = calculateAfterFee({ grossRobux: 101n, schemeId: "in-experience" });
    expect(result.creatorRobux).toBe(70n);
    expect(result.exactCreatorRobux.toFixed(1)).toBe("70.7");
    // Nothing is lost: the remainder falls to the platform side.
    expect(result.creatorRobux + result.platformRobux).toBe(101n);
  });

  it("handles zero and negative input safely", () => {
    expect(calculateAfterFee({ grossRobux: 0n, schemeId: "in-experience" }).creatorRobux).toBe(0n);
    expect(calculateAfterFee({ grossRobux: -50n, schemeId: "in-experience" }).creatorRobux).toBe(0n);
  });
});

describe("avatar items sold inside an experience", () => {
  it("splits between item creator, experience owner and Roblox", () => {
    const result = calculateAfterFee({
      grossRobux: 1_000n,
      schemeId: "avatar-item-in-experience",
    });
    expect(result.creatorRobux).toBe(300n);
    expect(result.experienceOwnerRobux).toBe(400n);
    expect(result.platformRobux).toBe(300n);
  });

  it("accounts for every Robux in the split", () => {
    const result = calculateAfterFee({
      grossRobux: 1_000n,
      schemeId: "avatar-item-in-experience",
    });
    const total =
      result.creatorRobux + (result.experienceOwnerRobux ?? 0n) + result.platformRobux;
    expect(total).toBe(1_000n);
  });
});

describe("progressive Marketplace revenue share", () => {
  const scheme = "marketplace-avatar-item";
  const multiple = (value: string) => Rational.fromDecimalString(value);

  it.each([
    ["1", 30n],
    ["1.3", 37n],
    ["1.5", 41n],
    ["2", 50n],
    ["2.5", 57n],
    ["3", 62n],
    ["3.5", 65n],
    ["4", 67n],
    ["5", 69n],
    ["6", 70n],
  ])("pays %s x the price floor at the documented tier", (tier, expectedPercent) => {
    const result = calculateAfterFee({
      grossRobux: 1_000n,
      schemeId: scheme,
      priceFloorMultiple: multiple(tier),
    });
    expect(result.creatorSharePercent.toFixed(0)).toBe(expectedPercent.toString());
    expect(result.appliedTierMultiple).toBe(tier);
  });

  it("keeps the lower tier until the next threshold is actually reached", () => {
    const justBelow = calculateAfterFee({
      grossRobux: 1_000n,
      schemeId: scheme,
      priceFloorMultiple: multiple("1.99"),
    });
    expect(justBelow.creatorSharePercent.toFixed(0)).toBe("41");
    expect(justBelow.appliedTierMultiple).toBe("1.5");
  });

  it("caps at the top tier for very expensive items", () => {
    const result = calculateAfterFee({
      grossRobux: 10_000n,
      schemeId: scheme,
      priceFloorMultiple: multiple("50"),
    });
    expect(result.creatorSharePercent.toFixed(0)).toBe("70");
    expect(result.creatorRobux).toBe(7_000n);
  });

  it("falls back to the base share when no price-floor multiple is supplied", () => {
    const result = calculateAfterFee({ grossRobux: 1_000n, schemeId: scheme });
    expect(result.creatorSharePercent.toFixed(0)).toBe("30");
    expect(result.appliedTierMultiple).toBeNull();
  });
});

describe("before-fee target", () => {
  it("computes the listing price needed to clear a target", () => {
    const result = calculateBeforeFee({ targetNetRobux: 700n, schemeId: "in-experience" });
    expect(result.requiredGrossRobux).toBe(1_000n);
    expect(result.actualNetRobux).toBe(700n);
  });

  it("rounds the required price up so the creator always clears the target", () => {
    // 1000 / 0.7 = 1428.57..., so 1429 Robux are needed.
    const result = calculateBeforeFee({ targetNetRobux: 1_000n, schemeId: "in-experience" });
    expect(result.requiredGrossRobux).toBe(1_429n);
    expect(result.actualNetRobux).toBeGreaterThanOrEqual(1_000n);
  });

  it("round-trips against calculateAfterFee", () => {
    for (const target of [100n, 777n, 5_000n, 123_456n]) {
      const before = calculateBeforeFee({ targetNetRobux: target, schemeId: "in-experience" });
      const after = calculateAfterFee({
        grossRobux: before.requiredGrossRobux,
        schemeId: "in-experience",
      });
      expect(after.creatorRobux).toBeGreaterThanOrEqual(target);
    }
  });

  it("uses the progressive tier when one applies", () => {
    const result = calculateBeforeFee({
      targetNetRobux: 700n,
      schemeId: "marketplace-avatar-item",
      priceFloorMultiple: Rational.fromDecimalString("6"),
    });
    expect(result.creatorSharePercent.toFixed(0)).toBe("70");
    expect(result.requiredGrossRobux).toBe(1_000n);
  });

  it("returns zero for a zero target", () => {
    const result = calculateBeforeFee({ targetNetRobux: 0n, schemeId: "in-experience" });
    expect(result.requiredGrossRobux).toBe(0n);
  });
});

describe("scheme registry", () => {
  it("exposes every documented scheme with a source", () => {
    expect(marketplaceSchemes.length).toBeGreaterThanOrEqual(3);
    for (const scheme of marketplaceSchemes) {
      expect(scheme.sourceIds.length).toBeGreaterThan(0);
    }
  });

  it("throws for an unknown scheme rather than defaulting silently", () => {
    expect(() => calculateAfterFee({ grossRobux: 1n, schemeId: "nope" })).toThrow();
  });
});
