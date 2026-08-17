import { describe, expect, it } from "vitest";
import { Rational } from "@/lib/calculations/rational";

describe("Rational", () => {
  describe("fromDecimalString", () => {
    it("parses an exact decimal without floating-point loss", () => {
      const rate = Rational.fromDecimalString("0.0038");
      expect(rate.n).toBe(19n);
      expect(rate.d).toBe(5000n);
    });

    it("parses integers, leading signs and bare fractions", () => {
      expect(Rational.fromDecimalString("114").toFixed(0)).toBe("114");
      expect(Rational.fromDecimalString("-12.5").toFixed(2)).toBe("-12.50");
      expect(Rational.fromDecimalString("+3.80").toFixed(2)).toBe("3.80");
      expect(Rational.fromDecimalString(".5").toFixed(1)).toBe("0.5");
    });

    it("rejects anything that is not an exact decimal", () => {
      for (const bad of ["", "abc", "1e5", "1,000", "0x10", "1.2.3", " 1 2 "]) {
        expect(() => Rational.fromDecimalString(bad)).toThrow(RangeError);
      }
    });
  });

  describe("exact arithmetic", () => {
    it("computes a payout exactly where binary floating point drifts", () => {
      // 17,000 Robux at the U.S. 18+ rate is a real query in the supplied
      // keyword data. The float path yields 91.80000000000001, which would
      // render as $91.80 only by luck of the rounding step.
      expect(17_000 * 0.0054).toBe(91.80000000000001);

      const exact = Rational.fromInt(17_000).mul(Rational.fromDecimalString("0.0054"));
      expect(exact.toFixed(2)).toBe("91.80");
      expect(exact.eq(Rational.fromDecimalString("91.8"))).toBe(true);
    });

    it("adds and subtracts without drift across many operations", () => {
      let total = Rational.ZERO;
      const tenth = Rational.fromDecimalString("0.1");
      for (let i = 0; i < 10; i += 1) total = total.add(tenth);
      expect(total.eq(Rational.ONE)).toBe(true);
      // The float equivalent drifts.
      expect(Array.from({ length: 10 }).reduce<number>((a) => a + 0.1, 0)).not.toBe(1);
    });

    it("divides exactly and reduces to lowest terms", () => {
      const third = Rational.fromInt(1).div(Rational.fromInt(3));
      expect(third.n).toBe(1n);
      expect(third.d).toBe(3n);
      expect(third.mul(Rational.fromInt(3)).eq(Rational.ONE)).toBe(true);
    });

    it("throws on division by zero", () => {
      expect(() => Rational.ONE.div(Rational.ZERO)).toThrow(RangeError);
    });

    it("handles very large values exactly", () => {
      const huge = Rational.of(100_000_000_000n);
      const usd = huge.mul(Rational.fromDecimalString("0.0038"));
      expect(usd.toFixed(2)).toBe("380000000.00");
    });
  });

  describe("comparison", () => {
    it("orders values including negatives", () => {
      const a = Rational.fromDecimalString("0.0035");
      const b = Rational.fromDecimalString("0.0038");
      expect(a.lt(b)).toBe(true);
      expect(b.gt(a)).toBe(true);
      expect(a.eq(Rational.fromDecimalString("0.00350"))).toBe(true);
      expect(a.neg().lt(Rational.ZERO)).toBe(true);
      expect(Rational.max(a, b).eq(b)).toBe(true);
      expect(Rational.min(a, b).eq(a)).toBe(true);
    });

    it("clamps negatives to zero", () => {
      expect(Rational.fromDecimalString("-5").clampNonNegative().isZero()).toBe(true);
      expect(Rational.fromDecimalString("5").clampNonNegative().toFixed(0)).toBe("5");
    });
  });

  describe("rounding", () => {
    it("rounds half-up by default", () => {
      expect(Rational.fromDecimalString("2.345").toFixed(2)).toBe("2.35");
      expect(Rational.fromDecimalString("2.344").toFixed(2)).toBe("2.34");
      expect(Rational.fromDecimalString("2.335").toFixed(2)).toBe("2.34");
    });

    it("rounds half-even when asked", () => {
      expect(Rational.fromDecimalString("2.345").toFixed(2, "half-even")).toBe("2.34");
      expect(Rational.fromDecimalString("2.355").toFixed(2, "half-even")).toBe("2.36");
    });

    it("rounds negatives away from zero for half-up", () => {
      expect(Rational.fromDecimalString("-2.345").toFixed(2)).toBe("-2.35");
    });

    it("supports ceil, floor and trunc in both signs", () => {
      const positive = Rational.fromDecimalString("1.2");
      const negative = Rational.fromDecimalString("-1.2");
      expect(positive.toFixed(0, "ceil")).toBe("2");
      expect(positive.toFixed(0, "floor")).toBe("1");
      expect(positive.toFixed(0, "trunc")).toBe("1");
      expect(negative.toFixed(0, "ceil")).toBe("-1");
      expect(negative.toFixed(0, "floor")).toBe("-2");
      expect(negative.toFixed(0, "trunc")).toBe("-1");
    });

    it("never emits negative zero", () => {
      expect(Rational.fromDecimalString("-0.001").toFixed(2)).toBe("0.00");
    });

    it("pads fractional digits correctly for small values", () => {
      expect(Rational.fromDecimalString("0.005").toFixed(4)).toBe("0.0050");
      expect(Rational.ZERO.toFixed(2)).toBe("0.00");
    });

    it("rejects an out-of-range decimalPlaces", () => {
      expect(() => Rational.ONE.toFixed(-1)).toThrow(RangeError);
      expect(() => Rational.ONE.toFixed(31)).toThrow(RangeError);
    });
  });

  describe("integer conversion", () => {
    it("ceils and floors correctly in both signs", () => {
      expect(Rational.fromDecimalString("1.0001").ceilToBigInt()).toBe(2n);
      expect(Rational.fromDecimalString("2").ceilToBigInt()).toBe(2n);
      expect(Rational.fromDecimalString("1.9999").floorToBigInt()).toBe(1n);
      expect(Rational.fromDecimalString("-1.5").ceilToBigInt()).toBe(-1n);
      expect(Rational.fromDecimalString("-1.5").floorToBigInt()).toBe(-2n);
    });
  });
});
