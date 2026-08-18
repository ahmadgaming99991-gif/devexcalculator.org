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
 *
 * The index exists so a page render is a bounded number of reads rather than a
 * `list()` over a growing namespace. Snapshots are written with an expiry, so
 * old data removes itself and retention needs no separate job.
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

/** Caps a single render's KV reads, and the width of any chart. */
const MAX_SNAPSHOTS_READ = 200;

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

  return { written: key, retained: kept.length };
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
  const index = await readIndex(store);
  if (index.length === 0) return EMPTY_SERIES;

  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
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
