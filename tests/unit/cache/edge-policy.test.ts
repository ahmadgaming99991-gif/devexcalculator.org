import { describe, expect, it } from "vitest";
import {
  CACHEABLE_DYNAMIC_ROUTES,
  EDGE_POLICY,
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

  it("never touches anything but a GET", () => {
    for (const method of ["POST", "OPTIONS", "HEAD", "PUT"]) {
      expect(
        edgeCachePolicy({ method, url: "https://devexcalculator.org/" }, htmlPage()),
        `${method} was cached`,
      ).toBeNull();
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

  it("survives a request URL it cannot parse", () => {
    expect(edgeCachePolicy({ method: "GET", url: "::::" }, htmlPage())).toBeNull();
  });
});
