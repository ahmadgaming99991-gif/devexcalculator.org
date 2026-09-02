import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Every `useClientValue` snapshot must be the same on every call.
 *
 * `useSyncExternalStore` reads `getSnapshot` during the render and again to
 * check the store has not moved underneath it. A snapshot that reads the clock
 * returns a different number whenever those two calls straddle a millisecond,
 * and React answers that during hydration by discarding the whole
 * server-rendered document and re-rendering it in the browser.
 *
 * That was live: `Minified React error #418` on roughly one cold load in three,
 * on every route, from a single `useClientValue(() => Date.now(), 0)` in the
 * shared footer. It never reproduced on a development machine, where both reads
 * land in the same millisecond — so a test that reads the source is the only
 * kind that would have caught it.
 *
 * Coarse derivations are fine and are what the surviving call sites use:
 * `ageInDays(...)` changes once a day, `getUTCFullYear()` once a year,
 * `localDay(...)` once a day. What is banned is the raw instant.
 */

const UNSTABLE = [
  { pattern: /useClientValue\(\s*\(\)\s*=>\s*Date\.now\(\)/, why: "Date.now() is a different number on every call" },
  { pattern: /useClientValue\(\s*\(\)\s*=>\s*performance\.now\(\)/, why: "performance.now() is a different number on every call" },
  { pattern: /useClientValue\(\s*\(\)\s*=>\s*Math\.random\(\)/, why: "Math.random() is a different number on every call" },
  { pattern: /useClientValue\(\s*\(\)\s*=>\s*new Date\(\)\s*\)/, why: "a bare Date is a fresh object on every call" },
];

function sources(): readonly string[] {
  return globSync("src/**/*.{ts,tsx}").filter((f) => !f.endsWith("use-client-value.ts"));
}

describe("useClientValue snapshots are stable", () => {
  it("finds the call sites at all, so a passing run means something", () => {
    const withCalls = sources().filter((f) => readFileSync(f, "utf8").includes("useClientValue("));
    expect(withCalls.length).toBeGreaterThan(3);
  });

  for (const { pattern, why } of UNSTABLE) {
    it(`no snapshot reads ${pattern.source.slice(0, 40)}… — ${why}`, () => {
      const offenders = sources().filter((f) => pattern.test(readFileSync(f, "utf8")));
      expect(offenders, `${why}. Read it once outside the component and pass the constant.`).toEqual([]);
    });
  }
});
