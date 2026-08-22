import { platformMetrics, engagement } from "@/lib/platform/metrics";
import { sources } from "@/lib/calculations/rate-registry";
import {
  everyGameSeries,
  GAME_HISTORY_DAYS,
  GAME_HISTORY_INTERVAL_MINUTES,
  COLLECTION_INTERVAL_MINUTES,
  RETENTION_DAYS,
  type GameHistory,
  type HistorySeries,
} from "@/lib/platform/history";
import type { CsvValue } from "./csv";

/**
 * The site's data, as rows.
 *
 * Both pages that hold data — the creator payout statistics and the observed
 * platform activity — render charts and tables that cannot be copied out. A
 * chart is an argument; the rows behind it are the evidence, and publishing
 * them is the difference between "trust this graph" and "check it".
 *
 * Every row carries its own provenance. That is the whole design: a row taken
 * out of the file and pasted somewhere else still says when it was observed or
 * reported, whether Roblox published it or this site derived it, and which
 * source it came from. A file whose meaning lives in a header block loses it
 * the first time someone selects a range.
 *
 * Nothing here fills a gap. The observed series contains exactly the
 * observations that were collected; a collector outage leaves a hole, and the
 * hole is the honest record of it.
 */

const sourceUrls = new Map(sources.sources.map((source) => [source.id, source.url]));

function sourceUrl(id: string | null | undefined): string {
  return (id && sourceUrls.get(id)) ?? "";
}

// ---------------------------------------------------------------------------
// Roblox creator payout statistics
// ---------------------------------------------------------------------------

export interface StatsRow extends Record<string, CsvValue> {
  readonly metric_id: string;
  readonly metric: string;
  readonly period: string;
  readonly period_kind: string;
  readonly period_ends_at: string;
  readonly value: string;
  /**
   * The unit, where the value does not already carry one.
   *
   * Blank for the engagement figures, whose values are quoted from the release
   * as "123 million" and "29 billion" — restating that as a unit would mean
   * re-expressing a number Roblox wrote, which is how a reported figure
   * quietly becomes a derived one.
   */
  readonly unit: string;
  readonly note: string;
  /** `reported` when Roblox published this figure; `derived` when computed. */
  readonly origin: string;
  readonly source_id: string;
  readonly source_url: string;
}

export const STATS_COLUMNS = [
  "metric_id",
  "metric",
  "period",
  "period_kind",
  "period_ends_at",
  "value",
  "unit",
  "note",
  "origin",
  "source_id",
  "source_url",
] as const;

export function statsRows(): readonly StatsRow[] {
  const rows: StatsRow[] = [];

  for (const key of ["developerExchangeFees", "revenue", "shareOfRevenue"] as const) {
    const group = platformMetrics[key];
    for (const period of group.periods) {
      rows.push({
        metric_id: `${key}.${period.id}`,
        metric: group.label,
        period: period.label,
        period_kind: period.kind,
        period_ends_at: period.endsAt,
        // Exact decimal strings throughout. These are money and percentages
        // read from filings; parsing them into a float to print them again
        // would be the one place this site let binary rounding near a figure.
        value: period.amountUsd ?? period.percent ?? "",
        unit: group.unit,
        // The wording follows the origin. "Reported to the nearest million"
        // on a row marked `derived` says two different things about where the
        // figure came from, which is exactly the confusion the origin column
        // exists to prevent.
        note: period.precision
          ? period.origin === "reported"
            ? `Reported to the nearest ${period.precision}.`
            : `Derived in code from reported figures, to the nearest ${period.precision}.`
          : "",
        origin: period.origin,
        source_id: period.sourceId,
        source_url: sourceUrl(period.sourceId),
      });
    }
  }

  for (const figure of engagement.figures) {
    rows.push({
      metric_id: `engagement.${figure.id}`,
      metric: figure.label,
      period: engagement.period,
      period_kind: "quarter",
      period_ends_at: "",
      // Already carries its own magnitude, quoted from the release.
      value: figure.value,
      unit: "",
      note: figure.note,
      origin: figure.origin,
      source_id: engagement.sourceId,
      source_url: sourceUrl(engagement.sourceId),
    });
  }

  return rows;
}

/**
 * What Roblox does not publish, exported alongside what it does.
 *
 * An absence with a reason is a fact about the dataset. Leaving these out
 * would make the file look like the complete picture, and someone would fill
 * the gap with an estimate — which is the exact thing the page refuses to do.
 */
export const UNPUBLISHED_COLUMNS = ["metric_id", "metric", "status", "reason"] as const;

export interface UnpublishedRow extends Record<string, CsvValue> {
  readonly metric_id: string;
  readonly metric: string;
  readonly status: string;
  readonly reason: string;
}

export function unpublishedRows(): readonly UnpublishedRow[] {
  return engagement.notPublished.map((entry) => ({
    metric_id: `engagement.${entry.id}`,
    metric: entry.label,
    status: "not published by Roblox",
    reason: entry.reason,
  }));
}

// ---------------------------------------------------------------------------
// Observed platform activity
// ---------------------------------------------------------------------------

export const PLATFORM_TOTALS_COLUMNS = [
  "observed_at",
  "total_playing",
  "origin",
  "source",
] as const;

export interface PlatformTotalsRow extends Record<string, CsvValue> {
  readonly observed_at: string;
  readonly total_playing: number;
  readonly origin: string;
  readonly source: string;
}

/** The observation origin, identical on every row and stated on every row. */
const OBSERVED = "observed by devexcalculator.org";
const ROBLOX_PUBLIC = "Roblox public games endpoints";

export function platformTotalsRows(series: HistorySeries): readonly PlatformTotalsRow[] {
  return series.points.map((point) => ({
    observed_at: point.at,
    total_playing: point.totalPlaying,
    origin: OBSERVED,
    source: ROBLOX_PUBLIC,
  }));
}

export const PLATFORM_EXPERIENCES_COLUMNS = [
  "observed_at",
  "universe_id",
  "experience",
  "playing",
  "origin",
  "source",
] as const;

export interface PlatformExperienceRow extends Record<string, CsvValue> {
  readonly observed_at: string;
  readonly universe_id: string;
  readonly experience: string;
  readonly playing: number;
  readonly origin: string;
  readonly source: string;
}

export function platformExperienceRows(
  history: GameHistory,
): readonly PlatformExperienceRow[] {
  const rows: PlatformExperienceRow[] = [];

  for (const entry of everyGameSeries(history)) {
    for (const point of entry.series.points) {
      rows.push({
        observed_at: point.at,
        universe_id: entry.id,
        experience: entry.name,
        playing: point.totalPlaying,
        origin: OBSERVED,
        source: ROBLOX_PUBLIC,
      });
    }
  }

  // Sorted by time then by experience, so the file reads as a record of
  // observations rather than as one experience after another.
  return rows.sort(
    (a, b) => a.observed_at.localeCompare(b.observed_at) || a.experience.localeCompare(b.experience),
  );
}

/**
 * The limitations that travel with an observed export.
 *
 * Returned as data rather than written into the file, so the JSON response and
 * the API documentation state exactly the same thing.
 */
export function platformExportNotes(): readonly string[] {
  return [
    `Observations only. Nothing is interpolated and no missing observation is filled in; a gap means the collector did not run, and is left visible.`,
    `Collected every ${COLLECTION_INTERVAL_MINUTES} minutes. Platform totals are retained for ${RETENTION_DAYS} days; per-experience series are sampled hourly and retained for ${GAME_HISTORY_DAYS} days, so the two have different resolutions and different spans.`,
    `Covers only the experiences Roblox was ranking at the moment of each observation. This is not all of Roblox, and no share of the platform can be computed from it.`,
    `Read from Roblox's own public endpoints server-side. Roblox publishes no figure for concurrent players platform-wide, and none is inferred here.`,
    `Per-experience points are recorded at most once every ${GAME_HISTORY_INTERVAL_MINUTES} minutes.`,
  ];
}
