import { describe, expect, it } from "vitest";
import { isBulkSubmission, selectRoutes } from "../../../src/lib/seo/indexnow";
import { indexableRoutes, routeRegistry } from "../../../src/lib/content/route-registry";
import { publicLocales } from "../../../src/i18n/visibility";
import { localizedPath } from "../../../src/i18n/locale-path";

/*
 * One submission per published language per route.
 *
 * Derived from `publicLocales()` rather than written as a number, so
 * publishing a language moves these tests with the site instead of turning
 * three of them red for the wrong reason. What they are actually asserting —
 * canonical only, indexable only, changed only — does not depend on how many
 * languages there are.
 */
const perRoute = () => publicLocales().length;
const allLocalized = (route: string): string[] =>
  publicLocales().map((meta) => localizedPath(meta.locale, route));

/**
 * What IndexNow is allowed to be told about.
 *
 * The endpoint accepts whatever it is sent, so every constraint that matters
 * — canonical only, indexable only, changed only — lives here.
 */

describe("IndexNow selection", () => {
  it("submits only canonical indexable routes", () => {
    const canonical = new Set(indexableRoutes.flatMap((record) => allLocalized(record.route)));
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
      for (const path of allLocalized(record.route)) {
        expect(submitted.has(path), `${path} should not be submitted`).toBe(false);
      }
    }
  });

  it("defaults to the routes carrying the newest content date", () => {
    const newest = indexableRoutes.reduce(
      (latest, record) => (record.dateModified > latest ? record.dateModified : latest),
      "",
    );
    const expected = indexableRoutes
      .filter((record) => record.dateModified === newest)
      .flatMap((record) => allLocalized(record.route));

    expect([...selectRoutes()].sort()).toEqual([...expected].sort());
  });

  it("submits far fewer than everything by default", () => {
    // The point of the default: a release touches a few pages, and telling a
    // crawler that all of them changed is how it learns to discount the
    // signal.
    expect(selectRoutes().length).toBeLessThan(indexableRoutes.length * perRoute());
  });

  it("widens to a date when one is given", () => {
    const fromLaunch = selectRoutes({ since: "2026-08-17" });
    expect(fromLaunch.length).toBe(indexableRoutes.length * perRoute());

    const fromTheFuture = selectRoutes({ since: "2099-01-01" });
    expect(fromTheFuture).toHaveLength(0);
  });

  it("flags a submission large enough to need saying out loud", () => {
    expect(isBulkSubmission(indexableRoutes.length)).toBe(true);
    expect(isBulkSubmission(1)).toBe(false);
  });
});
