import { beforeEach, describe, expect, it } from "vitest";
import { getDictionary, translator } from "@/i18n/get-dictionary";
import {
  CHART_WINDOWS,
  COLLECTION_INTERVAL_MINUTES,
  DEFAULT_CHART_WINDOW,
  appendGameHistory,
  describeSpan,
  everyGameSeries,
  GAME_HISTORY_DAYS,
  GAME_HISTORY_INTERVAL_MINUTES,
  isGameHistoryDue,
  gameSeries,
  largestExperienceSeries,
  MINIMUM_POINTS_FOR_CHART,
  readSeries,
  recordSnapshot,
  resolveChartWindow,
  RETENTION_DAYS,
  sliceSeries,
  summarise,
  toSnapshot,
  windowCounts,
  type GameHistory,
  type HistorySeries,
  type HistoryStore,
  type Snapshot,
} from "@/lib/platform/history";
import type { ExperienceObservation } from "@/lib/platform/roblox-api";

/** One sampling interval, in milliseconds. */
const HOUR = GAME_HISTORY_INTERVAL_MINUTES * 60_000;

/**
 * The committed English dictionary, not a stub.
 *
 * What these assertions are about is the sentence a reader sees, so building
 * the words here instead would only test the test.
 */
const english = translator(await getDictionary("en", ["common"]), "en");

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
    expect(describeSpan(english, series)).toBe("no observations yet");
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
    expect(describeSpan(english, series)).toBe("4 hours");
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

    expect(describeSpan(english, await readSeries(store))).toBe("3 days");
  });

  it("ignores a snapshot whose stored value is not a snapshot", async () => {
    const at = new Date().toISOString();
    await recordSnapshot(store, snapshotAt(at, 10));
    store.data.set(`obs:${at}`, JSON.stringify({ nonsense: true }));
    // The rollup holds the charted total independently, so this exercises the
    // legacy per-snapshot path — the one that has to judge each stored value.
    store.data.delete("series");

    const series = await readSeries(store);
    expect(series.points).toEqual([]);
  });

  it("keeps charting when only a snapshot's detail is corrupt", async () => {
    // The chart reads the rollup, and the rollup is a stored observation in its
    // own right. Losing the detail record should not erase a point that was
    // genuinely collected.
    const at = new Date().toISOString();
    await recordSnapshot(store, snapshotAt(at, 10));
    store.data.set(`obs:${at}`, JSON.stringify({ nonsense: true }));

    const series = await readSeries(store);
    expect(series.points).toEqual([{ at, totalPlaying: 10 }]);
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
 * The chart range.
 *
 * The point of these is that a range narrows *which stored observations are
 * plotted* and never changes the points themselves. A range option is a filter,
 * not a resampler and not a longer axis over the same data.
 */
describe("chart ranges", () => {
  let store: ReturnType<typeof fakeStore>;

  beforeEach(() => {
    store = fakeStore();
  });

  it("offers no range longer than observations are kept", () => {
    for (const option of CHART_WINDOWS) {
      expect(option.days).toBeLessThanOrEqual(RETENTION_DAYS);
    }
    expect(DEFAULT_CHART_WINDOW.days).toBe(RETENTION_DAYS);
  });

  it("resolves a requested range, falling back rather than erroring", () => {
    expect(resolveChartWindow("1").days).toBe(1);
    expect(resolveChartWindow("7").days).toBe(7);
    // Anything not offered — a hand-edited query, a missing parameter — lands
    // on the widest real option instead of producing an axis with no data.
    expect(resolveChartWindow("999")).toEqual(DEFAULT_CHART_WINDOW);
    expect(resolveChartWindow("nonsense")).toEqual(DEFAULT_CHART_WINDOW);
    expect(resolveChartWindow(undefined)).toEqual(DEFAULT_CHART_WINDOW);
  });

  it("returns only the observations inside the requested range", async () => {
    for (const hoursAgo of [0, 12, 36, 96, 240]) {
      await recordSnapshot(
        store,
        snapshotAt(new Date(Date.now() - hoursAgo * 3_600_000).toISOString(), 100 + hoursAgo),
      );
    }

    expect((await readSeries(store, 1)).points).toHaveLength(2); // 0h, 12h
    expect((await readSeries(store, 3)).points).toHaveLength(3); // + 36h
    expect((await readSeries(store, 7)).points).toHaveLength(4); // + 96h
    expect((await readSeries(store, 14)).points).toHaveLength(5); // + 240h
  });

  it("plots the same values whichever range holds them", async () => {
    for (const hoursAgo of [0, 6, 12]) {
      await recordSnapshot(
        store,
        snapshotAt(new Date(Date.now() - hoursAgo * 3_600_000).toISOString(), 500 + hoursAgo),
      );
    }

    // A wider range must not smooth, resample or re-space the points it shares
    // with a narrower one.
    const narrow = await readSeries(store, 1);
    const wide = await readSeries(store, 14);
    expect(wide.points).toEqual(narrow.points);
  });
});

/**
 * The rollup exists so one render is one read. Reading the chart from the
 * per-snapshot index cost a read per point and capped a render at 200 of them —
 * about two days at a fifteen-minute interval — which would have made a
 * fourteen-day range an axis the data could never fill.
 */
describe("the series rollup", () => {
  let store: ReturnType<typeof fakeStore>;

  beforeEach(() => {
    store = fakeStore();
  });

  it("reads a long history in a single get", async () => {
    for (let i = 0; i < 400; i += 1) {
      await recordSnapshot(
        store,
        snapshotAt(new Date(Date.now() - i * 900_000).toISOString(), 1_000 + i),
      );
    }

    let gets = 0;
    const counting: HistoryStore = {
      get: (key, type) => {
        gets += 1;
        return store.get(key, type);
      },
      put: (key, value, options) => store.put(key, value, options),
    };

    const series = await readSeries(counting, RETENTION_DAYS);
    expect(gets).toBe(1);
    // 400 points at 15 minutes is over four days: past the old 200 cap, and
    // past what the per-snapshot path could ever have returned.
    expect(series.points.length).toBe(400);
    expect(series.spanHours).toBeGreaterThan(48);
  });

  it("replaces rather than duplicates a repeated observation time", async () => {
    const at = new Date().toISOString();
    await recordSnapshot(store, snapshotAt(at, 1_000));
    await recordSnapshot(store, snapshotAt(at, 1_234));

    const series = await readSeries(store);
    expect(series.points).toHaveLength(1);
    expect(series.points[0]?.totalPlaying).toBe(1_234);
  });

  it("seeds itself from snapshots collected before it existed", async () => {
    // The failure this guards against was live: the rollup started with one
    // point, reads preferred it, and 42 real observations stopped being
    // charted while still sitting in KV.
    const earlier = [5, 4, 3, 2].map((back) =>
      new Date(Date.now() - back * 3_600_000).toISOString(),
    );
    for (const iso of earlier) {
      await recordSnapshot(store, snapshotAt(iso, 800));
    }
    store.data.delete("series");

    const next = new Date(Date.now() - 3_600_000).toISOString();
    await recordSnapshot(store, snapshotAt(next, 950));

    const series = await readSeries(store);
    expect(series.points.map((point) => point.at)).toEqual([...earlier, next]);
  });

  it("repairs a rollup that is shorter than the history it should cover", async () => {
    // Exactly the production case: a first run wrote a one-point rollup, reads
    // preferred it, and the observations behind it stopped being charted.
    // Absence is not the only broken state, so checking for absence alone left
    // it stuck.
    const earlier = [6, 5, 4, 3].map((back) =>
      new Date(Date.now() - back * 3_600_000).toISOString(),
    );
    for (const iso of earlier) {
      await recordSnapshot(store, snapshotAt(iso, 800));
    }
    const stray = Date.now() - 2 * 3_600_000;
    store.data.set("series", JSON.stringify([[stray, 777]]));

    const next = new Date(Date.now() - 3_600_000).toISOString();
    await recordSnapshot(store, snapshotAt(next, 950));

    const series = await readSeries(store);
    // The four recovered snapshots, the point the short rollup already held,
    // and the new one — nothing lost, nothing duplicated.
    expect(series.points.map((point) => point.at)).toEqual([
      ...earlier,
      new Date(stray).toISOString(),
      next,
    ]);
  });

  it("still reads history stored before the rollup existed", async () => {
    // Data written by the previous version has `obs:` keys and an index but no
    // rollup. It must keep charting rather than reading as an empty history.
    const at = [2, 1, 0].map((back) =>
      new Date(Date.now() - back * 3_600_000).toISOString(),
    );
    for (const iso of at) {
      await recordSnapshot(store, snapshotAt(iso, 700));
    }
    store.data.delete("series");

    const series = await readSeries(store);
    expect(series.points.map((point) => point.at)).toEqual(at);
    expect(series.chartable).toBe(true);
  });

  it("drops rollup entries that are not a time and a total", async () => {
    const good = Date.now() - 3_600_000;
    await recordSnapshot(store, snapshotAt(new Date().toISOString(), 10));
    store.data.set(
      "series",
      JSON.stringify([["nonsense"], [1, 2, 3], null, [good, 55]]),
    );

    const series = await readSeries(store);
    expect(series.points).toEqual([
      { at: new Date(good).toISOString(), totalPlaying: 55 },
    ]);
  });

  it("stores a time that round-trips to the instant it was recorded", async () => {
    // Truncating to whole seconds moved every observation by up to 999ms, so
    // the page printed a time that was close to, but not, the time recorded.
    //
    // Anchored to now, not to a fixed date. This assertion is about
    // millisecond precision, but a hardcoded instant also silently becomes a
    // retention test the day it ages past the window - which is exactly how it
    // started failing, two weeks after it was written, for a reason it was
    // never about.
    const at = new Date(Date.now() - 3_600_000).toISOString().replace(/\.\d{3}Z$/, ".279Z");
    await recordSnapshot(store, snapshotAt(at, 900));

    const series = await readSeries(store);
    expect(series.points[0]?.at).toBe(at);
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

/**
 * Per-experience history.
 *
 * The shape is unusual — one shared `at` array, one value array per experience
 * — so the thing worth testing is alignment. An experience that appears late,
 * or disappears for a while, must not have its earlier observations shifted
 * under someone else's timestamps.
 */
describe("per-experience history", () => {
  const observed = (entries: readonly [number, string, number][]) =>
    entries.map(([universeId, name, playing]) => ({ universeId, name, playing }));

  it("keeps every experience aligned to the shared timestamps", () => {
    let history = appendGameHistory(
      { at: [], names: {}, players: {} },
      HOUR,
      observed([[1, "A", 10], [2, "B", 20]]),
    );
    history = appendGameHistory(history, 2 * HOUR, observed([[1, "A", 11], [2, "B", 21]]));

    expect(history.at).toEqual([HOUR, 2 * HOUR]);
    expect(history.players["1"]).toEqual([10, 11]);
    expect(history.players["2"]).toEqual([20, 21]);
  });

  it("pads an experience that appears part-way through", () => {
    let history = appendGameHistory({ at: [], names: {}, players: {} }, HOUR, observed([[1, "A", 10]]));
    history = appendGameHistory(history, 2 * HOUR, observed([[1, "A", 11], [9, "Late", 99]]));

    // The newcomer's single observation must sit under the second hour, not the first.
    expect(history.players["9"]).toEqual([null, 99]);
    expect(gameSeries(history, 9).points).toEqual([
      { at: new Date(2 * HOUR).toISOString(), totalPlaying: 99 },
    ]);
  });

  it("records an absence as a gap, never as zero players", () => {
    let history = appendGameHistory({ at: [], names: {}, players: {} }, HOUR, observed([[1, "A", 10]]));
    history = appendGameHistory(history, 2 * HOUR, observed([]));
    history = appendGameHistory(history, 3 * HOUR, observed([[1, "A", 12]]));

    expect(history.players["1"]).toEqual([10, null, 12]);
    // The plotted series skips the gap rather than drawing a line to zero.
    expect(gameSeries(history, 1).points.map((point) => point.totalPlaying)).toEqual([10, 12]);
  });

  it("samples once an hour even though the collector runs four times", () => {
    let history = appendGameHistory({ at: [], names: {}, players: {} }, HOUR, observed([[1, "A", 10]]));
    // The three runs inside the hour are collected for the totals series and
    // deliberately not kept here. Skipping them is what buys seven days.
    for (const minutes of [15, 30, 45]) {
      history = appendGameHistory(history, HOUR + minutes * 60_000, observed([[1, "A", 99]]));
    }
    expect(history.at).toHaveLength(1);

    history = appendGameHistory(history, 2 * HOUR, observed([[1, "A", 12]]));
    expect(history.at).toHaveLength(2);
    // Every kept point is an observation that was actually made. Nothing is
    // averaged across the hour and nothing stands in for the skipped runs.
    expect(history.players["1"]).toEqual([10, 12]);
  });

  it("takes a sample slightly before the hour rather than drifting later", () => {
    const history = appendGameHistory({ at: [], names: {}, players: {} }, HOUR, observed([[1, "A", 10]]));
    // The cron does not fire on exact hour boundaries. Demanding a full hour
    // would push the cadence one interval later every hour.
    expect(isGameHistoryDue(history, HOUR + 53 * 60_000)).toBe(true);
    expect(isGameHistoryDue(history, HOUR + 40 * 60_000)).toBe(false);
  });

  it("keeps a week by time, not by counting points", () => {
    let history: GameHistory = { at: [], names: {}, players: {} };
    const start = Date.UTC(2026, 0, 1);
    // Nine days of hourly samples, so the window has to discard the first two.
    for (let hour = 0; hour < 9 * 24; hour += 1) {
      history = appendGameHistory(history, start + hour * HOUR, observed([[1, "A", hour]]));
    }

    const span = (history.at.at(-1)! - history.at[0]!) / HOUR;
    expect(span).toBeLessThanOrEqual(GAME_HISTORY_DAYS * 24);
    expect(history.at).toHaveLength(history.players["1"]!.length);
    // Trimming from the front keeps the newest observation last.
    expect(history.players["1"]?.at(-1)).toBe(9 * 24 - 1);
  });

  it("keeps the denser points recorded before sampling changed", () => {
    /*
     * Real stored history spans the change from four samples an hour to one.
     * Trimming by a fixed count would have measured a different number of days
     * on either side of it and thrown away six days of new points to keep one
     * day of old ones.
     */
    let history: GameHistory = { at: [], names: {}, players: {} };
    const start = Date.UTC(2026, 0, 1);
    for (let quarter = 0; quarter < 96; quarter += 1) {
      history = { ...history, at: [...history.at, start + quarter * 15 * 60_000] };
      history = {
        ...history,
        players: { "1": [...(history.players["1"] ?? []), quarter] },
        names: { "1": "A" },
      };
    }
    const dense = history.at.length;

    history = appendGameHistory(history, start + 25 * HOUR, observed([[1, "A", 500]]));

    // The old dense day survives alongside the new hourly point; nothing is
    // discarded until it actually falls outside the week.
    expect(history.at).toHaveLength(dense + 1);
    expect(history.players["1"]?.at(-1)).toBe(500);
  });

  it("forgets an experience with nothing left inside the window", () => {
    const start = Date.UTC(2026, 0, 1);
    let history = appendGameHistory({ at: [], names: {}, players: {} }, start, observed([[7, "Gone", 5]]));
    for (let hour = 1; hour <= GAME_HISTORY_DAYS * 24 + 1; hour += 1) {
      history = appendGameHistory(history, start + hour * HOUR, observed([[1, "A", hour]]));
    }

    expect(history.players["7"]).toBeUndefined();
    expect(gameSeries(history, 7).points).toEqual([]);
  });

  it("has no series for an experience it never saw", () => {
    const history = appendGameHistory({ at: [], names: {}, players: {} }, HOUR, observed([[1, "A", 10]]));
    expect(gameSeries(history, 404).points).toEqual([]);
  });
});

/**
 * The two derived views the charts draw.
 *
 * Both are arithmetic over recorded observations and nothing else. The risk
 * they carry is subtle: "the busiest experience" is a value that follows
 * whichever title is on top, so it must never be read as one experience's line,
 * and it must never fall back to zero when nothing was observed.
 */
describe("derived chart series", () => {
  const observed = (entries: readonly [number, string, number][]) =>
    entries.map(([universeId, name, playing]) => ({ universeId, name, playing }));

  const build = (runs: readonly (readonly [number, readonly [number, string, number][]])[]) => {
    let history: GameHistory = { at: [], names: {}, players: {} };
    for (const [at, entries] of runs) {
      history = appendGameHistory(history, at, observed(entries));
    }
    return history;
  };

  it("follows the highest count, naming whichever experience held it", () => {
    const history = build([
      [HOUR, [[1, "A", 100], [2, "B", 300]]],
      [2 * HOUR, [[1, "A", 500], [2, "B", 200]]],
    ]);

    const { series, leaders } = largestExperienceSeries(history);
    expect(series.points.map((point) => point.totalPlaying)).toEqual([300, 500]);
    // The leader changed between observations, and the labels follow it.
    expect(leaders[new Date(HOUR).toISOString()]).toBe("B");
    expect(leaders[new Date(2 * HOUR).toISOString()]).toBe("A");
  });

  it("skips an observation where nothing was recorded rather than reporting zero", () => {
    const history = build([
      [HOUR, [[1, "A", 100]]],
      [2 * HOUR, []],
      [3 * HOUR, [[1, "A", 120]]],
    ]);

    const { series } = largestExperienceSeries(history);
    expect(series.points.map((point) => point.totalPlaying)).toEqual([100, 120]);
  });

  it("orders every series by its current count, not by insertion", () => {
    const history = build([
      [HOUR, [[1, "Small", 10], [2, "Big", 900], [3, "Middle", 400]]],
      [2 * HOUR, [[1, "Small", 12], [2, "Big", 950], [3, "Middle", 420]]],
    ]);

    expect(everyGameSeries(history).map((entry) => entry.name)).toEqual([
      "Big",
      "Middle",
      "Small",
    ]);
    expect(everyGameSeries(history)[0]?.latest).toBe(950);
  });

  it("leaves out an experience with no observations left to plot", () => {
    const history = build([[1_000, [[1, "A", 10]]]]);
    expect(everyGameSeries(history).map((entry) => entry.id)).toEqual(["1"]);
    expect(everyGameSeries({ at: [], names: {}, players: {} })).toEqual([]);
  });

  it("has nothing to chart from an empty history rather than a flat zero line", () => {
    const { series } = largestExperienceSeries({ at: [], names: {}, players: {} });
    expect(series.points).toEqual([]);
    expect(series.chartable).toBe(false);
  });
});

/**
 * Ranges that hold the same points.
 *
 * Early on every range charts everything, because the history is shorter than
 * the narrowest range. That is correct and it reads as a broken control, so the
 * page needs to be able to tell the two apart — which means the counts have to
 * be computable without a store round trip per range.
 */
describe("range counts", () => {
  const seriesOver = (hoursAgo: readonly number[]): HistorySeries => ({
    points: hoursAgo
      .map((h) => ({
        at: new Date(Date.now() - h * 3_600_000).toISOString(),
        totalPlaying: 100,
      }))
      .sort((a, b) => a.at.localeCompare(b.at)),
    spanHours: Math.max(...hoursAgo) - Math.min(...hoursAgo),
    firstObservedAt: null,
    lastObservedAt: null,
    chartable: true,
  });

  it("reports the same count for every range while the history is shorter than all of them", () => {
    // Thirteen hours of observations: inside 24 hours, and therefore inside
    // every wider range too.
    const counts = windowCounts(seriesOver([13, 9, 5, 1]));
    expect(counts[1]).toBe(4);
    expect(counts[3]).toBe(4);
    expect(counts[7]).toBe(4);
    expect(counts[14]).toBe(4);
  });

  it("separates the ranges once the history outgrows them", () => {
    const counts = windowCounts(seriesOver([13 * 24, 5 * 24, 2 * 24, 12, 1]));
    expect(counts[1]).toBe(2);
    expect(counts[3]).toBe(3);
    expect(counts[7]).toBe(4);
    expect(counts[14]).toBe(5);
  });

  it("narrows without touching the points it keeps", () => {
    const full = seriesOver([50, 30, 2, 1]);
    const day = sliceSeries(full, 1);
    // 50 and 30 hours ago fall outside a day; the two inside it are unchanged.
    expect(day.points).toEqual(full.points.slice(-2));
  });

  it("has no counts to report from an empty history", () => {
    const empty = seriesOver([]);
    expect(windowCounts({ ...empty, points: [] })[1]).toBe(0);
  });
});
