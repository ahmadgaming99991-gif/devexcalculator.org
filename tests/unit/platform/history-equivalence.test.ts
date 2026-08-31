import { describe, expect, it } from "vitest";
import {
  everyGameSeries,
  gameSeries,
  largestExperienceSeries,
  type GameHistory,
} from "../../../src/lib/platform/history";

/**
 * The optimised readers must return exactly what the plain ones did.
 *
 * `/platform/` was rebuilding the same derived values on every render: the
 * shared timestamp array was converted to ISO strings once per experience and
 * again once per table row, and `largestExperienceSeries` called
 * `Object.entries` inside its per-observation loop, allocating 471 key/value
 * pairs 136 times. Both were replaced by hoisting the work.
 *
 * A refactor for speed is exactly the kind that passes the tests that already
 * exist — they were written against behaviour somebody thought about, and this
 * changes none of that behaviour deliberately. So the reference
 * implementations below are the *original* algorithms, kept verbatim, and the
 * assertions are that the fast paths agree with them value for value.
 *
 * The generated history is production-shaped: many experiences, a shared
 * timestamp array, and null wherever an experience was not in any ranking at
 * that moment. The edge cases are the ones the hoisting could plausibly break
 * — a tie for busiest, an experience present at no observation, and an empty
 * history.
 */

/** The original `gameSeries` point-building, before the ISO strings were shared. */
function referencePoints(
  history: GameHistory,
  universeId: number,
): { at: string; totalPlaying: number }[] {
  const values = history.players[String(universeId)];
  if (!values) return [];
  const points: { at: string; totalPlaying: number }[] = [];
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    const at = history.at[i];
    if (value === null || value === undefined || at === undefined) continue;
    points.push({ at: new Date(at).toISOString(), totalPlaying: value });
  }
  return points;
}

/** The original `largestExperienceSeries`, with `Object.entries` in the loop. */
function referenceLargest(history: GameHistory): {
  points: { at: string; totalPlaying: number }[];
  leaders: Record<string, string>;
} {
  const points: { at: string; totalPlaying: number }[] = [];
  const leaders: Record<string, string> = {};

  for (let i = 0; i < history.at.length; i += 1) {
    const at = history.at[i];
    if (at === undefined) continue;
    let best = -1;
    let bestId: string | null = null;
    for (const [id, values] of Object.entries(history.players)) {
      const value = values[i];
      if (value === null || value === undefined) continue;
      if (value > best) {
        best = value;
        bestId = id;
      }
    }
    if (bestId === null) continue;
    const iso = new Date(at).toISOString();
    points.push({ at: iso, totalPlaying: best });
    leaders[iso] = history.names[bestId] ?? "An experience";
  }

  return { points, leaders };
}

/** Production shape: 471 experiences across 136 hourly observations. */
function build(experiences: number, observations: number): GameHistory {
  const start = Date.parse("2026-08-24T00:00:00.000Z");
  const at = Array.from({ length: observations }, (_, i) => start + i * 3_600_000);
  const names: Record<string, string> = {};
  const players: Record<string, (number | null)[]> = {};

  for (let e = 0; e < experiences; e += 1) {
    const id = String(100000 + e);
    names[id] = `Experience ${e}`;
    const density = e < 10 ? 1 : 0.15;
    players[id] = Array.from({ length: observations }, (_, i) =>
      (i * 7919 + e * 104729) % 1000 < density * 1000 ? 1000 + ((e * 31 + i * 17) % 90000) : null,
    );
  }

  return { at, names, players };
}

const history = build(471, 136);

describe("the hoisted history readers agree with the plain ones", () => {
  it("has a history worth comparing over", () => {
    // A comparison over an empty structure passes without proving anything.
    expect(Object.keys(history.players)).toHaveLength(471);
    expect(history.at).toHaveLength(136);
    expect(largestExperienceSeries(history).series.points.length).toBeGreaterThan(100);
  });

  it("gives every experience the same points as the plain reader", () => {
    for (const id of Object.keys(history.players)) {
      expect(gameSeries(history, Number(id)).points, id).toEqual(referencePoints(history, Number(id)));
    }
  });

  it("gives the same busiest-experience series and leaders", () => {
    const reference = referenceLargest(history);
    const actual = largestExperienceSeries(history);
    expect(actual.series.points).toEqual(reference.points);
    expect(actual.leaders).toEqual(reference.leaders);
  });

  it("orders every series the same way, with the same names", () => {
    const actual = everyGameSeries(history);
    for (const entry of actual) {
      expect(entry.series.points, entry.id).toEqual(referencePoints(history, Number(entry.id)));
      expect(entry.name).toBe(history.names[entry.id]);
    }
    // Sorted by latest value, descending — a property of the data, not of key order.
    for (let i = 1; i < actual.length; i += 1) {
      expect(actual[i - 1]!.latest).toBeGreaterThanOrEqual(actual[i]!.latest);
    }
  });

  it("keeps the first of a tie for busiest, as the plain reader did", () => {
    // `>` rather than `>=` means the earliest key wins a tie. Hoisting
    // `Object.entries` preserves key order, so this must not have moved.
    const tied: GameHistory = {
      at: [Date.parse("2026-08-24T00:00:00.000Z")],
      names: { "1": "First", "2": "Second" },
      players: { "1": [500], "2": [500] },
    };
    expect(largestExperienceSeries(tied).leaders).toEqual(referenceLargest(tied).leaders);
    expect(Object.values(largestExperienceSeries(tied).leaders)).toEqual(["First"]);
  });

  it("handles an experience seen at no observation, and an empty history", () => {
    const sparse: GameHistory = {
      at: [1, 2, 3].map((n) => Date.parse("2026-08-24T00:00:00.000Z") + n * 3_600_000),
      names: { "1": "Never seen", "2": "Seen once" },
      players: { "1": [null, null, null], "2": [null, 42, null] },
    };
    expect(gameSeries(sparse, 1).points).toEqual([]);
    expect(gameSeries(sparse, 2).points).toEqual(referencePoints(sparse, 2));
    expect(largestExperienceSeries(sparse).series.points).toEqual(
      referenceLargest(sparse).points,
    );

    const empty: GameHistory = { at: [], names: {}, players: {} };
    expect(everyGameSeries(empty)).toEqual([]);
    expect(largestExperienceSeries(empty).series.points).toEqual([]);
  });

  it("does not let one history's cached times leak into another", () => {
    // The ISO strings are memoised per history object. Two histories with
    // different instants must not share them.
    const a: GameHistory = {
      at: [Date.parse("2026-01-01T00:00:00.000Z")],
      names: { "1": "A" },
      players: { "1": [10] },
    };
    const b: GameHistory = {
      at: [Date.parse("2026-06-30T12:00:00.000Z")],
      names: { "1": "B" },
      players: { "1": [20] },
    };
    expect(gameSeries(a, 1).points[0]?.at).toBe("2026-01-01T00:00:00.000Z");
    expect(gameSeries(b, 1).points[0]?.at).toBe("2026-06-30T12:00:00.000Z");
    expect(gameSeries(a, 1).points[0]?.at).toBe("2026-01-01T00:00:00.000Z");
  });
});
