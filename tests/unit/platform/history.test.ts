import { beforeEach, describe, expect, it } from "vitest";
import {
  COLLECTION_INTERVAL_MINUTES,
  describeSpan,
  MINIMUM_POINTS_FOR_CHART,
  readSeries,
  recordSnapshot,
  RETENTION_DAYS,
  toSnapshot,
  type HistoryStore,
  type Snapshot,
} from "@/lib/platform/history";

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
    const snapshot = toSnapshot("2026-08-18T00:00:00.000Z", "Top Trending", [
      { universeId: 1, name: "A", playing: 10, visits: 5, maxPlayers: 50, creatorName: null },
      { universeId: 2, name: "B", playing: 32, visits: null, maxPlayers: null, creatorName: "X" },
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
