import { describe, expect, it } from "vitest";
import {
  CLOSED_DEFAULT_POLICY,
  EDGE_CACHE_CONTROL_HEADER,
  isPlatformPath,
  isStorablePlatformResponse,
  PLATFORM_BROWSER_POLICY,
  PLATFORM_CACHE_SECONDS,
  PLATFORM_DYNAMIC_POLICY,
  PLATFORM_EDGE_POLICY,
  PLATFORM_STALE_IF_ERROR_SECONDS,
  platformCachePolicy,
  platformEdgePolicy,
  RENDERED_AT_HEADER,
  resolveCachePolicy,
} from "@/lib/cache/platform-cache";
import { COLLECTION_INTERVAL_MINUTES } from "@/lib/platform/history";

/**
 * The rules that decide what `/platform/` says about caching.
 *
 * Under cache-before-Worker these are load-bearing in a way they were not
 * before: Cloudflare consults the cache without invoking the Worker, so this
 * header is the whole of the site's instruction. A copy served to a request
 * that selected a different view looks like a working page showing the wrong
 * thing, and nothing downstream would catch it.
 */

const get = (url: string, init?: RequestInit) =>
  new Request(`https://devexcalculator.org${url}`, init);

describe("the policy for a query-free platform request", () => {
  it("caches the bare path, with or without the trailing slash", () => {
    expect(platformCachePolicy(get("/platform/"))).toBe(PLATFORM_BROWSER_POLICY);
    expect(platformCachePolicy(get("/platform"))).toBe(PLATFORM_BROWSER_POLICY);
  });

  it("is exactly the browser policy asked for", () => {
    // No `s-maxage`: the shared-cache instruction lives in the edge header now,
    // because the two caches are told different things.
    expect(PLATFORM_BROWSER_POLICY).toBe("public, max-age=0, must-revalidate");
  });

  /**
   * A bare `?` carries no parameter, so it is the same page.
   *
   * `URL` normalises `/platform/?` to an empty search, which makes it
   * cacheable — right rather than a hole: there is no selection to get wrong.
   * Asserted so the next reader knows it was considered rather than missed.
   */
  it("treats a query string with no parameters as the plain page", () => {
    expect(platformCachePolicy(get("/platform/?"))).toBe(PLATFORM_BROWSER_POLICY);
  });
});

describe("the policy for a platform view", () => {
  /**
   * The three named parameters, and the rule that outlives them.
   *
   * Asserted by name because they are the ones that exist; the rule is "any
   * query string" so a fourth is safe the day it is added rather than the day
   * somebody remembers this list.
   */
  it("is no-store for every functional query parameter", () => {
    for (const search of [
      "?ranking=most-engaging",
      "?days=7",
      "?experience=1234567",
      "?ranking=top-playing&days=1",
      "?somethingNobodyHasWrittenYet=1",
    ]) {
      expect(platformCachePolicy(get(`/platform/${search}`)), search).toBe("no-store");
    }
    expect(PLATFORM_DYNAMIC_POLICY).toBe("no-store");
  });

  it("is no-store for anything that is not a GET", () => {
    for (const method of ["POST", "HEAD", "PUT", "DELETE", "OPTIONS"]) {
      expect(platformCachePolicy(get("/platform/", { method })), method).toBe("no-store");
    }
  });

  /**
   * `no-store`, not an absent header.
   *
   * With the cache in front of the Worker, a response that says nothing is a
   * response whose caching something else decides. Saying nothing is the bug
   * this asserts against.
   */
  it("never answers a platform request with silence", () => {
    for (const path of ["/platform/", "/platform/?days=7", "/platform"]) {
      expect(platformCachePolicy(get(path)), path).not.toBeNull();
    }
  });
});

describe("what the policy does not touch", () => {
  it("claims no other route", () => {
    for (const path of [
      "/platform/stock/",
      "/tr/platform/",
      "/platform/stock",
      "/",
      "/devex-rates/",
      "/platformer/",
      "/api/platform/",
    ]) {
      expect(platformCachePolicy(get(path)), path).toBeNull();
      expect(isPlatformPath(get(path)), path).toBe(false);
    }
  });

  it("still recognises a bypassed platform request as the platform page", () => {
    expect(isPlatformPath(get("/platform/?days=7"))).toBe(true);
    expect(isPlatformPath(get("/platform"))).toBe(true);
  });
});

describe("what a copy may be taken of", () => {
  it("takes one of a plain 200 HTML document", () => {
    const html = new Response("<!doctype html>", {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
    expect(isStorablePlatformResponse(html)).toBe(true);
  });

  it("never of a failure or a redirect", () => {
    // A cached failure outlives the failure, which is the one way this could
    // make an outage worse rather than better.
    for (const status of [500, 503, 404, 302, 301]) {
      const response = new Response("", { status, headers: { "content-type": "text/html" } });
      expect(isStorablePlatformResponse(response), String(status)).toBe(false);
    }
  });

  it("never of anything carrying a cookie, or anything that is not HTML", () => {
    const withCookie = new Response("<!doctype html>", {
      headers: { "content-type": "text/html", "set-cookie": "a=b" },
    });
    expect(isStorablePlatformResponse(withCookie)).toBe(false);

    const json = new Response("{}", { headers: { "content-type": "application/json" } });
    expect(isStorablePlatformResponse(json)).toBe(false);
  });
});

describe("the freshness argument, asserted rather than described", () => {
  it("expires well inside one collection interval", () => {
    // The whole argument in one assertion: the collector writes every
    // COLLECTION_INTERVAL_MINUTES and a copy expires long before that, so a
    // reader cannot be shown a chart that has stopped moving relative to what
    // has been collected. Shortening the collection interval fails here rather
    // than silently invalidating the reasoning.
    expect(PLATFORM_CACHE_SECONDS).toBeLessThan(COLLECTION_INTERVAL_MINUTES * 60);
  });

  it("carries no stale-while-revalidate in either header", () => {
    // That directive would answer from an expired copy on the ordinary path,
    // and the freshness bound is the reason this route may be cached at all.
    // `stale-if-error` is the narrower one and is asserted separately below.
    expect(PLATFORM_BROWSER_POLICY).not.toContain("stale-while-revalidate");
    expect(PLATFORM_EDGE_POLICY).not.toContain("stale-while-revalidate");
  });

  it("bounds the edge copy at the same two minutes", () => {
    expect(PLATFORM_EDGE_POLICY).toContain(`max-age=${PLATFORM_CACHE_SECONDS}`);
    expect(PLATFORM_EDGE_POLICY).not.toContain("s-maxage");
  });
});

describe("the fallback that only speaks when a render fails", () => {
  it("is exactly the edge policy asked for", () => {
    expect(PLATFORM_EDGE_POLICY).toBe("public, max-age=120, stale-if-error=300");
    expect(PLATFORM_STALE_IF_ERROR_SECONDS).toBe(300);
  });

  /**
   * The assertion the whole fix depends on.
   *
   * `must-revalidate`, `proxy-revalidate` and `s-maxage` each tell a cache it
   * may never serve a stale copy — which is precisely the permission
   * `stale-if-error` grants. Any of them in this value would disable the
   * fallback while leaving it looking present in the header, which is the
   * failure mode worth a test rather than a comment: the outage would return
   * and the configuration would still read as fixed.
   */
  it("contains nothing that would silently disable stale-if-error", () => {
    for (const directive of ["must-revalidate", "proxy-revalidate", "s-maxage", "no-cache", "no-store"]) {
      expect(PLATFORM_EDGE_POLICY, directive).not.toContain(directive);
    }
    expect(PLATFORM_EDGE_POLICY).toContain("stale-if-error=300");
  });

  it("keeps must-revalidate on the browser header, where it is correct", () => {
    // The reader revalidates every time; that instruction must not reach the
    // edge's decision, which is the reason for two headers at all.
    expect(PLATFORM_BROWSER_POLICY).toContain("must-revalidate");
    expect(PLATFORM_BROWSER_POLICY).toContain("max-age=0");
  });

  it("names the header Cloudflare reads in preference to Cache-Control", () => {
    expect(EDGE_CACHE_CONTROL_HEADER).toBe("cloudflare-cdn-cache-control");
  });

  const html = (init: ResponseInit = {}) =>
    new Response("<!doctype html>", {
      ...init,
      headers: { "content-type": "text/html; charset=utf-8", ...(init.headers ?? {}) },
    });

  it("is offered to a storable query-free platform response", () => {
    expect(platformEdgePolicy(get("/platform/"), html())).toBe(PLATFORM_EDGE_POLICY);
    expect(platformEdgePolicy(get("/platform"), html())).toBe(PLATFORM_EDGE_POLICY);
    expect(platformEdgePolicy(get("/platform/?"), html())).toBe(PLATFORM_EDGE_POLICY);
  });

  it("is offered to no view, and to no other route", () => {
    for (const path of [
      "/platform/?days=7",
      "/platform/?ranking=fun-with-friends",
      "/platform/?experience=1234567",
      "/platform/stock/",
      "/tr/platform/",
      "/",
      "/devex-rates/",
      "/api/platform/",
    ]) {
      expect(platformEdgePolicy(get(path), html()), path).toBeNull();
    }
  });

  it("is offered to no method but GET", () => {
    for (const method of ["POST", "HEAD", "PUT", "DELETE", "OPTIONS"]) {
      expect(platformEdgePolicy(get("/platform/", { method }), html()), method).toBeNull();
    }
  });

  /**
   * A failure must never be the copy that gets served for five minutes.
   *
   * `stale-if-error` makes a stored copy outlive the moment it was stored in,
   * so storing a 503 would turn one bad render into five minutes of them —
   * the opposite of what this exists for.
   */
  it("is offered to no error, redirect, cookie-bearing or non-HTML response", () => {
    for (const status of [500, 503, 404, 302, 301]) {
      expect(platformEdgePolicy(get("/platform/"), html({ status })), String(status)).toBeNull();
    }
    expect(platformEdgePolicy(get("/platform/"), html({ headers: { "set-cookie": "a=b" } }))).toBeNull();
    expect(
      platformEdgePolicy(get("/platform/"), new Response("{}", { headers: { "content-type": "application/json" } })),
    ).toBeNull();
  });

  /**
   * Kept, and now doing a second job.
   *
   * It still shows that a hit did not re-render. Under `stale-if-error` it also
   * shows *how old* a stale copy is, which is the only way a reader of the
   * evidence can tell a fallback from a fresh render — `Cf-Cache-Status: STALE`
   * says Cloudflare fell back, and this says what it fell back to.
   */
  it("names the header that proves a hit did not re-render, and dates a stale copy", () => {
    expect(RENDERED_AT_HEADER).toBe("x-platform-rendered-at");
  });
});

describe("the closed default", () => {
  it("is no-store", () => {
    // Turning on cache-before-Worker makes an absent Cache-Control mean
    // "somebody else decides". Every response leaving the Worker gets a
    // policy, and this is the one applied when nothing else claimed it.
    expect(CLOSED_DEFAULT_POLICY).toBe("no-store");
  });
});

describe("the policy every response ends up with", () => {
  const resolve = (o: Partial<Parameters<typeof resolveCachePolicy>[0]>) =>
    resolveCachePolicy({
      platform: null,
      storablePlatformResponse: false,
      others: [],
      existing: null,
      ...o,
    });

  it("gives the platform policy precedence over everything else", () => {
    expect(
      resolve({
        platform: PLATFORM_BROWSER_POLICY,
        storablePlatformResponse: true,
        others: ["public, s-maxage=999"],
        existing: "private, no-store",
      }),
    ).toBe(PLATFORM_BROWSER_POLICY);
  });

  it("downgrades a platform response a copy may not be taken of", () => {
    // An error or a redirect on /platform/. A cached failure outlives the
    // failure, so it gets the dynamic policy however cacheable the request was.
    expect(
      resolve({ platform: PLATFORM_BROWSER_POLICY, storablePlatformResponse: false }),
    ).toBe(PLATFORM_DYNAMIC_POLICY);
  });

  it("takes the first policy any other rule offers", () => {
    expect(resolve({ others: [null, "public, s-maxage=3600"] })).toBe("public, s-maxage=3600");
    expect(resolve({ others: ["public, s-maxage=600", "public, s-maxage=3600"] })).toBe(
      "public, s-maxage=600",
    );
  });

  it("never overwrites a policy the response set deliberately", () => {
    // A route handler's own header and a static asset's year both arrive this
    // way. Overwriting either would be this function deciding something it was
    // not asked to decide.
    expect(resolve({ existing: "public, max-age=31536000, immutable" })).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(resolve({ existing: "no-store" })).toBe("no-store");
    expect(resolve({ existing: "public, max-age=86400" })).toBe("public, max-age=86400");
  });

  /**
   * The rule the whole audit exists for.
   *
   * With the cache in front of the Worker, a response that says nothing is a
   * response whose caching Cloudflare's defaults decide. Every response class
   * on this site was enumerated against a running Worker and none was found
   * unlabelled — and this is what keeps that true for the next one somebody
   * adds without thinking about caching at all.
   */
  it("closes a silence rather than leaving it", () => {
    expect(resolve({})).toBe(CLOSED_DEFAULT_POLICY);
    expect(resolve({ existing: "" })).toBe(CLOSED_DEFAULT_POLICY);
    expect(resolve({ others: [null, null], existing: null })).toBe(CLOSED_DEFAULT_POLICY);
  });
});
