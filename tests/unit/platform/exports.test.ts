import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "../../../src/lib/api/csv";
import {
  PLATFORM_EXPERIENCES_COLUMNS,
  PLATFORM_TOTALS_COLUMNS,
  STATS_COLUMNS,
  platformExperienceRows,
  platformExportNotes,
  platformTotalsRows,
  statsRows,
  unpublishedRows,
} from "../../../src/lib/api/exports";
import type { GameHistory, HistorySeries } from "../../../src/lib/platform/history";

/**
 * The exports are the evidence behind two pages of charts. What can go wrong
 * with them is a figure losing its provenance on the way out, or a gap being
 * quietly filled — so that is what these pin.
 */

describe("CSV writing", () => {
  it("quotes only what has to be quoted", () => {
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell(1_684_498)).toBe("1684498");
    expect(csvCell(null)).toBe("");
    expect(csvCell("has,comma")).toBe('"has,comma"');
    expect(csvCell('says "hello"')).toBe('"says ""hello"""');
    expect(csvCell("two\nlines")).toBe('"two\nlines"');
  });

  it("writes CRLF rows in the declared column order", () => {
    const csv = toCsv(["b", "a"], [{ a: "1", b: "2" }]);
    expect(csv).toBe("b,a\r\n2,1\r\n");
  });
});

describe("payout statistics export", () => {
  const rows = statsRows();

  it("gives every row a source and an origin", () => {
    expect(rows.length).toBeGreaterThan(10);
    for (const row of rows) {
      expect(row.source_id, `${row.metric_id} has no source`).not.toBe("");
      expect(["reported", "derived"]).toContain(row.origin);
      expect(row.value, `${row.metric_id} has no value`).not.toBe("");
    }
  });

  it("links every source to the document it came from", () => {
    for (const row of rows) {
      expect(row.source_url, `${row.metric_id} has no source URL`).toMatch(/^https:\/\//);
    }
  });

  it("never describes a derived figure as reported", () => {
    // A row marked `derived` carrying "Reported to the nearest million" says
    // two different things about where the number came from.
    for (const row of rows.filter((entry) => entry.origin === "derived")) {
      expect(row.note.toLowerCase(), `${row.metric_id} calls a derived figure reported`).not.toMatch(
        /^reported/,
      );
    }
  });

  it("carries money as an exact decimal string", () => {
    for (const row of rows.filter((entry) => entry.unit === "usd")) {
      // No exponent, no float artefacts: the value is the string from the
      // filing, and never went through a `number`.
      expect(row.value, `${row.metric_id} is not an exact decimal`).toMatch(/^\d+(\.\d+)?$/);
    }
  });

  it("exports what Roblox does not publish, with the reason", () => {
    const absences = unpublishedRows();
    expect(absences.length).toBeGreaterThan(0);
    for (const row of absences) {
      expect(row.status).toBe("not published by Roblox");
      // A one-word reason would be no reason at all.
      expect(row.reason.length).toBeGreaterThan(40);
    }
  });

  it("declares every column it emits", () => {
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual([...STATS_COLUMNS].sort());
    }
  });
});

describe("platform observation export", () => {
  const series: HistorySeries = {
    points: [
      { at: "2026-08-20T00:00:00.000Z", totalPlaying: 1_000 },
      // A deliberate six-hour gap: the collector did not run.
      { at: "2026-08-20T06:00:00.000Z", totalPlaying: 1_200 },
    ],
    spanHours: 6,
    firstObservedAt: "2026-08-20T00:00:00.000Z",
    lastObservedAt: "2026-08-20T06:00:00.000Z",
    chartable: false,
  };

  it("exports exactly the observations it holds, gap included", () => {
    const rows = platformTotalsRows(series);
    // Two rows, not seven. Nothing is invented to make the series regular.
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.observed_at)).toEqual([
      "2026-08-20T00:00:00.000Z",
      "2026-08-20T06:00:00.000Z",
    ]);
  });

  it("states origin and source on every row", () => {
    for (const row of platformTotalsRows(series)) {
      expect(row.origin).toContain("observed");
      expect(row.source).toContain("Roblox");
      expect(Object.keys(row).sort()).toEqual([...PLATFORM_TOTALS_COLUMNS].sort());
    }
  });

  it("orders per-experience rows by time, then by experience", () => {
    // The stored shape: one shared timeline, and a column per experience with
    // `null` where that experience was not in the ranking at the time.
    const history: GameHistory = {
      at: [Date.parse("2026-08-20T00:00:00.000Z"), Date.parse("2026-08-20T01:00:00.000Z")],
      names: { "1": "Alpha", "2": "Beta" },
      players: {
        "2": [10, 20],
        "1": [5, null],
      },
    };

    const rows = platformExperienceRows(history);
    expect(rows.map((row) => `${row.observed_at} ${row.experience}`)).toEqual([
      "2026-08-20T00:00:00.000Z Alpha",
      "2026-08-20T00:00:00.000Z Beta",
      "2026-08-20T01:00:00.000Z Beta",
    ]);
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual([...PLATFORM_EXPERIENCES_COLUMNS].sort());
    }
  });

  it("says what the file does not cover", () => {
    const notes = platformExportNotes().join(" ").toLowerCase();
    // The three claims a reader could otherwise make from this data and
    // should not: that gaps were filled, that it covers all of Roblox, and
    // that both files have the same resolution.
    expect(notes).toContain("nothing is interpolated");
    expect(notes).toContain("not all of roblox");
    expect(notes).toContain("different resolutions");
  });
});
