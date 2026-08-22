import { describe, expect, it } from "vitest";
import { isBulkSubmission, selectRoutes } from "../../../src/lib/seo/indexnow";
import { indexableRoutes, routeRegistry } from "../../../src/lib/content/route-registry";

/**
 * What IndexNow is allowed to be told about.
 *
 * The endpoint accepts whatever it is sent, so every constraint that matters
 * — canonical only, indexable only, changed only — lives here.
 */

describe("IndexNow selection", () => {
  it("submits only canonical indexable routes", () => {
    const canonical = new Set(indexableRoutes.map((record) => record.route));
    for (const route of selectRoutes({ all: true })) {
      expect(canonical.has(route), `${route} is not a canonical indexable route`).toBe(true);
    }
  });

  it("never submits an API endpoint, a feed or a query state", () => {
    for (const route of selectRoutes({ all: true })) {
      // `/api/` is the documentation page and is indexable; the data endpoints
      // beneath it are not, and neither is anything carrying a query.
      expect(route).not.toMatch(/^\/api\/.+/);
      expect(route).not.toContain("?");
      expect(route).not.toContain("#");
      expect(route.startsWith("/")).toBe(true);
    }
  });

  it("excludes routes the registry marks noindex or unpublished", () => {
    const excluded = routeRegistry.filter(
      (record) => record.status !== "published" || record.indexation !== "index",
    );
    const submitted = new Set(selectRoutes({ all: true }));
    for (const record of excluded) {
      expect(submitted.has(record.route), `${record.route} should not be submitted`).toBe(false);
    }
  });

  it("defaults to the routes carrying the newest content date", () => {
    const newest = indexableRoutes.reduce(
      (latest, record) => (record.dateModified > latest ? record.dateModified : latest),
      "",
    );
    const expected = indexableRoutes
      .filter((record) => record.dateModified === newest)
      .map((record) => record.route);

    expect([...selectRoutes()].sort()).toEqual([...expected].sort());
  });

  it("submits far fewer than everything by default", () => {
    // The point of the default: a release touches a few pages, and telling a
    // crawler that all of them changed is how it learns to discount the
    // signal.
    expect(selectRoutes().length).toBeLessThan(indexableRoutes.length);
  });

  it("widens to a date when one is given", () => {
    const fromLaunch = selectRoutes({ since: "2026-08-17" });
    expect(fromLaunch.length).toBe(indexableRoutes.length);

    const fromTheFuture = selectRoutes({ since: "2099-01-01" });
    expect(fromTheFuture).toHaveLength(0);
  });

  it("flags a submission large enough to need saying out loud", () => {
    expect(isBulkSubmission(indexableRoutes.length)).toBe(true);
    expect(isBulkSubmission(1)).toBe(false);
  });
});
