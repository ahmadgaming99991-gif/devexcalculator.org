import type { ExperienceObservation } from "./roblox-api";

/**
 * Observation history, stored in Workers KV.
 *
 * This is the one piece of state the site keeps, and it exists because the
 * alternative was to show a chart of data nobody had collected. Decision D-027
 * records why it reverses D-011.
 *
 * Storage shape, deliberately boring:
 *
 *   obs:<ISO timestamp>   one snapshot, written by the cron trigger
 *   index                 an ordered list of the snapshot keys that exist
 *   series                every observation as [epoch ms, total], one key
 *
 * The index exists so a page render is a bounded number of reads rather than a
 * `list()` over a growing namespace. Snapshots are written with an expiry, so
 * old data removes itself and retention needs no separate job.
 *
 * `series` was added because reading the chart from the index cost one KV read
 * per point, which capped a render at 200 reads — about two days at a
 * fifteen-minute interval. Offering a reader a fourteen-day chart while only
 * ever holding two days of it would have been a lie told by the axis. The whole
 * series is a few tens of kilobytes, so it fits in one value and a render is
 * one read. Snapshots stay exactly as they were: `series` carries only what the
 * chart plots, and the per-observation detail still lives in `obs:` keys.
 */

/** Snapshots older than this are gone; KV expires them without a cleanup job. */
export const RETENTION_DAYS = 14;
const RETENTION_SECONDS = RETENTION_DAYS * 24 * 60 * 60;

/** The cron writes one snapshot per run. Four an hour is enough to draw a day. */
export const COLLECTION_INTERVAL_MINUTES = 15;

/** Nothing is charted until there are at least this many points to join. */
export const MINIMUM_POINTS_FOR_CHART = 3;

const INDEX_KEY = "index";
const SNAPSHOT_PREFIX = "obs:";
const SERIES_KEY = "series";

/**
 * Caps a single render's KV reads on the legacy path only.
 *
 * Reached when `series` has not been written yet — the first run after this
 * was deployed, and any environment holding older data. The rollup path has no
 * such cap because it is one read whatever the span.
 */
const MAX_SNAPSHOTS_READ = 200;

/**
 * One charted observation, stored compactly: [epoch milliseconds, total].
 *
 * Milliseconds rather than seconds so a stored time round-trips to exactly the
 * ISO string it came from. Truncating to seconds moved every observation by up
 * to 999ms, which is invisible on a chart but means the page would print a
 * time that was not the time recorded.
 */
type SeriesEntry = readonly [number, number];

function isSeriesEntry(value: unknown): value is SeriesEntry {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

async function readRollup(store: HistoryStore): Promise<SeriesEntry[] | null> {
  const raw = await store.get(SERIES_KEY, "json");
  if (!Array.isArray(raw)) return null;
  return raw.filter(isSeriesEntry);
}

export interface Snapshot {
  readonly observedAt: string;
  readonly sortName: string;
  readonly totalPlaying: number;
  readonly experiences: readonly {
    readonly universeId: number;
    readonly name: string;
    readonly playing: number;
  }[];
}

/** The minimum of the KV binding this module needs, so tests can supply a fake. */
export interface HistoryStore {
  get(key: string, type: "json"): Promise<unknown>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
}

function snapshotKey(observedAt: string): string {
  return `${SNAPSHOT_PREFIX}${observedAt}`;
}

async function readIndex(store: HistoryStore): Promise<string[]> {
  const raw = await store.get(INDEX_KEY, "json");
  if (!Array.isArray(raw)) return [];
  return raw.filter((entry): entry is string => typeof entry === "string");
}

/**
 * Records one observation.
 *
 * The index is trimmed to the retention window on write, so it cannot grow
 * without bound even though the snapshots it points at expire on their own.
 */
export async function recordSnapshot(
  store: HistoryStore,
  snapshot: Snapshot,
): Promise<{ written: string; retained: number }> {
  const key = snapshotKey(snapshot.observedAt);

  await store.put(key, JSON.stringify(snapshot), { expirationTtl: RETENTION_SECONDS });

  const cutoff = Date.now() - RETENTION_SECONDS * 1000;
  const index = await readIndex(store);
  const kept = [...index, key]
    .filter((entry, position, all) => all.indexOf(entry) === position)
    .filter((entry) => {
      const at = Date.parse(entry.slice(SNAPSHOT_PREFIX.length));
      return Number.isFinite(at) && at >= cutoff;
    })
    .sort();

  await store.put(INDEX_KEY, JSON.stringify(kept.slice(-MAX_SNAPSHOTS_READ)));

  /*
   * The rollup the chart reads.
   *
   * Appended rather than rebuilt, so the cost of a collection run does not grow
   * with the length of the history. A repeated timestamp replaces its earlier
   * entry instead of adding a second point at the same instant — a retried run
   * must not put a kink in the line.
   */
  const at = Date.parse(snapshot.observedAt);
  if (Number.isFinite(at)) {
    /*
     * Seeded from the snapshots already stored, whenever the rollup is missing
     * or has fewer points than the index says exist.
     *
     * Without this the rollup started at a single point and reads preferred
     * it, silently dropping every observation collected before the rollup
     * existed — real recorded data, still sitting in `obs:` keys. It happened
     * in production. Comparing against the index rather than only checking for
     * absence also means a write that failed halfway repairs itself on the
     * next run instead of leaving the chart permanently short.
     */
    const stored = await readRollup(store);
    const existing =
      stored && stored.length >= kept.length
        ? stored
        : mergeEntries(stored ?? [], await seedRollup(store, kept));
    const merged = [
      ...existing.filter(([stored]) => stored !== at && stored >= cutoff),
      [at, snapshot.totalPlaying] as SeriesEntry,
    ].sort((a, b) => a[0] - b[0]);

    await store.put(SERIES_KEY, JSON.stringify(merged), {
      expirationTtl: RETENTION_SECONDS,
    });
  }

  return { written: key, retained: kept.length };
}

/** Combines two sets of entries, keeping one point per instant. */
function mergeEntries(
  a: readonly SeriesEntry[],
  b: readonly SeriesEntry[],
): SeriesEntry[] {
  const byTime = new Map<number, number>();
  for (const [at, total] of [...a, ...b]) byTime.set(at, total);
  return [...byTime.entries()].sort((x, y) => x[0] - y[0]);
}

/**
 * Builds the rollup from snapshots that were stored before it existed.
 *
 * Every entry comes from a snapshot this site actually recorded; nothing is
 * interpolated to fill the gaps between them. A snapshot that cannot be read
 * is skipped rather than guessed at.
 */
async function seedRollup(
  store: HistoryStore,
  index: readonly string[],
): Promise<SeriesEntry[]> {
  const keys = index.slice(-MAX_SNAPSHOTS_READ);
  const stored = await Promise.all(
    keys.map(async (key) => {
      const value = await store.get(key, "json");
      if (!isSnapshot(value)) return null;
      const at = Date.parse(value.observedAt);
      return Number.isFinite(at) ? ([at, value.totalPlaying] as SeriesEntry) : null;
    }),
  );

  return stored
    .filter((entry): entry is SeriesEntry => entry !== null)
    .sort((a, b) => a[0] - b[0]);
}

export interface HistorySeries {
  readonly points: readonly { readonly at: string; readonly totalPlaying: number }[];
  /** Hours between the first and last observation actually held. */
  readonly spanHours: number;
  readonly firstObservedAt: string | null;
  readonly lastObservedAt: string | null;
  /** True once there is enough to draw a line rather than a dot. */
  readonly chartable: boolean;
}

const EMPTY_SERIES: HistorySeries = {
  points: [],
  spanHours: 0,
  firstObservedAt: null,
  lastObservedAt: null,
  chartable: false,
};

/**
 * Reads back what has actually been collected.
 *
 * Deliberately reports the real span rather than a fixed window: on day one
 * this returns a few hours, and it widens on its own as observations
 * accumulate. Nothing here pads, interpolates or back-fills — a gap in
 * collection stays a gap.
 */
export async function readSeries(
  store: HistoryStore,
  windowDays = RETENTION_DAYS,
): Promise<HistorySeries> {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;

  // One read covers any span. Only when the rollup has never been written —
  // the first collection after this shipped — does the per-snapshot path run.
  const rollup = await readRollup(store);
  if (rollup && rollup.length > 0) {
    const points = rollup
      .filter(([at]) => at >= cutoff)
      .sort((a, b) => a[0] - b[0])
      .map(([at, totalPlaying]) => ({
        at: new Date(at).toISOString(),
        totalPlaying,
      }));
    return toSeries(points);
  }

  const index = await readIndex(store);
  if (index.length === 0) return EMPTY_SERIES;

  const wanted = index
    .filter((key) => {
      const at = Date.parse(key.slice(SNAPSHOT_PREFIX.length));
      return Number.isFinite(at) && at >= cutoff;
    })
    .slice(-MAX_SNAPSHOTS_READ);

  const snapshots = await Promise.all(
    wanted.map(async (key) => {
      const value = await store.get(key, "json");
      return isSnapshot(value) ? value : null;
    }),
  );

  const points = snapshots
    .filter((snapshot): snapshot is Snapshot => snapshot !== null)
    .map((snapshot) => ({ at: snapshot.observedAt, totalPlaying: snapshot.totalPlaying }))
    .sort((a, b) => a.at.localeCompare(b.at));

  return toSeries(points);
}

/** Describes a set of points without adding anything to them. */
function toSeries(
  points: readonly { readonly at: string; readonly totalPlaying: number }[],
): HistorySeries {
  if (points.length === 0) return EMPTY_SERIES;

  const first = points[0]?.at ?? null;
  const last = points[points.length - 1]?.at ?? null;
  const spanMs =
    first && last ? Math.max(0, Date.parse(last) - Date.parse(first)) : 0;

  return {
    points,
    spanHours: spanMs / 3_600_000,
    firstObservedAt: first,
    lastObservedAt: last,
    chartable: points.length >= MINIMUM_POINTS_FOR_CHART,
  };
}

function isSnapshot(value: unknown): value is Snapshot {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.observedAt === "string" &&
    typeof record.totalPlaying === "number" &&
    Array.isArray(record.experiences)
  );
}

/** Turns a live reading into the snapshot the collector stores. */
export function toSnapshot(
  observedAt: string,
  sortName: string,
  experiences: readonly ExperienceObservation[],
): Snapshot {
  return {
    observedAt,
    sortName,
    totalPlaying: experiences.reduce((sum, experience) => sum + experience.playing, 0),
    // Only the fields a chart needs are stored. Descriptions and thumbnails
    // would multiply the size of every snapshot for no chart.
    experiences: experiences.map((experience) => ({
      universeId: experience.universeId,
      name: experience.name,
      playing: experience.playing,
    })),
  };
}

/**
 * The windows a reader can chart.
 *
 * Capped at the retention window because nothing older than that exists: an
 * option for 30 days would be an option to look at emptiness. Each is a real
 * cut of stored observations, never a resampling or a longer axis drawn over
 * the same points.
 */
export const CHART_WINDOWS = [
  { days: 1, label: "24 hours" },
  { days: 3, label: "3 days" },
  { days: 7, label: "7 days" },
  { days: RETENTION_DAYS, label: `${RETENTION_DAYS} days` },
] as const;

export type ChartWindow = (typeof CHART_WINDOWS)[number];

/** The default view: everything held, which early on is everything there is. */
export const DEFAULT_CHART_WINDOW: ChartWindow =
  CHART_WINDOWS[CHART_WINDOWS.length - 1]!;

/**
 * Resolves a requested window to one this site actually offers.
 *
 * A hand-edited `?days=999` selects the widest real option rather than
 * producing an error or an axis nobody has data for.
 */
export function resolveChartWindow(requested: string | undefined): ChartWindow {
  const days = Number(requested);
  if (!Number.isFinite(days)) return DEFAULT_CHART_WINDOW;
  return CHART_WINDOWS.find((window) => window.days === days) ?? DEFAULT_CHART_WINDOW;
}

export interface SeriesExtremes {
  readonly peak: { readonly at: string; readonly totalPlaying: number };
  readonly low: { readonly at: string; readonly totalPlaying: number };
  /** Mean across the recorded points, rounded to a whole player. */
  readonly mean: number;
  /**
   * Difference between the last two observations, or null when there is only
   * one. Deliberately the *observed* change: with a gap in collection the two
   * points may be further apart than the collection interval, which is why the
   * page states the interval it actually spans rather than assuming 15 minutes.
   */
  readonly change: {
    readonly absolute: number;
    readonly percent: number | null;
    readonly minutesApart: number;
  } | null;
}

/**
 * The highest, lowest and average of what was actually recorded.
 *
 * Every figure here is arithmetic over stored observations — no smoothing, no
 * interpolation, and no claim about moments between two points. Null when
 * nothing has been recorded, so a caller cannot render a zero as a measurement.
 */
export function summarise(series: HistorySeries): SeriesExtremes | null {
  const points = series.points;
  if (points.length === 0) return null;

  let peak = points[0]!;
  let low = points[0]!;
  let total = 0;

  for (const point of points) {
    if (point.totalPlaying > peak.totalPlaying) peak = point;
    if (point.totalPlaying < low.totalPlaying) low = point;
    total += point.totalPlaying;
  }

  const last = points[points.length - 1]!;
  const previous = points.length >= 2 ? points[points.length - 2]! : null;

  const change = previous
    ? {
        absolute: last.totalPlaying - previous.totalPlaying,
        percent:
          previous.totalPlaying > 0
            ? ((last.totalPlaying - previous.totalPlaying) / previous.totalPlaying) * 100
            : null,
        minutesApart: Math.max(
          0,
          Math.round((Date.parse(last.at) - Date.parse(previous.at)) / 60_000),
        ),
      }
    : null;

  return {
    peak: { at: peak.at, totalPlaying: peak.totalPlaying },
    low: { at: low.at, totalPlaying: low.totalPlaying },
    mean: Math.round(total / points.length),
    change,
  };
}

/**
 * Describes the collected window in words.
 *
 * The page states what it actually has — "4 hours" on the first day — instead
 * of labelling a near-empty chart "14 days".
 */
export function describeSpan(series: HistorySeries): string {
  if (series.points.length === 0) return "no observations yet";
  if (series.points.length === 1) return "a single observation";

  const hours = series.spanHours;
  if (hours < 1) return "under an hour";
  if (hours < 48) {
    const rounded = Math.round(hours);
    return `${rounded} hour${rounded === 1 ? "" : "s"}`;
  }
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}
