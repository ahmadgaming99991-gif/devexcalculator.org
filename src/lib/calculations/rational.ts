/**
 * Exact rational arithmetic backed by `bigint`.
 *
 * Money math on this site must never use binary floating point. `0.0038` is
 * not representable in IEEE-754, so `100000 * 0.0038` yields
 * `380.00000000000006` in JavaScript. At scale that is the difference between
 * a payout estimate a creator can trust and one they cannot.
 *
 * Every value is held as an exact fraction `n / d` with `d > 0`, reduced by
 * the greatest common divisor after each operation. Conversion to a decimal
 * string happens once, at the display boundary, with an explicit rounding
 * mode. See docs/calculation-methodology.md.
 */

export type RoundingMode = "half-up" | "half-even" | "ceil" | "floor" | "trunc";

export class Rational {
  readonly n: bigint;
  readonly d: bigint;

  private constructor(n: bigint, d: bigint) {
    if (d === 0n) {
      throw new RangeError("Rational denominator must not be zero");
    }
    // Normalise the sign onto the numerator so comparisons stay simple.
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const g = gcd(abs(n), d);
    this.n = g === 0n ? 0n : n / g;
    this.d = g === 0n ? 1n : d / g;
  }

  static readonly ZERO = new Rational(0n, 1n);
  static readonly ONE = new Rational(1n, 1n);

  static of(n: bigint, d: bigint = 1n): Rational {
    return new Rational(n, d);
  }

  static fromInt(value: number | bigint): Rational {
    if (typeof value === "bigint") return new Rational(value, 1n);
    if (!Number.isInteger(value)) {
      throw new RangeError(`Rational.fromInt requires an integer, got ${value}`);
    }
    return new Rational(BigInt(value), 1n);
  }

  /**
   * Parses an exact decimal string such as `"0.0038"`, `"-12.50"` or `"114"`.
   *
   * Deliberately does NOT accept `number` — passing `0.0038` as a float would
   * already have lost precision before this function ever ran. Rate registry
   * values are therefore stored as strings.
   */
  static fromDecimalString(input: string): Rational {
    const raw = input.trim();
    if (!/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(raw)) {
      throw new RangeError(`Not an exact decimal string: ${JSON.stringify(input)}`);
    }
    const negative = raw.startsWith("-");
    const unsigned = raw.replace(/^[+-]/, "");
    const [intPart = "0", fracPart = ""] = unsigned.split(".");
    const digits = `${intPart}${fracPart}` || "0";
    const numerator = BigInt(digits === "" ? "0" : digits);
    const denominator = 10n ** BigInt(fracPart.length);
    return new Rational(negative ? -numerator : numerator, denominator);
  }

  add(other: Rational): Rational {
    return new Rational(this.n * other.d + other.n * this.d, this.d * other.d);
  }

  sub(other: Rational): Rational {
    return new Rational(this.n * other.d - other.n * this.d, this.d * other.d);
  }

  mul(other: Rational): Rational {
    return new Rational(this.n * other.n, this.d * other.d);
  }

  div(other: Rational): Rational {
    if (other.isZero()) {
      throw new RangeError("Division by zero");
    }
    return new Rational(this.n * other.d, this.d * other.n);
  }

  neg(): Rational {
    return new Rational(-this.n, this.d);
  }

  /** Returns -1, 0 or 1. */
  cmp(other: Rational): -1 | 0 | 1 {
    const left = this.n * other.d;
    const right = other.n * this.d;
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  }

  lt(other: Rational): boolean {
    return this.cmp(other) < 0;
  }

  lte(other: Rational): boolean {
    return this.cmp(other) <= 0;
  }

  gt(other: Rational): boolean {
    return this.cmp(other) > 0;
  }

  gte(other: Rational): boolean {
    return this.cmp(other) >= 0;
  }

  eq(other: Rational): boolean {
    return this.cmp(other) === 0;
  }

  isZero(): boolean {
    return this.n === 0n;
  }

  isNegative(): boolean {
    return this.n < 0n;
  }

  static max(a: Rational, b: Rational): Rational {
    return a.gte(b) ? a : b;
  }

  static min(a: Rational, b: Rational): Rational {
    return a.lte(b) ? a : b;
  }

  /** Clamps negatives to zero. Used for fee/tax results that must not go below 0. */
  clampNonNegative(): Rational {
    return this.isNegative() ? Rational.ZERO : this;
  }

  /** Smallest integer >= this value. */
  ceilToBigInt(): bigint {
    const q = this.n / this.d;
    const r = this.n % this.d;
    return r > 0n ? q + 1n : q;
  }

  /** Largest integer <= this value. */
  floorToBigInt(): bigint {
    const q = this.n / this.d;
    const r = this.n % this.d;
    return r < 0n ? q - 1n : q;
  }

  /**
   * Rounds to `decimalPlaces` and returns an exact decimal string.
   * This is the single boundary where precision is intentionally dropped.
   */
  toFixed(decimalPlaces: number, mode: RoundingMode = "half-up"): string {
    if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 30) {
      throw new RangeError(`decimalPlaces must be an integer in 0..30, got ${decimalPlaces}`);
    }
    const scale = 10n ** BigInt(decimalPlaces);
    const scaled = this.mul(new Rational(scale, 1n));
    const rounded = roundToBigInt(scaled, mode);

    const negative = rounded < 0n;
    const digits = abs(rounded).toString().padStart(decimalPlaces + 1, "0");
    const cut = digits.length - decimalPlaces;
    const intPart = digits.slice(0, cut);
    const fracPart = digits.slice(cut);
    const body = decimalPlaces === 0 ? intPart : `${intPart}.${fracPart}`;
    // Avoid emitting "-0.00" for a value that rounded to zero.
    return negative && rounded !== 0n ? `-${body}` : body;
  }

  /**
   * Lossy conversion to `number`, for `Intl.NumberFormat` display and chart
   * geometry only. Never feed the result back into further money arithmetic.
   */
  toNumber(): number {
    return Number(this.n) / Number(this.d);
  }

  toString(): string {
    return this.d === 1n ? this.n.toString() : `${this.n}/${this.d}`;
  }
}

function abs(value: bigint): bigint {
  return value < 0n ? -value : value;
}

function gcd(a: bigint, b: bigint): bigint {
  let x = abs(a);
  let y = abs(b);
  while (y !== 0n) {
    [x, y] = [y, x % y];
  }
  return x;
}

function roundToBigInt(value: Rational, mode: RoundingMode): bigint {
  const q = value.n / value.d; // truncated toward zero
  const r = value.n % value.d;
  if (r === 0n) return q;

  const negative = value.n < 0n;

  switch (mode) {
    case "trunc":
      return q;
    case "floor":
      return negative ? q - 1n : q;
    case "ceil":
      return negative ? q : q + 1n;
    case "half-up":
    case "half-even": {
      const twiceRemainder = abs(r) * 2n;
      const step = negative ? -1n : 1n;
      if (twiceRemainder > value.d) return q + step;
      if (twiceRemainder < value.d) return q;
      // Exactly one half.
      if (mode === "half-up") return q + step;
      return q % 2n === 0n ? q : q + step;
    }
  }
}
