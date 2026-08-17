import currenciesJson from "@/data/currencies.json";
import { Rational } from "./rational";

/**
 * Display formatting — the only place precision is intentionally dropped.
 *
 * Rounding policy (docs/calculation-methodology.md):
 *   1. Arithmetic keeps full precision as exact rationals throughout.
 *   2. A value is rounded exactly once, here, at the moment it is rendered.
 *   3. Money rounds half-up to the currency's own minor units.
 *   4. Robux requirements round UP to a whole Robux, never down.
 *   5. `Intl.NumberFormat` handles grouping and currency symbols so output
 *      matches the reader's locale conventions.
 */

export interface CurrencyDefinition {
  readonly code: string;
  readonly name: string;
  readonly minorUnits: number;
  readonly isBase: boolean;
}

interface CurrenciesFile {
  readonly schemaVersion: number;
  readonly baseCurrency: string;
  readonly providerId: string;
  readonly note: string;
  readonly currencies: readonly CurrencyDefinition[];
}

const file = currenciesJson as CurrenciesFile;

export const supportedCurrencies: readonly CurrencyDefinition[] = file.currencies;
export const baseCurrency = file.baseCurrency;

const byCode = new Map(file.currencies.map((c) => [c.code, c]));

export function getCurrency(code: string): CurrencyDefinition | null {
  return byCode.get(code.toUpperCase()) ?? null;
}

export function isSupportedCurrency(code: string): boolean {
  return byCode.has(code.toUpperCase());
}

export function minorUnitsFor(code: string): number {
  return byCode.get(code.toUpperCase())?.minorUnits ?? 2;
}

/** Default locale for number formatting. Kept in one place for consistency. */
export const DISPLAY_LOCALE = "en-US";

/**
 * Formats an exact rational as a currency string.
 *
 * The rational is rounded to the currency's minor units first, then handed to
 * `Intl` as a decimal string parsed once. This avoids passing a float through
 * `Intl` and re-introducing the representation error the engine avoided.
 */
export function formatCurrency(
  value: Rational,
  currencyCode: string,
  options: { locale?: string; showSymbol?: boolean; maximumFractionDigits?: number } = {},
): string {
  const code = currencyCode.toUpperCase();
  const minorUnits = options.maximumFractionDigits ?? minorUnitsFor(code);
  const rounded = value.toFixed(minorUnits, "half-up");

  const formatter = new Intl.NumberFormat(options.locale ?? DISPLAY_LOCALE, {
    style: options.showSymbol === false ? "decimal" : "currency",
    currency: code,
    minimumFractionDigits: minorUnits,
    maximumFractionDigits: minorUnits,
  });

  return formatter.format(Number(rounded));
}

/**
 * Formats a rate such as `0.0038`, which needs more precision than a payout.
 * Trailing zeros are preserved so `3.80` never renders as `3.8`.
 */
export function formatRate(value: Rational, decimalPlaces = 4): string {
  const rounded = value.toFixed(decimalPlaces, "half-up");
  const formatter = new Intl.NumberFormat(DISPLAY_LOCALE, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
  return formatter.format(Number(rounded));
}

/** Formats a whole Robux count with thousands separators. */
export function formatRobux(value: bigint | number): string {
  const asBigInt = typeof value === "bigint" ? value : BigInt(Math.trunc(value));
  return new Intl.NumberFormat(DISPLAY_LOCALE).format(asBigInt);
}

/**
 * Screen-reader friendly label for a large Robux count.
 * `formatRobux` alone reads acceptably, but pairing the digits with the unit
 * avoids a bare number being announced without context.
 */
export function formatRobuxLabel(value: bigint | number): string {
  const formatted = formatRobux(value);
  const isOne = (typeof value === "bigint" ? value : BigInt(Math.trunc(value))) === 1n;
  return `${formatted} Earned ${isOne ? "Robux" : "Robux"}`;
}

/** Formats a percentage such as a fee or a difference. */
export function formatPercent(value: Rational, decimalPlaces = 2): string {
  const rounded = value.toFixed(decimalPlaces, "half-up");
  const formatter = new Intl.NumberFormat(DISPLAY_LOCALE, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
  return `${formatter.format(Number(rounded))}%`;
}

/** Formats a signed difference, always showing the sign for non-zero values. */
export function formatSignedCurrency(value: Rational, currencyCode: string): string {
  const formatted = formatCurrency(value, currencyCode);
  if (value.gt(Rational.ZERO)) return `+${formatted}`;
  return formatted;
}

export function formatSignedPercent(value: Rational, decimalPlaces = 1): string {
  const formatted = formatPercent(value, decimalPlaces);
  if (value.gt(Rational.ZERO)) return `+${formatted}`;
  return formatted;
}

/**
 * Compact Robux label used on preset chips: 1K, 30K, 1M.
 * Only applied to exact multiples so a chip never misrepresents its value.
 */
export function formatCompactRobux(value: bigint): string {
  if (value >= 1_000_000_000n && value % 1_000_000_000n === 0n) {
    return `${value / 1_000_000_000n}B`;
  }
  if (value >= 1_000_000n && value % 1_000_000n === 0n) {
    return `${value / 1_000_000n}M`;
  }
  if (value >= 1_000n && value % 1_000n === 0n) {
    return `${value / 1_000n}K`;
  }
  return formatRobux(value);
}

/** Formats an ISO instant as a plain readable date, e.g. "17 August 2026". */
export function formatDate(iso: string, locale = "en-GB"): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

/** Formats an ISO instant as a date and time in UTC, for FX observations. */
export function formatDateTime(iso: string, locale = "en-GB"): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return `${new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false,
  }).format(parsed)} UTC`;
}
