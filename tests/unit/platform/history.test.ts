import { beforeEach, describe, expect, it } from "vitest";
import {
  COLLECTION_INTERVAL_MINUTES,
  describeSpan,
  MINIMUM_POINTS_FOR_CHART,
  readSeries,
  recordSnapshot,
  RETENTION_DAYS,
  summarise,
  toSnapshot,
  type HistorySeries,
  type HistoryStore,
  type Snapshot,
} from "@/lib/platform/history";
import type { ExperienceObservation } from "@/lib/platform/roblox-api";

/**
 * An in-memory stand-in for the KV binding.
 *
 * Deliberately does not implement expiry: KV removes expired keys itself, and
 * pretending to do it here would test a fake rather than the code. What is
 * tested is the part this project owns — that the index is trimmed, that reads
 * report the window actually held, and that nothing is invented to fill a gap.
 */
function fakeStore(): HistoryStore & { readonly data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    async get(key) {
      const raw = data.get(key);
      return raw === undefined ? null : JSON.parse(raw);
    },
    async put(key, value) {
      data.set(key, value);
    },
  };
}

function snapshotAt(iso: string, totalPlaying: number): Snapshot {
  return {
    observedAt: iso,
    sortName: "Top Trending",
    totalPlaying,
    experiences: [{ universeId: 1, name: "An experience", playing: totalPlaying }],
  };
}

describe("observation history", () => {
  let store: ReturnType<typeof fakeStore>;

  beforeEach(() => {
    store = fakeStore();
  });

  it("stores a snapshot and indexes it", async () => {
    const at = new Date().toISOString();
    const result = await recordSnapshot(store, snapshotAt(at, 1_000));

    expect(result.written).toBe(`obs:${at}`);
    expect(store.data.has(`obs:${at}`)).toBe(true);
    expect(JSON.parse(store.data.get("index") ?? "[]")).toEqual([`obs:${at}`]);
  });

  it("keeps the index free of duplicates when the same instant is recorded twice", async () => {
    const at = new Date().toISOString();
    await recordSnapshot(store, snapshotAt(at, 1_000));
    await recordSnapshot(store, snapshotAt(at, 1_100));

    expect(JSON.parse(store.data.get("index") ?? "[]")).toHaveLength(1);
  });

  it("drops index entries older than the retention window", async () => {
    const old = new Date(Date.now() - (RETENTION_DAYS + 1) * 86_400_000).toISOString();
    const fresh = new Date().toISOString();

    await recordSnapshot(store, snapshotAt(old, 1));
    await recordSnapshot(store, snapshotAt(fresh, 2));

    const index = JSON.parse(store.data.get("index") ?? "[]") as string[];
    expect(index).toEqual([`obs:${fresh}`]);
  });

  it("reports an empty series before anything is collected", async () => {
    const series = await readSeries(store);

    expect(series.points).toEqual([]);
    expect(series.chartable).toBe(false);
    expect(series.firstObservedAt).toBeNull();
    expect(describeSpan(series)).toBe("no observations yet");
  });

  it("is not chartable until there are enough points to draw a line", async () => {
    for (let index = 0; index < MINIMUM_POINTS_FOR_CHART - 1; index += 1) {
      const at = new Date(Date.now() - index * 900_000).toISOString();
      await recordSnapshot(store, snapshotAt(at, 100 + index));
    }

    const series = await readSeries(store);
    expect(series.points.length).toBe(MINIMUM_POINTS_FOR_CHART - 1);
    expect(series.chartable).toBe(false);
  });

  it("becomes chartable once the minimum is reached, in chronological order", async () => {
    const times = [2, 1, 0].map((back) =>
      new Date(Date.now() - back * 3_600_000).toISOString(),
    );
    // Recorded out of order on purpose: the series must sort by time, not by
    // insertion, or a retried collection would draw a line that goes backwards.
    for (const at of [times[1], times[2], times[0]] as string[]) {
      await recordSnapshot(store, snapshotAt(at, 500));
    }

    const series = await readSeries(store);
    expect(series.chartable).toBe(true);
    expect(series.points.map((point) => point.at)).toEqual(times);
  });

  it("reports the period actually collected, not the retention window", async () => {
    for (const back of [4, 2, 0]) {
      await recordSnapshot(
        store,
        snapshotAt(new Date(Date.now() - back * 3_600_000).toISOString(), 10),
      );
    }

    const series = await readSeries(store);
    expect(Math.round(series.spanHours)).toBe(4);
    expect(describeSpan(series)).toBe("4 hours");
  });

  it("describes a multi-day span in days", async () => {
    for (const back of [3 * 24, 0]) {
      await recordSnapshot(
        store,
        snapshotAt(new Date(Date.now() - back * 3_600_000).toISOString(), 10),
      );
    }
    // A third point so the span is read from a real series.
    await recordSnapshot(
      store,
      snapshotAt(new Date(Date.now() - 36 * 3_600_000).toISOString(), 10),
    );

    expect(describeSpan(await readSeries(store))).toBe("3 days");
  });

  it("ignores a snapshot whose stored value is not a snapshot", async () => {
    const at = new Date().toISOString();
    await recordSnapshot(store, snapshotAt(at, 10));
    store.data.set(`obs:${at}`, JSON.stringify({ nonsense: true }));

    const series = await readSeries(store);
    expect(series.points).toEqual([]);
  });

  it("totals players across experiences when building a snapshot", () => {
    // Only the three charted fields are read here, but the parameter type is
    // the full observation, so the rest are filled with their absent values
    // rather than restated at every call site.
    const experience = (
      fields: Pick<ExperienceObservation, "universeId" | "name" | "playing"> &
        Partial<ExperienceObservation>,
    ): ExperienceObservation => ({
      rootPlaceId: null,
      visits: null,
      maxPlayers: null,
      creatorName: null,
      creatorVerified: false,
      upVotes: null,
      downVotes: null,
      favourites: null,
      genre: null,
      maturity: null,
      isSponsored: false,
      urlPath: null,
      ...fields,
    });

    const snapshot = toSnapshot("2026-08-18T00:00:00.000Z", "Top Trending", [
      experience({ universeId: 1, name: "A", playing: 10, visits: 5, maxPlayers: 50 }),
      experience({ universeId: 2, name: "B", playing: 32, creatorName: "X" }),
    ]);

    expect(snapshot.totalPlaying).toBe(42);
    // Only the charted fields are kept, to keep each stored snapshot small.
    expect(Object.keys(snapshot.experiences[0] ?? {})).toEqual([
      "universeId",
      "name",
      "playing",
    ]);
  });

  it("collects often enough to stay inside the KV free tier", () => {
    const writesPerDay = (24 * 60) / COLLECTION_INTERVAL_MINUTES;
    // Two writes per run: the snapshot and the index.
    expect(writesPerDay * 2).toBeLessThan(1_000);
  });
});

/**
 * Peak, low and average describe the recorded points and nothing else. The
 * danger they carry is implying a measurement between two observations, so the
 * summary reports only values that appear in the series, and states how far
 * apart the last two actually were rather than assuming the interval held.
 */
describe("summarising what was recorded", () => {
  const at = (minutesAgo: number) =>
    new Date(Date.UTC(2026, 7, 18, 12, 0, 0) - minutesAgo * 60_000).toISOString();

  const series = (values: readonly [string, number][]): HistorySeries => ({
    points: values.map(([iso, totalPlaying]) => ({ at: iso, totalPlaying })),
    spanHours: 1,
    firstObservedAt: values[0]?.[0] ?? null,
    lastObservedAt: values[values.length - 1]?.[0] ?? null,
    chartable: values.length >= MINIMUM_POINTS_FOR_CHART,
  });

  it("reports the highest and lowest points, with when each was observed", () => {
    const summary = summarise(
      series([
        [at(45), 900],
        [at(30), 1_500],
        [at(15), 700],
        [at(0), 1_100],
      ]),
    );

    expect(summary?.peak).toEqual({ at: at(30), totalPlaying: 1_500 });
    expect(summary?.low).toEqual({ at: at(15), totalPlaying: 700 });
  });

  it("averages only the points it holds", () => {
    const summary = summarise(
      series([
        [at(30), 100],
        [at(15), 200],
        [at(0), 301],
      ]),
    );
    expect(summary?.mean).toBe(200);
  });

  it("states the gap between the last two observations rather than assuming it", () => {
    // A missed collection run leaves the last two points 30 minutes apart, not
    // the 15 the schedule intends. Reporting the change as "in 15 minutes"
    // would describe an interval that was never observed.
    const summary = summarise(
      series([
        [at(60), 500],
        [at(30), 600],
      ]),
    );

    expect(summary?.change?.minutesApart).toBe(30);
    expect(summary?.change?.absolute).toBe(100);
    expect(summary?.change?.percent).toBeCloseTo(20, 5);
  });

  it("has no change to report from a single observation", () => {
    expect(summarise(series([[at(0), 42]]))?.change).toBeNull();
  });

  it("returns null for an empty series instead of a zero that reads as measured", () => {
    expect(summarise(series([]))).toBeNull();
  });
});
