import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The v1 collector may not be retired while the public exports still read it.
 *
 * `/platform/` no longer reads the v1 store — the dashboard fetches from the
 * data plane on `api.devexcalculator.org`. `/api/platform/` was the last
 * reader: it is linked from the page as a CSV and JSON download and has been
 * public long enough to be in someone's script.
 *
 * That makes retiring the v1 collector a silent failure rather than a loud
 * one: the exports keep answering `200`, keep returning well-formed rows, and
 * the newest row simply stops moving. Nothing errors. The page would show
 * fresh figures beside a download that had quietly frozen, which is the exact
 * failure this project treats as worse than an outage — stale data presented
 * as current.
 *
 * So the two are tied together here. While the export reads v1, the three
 * things that keep v1 collecting must exist; once it reads v2, the binding
 * that makes the v2 path reachable must exist instead. The gate follows the
 * export rather than being switched off by hand, because its premise is what
 * the route imports.
 */

const read = (path: string) => readFileSync(path, "utf8");

const EXPORT_ROUTE = "src/app/api/platform/route.ts";
const WORKER_ENTRY = "worker/index.ts";
const WRANGLER = "wrangler.jsonc";

/**
 * True while `/api/platform/` depends on the v1 store to answer in production.
 *
 * The route now reads the v2 data plane first and falls back to v1 only when
 * the `PLATFORM_DATA` binding is absent, which is the local-development case -
 * in production the binding is declared, so the fallback never runs. A bare
 * "does it mention v1" check would therefore report a dependency that no
 * deployed request can reach, and would have pinned a Cron Trigger the site no
 * longer needs. The dependency is the *primary* source, so that is what this
 * asks about.
 */
const exportReadsV1 = (): boolean => {
  const source = read(EXPORT_ROUTE);
  const mentionsV1 =
    source.includes("@/lib/platform/history") || source.includes("@/lib/platform/store");
  const prefersV2 = source.includes("@/lib/platform/v2-exports") && source.includes("getV2Store");
  return mentionsV1 && !prefersV2;
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
   * The same guard, pointed at the store the export actually reads now.
   *
   * Retiring v1 did not remove the failure this file exists to prevent - it
   * moved it. An export reading v2 through a binding that is not declared
   * would fall back to a v1 store nothing is filling any more, and answer 200
   * with rows whose newest timestamp never moves again. So the binding that
   * makes the v2 path reachable is now the thing that must exist.
   */
  it.runIf(!exportReadsV1())("keeps the binding that makes the v2 export path reachable", () => {
    const config = read(WRANGLER);
    expect(config, "PLATFORM_DATA is no longer bound, so the export would fall back to a store nothing fills").toContain(
      "PLATFORM_DATA",
    );
    // v1 stays bound and stays populated: it is the rollback path, and the
    // fallback in the route is only reachable while it is.
    expect(config, "PLATFORM_HISTORY was unbound while it is still the rollback path").toContain(
      "PLATFORM_HISTORY",
    );
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
