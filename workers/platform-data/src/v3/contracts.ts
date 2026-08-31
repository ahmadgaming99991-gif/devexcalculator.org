/**
 * The staged shapes: split fast state from slow state.
 *
 * The single-stage v2 collector measured 8.27–14.96 ms on Workers Free, and the
 * cost was not the bundle — it was JSON volume. One cycle moved ~390 KB, of
 * which 218 KB was the previous snapshot being read and written back purely to
 * carry slow-changing detail fields the cycle never touched.
 *
 * So the snapshot is split. `p3:live` holds only what changes every fifteen
 * minutes; `p3:details` holds what changes on a multi-hour rotation. Stage A
 * never reads or rewrites detail, and Stage B never reads or rewrites rankings.
 *
 * Field names are short in storage and expanded nowhere. Renaming 471 rows on
 * every read would spend the CPU this shape exists to save, so the wire format
 * is the stored format and the client knows both.
 */

/** One of Roblox's published rankings, exactly as Roblox labelled it. */
export interface Ranking {
  readonly id: string;
  readonly name: string;
  readonly subtitle: string | null;
  readonly size: number;
}

/** Fast state: one row per experience, rewritten every cycle. */
export interface LiveRow {
  /** universeId */ readonly i: number;
  /** rootPlaceId */ readonly r: number | null;
  /** name */ readonly n: string;
  /** players now */ readonly p: number;
  /** isSponsored */ readonly s: boolean;
}

export interface CollectorState {
  readonly outcome: "recorded" | "skipped" | "failed";
  readonly lastRunAt: string;
  readonly consecutiveFailures: number;
  readonly detail: string | null;
}

export interface Live {
  readonly v: 3;
  readonly observedAt: string;
  readonly collector: CollectorState;
  readonly source: { readonly status: "read" | "unavailable"; readonly detail: string | null };
  readonly rankings: readonly Ranking[];
  readonly defaultRanking: string;
  readonly platform: { readonly players: number; readonly experiences: number; readonly rankings: number };
  readonly byRanking: Readonly<Record<string, readonly number[]>>;
  readonly experiences: Readonly<Record<string, LiveRow>>;
}

/**
 * Slow state: enrichment, on its own clock and its own timestamp.
 *
 * `o` is per row and records when *that row* was last successfully refreshed,
 * never when the rankings were read. A row Stage B has not reached yet is
 * absent rather than present-and-empty, so "unknown" is unambiguous.
 */
export interface DetailRow {
  /** visits */ readonly v: number | null;
  /** maxPlayers */ readonly m: number | null;
  /** creator name */ readonly c: string | null;
  /** creator verified */ readonly cv: boolean;
  /** up votes */ readonly u: number | null;
  /** down votes */ readonly d: number | null;
  /** favourites */ readonly f: number | null;
  /** genre */ readonly g: string | null;
  /** maturity */ readonly a: string | null;
  /** observedAt, ISO */ readonly o: string;
}

export interface Details {
  readonly v: 3;
  /** Rotation cursor: where the next batch starts among already-known rows. */
  readonly cursor: number;
  readonly rows: Readonly<Record<string, DetailRow>>;
}

/** Platform totals, plus the one bookkeeping field Stage A needs to read anyway. */
export interface Totals {
  readonly v: 3;
  /** `[epochMillis, totalPlaying]`, ascending. */
  readonly points: readonly (readonly [number, number])[];
  /** When the hourly history point was last appended. 0 when never. */
  readonly lastHistoryAt: number;
}

/**
 * One shard of one day of per-experience history.
 *
 * Day-bucketed because the alternative — a 111 KB per-shard value covering
 * seven days — is read and rewritten in full on every hourly append, which
 * measured at roughly 888 KB of JSON per append across four shards. A day
 * bucket reaches about 20 KB by its final hour and starts each day at nothing.
 */
export interface HistoryBucket {
  readonly v: 3;
  readonly s: number;
  readonly d: string;
  readonly at: readonly number[];
  readonly p: Readonly<Record<string, readonly (number | null)[]>>;
}

/**
 * The pre-derived cross-experience series, maintained incrementally.
 *
 * Never rebuilt by scanning history: an append reads this value, pushes one
 * point onto each kept series and writes it back. Series are kept past the
 * top twelve so an experience that dips out for an hour does not lose its line.
 */
export interface Highlights {
  readonly v: 3;
  readonly at: readonly number[];
  readonly series: readonly {
    readonly id: string;
    readonly name: string;
    readonly players: readonly (number | null)[];
  }[];
}

export const K = {
  live: "p3:live",
  details: "p3:details",
  totals: "p3:totals",
  highlights: "p3:highlights",
  /** `p3:h:<shard>:<YYYYMMDD>` */
  bucket: (shard: number, day: string) => `p3:h:${shard}:${day}`,
  /** The folded-shape comparison key. Only the A/B measurement writes it. */
  folded: "p3f:current",
} as const;

export const RETENTION_DAYS = 14;
export const COLLECTION_INTERVAL_MINUTES = 15;
export const HISTORY_INTERVAL_MINUTES = 60;
/** Per-experience history span, matching what v1 already collects and charts. */
export const HISTORY_DAYS = 7;
export const SHARD_COUNT = 4;
export const HIGHLIGHT_TOP = 12;
/** Kept series, above the charted twelve, so membership churn is not a gap. */
export const HIGHLIGHT_KEEP = 20;
export const HIGHLIGHT_POINT_CAP = (HISTORY_DAYS * 24 * 60) / HISTORY_INTERVAL_MINUTES;
export const TOTALS_POINT_CAP = (RETENTION_DAYS * 24 * 60) / COLLECTION_INTERVAL_MINUTES;
export const DETAIL_BATCH = 50;
/** A detail row nobody has refreshed within the retention window is dropped. */
export const DETAIL_MAX_AGE_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

/** Stable, cheap and deterministic. The same id always lands in the same shard. */
export function shardOf(universeId: number | string, count = SHARD_COUNT): number {
  const s = String(universeId);
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % count;
}

/** `YYYYMMDD` in UTC. Buckets are dated by the observation, never by the reader. */
export function dayKey(at: number): string {
  const d = new Date(at);
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${d.getUTCFullYear()}${m < 10 ? "0" : ""}${m}${day < 10 ? "0" : ""}${day}`;
}

/** The last `count` day keys, newest last. */
export function dayKeys(now: number, count: number): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) out.push(dayKey(now - i * 86_400_000));
  return out;
}
