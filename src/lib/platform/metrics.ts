import raw from "@/data/platform-metrics.json";
import { sources } from "@/lib/calculations/rate-registry";

/**
 * Roblox's published platform figures.
 *
 * Every number here was read out of an SEC filing and carries the filing it
 * came from. Nothing is sampled, scraped or estimated, and there is no live
 * feed: Roblox reports quarterly, so quarterly is the only honest resolution
 * this page can claim. The registry is validated at module load, which happens
 * during `next build`, so a malformed or unsourced figure fails the build
 * rather than reaching a reader.
 */

export type MetricOrigin = "reported" | "derived";
export type PeriodKind = "quarter" | "year";

export interface MetricPeriod {
  readonly id: string;
  readonly label: string;
  readonly kind: PeriodKind;
  readonly endsAt: string;
  /** Whole US dollars. A string, so the figure never becomes a double. */
  readonly amountUsd?: string;
  readonly percent?: string;
  readonly precision?: "thousand" | "million";
  readonly origin: MetricOrigin;
  readonly derivation?: string;
  readonly sourceId: string;
}

export interface MetricSeries {
  readonly label: string;
  readonly description: string;
  readonly unit: "usd" | "percent";
  readonly periods: readonly MetricPeriod[];
}

export interface ContextFigure {
  readonly id: string;
  readonly label: string;
  /** Quoted from the release, not recomputed. */
  readonly current: string;
  readonly previous: string;
  readonly note: string;
}

export interface CompanyContext {
  readonly label: string;
  readonly description: string;
  readonly period: string;
  readonly comparedWith: string;
  readonly sourceId: string;
  readonly figures: readonly ContextFigure[];
}

interface Registry {
  readonly schemaVersion: number;
  readonly registryVersion: string;
  readonly retrievedAt: string;
  readonly sourceIds: readonly string[];
  readonly developerExchangeFees: MetricSeries;
  readonly revenue: MetricSeries;
  readonly shareOfRevenue: MetricSeries;
  readonly companyContext: CompanyContext;
}

const registry = raw as unknown as Registry;

const WHOLE_NUMBER = /^\d+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validate(): void {
  const problems: string[] = [];

  if (registry.schemaVersion !== 1) {
    problems.push(`Unsupported schemaVersion ${registry.schemaVersion}.`);
  }
  if (!ISO_DATE.test(registry.retrievedAt)) {
    problems.push(`retrievedAt must be an ISO date, got "${registry.retrievedAt}".`);
  }

  const series: [string, MetricSeries][] = [
    ["developerExchangeFees", registry.developerExchangeFees],
    ["revenue", registry.revenue],
    ["shareOfRevenue", registry.shareOfRevenue],
  ];

  for (const [name, entry] of series) {
    if (entry.periods.length === 0) problems.push(`${name} has no periods.`);
    const seen = new Set<string>();

    for (const period of entry.periods) {
      const where = `${name}.${period.id}`;

      if (seen.has(period.id)) problems.push(`${where} is listed twice.`);
      seen.add(period.id);

      if (!ISO_DATE.test(period.endsAt)) {
        problems.push(`${where} has an invalid endsAt "${period.endsAt}".`);
      }

      // A figure with no resolvable source is exactly what this registry
      // exists to prevent.
      if (!sources.sources.some((source) => source.id === period.sourceId)) {
        problems.push(`${where} cites unknown source "${period.sourceId}".`);
      }

      if (entry.unit === "usd") {
        if (!period.amountUsd || !WHOLE_NUMBER.test(period.amountUsd)) {
          problems.push(`${where} must carry amountUsd as digits, got "${period.amountUsd}".`);
        }
      } else if (!period.percent || !/^\d+(\.\d+)?$/.test(period.percent)) {
        problems.push(`${where} must carry percent as a number string.`);
      }

      // A derived figure has to say what it was derived from, or a reader
      // cannot tell it apart from one Roblox printed.
      if (period.origin === "derived" && !period.derivation) {
        problems.push(`${where} is derived but does not record how.`);
      }
      if (period.origin === "reported" && period.derivation) {
        problems.push(`${where} is reported but also claims a derivation.`);
      }
    }
  }

  const context = registry.companyContext;
  if (!sources.sources.some((source) => source.id === context.sourceId)) {
    problems.push(`companyContext cites unknown source "${context.sourceId}".`);
  }
  if (context.figures.length === 0) problems.push("companyContext has no figures.");
  for (const figure of context.figures) {
    // Every figure is quoted, so the only thing to enforce is that it says
    // something and is not left as a placeholder.
    if (!figure.current.trim() || !figure.label.trim() || !figure.note.trim()) {
      problems.push(`companyContext.${figure.id} is missing a label, value or note.`);
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `platform-metrics.json is invalid:\n  ${problems.join("\n  ")}\n` +
        "Fix src/data/platform-metrics.json; the build depends on it.",
    );
  }
}

validate();

/** Quarterly DevEx payouts, oldest first, for charting. */
export const devExFeesByQuarter: readonly MetricPeriod[] = registry.developerExchangeFees.periods
  .filter((period) => period.kind === "quarter")
  .slice()
  .sort((a, b) => a.endsAt.localeCompare(b.endsAt));

/** Annual DevEx payouts, oldest first. */
export const devExFeesByYear: readonly MetricPeriod[] = registry.developerExchangeFees.periods
  .filter((period) => period.kind === "year")
  .slice()
  .sort((a, b) => a.endsAt.localeCompare(b.endsAt));

export const companyContext: CompanyContext = registry.companyContext;

export const platformMetrics = registry;

/** Formats whole dollars as a short, readable magnitude: 1.50B, 477M. */
export function formatUsdMagnitude(amountUsd: string): string {
  const value = BigInt(amountUsd);
  const billion = 1_000_000_000n;
  const million = 1_000_000n;

  if (value >= billion) {
    // Two decimals, computed in integers so no float rounding is involved.
    const hundredths = (value * 100n) / billion;
    return `$${(Number(hundredths) / 100).toFixed(2)}B`;
  }
  const whole = value / million;
  const tenths = ((value % million) * 10n) / million;
  return tenths === 0n ? `$${whole}M` : `$${whole}.${tenths}M`;
}

/**
 * Year-on-year change between two amounts, as a signed percentage with one
 * decimal. Computed on integers to avoid a floating-point figure being
 * presented as if it were exact.
 */
export function percentChange(fromUsd: string, toUsd: string): string {
  const from = BigInt(fromUsd);
  const to = BigInt(toUsd);
  if (from === 0n) return "—";
  const tenths = ((to - from) * 1000n) / from;
  const value = Number(tenths) / 10;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}
