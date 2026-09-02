import { describe, expect, it } from "vitest";
import {
  CACHEABLE_DYNAMIC_ROUTES,
  EDGE_POLICY,
  EXCLUDED_FOR_RENDERING_A_DATE,
  edgeCachePolicy,
} from "../../../src/lib/cache/edge-policy";

/**
 * This relaxes a safe default, so the tests are written the other way round
 * from usual: most of them assert that nothing happens.
 */

const NEXT_DEFAULT = "private, no-cache, no-store, max-age=0, must-revalidate";

function reply(
  headers: Record<string, string>,
  status = 200,
): { status: number; headers: { get(name: string): string | null } } {
  const map = new Headers(headers);
  return { status, headers: { get: (name: string) => map.get(name) } };
}

const htmlPage = () =>
  reply({ "content-type": "text/html; charset=utf-8", "cache-control": NEXT_DEFAULT });

describe("pages the edge may hold", () => {
  it("caches every allowlisted route", () => {
    for (const route of CACHEABLE_DYNAMIC_ROUTES) {
      expect(
        edgeCachePolicy({ method: "GET", url: `https://devexcalculator.org${route}` }, htmlPage()),
        `${route} was not cached`,
      ).toBe(EDGE_POLICY);
    }
  });

  it("keeps the browser revalidating while letting the edge serve", () => {
    // `no-store` is what disqualifies a page from the back/forward cache, so
    // its absence is the point of the whole policy — but `max-age=0` has to
    // stay, or a rate change would sit in a reader's own browser.
    expect(EDGE_POLICY).not.toContain("no-store");
    expect(EDGE_POLICY).toContain("max-age=0");
    expect(EDGE_POLICY).toContain("s-maxage=");
  });
});

describe("what it refuses to touch", () => {
  it("leaves a request carrying a shared calculation alone", () => {
    // Someone's balance is in that query string. The link is public by
    // construction; there is still no reason for an edge to keep a copy.
    expect(
      edgeCachePolicy({ method: "GET", url: "https://devexcalculator.org/?robux=250000" }, htmlPage()),
    ).toBeNull();
    expect(
      edgeCachePolicy(
        { method: "GET", url: "https://devexcalculator.org/usd-to-robux/?targetUsd=1500" },
        htmlPage(),
      ),
    ).toBeNull();
  });

  it("leaves a page that renders today's date rendering per request", () => {
    // /usd-to-robux/ bakes the calendar date into the HTML as the planner's
    // no-JavaScript fallback. Cached, that is yesterday served as today on the
    // page that counts days to a deadline.
    for (const route of EXCLUDED_FOR_RENDERING_A_DATE) {
      expect(
        edgeCachePolicy({ method: "GET", url: `https://devexcalculator.org${route}` }, htmlPage()),
        `${route} was cached`,
      ).toBeNull();
    }
  });

  it("keeps the two lists from ever overlapping", () => {
    for (const route of EXCLUDED_FOR_RENDERING_A_DATE) {
      expect(CACHEABLE_DYNAMIC_ROUTES).not.toContain(route);
    }
  });

  it("leaves the collector-backed pages rendering per request", () => {
    // A cached chart is a chart that has stopped moving, which is the failure
    // the collector's heartbeat exists to make visible.
    for (const route of ["/platform/", "/platform/stock/"]) {
      expect(
        edgeCachePolicy({ method: "GET", url: `https://devexcalculator.org${route}` }, htmlPage()),
        `${route} was cached`,
      ).toBeNull();
    }
  });

  it("leaves routes nobody added to the allowlist alone", () => {
    expect(
      edgeCachePolicy({ method: "GET", url: "https://devexcalculator.org/some-new-page/" }, htmlPage()),
    ).toBeNull();
  });

  it("never touches an API response", () => {
    for (const route of ["/api/contact/", "/api/health/", "/api/rate-check/"]) {
      expect(
        edgeCachePolicy(
          { method: "GET", url: `https://devexcalculator.org${route}` },
          reply({ "content-type": "application/json", "cache-control": NEXT_DEFAULT }),
        ),
        `${route} was cached`,
      ).toBeNull();
    }
  });

  it("never touches a mutation", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
      expect(
        edgeCachePolicy({ method, url: "https://devexcalculator.org/" }, htmlPage()),
        `${method} was cached`,
      ).toBeNull();
    }
  });

  it("answers HEAD exactly as it answers GET", () => {
    /*
     * RFC 9110: a HEAD response carries the headers the GET would. Two answers
     * that disagree is a debugging trap — this exact divergence made `curl -I`
     * report the whole feature as broken while it was working correctly.
     */
    const cases = [
      ...CACHEABLE_DYNAMIC_ROUTES,
      ...EXCLUDED_FOR_RENDERING_A_DATE,
      "/platform/",
      "/?robux=250000",
      "/some-new-page/",
    ];
    for (const route of cases) {
      const url = `https://devexcalculator.org${route}`;
      expect(
        edgeCachePolicy({ method: "HEAD", url }, htmlPage()),
        `HEAD and GET disagree on ${route}`,
      ).toBe(edgeCachePolicy({ method: "GET", url }, htmlPage()));
    }
  });

  it("never touches a response that is not a 200", () => {
    for (const status of [301, 308, 404, 500, 503]) {
      expect(
        edgeCachePolicy(
          { method: "GET", url: "https://devexcalculator.org/" },
          reply({ "content-type": "text/html", "cache-control": NEXT_DEFAULT }, status),
        ),
        `${status} was cached`,
      ).toBeNull();
    }
  });

  it("never overrides a policy something set on purpose", () => {
    // The only responses it may relax are the ones Next marked `no-store` by
    // default. A page already given a cache policy keeps it, whatever it says.
    for (const existing of [
      "public, max-age=3600",
      "s-maxage=31536000, stale-while-revalidate=2592000",
      "private, max-age=0",
      "no-cache",
    ]) {
      expect(
        edgeCachePolicy(
          { method: "GET", url: "https://devexcalculator.org/" },
          reply({ "content-type": "text/html", "cache-control": existing }),
        ),
        `"${existing}" was replaced`,
      ).toBeNull();
    }
  });

  it("caches a locale home page the same as the English one", () => {
    /*
     * Live production defect, 2026-09-02. This list held bare English paths
     * and was matched against the raw pathname, so `/tr/`, `/de/`, `/es/` and
     * `/pt-br/` matched nothing, fell through to the closed default and were
     * served `no-store`. That bypasses the edge, so the Worker rendered every
     * single request for those pages — and returned 503 on roughly four
     * requests in five.
     *
     * A route is one page in seven languages, and its caching is a property of
     * the page rather than of the language.
     */
    for (const prefix of ["/tr", "/de", "/es", "/pt-br", "/fr", "/id"]) {
      expect(
        edgeCachePolicy({ method: "GET", url: `https://devexcalculator.org${prefix}/` }, htmlPage()),
        `${prefix}/ was left uncached`,
      ).toBe(EDGE_POLICY);
      expect(
        edgeCachePolicy(
          { method: "GET", url: `https://devexcalculator.org${prefix}/robux-to-usd/` },
          htmlPage(),
        ),
        `${prefix}/robux-to-usd/ was left uncached`,
      ).toBe(EDGE_POLICY);
    }
  });

  it("keeps a route off the list off it in every language", () => {
    // `/usd-to-robux/` renders today's date and is excluded. Stripping the
    // locale must not turn the exclusion into a per-language accident.
    for (const prefix of ["", "/tr", "/de"]) {
      expect(
        edgeCachePolicy(
          { method: "GET", url: `https://devexcalculator.org${prefix}/usd-to-robux/` },
          htmlPage(),
        ),
        `${prefix}/usd-to-robux/ became cacheable`,
      ).toBeNull();
    }
  });

  it("survives a request URL it cannot parse", () => {
    expect(edgeCachePolicy({ method: "GET", url: "::::" }, htmlPage())).toBeNull();
  });
});
