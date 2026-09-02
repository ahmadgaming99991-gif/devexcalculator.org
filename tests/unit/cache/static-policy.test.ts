import { describe, expect, it } from "vitest";
import {
  RATE_SENSITIVE_EDGE_POLICY,
  staticCachePolicy,
} from "../../../src/lib/cache/edge-policy";
import { routeRegistry } from "../../../src/lib/content/route-registry";

/**
 * A prerendered page leaves Next with `s-maxage=31536000` — a year at the
 * edge. That is right for a fixed document and wrong for every page here that
 * quotes a rate or a verification date. `/sources/` is the page that makes it
 * plain: it exists to say when each source was last checked, and it was cached
 * for a year, so the date it showed could be a year older than the date it was
 * describing.
 *
 * This narrows a header, so unlike its sibling most of these assert that it
 * *does* fire — and the rest that it leaves alone anything set on purpose.
 */

const NEXT_STATIC = "s-maxage=31536000, stale-while-revalidate=2592000";

function reply(
  headers: Record<string, string>,
  status = 200,
): { status: number; headers: { get(name: string): string | null } } {
  const map = new Headers(headers);
  return { status, headers: { get: (name: string) => map.get(name) } };
}

const staticPage = () =>
  reply({ "content-type": "text/html; charset=utf-8", "cache-control": NEXT_STATIC });

const at = (path: string, method = "GET") => ({
  method,
  url: `https://devexcalculator.org${path}`,
});

describe("staticCachePolicy", () => {
  it("cuts the year down to an hour on /sources/", () => {
    expect(staticCachePolicy(at("/sources/"), staticPage())).toBe(RATE_SENSITIVE_EDGE_POLICY);
    expect(RATE_SENSITIVE_EDGE_POLICY).toContain("s-maxage=3600");
  });

  it("covers every rate-sensitive route the registry declares", () => {
    const sensitive = routeRegistry.filter((record) => record.rateSensitive);
    // If this is ever zero the test below passes vacuously.
    expect(sensitive.length).toBeGreaterThan(10);
    for (const record of sensitive) {
      expect(staticCachePolicy(at(record.route), staticPage())).toBe(RATE_SENSITIVE_EDGE_POLICY);
    }
  });

  it("leaves a page whose figures do not expire alone", () => {
    for (const record of routeRegistry.filter((r) => !r.rateSensitive)) {
      expect(staticCachePolicy(at(record.route), staticPage())).toBeNull();
    }
  });

  it("answers a HEAD the same way it answers the GET", () => {
    expect(staticCachePolicy(at("/sources/", "HEAD"), staticPage())).toBe(
      RATE_SENSITIVE_EDGE_POLICY,
    );
  });

  it("never touches a mutation", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(staticCachePolicy(at("/sources/", method), staticPage())).toBeNull();
    }
  });

  it("leaves a policy that was set deliberately", () => {
    // Anything that is not Next's untouched static default was chosen by a
    // route handler or by the dynamic policy, and is not this function's to
    // overrule.
    const chosen = reply({
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=600, stale-while-revalidate=86400",
    });
    expect(staticCachePolicy(at("/sources/"), chosen)).toBeNull();

    const dynamic = reply({
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate",
    });
    expect(staticCachePolicy(at("/sources/"), dynamic)).toBeNull();
  });

  it("leaves anything that is not an HTML 200", () => {
    expect(
      staticCachePolicy(
        at("/sources/"),
        reply({ "content-type": "application/json", "cache-control": NEXT_STATIC }),
      ),
    ).toBeNull();

    expect(
      staticCachePolicy(
        at("/sources/"),
        reply({ "content-type": "text/html", "cache-control": NEXT_STATIC }, 404),
      ),
    ).toBeNull();

    expect(
      staticCachePolicy(at("/sources/"), reply({ "content-type": "text/html" })),
    ).toBeNull();
  });

  it("matches the whole path, not a prefix of it", () => {
    // `/sources/` being covered must not quietly cover `/sources/anything/`.
    expect(staticCachePolicy(at("/sources/archive/"), staticPage())).toBeNull();
    expect(staticCachePolicy(at("/sourcesx/"), staticPage())).toBeNull();
  });

  it("ignores a query string rather than caching a distinct URL as the page", () => {
    // The path is what matches, so a query-carrying request gets the same
    // hour — which is correct here: these pages do not read the query, and a
    // shorter TTL is never the unsafe direction.
    expect(staticCachePolicy(at("/sources/?utm_source=x"), staticPage())).toBe(
      RATE_SENSITIVE_EDGE_POLICY,
    );
  });

  it("expires a translated rate page on the same clock as the English one", () => {
    /*
     * Live production defect, 2026-09-02. `RATE_SENSITIVE_ROUTES` is built
     * from the registry's canonical routes and was matched against the raw
     * pathname, so a translated rate page never matched and kept Next's
     * untouched `s-maxage=31536000`.
     *
     * The English page expires hourly because the figures on it expire. The
     * same page in six languages would have served a superseded DevEx rate for
     * up to a year — on a site whose whole subject is what those figures are.
     */
    for (const prefix of ["/tr", "/de", "/es", "/pt-br", "/fr", "/id"]) {
      expect(
        staticCachePolicy(at(`${prefix}/devex-rates/`), staticPage()),
        `${prefix}/devex-rates/ kept the static year`,
      ).toBe(RATE_SENSITIVE_EDGE_POLICY);
    }
  });

  it("returns null for a URL it cannot parse", () => {
    expect(staticCachePolicy({ method: "GET", url: "not a url" }, staticPage())).toBeNull();
  });
});
