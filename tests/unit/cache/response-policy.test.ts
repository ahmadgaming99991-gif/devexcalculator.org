import { describe, expect, it } from "vitest";
import { applyCachePolicy } from "@/lib/cache/response-policy";
import {
  CLOSED_DEFAULT_POLICY,
  EDGE_CACHE_CONTROL_HEADER,
  PLATFORM_BROWSER_POLICY,
  PLATFORM_EDGE_POLICY,
  RENDERED_AT_HEADER,
} from "@/lib/cache/platform-cache";
import { upgradeToHttps } from "@/lib/http/https-upgrade";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The single exit, and the invariant that only exists because of it.
 *
 * With `cache.enabled`, Cloudflare consults the cache before invoking the
 * Worker, so a response that carries no `Cache-Control` is a response whose
 * caching is decided somewhere other than this repository. The claim the
 * configuration rests on is that no such response exists.
 *
 * That claim was false when it was first made, and the empirical audit could
 * not have caught it: the response that broke it is the HTTPS upgrade, which
 * cannot be produced by a local preview because the preview serves over plain
 * HTTP and therefore runs with the upgrade disabled. These tests exercise the
 * function the Worker actually calls, rather than a restatement of its wiring.
 */

const html = (body = "<!doctype html>", init: ResponseInit = {}) =>
  new Response(body, {
    ...init,
    headers: { "content-type": "text/html; charset=utf-8", ...(init.headers ?? {}) },
  });

const get = (url: string, init?: RequestInit) => new Request(url, init);

describe("the response that used to leave without a policy", () => {
  it("gives the HTTPS upgrade an explicit policy", () => {
    const request = get("http://devexcalculator.org/devex-rates/");
    const upgrade = upgradeToHttps(request);

    // The precondition: the redirect itself says nothing about caching.
    expect(upgrade).not.toBeNull();
    expect(upgrade!.headers.get("cache-control")).toBeNull();

    const sent = applyCachePolicy(request, upgrade!);
    expect(sent.headers.get("cache-control")).toBe(CLOSED_DEFAULT_POLICY);
    expect(sent.status).toBe(301);
    // The upgrade's own headers survive being given a policy.
    expect(sent.headers.get("location")).toBe("https://devexcalculator.org/devex-rates/");
    expect(sent.headers.get("strict-transport-security")).toContain("max-age=31536000");
  });

  it("does not hand a redirect the platform policy", () => {
    // /platform/ over plain HTTP is a cacheable *request* answered by a 301.
    // Storing that under the platform key would serve a redirect as the page.
    const request = get("http://devexcalculator.org/platform/");
    const sent = applyCachePolicy(request, upgradeToHttps(request)!);
    expect(sent.headers.get("cache-control")).toBe("no-store");
    expect(sent.headers.has(RENDERED_AT_HEADER)).toBe(false);
  });
});

describe("what the single exit guarantees", () => {
  /**
   * The whole point of the configuration, asserted over the shapes a response
   * can take rather than over a list of routes somebody has to keep current.
   */
  it("never lets a response leave without a Cache-Control", () => {
    const cases: [string, Response][] = [
      ["plain page", html()],
      ["json", new Response("{}", { headers: { "content-type": "application/json" } })],
      ["no content type", new Response("x")],
      ["404", html("", { status: 404 })],
      ["500", html("", { status: 500 })],
      ["redirect", new Response(null, { status: 308, headers: { location: "/" } })],
      ["empty header", html("", { headers: { "cache-control": "" } })],
    ];
    for (const [name, response] of cases) {
      const sent = applyCachePolicy(get("https://devexcalculator.org/anything/"), response);
      expect(sent.headers.get("cache-control"), name).toBeTruthy();
    }
  });

  it("keeps a policy the response set deliberately, and does not copy needlessly", () => {
    const asset = new Response("body", {
      headers: {
        "content-type": "application/javascript",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
    const sent = applyCachePolicy(get("https://devexcalculator.org/_next/static/x.js"), asset);
    expect(sent.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    // Already correct, so the same object comes back rather than a copy.
    expect(sent).toBe(asset);
  });
});

describe("the platform response, end to end", () => {
  it("labels the query-free page and stamps the render instant", () => {
    const sent = applyCachePolicy(
      get("https://devexcalculator.org/platform/"),
      html("<!doctype html><title>Platform</title>"),
    );
    expect(sent.headers.get("cache-control")).toBe(PLATFORM_BROWSER_POLICY);
    expect(sent.headers.get(EDGE_CACHE_CONTROL_HEADER)).toBe(PLATFORM_EDGE_POLICY);
    expect(sent.headers.get(RENDERED_AT_HEADER)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("bypasses a view, and still says when it rendered", () => {
    // The stamp is not only a hit-detector. On a bypassed view every request
    // renders, so a changing value is the evidence that the bypass is real --
    // which is what the production check on `?days=7` reads.
    const sent = applyCachePolicy(get("https://devexcalculator.org/platform/?days=7"), html());
    expect(sent.headers.get("cache-control")).toBe("no-store");
    expect(sent.headers.get(RENDERED_AT_HEADER)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("never stores a platform failure", () => {
    for (const status of [500, 503, 404]) {
      const sent = applyCachePolicy(
        get("https://devexcalculator.org/platform/"),
        html("", { status }),
      );
      expect(sent.headers.get("cache-control"), String(status)).toBe("no-store");
    }
  });
});

describe("the edge header, as the response actually carries it", () => {
  /**
   * `Cloudflare-CDN-Cache-Control` outranks `Cache-Control` at Cloudflare, so
   * every one of these is an assertion about which cache decides — not about a
   * string. A response that must not be cached carrying a header whose only
   * purpose is to permit caching would be the whole bug back again, in a form
   * `Cache-Control` alone could not reveal.
   */
  it("gives the query-free page both headers, each saying its own thing", () => {
    const sent = applyCachePolicy(get("https://devexcalculator.org/platform/"), html());
    expect(sent.headers.get("cache-control")).toBe(PLATFORM_BROWSER_POLICY);
    expect(sent.headers.get(EDGE_CACHE_CONTROL_HEADER)).toBe(PLATFORM_EDGE_POLICY);
    // The browser is told to revalidate; the edge is told it may fall back.
    expect(sent.headers.get("cache-control")).toContain("must-revalidate");
    expect(sent.headers.get(EDGE_CACHE_CONTROL_HEADER)).not.toContain("must-revalidate");
  });

  it("gives a view no edge header at all", () => {
    for (const search of ["?days=7", "?ranking=fun-with-friends", "?experience=1234567"]) {
      const sent = applyCachePolicy(
        get(`https://devexcalculator.org/platform/${search}`),
        html(),
      );
      expect(sent.headers.get("cache-control"), search).toBe("no-store");
      expect(sent.headers.has(EDGE_CACHE_CONTROL_HEADER), search).toBe(false);
    }
  });

  it("gives no other route an edge header", () => {
    for (const path of [
      "/",
      "/devex-rates/",
      "/platform/stock/",
      "/tr/platform/",
      "/api/platform/",
      "/_next/static/x.js",
      "/feed.xml",
    ]) {
      const sent = applyCachePolicy(get(`https://devexcalculator.org${path}`), html());
      expect(sent.headers.has(EDGE_CACHE_CONTROL_HEADER), path).toBe(false);
    }
  });

  it("never lets a failure or a redirect become the copy served for five minutes", () => {
    for (const status of [500, 503, 404]) {
      const sent = applyCachePolicy(
        get("https://devexcalculator.org/platform/"),
        html("", { status }),
      );
      expect(sent.headers.get("cache-control"), String(status)).toBe("no-store");
      expect(sent.headers.has(EDGE_CACHE_CONTROL_HEADER), String(status)).toBe(false);
    }
    const redirect = applyCachePolicy(
      get("https://devexcalculator.org/platform/"),
      new Response(null, { status: 308, headers: { location: "/" } }),
    );
    expect(redirect.headers.has(EDGE_CACHE_CONTROL_HEADER)).toBe(false);
  });

  /**
   * Nothing upstream sets this header today. This is what keeps that from
   * being a thing somebody has to remember: an inbound one outranks every
   * decision the policy chain just made, so it is stripped rather than trusted.
   */
  it("strips an edge header it did not set, even when nothing else needs changing", () => {
    const smuggled = new Response("{}", {
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        [EDGE_CACHE_CONTROL_HEADER]: "public, max-age=31536000",
      },
    });
    const sent = applyCachePolicy(get("https://devexcalculator.org/api/health/"), smuggled);
    expect(sent.headers.get("cache-control")).toBe("no-store");
    expect(sent.headers.has(EDGE_CACHE_CONTROL_HEADER)).toBe(false);
  });
});

describe("the Worker's exits, read from its source", () => {
  /**
   * The test that would have caught the bug, rather than only its fix.
   *
   * `applyCachePolicy` being correct is worth nothing if a `return` above it
   * skips it, which is exactly what the HTTPS upgrade did. `worker/index.ts`
   * imports the generated OpenNext bundle, which only resolves inside
   * wrangler, so it cannot be executed here — but it can be read, and the
   * property that matters is a syntactic one.
   */
  it("routes every return in the fetch handler through applyCachePolicy", () => {
    const source = readFileSync(join(process.cwd(), "worker", "index.ts"), "utf8");

    const start = source.indexOf("async fetch(");
    const end = source.indexOf("async scheduled(");
    expect(start, "fetch handler not found").toBeGreaterThan(-1);
    expect(end, "scheduled handler not found").toBeGreaterThan(start);

    const body = source.slice(start, end);
    // Comments describe the exits; only the statements are the exits.
    const withoutComments = body.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const returns = withoutComments.match(/return\s+[^;]+/g) ?? [];

    expect(returns).toHaveLength(1);
    expect(returns[0]).toContain("applyCachePolicy(");
  });
});

describe("the invocation surfaces other than a browser request", () => {
  /**
   * `WORKER_SELF_REFERENCE` is declared for OpenNext's ISR revalidation, whose
   * only consumer is `DOQueueHandler` — unreachable here, because the queue
   * resolves to "dummy" and no Durable Object binding is declared. If it ever
   * became reachable, its request is a HEAD carrying `x-isr`, and a HEAD is
   * never the platform page.
   */
  it("treats a service-binding revalidation HEAD as dynamic", () => {
    const sent = applyCachePolicy(
      get("https://devexcalculator.org/platform/", {
        method: "HEAD",
        headers: { "x-isr": "1" },
      }),
      html(),
    );
    expect(sent.headers.get("cache-control")).toBe("no-store");
  });
});
