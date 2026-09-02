/**
 * The public exports, read from the v2 data plane instead of the v1 collector.
 *
 * `/api/platform/` is linked from the page as a CSV and JSON download and has
 * been public long enough to be in someone's script. When the v1 collector
 * stops, an export still reading v1 keeps answering 200 with well-formed rows
 * whose newest row never moves — a file that has silently frozen, sitting
 * beside a page showing fresh figures. That is the one failure this project
 * treats as worse than an outage, so the exports move before v1 retires.
 *
 * The strategy here is deliberately unambitious: read v2's shapes, build the
 * *v1* in-memory shapes from them, and hand those to the row builders that
 * already exist. Column names, column order, sort order, filenames and the JSON
 * envelope are then preserved by construction rather than by re-implementation
 * and hope. `src/lib/api/exports.ts` is not touched.
 *
 * Reads only. This module never writes to the v2 namespace — the data Worker
 * owns every key in it.
 */

import {
  GAME_HISTORY_DAYS,
  RETENTION_DAYS,
  type GameHistory,
  type HistorySeries,
} from "./history";

/** Mirrors the data Worker's own constants. See workers/platform-data/src/contracts.ts. */
const SCHEMA = 2;
const SHARD_COUNT = 4;
const MINIMUM_POINTS_FOR_CHART = 2;

export interface V2Store {
  get(key: string, type: "json"): Promise<unknown>;
}

/** The binding is optional: locally there is none, and that is not an error. */
export async function getV2Store(): Promise<V2Store | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true });
    const binding = (context.env as Record<string, unknown>).PLATFORM_DATA;
    return binding ? (binding as V2Store) : null;
  } catch {
    return null;
  }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** The same schema gate the Worker applies: a foreign shape reads as absent. */
async function read(store: V2Store, key: string): Promise<Record<string, unknown> | null> {
  try {
    const value = await store.get(key, "json");
    return isObject(value) && value.schema === SCHEMA ? value : null;
  } catch {
    return null;
  }
}

function dayKey(at: number): string {
  const date = new Date(at);
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");
  return `${date.getUTCFullYear()}${month}${day}`;
}

function dayKeys(now: number, count: number): string[] {
  const days: string[] = [];
  for (let back = count - 1; back >= 0; back -= 1) {
    days.push(dayKey(now - back * 86_400_000));
  }
  return days;
}

const asPoints = (value: unknown): [number, number][] =>
  Array.isArray(value)
    ? value.filter(
        (point): point is [number, number] =>
          Array.isArray(point) &&
          point.length === 2 &&
          typeof point[0] === "number" &&
          typeof point[1] === "number",
      )
    : [];

/**
 * Platform totals, as one series across the retention window.
 *
 * Assembled from the archived days plus the day still in progress, which lives
 * inside the live value — that fold is what keeps the collection cycle to one
 * KV write, and it means today's points are not in a `totals:` key yet.
 */
export async function v2TotalsSeries(store: V2Store, now = Date.now()): Promise<HistorySeries> {
  const days = dayKeys(now, RETENTION_DAYS);
  const [live, ...archives] = await Promise.all([
    read(store, "platform:v2:live"),
    ...days.map((day) => read(store, `platform:v2:totals:${day}`)),
  ]);

  const collected: [number, number][] = [];
  for (const archive of archives) {
    if (archive) collected.push(...asPoints(archive.points));
  }
  if (live) collected.push(...asPoints(live.today));

  // One point per instant, ascending. A day archived while its points were
  // still in `live` can appear in both, and a duplicated observation would be
  // a row that never happened twice.
  const byInstant = new Map<number, number>();
  for (const [at, players] of collected) byInstant.set(at, players);
  const points = [...byInstant.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([at, totalPlaying]) => ({ at: new Date(at).toISOString(), totalPlaying }));

  const first = points[0]?.at ?? null;
  const last = points[points.length - 1]?.at ?? null;

  return {
    points,
    spanHours:
      first !== null && last !== null
        ? Math.round((Date.parse(last) - Date.parse(first)) / 3_600_000)
        : 0,
    firstObservedAt: first,
    lastObservedAt: last,
    chartable: points.length >= MINIMUM_POINTS_FOR_CHART,
  };
}

/**
 * Per-experience history, reassembled from the day buckets.
 *
 * v2 shards by experience and buckets by UTC day, so one v1 `GameHistory` is
 * four shards times seven days. The observation instants are the union across
 * every bucket, and a series that was not observed at an instant carries null
 * there — never a carried-forward value, which would invent an observation.
 *
 * Names need one note. v1 stored a name beside every series; v2's history
 * buckets store ids only. Names therefore come from the live roster, and from
 * `platform:v2:names` for experiences Roblox has since stopped ranking — the
 * roster holds ~270 ids against history covering 530-odd. An id neither knows
 * still falls back to `Experience <id>`, which is exactly what
 * `everyGameSeries` already does for a v1 series whose name was missing. The
 * public column is unchanged.
 */
export async function v2GameHistory(store: V2Store, now = Date.now()): Promise<GameHistory> {
  const days = dayKeys(now, GAME_HISTORY_DAYS);
  const shardKeys = days.flatMap((day) =>
    Array.from({ length: SHARD_COUNT }, (_, shard) => `platform:v2:history:${shard}:${day}`),
  );

  const [live, ...buckets] = await Promise.all([
    read(store, "platform:v2:live"),
    ...shardKeys.map((key) => read(store, key)),
  ]);

  // id -> instant -> players, so buckets can be merged without assuming the
  // shards share an observation clock.
  const byId = new Map<string, Map<number, number>>();
  const instants = new Set<number>();

  for (const bucket of buckets) {
    if (!bucket) continue;
    const at = Array.isArray(bucket.at) ? (bucket.at as unknown[]) : [];
    const players = isObject(bucket.p) ? bucket.p : {};
    for (const stamp of at) if (typeof stamp === "number") instants.add(stamp);

    for (const [id, series] of Object.entries(players)) {
      if (!Array.isArray(series)) continue;
      const points = byId.get(id) ?? new Map<number, number>();
      series.forEach((value, index) => {
        const stamp = at[index];
        if (typeof stamp === "number" && typeof value === "number") points.set(stamp, value);
      });
      if (points.size > 0) byId.set(id, points);
    }
  }

  const ordered = [...instants].sort((a, b) => a - b);

  /*
   * Names come from the live roster first, then from the archive.
   *
   * The roster only lists what Roblox is ranking right now - about 270
   * experiences - while the history behind it covers every experience ranked
   * in the last seven days, upward of 530. Reading names from the roster alone
   * left 30% of the export's rows labelled `Experience 6682487255`: the
   * observations were right, but a third of them stopped saying what they were
   * observations of.
   *
   * `platform:v2:names` is the archive, written once by the migration from the
   * names v1 had recorded. The roster still wins where both have an id, so a
   * renamed experience shows its current name rather than a remembered one.
   */
  const archived = await read(store, "platform:v2:names");
  const names: Record<string, string> = {};
  if (archived && isObject(archived.names)) {
    for (const [id, name] of Object.entries(archived.names)) {
      if (typeof name === "string" && name !== "") names[id] = name;
    }
  }
  const roster = live && isObject(live.experiences) ? live.experiences : {};
  for (const [id, row] of Object.entries(roster)) {
    if (isObject(row) && typeof row.n === "string") names[id] = row.n;
  }

  const players: Record<string, (number | null)[]> = {};
  for (const [id, points] of byId) {
    players[id] = ordered.map((stamp) => points.get(stamp) ?? null);
  }

  // `at` is epoch millis, matching v1's shape: `gameSeries` formats the
  // timestamps itself, and handing it ISO strings would double-format them.
  return { at: ordered, names, players };
}
