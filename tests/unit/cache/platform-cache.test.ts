import { describe, expect, it } from "vitest";
import {
  CACHE_STATUS_HEADER,
  edgeCache,
  isCacheablePlatformRequest,
  isStorablePlatformResponse,
  PLATFORM_CACHE_SECONDS,
  platformCacheControl,
  RENDERED_AT_HEADER,
} from "@/lib/cache/platform-cache";
import { COLLECTION_INTERVAL_MINUTES } from "@/lib/platform/history";

/**
 * The rules that decide whether `/platform/` may be answered from a copy.
 *
 * The decision is the part that can be wrong in a way nobody notices: a copy
 * served to a request that selected a different view looks like a working page
 * showing the wrong thing. So the predicate is pure and asserted here, rather
 * than only being exercised through a Worker nobody can run in a unit test.
 */

const get = (url: string, init?: RequestInit) =>
  new Request(`https://devexcalculator.org${url}`, init);

describe("which platform requests may be served from a copy", () => {
  it("caches the bare path, with or without the trailing slash", () => {
    expect(isCacheablePlatformRequest(get("/platform/"))).toBe(true);
    expect(isCacheablePlatformRequest(get("/platform"))).toBe(true);
  });

  /**
   * The three named parameters, and the rule that outlives them.
   *
   * `?ranking`, `?days` and `?experience` each select a different view of the
   * same data. They are asserted by name because they are the ones that exist,
   * and the rule is "any query string at all" so that a fourth parameter is
   * safe on the day it is added rather than on the day somebody remembers this
   * list.
   */
  it("bypasses every functional query parameter", () => {
    for (const search of [
      "?ranking=most-engaging",
      "?days=7",
      "?experience=1234567",
      "?ranking=top-playing&days=1",
      "?somethingNobodyHasWrittenYet=1",
    ]) {
      expect(isCacheablePlatformRequest(get(`/platform/${search}`)), search).toBe(false);
    }
  });

  /**
   * A bare `?` carries no parameter, so it is the same page.
   *
   * `URL` normalises `/platform/?` to an empty search, which makes it
   * cacheable — and that is right rather than a hole: there is no selection to
   * get wrong, and both spellings render identically. Asserted so the next
   * reader knows it was considered rather than missed.
   */
  it("treats a query string with no parameters as the plain page", () => {
    expect(isCacheablePlatformRequest(get("/platform/?"))).toBe(true);
  });

  it("covers no other route", () => {
    for (const path of [
      "/platform/stock/",
      "/tr/platform/",
      "/platform/stock",
      "/",
      "/devex-rates/",
      "/platformer/",
      "/api/platform/",
    ]) {
      expect(isCacheablePlatformRequest(get(path)), path).toBe(false);
    }
  });

  it("caches nothing but GET", () => {
    for (const method of ["POST", "HEAD", "PUT", "DELETE", "OPTIONS"]) {
      expect(isCacheablePlatformRequest(get("/platform/", { method })), method).toBe(false);
    }
  });
});

describe("what may be stored", () => {
  const html = (init?: ResponseInit) =>
    new Response("<!doctype html>", {
      headers: { "content-type": "text/html; charset=utf-8" },
      ...init,
    });

  it("stores a plain 200 HTML document", () => {
    expect(isStorablePlatformResponse(html())).toBe(true);
  });

  it("never stores a failure or a redirect", () => {
    // A cached failure outlives the failure, which is the one way this could
    // make an outage worse rather than better.
    for (const status of [500, 503, 404, 302, 301]) {
      const response = new Response("", {
        status,
        headers: { "content-type": "text/html" },
      });
      expect(isStorablePlatformResponse(response), String(status)).toBe(false);
    }
  });

  it("never stores anything carrying a cookie, or anything that is not HTML", () => {
    const withCookie = new Response("<!doctype html>", {
      headers: { "content-type": "text/html", "set-cookie": "a=b" },
    });
    expect(isStorablePlatformResponse(withCookie)).toBe(false);

    const json = new Response("{}", { headers: { "content-type": "application/json" } });
    expect(isStorablePlatformResponse(json)).toBe(false);
  });
});

describe("the policy stored with a copy", () => {
  it("is shorter than one collection interval, so a copy cannot miss a run", () => {
    // The whole freshness argument in one assertion: the collector writes every
    // COLLECTION_INTERVAL_MINUTES, and a copy expires well before that, so a
    // reader cannot be shown a chart that has stopped moving relative to what
    // has been collected.
    expect(PLATFORM_CACHE_SECONDS).toBeLessThan(COLLECTION_INTERVAL_MINUTES * 60);
  });

  it("carries no stale-while-revalidate", () => {
    // That directive exists to keep serving an expired copy, and an expired
    // copy is exactly what the bound above is there to prevent.
    expect(platformCacheControl()).not.toContain("stale-while-revalidate");
    expect(platformCacheControl()).toContain(`s-maxage=${PLATFORM_CACHE_SECONDS}`);
    expect(platformCacheControl()).toContain("public");
  });

  it("names its observable headers", () => {
    expect(CACHE_STATUS_HEADER).toBe("x-platform-cache");
    expect(RENDERED_AT_HEADER).toBe("x-platform-rendered-at");
  });
});

describe("where there is no edge cache", () => {
  it("reports none rather than throwing", () => {
    // `next start`, the build and this test all lack `caches.default`. Each
    // must render normally; a caching layer that turns a missing cache into an
    // error is a worse failure than the one it was added to fix.
    expect(edgeCache()).toBeNull();
  });
});
