import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The v1 collector may not be retired while the public exports still read it.
 *
 * `/platform/` no longer reads the v1 store — the dashboard fetches from the
 * data plane on `api.devexcalculator.org`. `/api/platform/` still does. It is
 * linked from the page as a CSV and JSON download and has been public long
 * enough to be in someone's script.
 *
 * That makes retiring the v1 collector a silent failure rather than a loud
 * one: the exports keep answering `200`, keep returning well-formed rows, and
 * the newest row simply stops moving. Nothing errors. The page would show
 * fresh figures beside a download that had quietly frozen, which is the exact
 * failure this project treats as worse than an outage — stale data presented
 * as current.
 *
 * So the two are tied together here. While the export reads v1, the three
 * things that keep v1 collecting must exist. Migrate the export to v2 and this
 * gate lifts on its own, because its premise is the import itself.
 */

const read = (path: string) => readFileSync(path, "utf8");

const EXPORT_ROUTE = "src/app/api/platform/route.ts";
const WORKER_ENTRY = "worker/index.ts";
const WRANGLER = "wrangler.jsonc";

/** True while `/api/platform/` still reads the v1 observation store. */
const exportReadsV1 = (): boolean => {
  const source = read(EXPORT_ROUTE);
  return source.includes("@/lib/platform/history") || source.includes("@/lib/platform/store");
};

describe("the v1 collector cannot be retired out from under the exports", () => {
  it("knows which store the exports read", () => {
    // Not an assertion about which answer is right — both are valid states of
    // the migration. It fails only if the question stops being answerable,
    // which would mean this gate had silently stopped guarding anything.
    expect(typeof exportReadsV1()).toBe("boolean");
  });

  it.runIf(exportReadsV1())("keeps the scheduled collection that fills that store", () => {
    const worker = read(WORKER_ENTRY);
    expect(worker, "worker/index.ts no longer exports a scheduled handler").toMatch(
      /async scheduled\(/,
    );
    expect(worker, "the totals snapshot is no longer recorded").toContain("recordSnapshot");
    expect(worker, "per-experience history is no longer recorded").toContain("recordGameHistory");
  });

  it.runIf(exportReadsV1())("keeps the Cron Trigger that invokes it", () => {
    const config = read(WRANGLER);
    expect(config, "the site Worker no longer declares a cron trigger").toMatch(
      /"crons"\s*:\s*\[\s*"[^"]+"/,
    );
  });

  it.runIf(exportReadsV1())("keeps the KV binding both the collector and the export use", () => {
    expect(read(WRANGLER), "PLATFORM_HISTORY is no longer bound").toContain("PLATFORM_HISTORY");
  });

  /**
   * The contract the migration has to reproduce.
   *
   * Column names and order are the public part of a CSV: a consumer indexes by
   * position or by header, and either breaks silently if these move. Recorded
   * here so that re-pointing the export at v2 is checked against what shipped
   * rather than against what the new store happens to make convenient.
   */
  it("pins the export contract the v2 implementation must reproduce", async () => {
    const exports = await import("@/lib/api/exports");

    expect(exports.PLATFORM_TOTALS_COLUMNS).toEqual([
      "observed_at",
      "total_playing",
      "origin",
      "source",
    ]);
    expect(exports.PLATFORM_EXPERIENCES_COLUMNS).toEqual([
      "observed_at",
      "universe_id",
      "experience",
      "playing",
      "origin",
      "source",
    ]);
  });

  it("pins the filenames and query shapes those downloads are published under", () => {
    const source = read(EXPORT_ROUTE);
    for (const published of [
      "roblox-players-observed.csv",
      "roblox-experience-players-observed.csv",
      "/api/platform/",
      "/api/platform/?format=csv",
      "/api/platform/?series=experiences",
      "/api/platform/?series=experiences&format=csv",
    ]) {
      expect(source, `${published} is no longer what this route publishes`).toContain(published);
    }
  });
});
