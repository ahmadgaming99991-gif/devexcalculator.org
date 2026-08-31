/**
 * The stored and published shapes of the platform data plane.
 *
 * Versioned as `v2` and stored under `p2:` keys so it can be built and proven
 * alongside the running v1 collector without either being able to read or
 * overwrite the other's state.
 *
 * ## Why the snapshot is normalised
 *
 * An experience appears in more than one Roblox ranking, and the detail fields
 * (visits, votes, genre, maturity) are the bulky ones. Storing rows per ranking
 * would duplicate those fields for every ranking an experience appears in.
 * `experiences` is therefore a map keyed by universe id and `byRanking` holds
 * ordered id lists — which also makes "give me one ranking" a cheap projection
 * rather than a filter over a large array.
 *
 * ## Two timestamps, never one
 *
 * `observedAt` is when the ranking and player counts were read. `detailsObservedAt`
 * is per experience and records when *that row's* slow-changing metadata was last
 * successfully refreshed. They are deliberately separate: detail is refreshed on a
 * rotation, so stamping it with the fresh observation time would present metadata
 * up to a few hours old as though it had just been read. A row that has never been
 * enriched carries `null`, and the UI shows those fields as unavailable rather than
 * inventing them.
 */

/** One of Roblox's published rankings, exactly as Roblox labelled it. */
export interface Ranking {
  readonly id: string;
  readonly name: string;
  readonly subtitle: string | null;
  readonly size: number;
}

/** Slow-changing metadata, refreshed on rotation rather than every cycle. */
export interface ExperienceDetails {
  readonly visits: number | null;
  readonly maxPlayers: number | null;
  readonly creatorName: string | null;
  readonly creatorVerified: boolean;
  readonly upVotes: number | null;
  readonly downVotes: number | null;
  readonly favourites: number | null;
  readonly genre: string | null;
  readonly maturity: string | null;
}

/** One experience: fresh counts every cycle, detail on its own clock. */
export interface ExperienceRecord {
  readonly universeId: number;
  readonly rootPlaceId: number | null;
  readonly name: string;
  /** Players at `observedAt`. Always fresh. */
  readonly playing: number;
  readonly isSponsored: boolean;
  readonly urlPath: string | null;
  /** Null until this row has been successfully enriched at least once. */
  readonly details: ExperienceDetails | null;
  /** When `details` was last successfully refreshed. Null when never. */
  readonly detailsObservedAt: string | null;
}

export interface CollectorState {
  readonly outcome: "recorded" | "skipped" | "failed";
  readonly lastRunAt: string;
  readonly consecutiveFailures: number;
  readonly detail: string | null;
}

/**
 * The one value a reader's first paint depends on.
 *
 * Also the detail cache: folding the two together is what keeps the write
 * budget at one write per cycle for this key instead of two. The alternative —
 * a separate `p2:details` value — would have added 96 writes a day for a value
 * that only ever changes at the same moment this one does.
 */
export interface CurrentSnapshot {
  readonly v: 2;
  readonly observedAt: string;
  readonly collector: CollectorState;
  readonly source: { readonly status: "read" | "unavailable"; readonly detail: string | null };
  readonly rankings: readonly Ranking[];
  readonly defaultRanking: string;
  readonly platform: {
    readonly players: number;
    readonly experiences: number;
    readonly rankings: number;
  };
  /** Ordered universe ids per ranking id. Ids only; rows live in `experiences`. */
  readonly byRanking: Readonly<Record<string, readonly number[]>>;
  readonly experiences: Readonly<Record<string, ExperienceRecord>>;
  /** Rotation cursor: where the next enrichment batch starts. */
  readonly detailCursor: number;
}

/** The platform-total series. Compact pairs rather than objects. */
export interface TotalsSeries {
  readonly v: 2;
  /** `[epochMillis, totalPlaying]`, ascending. */
  readonly points: readonly (readonly [number, number])[];
}

/** Per-experience history, one deterministic shard of it. */
export interface HistoryShard {
  readonly v: 2;
  readonly shard: number;
  readonly at: readonly number[];
  readonly names: Readonly<Record<string, string>>;
  readonly players: Readonly<Record<string, readonly (number | null)[]>>;
}

/**
 * The cross-experience dataset, pre-derived and small.
 *
 * `TopExperiencesOverTime` and `LargestExperience` are the only features that
 * need many series at once. Deriving this on write — from the shard being
 * appended, not by rescanning fourteen days — is what stops a reader from
 * having to download the whole matrix to draw two charts.
 */
export interface Highlights {
  readonly v: 2;
  readonly at: readonly number[];
  readonly series: readonly {
    readonly id: string;
    readonly name: string;
    readonly players: readonly (number | null)[];
  }[];
}

export const KEYS = {
  current: "p2:current",
  totals: "p2:totals",
  highlights: "p2:highlights",
  shard: (n: number) => `p2:hist:${n}`,
} as const;

/** Retention and cadence, mirrored from the v1 collector so series stay comparable. */
export const RETENTION_DAYS = 14;
export const COLLECTION_INTERVAL_MINUTES = 15;
export const HISTORY_INTERVAL_MINUTES = 60;
export const HISTORY_DAYS = 7;
export const SHARD_COUNT = 4;
export const DETAIL_BATCH = 50;
export const HIGHLIGHT_SERIES = 12;

/** Stable, cheap and deterministic. The same id always lands in the same shard. */
export function shardOf(universeId: number | string, count = SHARD_COUNT): number {
  const s = String(universeId);
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % count;
}
