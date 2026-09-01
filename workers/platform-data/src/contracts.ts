/**
 * The stored and published shapes of the platform data plane.
 *
 * ## Why the state is split
 *
 * Every value here is sized against a 10 ms CPU ceiling, because this Worker
 * runs on the Cloudflare Workers Free plan and an invocation that exceeds it is
 * terminated. Measurement, not preference, produced this shape:
 *
 *   - Fetching and validating the Roblox sorts response costs 2.25-3.05 ms.
 *     That is the floor and no design avoids it.
 *   - A single fourteen-day totals array of 1,344 points cost a further 3 ms
 *     per cycle, because appending one pair meant reading and rewriting 31.5 KB.
 *     Day-bucketed, the same work costs 2.54-3.36 ms in total.
 *   - Refreshing fifty enrichment rows inside a single 79 KB map cost 9.93 ms.
 *     Sharded into four, it costs 4.94 ms.
 *   - Appending four history shards and the highlights inside the same
 *     invocation as the rankings cost 12.35-23.15 ms. Split into one unit per
 *     invocation, no unit exceeds 6 ms.
 *
 * ## Two timestamps, never one
 *
 * `observedAt` is when the rankings and player counts were read. `o` on a detail
 * row is when *that row's* slow metadata was last successfully refreshed. They
 * are separate because enrichment rotates on an hourly sweep: stamping it with
 * the fresh observation time would present metadata up to twelve hours old as
 * though it had just been read. A row nobody has reached yet is absent, and the
 * UI shows those fields as unavailable rather than inventing them.
 */

/**
 * The stored schema version.
 *
 * Every value carries it and every read checks it. A value written by a future,
 * incompatible version reads as absent rather than as data, so a rollback
 * degrades to "no observations yet" instead of to a misparsed chart.
 */
export const SCHEMA = 2 as const;

/** One of Roblox's published rankings, exactly as Roblox labelled it. */
export interface Ranking {
  readonly id: string;
  readonly name: string;
  readonly subtitle: string | null;
  readonly size: number;
}

/** Fast state: one row per experience, rewritten every collection cycle. */
export interface LiveRow {
  /** universeId */ readonly i: number;
  /** rootPlaceId */ readonly r: number | null;
  /** name */ readonly n: string;
  /** players at `observedAt` */ readonly p: number;
  /** isSponsored */ readonly s: boolean;
}

/** What the last collection attempt did, so a reader can see a stall. */
export interface CollectorState {
  readonly outcome: "recorded" | "skipped" | "failed";
  readonly lastRunAt: string;
  readonly consecutiveFailures: number;
  readonly detail: string | null;
}

/**
 * The one value a reader's first paint depends on.
 *
 * It also carries `today`, the current day's platform totals. Folding that
 * series in is what keeps the collection cycle to a single write: a separate
 * totals key would be 96 more writes a day for a value that only ever changes
 * at the same instant this one does.
 */
export interface Live {
  readonly schema: typeof SCHEMA;
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
  readonly experiences: Readonly<Record<string, LiveRow>>;
  /** Today's platform totals as `[epochMillis, players]`, ascending. */
  readonly today: readonly (readonly [number, number])[];
  /** The day `today` belongs to, so a value carried over midnight is detected. */
  readonly todayDay: string;
}

/** Slow-changing metadata, refreshed on rotation and stamped on its own clock. */
export interface DetailRow {
  /** visits */ readonly v: number | null;
  /** maxPlayers */ readonly m: number | null;
  /** creator name */ readonly c: string | null;
  /** creator has a verified badge */ readonly cv: boolean;
  /** up votes */ readonly u: number | null;
  /** down votes */ readonly d: number | null;
  /** favourites */ readonly f: number | null;
  /** genre */ readonly g: string | null;
  /** maturity, as Roblox words it */ readonly a: string | null;
  /** when this row was last refreshed, ISO */ readonly o: string;
}

/** One shard of the enrichment map. A refresh rewrites one of these, not all. */
export interface Details {
  readonly schema: typeof SCHEMA;
  readonly shard: number;
  /** Rotation cursor: where the next batch starts among already-known rows. */
  readonly cursor: number;
  readonly rows: Readonly<Record<string, DetailRow>>;
}

/** One finished day of platform totals, rolled up out of `Live.today`. */
export interface TotalsDay {
  readonly schema: typeof SCHEMA;
  readonly day: string;
  readonly points: readonly (readonly [number, number])[];
}

/**
 * One shard of one day of per-experience history.
 *
 * Day-bucketed because the alternative - one value per shard covering the whole
 * window - is read and rewritten in full on every hourly append. Measured, that
 * was roughly 888 KB of JSON per append across four shards. A day bucket
 * reaches about 25 KB by its final hour and starts each day at nothing.
 */
export interface HistoryDay {
  readonly schema: typeof SCHEMA;
  readonly shard: number;
  readonly day: string;
  readonly at: readonly number[];
  /** universe id to one value per entry in `at`. `null` means not observed. */
  readonly p: Readonly<Record<string, readonly (number | null)[]>>;
}

/**
 * The pre-derived cross-experience dataset, maintained incrementally.
 *
 * Never rebuilt by scanning history: an append reads this value, pushes one
 * point onto each kept series and writes it back. Series are kept beyond the
 * charted twelve so an experience that dips out for an hour keeps its line.
 */
export interface Highlights {
  readonly schema: typeof SCHEMA;
  readonly at: readonly number[];
  readonly series: readonly {
    readonly id: string;
    readonly name: string;
    readonly players: readonly (number | null)[];
  }[];
}

/**
 * Every key this Worker owns, under one explicit versioned prefix.
 *
 * The prefix matters: the v1 collector's keys (`obs:`, `index`, `series`,
 * `games`, `heartbeat`) are unprefixed and live in a different namespace, and
 * nothing here can read or overwrite them even if the two are ever bound to the
 * same store.
 */
export const KEYS = {
  live: "platform:v2:live",
  highlights: "platform:v2:highlights",
  details: (shard: number) => `platform:v2:details:${shard}`,
  totals: (day: string) => `platform:v2:totals:${day}`,
  history: (shard: number, day: string) => `platform:v2:history:${shard}:${day}`,
} as const;

/** How long stored values are kept. KV expires them; no cleanup job exists. */
export const RETENTION_DAYS = 14;
/** How often the rankings and player counts are collected. */
export const COLLECTION_INTERVAL_MINUTES = 15;
/** How often a per-experience history point is recorded. */
export const HISTORY_INTERVAL_MINUTES = 60;
/** How far back per-experience history reaches. Matches what v1 collects. */
export const HISTORY_DAYS = 7;
/** Deterministic shards for both history and enrichment. */
export const SHARD_COUNT = 4;
/** Experiences charted by the highlights dataset. */
export const HIGHLIGHT_TOP = 12;
/** Series kept, above the charted twelve, so membership churn is not a gap. */
export const HIGHLIGHT_KEEP = 20;
export const HIGHLIGHT_POINT_CAP = (HISTORY_DAYS * 24 * 60) / HISTORY_INTERVAL_MINUTES;
/** Enrichment rows refreshed per run. Measured at 4.94 ms median for this size. */
export const DETAIL_BATCH = 50;
/** A detail row nobody has refreshed within the window, for an experience no
 *  longer ranked, is dropped. Rows still in the live roster are always kept. */
export const DETAIL_MAX_AGE_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

/** Stable, cheap and deterministic. The same id always lands in the same shard. */
export function shardOf(universeId: number | string, count = SHARD_COUNT): number {
  const s = String(universeId);
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % count;
}

/** `YYYYMMDD` in UTC. A bucket is dated by its observation, never by its reader. */
export function dayKey(at: number): string {
  const d = new Date(at);
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return `${d.getUTCFullYear()}${m < 10 ? "0" : ""}${m}${day < 10 ? "0" : ""}${day}`;
}

/** The last `count` day keys ending today, oldest first. */
export function dayKeys(now: number, count: number): string[] {
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) out.push(dayKey(now - i * 86_400_000));
  return out;
}
