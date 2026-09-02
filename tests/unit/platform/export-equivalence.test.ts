import { describe, expect, it } from "vitest";
import {
  PLATFORM_EXPERIENCES_COLUMNS,
  PLATFORM_TOTALS_COLUMNS,
  platformExperienceRows,
  platformTotalsRows,
} from "@/lib/api/exports";
import { v2GameHistory, v2TotalsSeries, type V2Store } from "@/lib/platform/v2-exports";
import type { GameHistory, HistorySeries } from "@/lib/platform/history";

/**
 * The public exports must not change when their storage does.
 *
 * `/api/platform/` is linked from the page and has been public long enough to
 * be in someone's script. Moving it from the v1 collector's keys to the v2 data
 * plane is invisible to a consumer only if the rows come out identical — same
 * columns, same order, same values, same provenance.
 *
 * These tests feed the same observations through both paths: the v1 in-memory
 * shapes directly, and the v2 stored shapes through the adapter. The rows are
 * then compared, not eyeballed.
 */

const DAY = "20260901";
const T = (hour: number, minute = 0) => Date.UTC(2026, 8, 1, hour, minute, 0);

/** A store holding exactly the v2 keys the adapter should look for. */
function storeOf(seed: Record<string, unknown>): V2Store {
  return {
    get: async (key) => seed[key] ?? null,
  };
}

const LIVE = {
  schema: 2,
  observedAt: new Date(T(2)).toISOString(),
  todayDay: DAY,
  experiences: {
    "111": { i: 111, r: 11, n: "One", p: 900, s: false, a: 0 },
    "222": { i: 222, r: 22, n: "Two", p: 400, s: true, a: null },
  },
  maturity: ["Maturity: Minimal"],
  today: [
    [T(1), 1300],
    [T(2), 1450],
  ],
};

describe("totals export equivalence", () => {
  it("produces the same rows from v2 storage as from a v1 series", async () => {
    const v2 = await v2TotalsSeries(
      storeOf({
        "platform:v2:live": LIVE,
        [`platform:v2:totals:${DAY}`]: { schema: 2, day: DAY, points: [[T(0), 1200]] },
      }),
      T(2),
    );

    const v1: HistorySeries = {
      points: [
        { at: new Date(T(0)).toISOString(), totalPlaying: 1200 },
        { at: new Date(T(1)).toISOString(), totalPlaying: 1300 },
        { at: new Date(T(2)).toISOString(), totalPlaying: 1450 },
      ],
      spanHours: 2,
      firstObservedAt: new Date(T(0)).toISOString(),
      lastObservedAt: new Date(T(2)).toISOString(),
      chartable: true,
    };

    expect(platformTotalsRows(v2)).toEqual(platformTotalsRows(v1));
  });

  it("joins the archived days to the day still folded into live", async () => {
    const series = await v2TotalsSeries(
      storeOf({
        "platform:v2:live": LIVE,
        [`platform:v2:totals:${DAY}`]: { schema: 2, day: DAY, points: [[T(0), 1200]] },
      }),
      T(2),
    );
    expect(series.points.map((point) => point.totalPlaying)).toEqual([1200, 1300, 1450]);
    expect(series.firstObservedAt).toBe(new Date(T(0)).toISOString());
    expect(series.lastObservedAt).toBe(new Date(T(2)).toISOString());
  });

  it("counts an instant once when the archive and live both carry it", async () => {
    // The boundary collection copies `today` into the archive; a day archived
    // while its points were still live exists in both places. It is still one
    // observation.
    const series = await v2TotalsSeries(
      storeOf({
        "platform:v2:live": LIVE,
        [`platform:v2:totals:${DAY}`]: {
          schema: 2,
          day: DAY,
          points: [
            [T(1), 1300],
            [T(2), 1450],
          ],
        },
      }),
      T(2),
    );
    expect(series.points).toHaveLength(2);
  });

  it("refuses a value from an incompatible schema rather than exporting it", async () => {
    const series = await v2TotalsSeries(
      storeOf({ "platform:v2:live": { ...LIVE, schema: 99 } }),
      T(2),
    );
    expect(series.points).toEqual([]);
  });

  it("keeps the published column list and order", () => {
    expect(PLATFORM_TOTALS_COLUMNS).toEqual(["observed_at", "total_playing", "origin", "source"]);
  });
});

describe("per-experience export equivalence", () => {
  const shardKey = (shard: number) => `platform:v2:history:${shard}:${DAY}`;

  it("produces the same rows from day buckets as from a v1 game history", async () => {
    // 111 and 222 land in different shards; the export must not care.
    const v2 = await v2GameHistory(
      storeOf({
        "platform:v2:live": LIVE,
        [shardKey(0)]: { schema: 2, shard: 0, day: DAY, at: [T(1), T(2)], p: { "111": [10, 30] } },
        [shardKey(1)]: { schema: 2, shard: 1, day: DAY, at: [T(1), T(2)], p: { "222": [5, null] } },
      }),
      T(2),
    );

    const v1: GameHistory = {
      at: [T(1), T(2)],
      names: { "111": "One", "222": "Two" },
      players: { "111": [10, 30], "222": [5, null] },
    };

    expect(platformExperienceRows(v2)).toEqual(platformExperienceRows(v1));
  });

  it("aligns shards that carry different observation instants", async () => {
    const history = await v2GameHistory(
      storeOf({
        "platform:v2:live": LIVE,
        [shardKey(0)]: { schema: 2, shard: 0, day: DAY, at: [T(1)], p: { "111": [10] } },
        [shardKey(1)]: { schema: 2, shard: 1, day: DAY, at: [T(2)], p: { "222": [5] } },
      }),
      T(2),
    );

    expect(history.at).toEqual([T(1), T(2)]);
    // Neither series is carried forward into the instant it missed.
    expect(history.players["111"]).toEqual([10, null]);
    expect(history.players["222"]).toEqual([null, 5]);
  });

  it("never carries a value forward into an unobserved instant", async () => {
    const history = await v2GameHistory(
      storeOf({
        "platform:v2:live": LIVE,
        [shardKey(0)]: {
          schema: 2,
          shard: 0,
          day: DAY,
          at: [T(1), T(2), T(3)],
          p: { "111": [10, null, 30] },
        },
      }),
      T(3),
    );
    expect(history.players["111"]).toEqual([10, null, 30]);
    const rows = platformExperienceRows(history);
    // The gap is a gap: two rows, not three.
    expect(rows.filter((row) => row.universe_id === "111")).toHaveLength(2);
  });

  it("names an experience the roster no longer lists from the archive", async () => {
    // The roster holds what Roblox ranks now; the history behind it covers
    // everything ranked in the last seven days. Reading names from the roster
    // alone left a third of the export's rows labelled `Experience <id>`.
    const history = await v2GameHistory(
      storeOf({
        "platform:v2:live": { ...LIVE, experiences: {} },
        "platform:v2:names": { schema: 2, names: { "111": "One" } },
        [shardKey(0)]: { schema: 2, shard: 0, day: DAY, at: [T(1)], p: { "111": [10] } },
      }),
      T(1),
    );
    expect(platformExperienceRows(history)[0]?.experience).toBe("One");
  });

  it("prefers the roster's current name over the archived one", async () => {
    const history = await v2GameHistory(
      storeOf({
        "platform:v2:live": LIVE,
        "platform:v2:names": { schema: 2, names: { "111": "Its Older Name" } },
        [shardKey(0)]: { schema: 2, shard: 0, day: DAY, at: [T(1)], p: { "111": [10] } },
      }),
      T(1),
    );
    expect(platformExperienceRows(history)[0]?.experience).toBe("One");
  });

  it("falls back to the same name v1 uses when neither source knows it", async () => {
    const history = await v2GameHistory(
      storeOf({
        "platform:v2:live": { ...LIVE, experiences: {} },
        [shardKey(0)]: { schema: 2, shard: 0, day: DAY, at: [T(1)], p: { "111": [10] } },
      }),
      T(1),
    );
    expect(platformExperienceRows(history)[0]?.experience).toBe("Experience 111");
  });

  it("keeps the published column list and order", () => {
    expect(PLATFORM_EXPERIENCES_COLUMNS).toEqual([
      "observed_at",
      "universe_id",
      "experience",
      "playing",
      "origin",
      "source",
    ]);
  });

  it("carries provenance on every row", async () => {
    const history = await v2GameHistory(
      storeOf({
        "platform:v2:live": LIVE,
        [shardKey(0)]: { schema: 2, shard: 0, day: DAY, at: [T(1)], p: { "111": [10] } },
      }),
      T(1),
    );
    for (const row of platformExperienceRows(history)) {
      expect(row.origin).toBeTruthy();
      expect(row.source).toBeTruthy();
    }
  });
});
