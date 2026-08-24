import { describe, expect, it } from "vitest";
import { localDay } from "@/features/devex/planner";

/**
 * Which calendar the plan is anchored to.
 *
 * `/usd-to-robux/` used to compute the planner's starting day itself, as
 * `new Date().toISOString().slice(0, 10)` — a UTC day — and hand it down,
 * while the planner's own helper exists specifically because a UTC day is the
 * wrong anchor. Two contradictory definitions of "today" in two files, and the
 * page's was the one that rendered first.
 *
 * It is wrong in a way that shows: `<input type="date">` deals in local
 * calendar dates, so anchoring a plan to a UTC day puts the two out of step
 * for everyone who is not on Greenwich. At 02:00 in Karachi the UTC day is
 * still yesterday, so "tomorrow" gets counted as two days away, and the date
 * picker's floor rejects the reader's own today.
 *
 * `toLocaleDateString("en-CA")` is the oracle here rather than a second copy
 * of the implementation: en-CA formats as `YYYY-MM-DD` and does it in local
 * time, which is exactly the value being claimed. The old UTC version fails
 * this in every timezone but one.
 */

describe("localDay", () => {
  it("gives the reader's calendar date, not the UTC one", () => {
    // Evening in Greenwich is already the next day east of it, and still the
    // previous day well to the west.
    const evening = new Date("2026-08-23T19:30:00Z");
    expect(localDay(evening)).toBe(evening.toLocaleDateString("en-CA"));
  });

  it("follows local time wherever the two disagree", () => {
    const instants = [
      "2026-01-01T00:30:00Z",
      "2026-01-01T23:30:00Z",
      "2026-06-30T21:00:00Z",
      "2026-12-31T23:59:00Z",
    ].map((iso) => new Date(iso));

    for (const instant of instants) {
      const local = instant.toLocaleDateString("en-CA");
      expect(localDay(instant)).toBe(local);

      // Where the runner's zone is not UTC, this is the assertion that would
      // have caught the bug outright.
      const utc = instant.toISOString().slice(0, 10);
      if (utc !== local) expect(localDay(instant)).not.toBe(utc);
    }
  });

  it("pads a single-digit month and day", () => {
    // `2026-1-5` is not a value `<input type="date">` accepts, and a min it
    // cannot parse is a min it ignores.
    const padded = /^\d{4}-\d{2}-\d{2}$/;
    expect(localDay(new Date("2026-01-05T12:00:00Z"))).toMatch(padded);
    expect(localDay(new Date("2026-11-25T12:00:00Z"))).toMatch(padded);
  });
});
