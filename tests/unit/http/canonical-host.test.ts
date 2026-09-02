import { describe, expect, it } from "vitest";
import { redirectToCanonicalHost } from "@/lib/http/canonical-host";
import { siteConfig } from "@/config/site";

/**
 * The duplicate that was live: `www.devexcalculator.org` answered `200 OK`
 * with the whole site on it, canonicalised to the apex. A canonical link is a
 * hint a crawler reads after fetching the page; a 301 is the answer before it.
 */

const APEX = new URL(siteConfig.url).host;

describe("redirectToCanonicalHost", () => {
  it("sends the www host to the apex, permanently", () => {
    const r = redirectToCanonicalHost({ url: `https://www.${APEX}/devex-rates/` });
    expect(r?.status).toBe(301);
    expect(r?.headers.get("location")).toBe(`https://${APEX}/devex-rates/`);
  });

  it("keeps the path and the query", () => {
    const r = redirectToCanonicalHost({ url: `https://www.${APEX}/?robux=100000&rate=standard-current` });
    expect(r?.headers.get("location")).toBe(`https://${APEX}/?robux=100000&rate=standard-current`);
  });

  it("upgrades the scheme in the same hop", () => {
    // Otherwise a plain-HTTP www request costs two redirects to reach a page.
    const r = redirectToCanonicalHost({ url: `http://www.${APEX}/sources/` });
    expect(r?.headers.get("location")).toBe(`https://${APEX}/sources/`);
  });

  it("is never stored, because both hosts share one cache", () => {
    /*
     * This shipped as `public, max-age=3600` and took the homepage down.
     * The apex and `www` are custom domains on one Worker behind one zone
     * cache; the redirect was stored and replayed against the apex, which
     * answered `301` to itself until the cache was bypassed. A redirect is two
     * hundred bytes and the reader leaves immediately — there is nothing to
     * win here and a site to lose.
     */
    const r = redirectToCanonicalHost({ url: `https://www.${APEX}/` });
    expect(r?.headers.get("cache-control")).toBe("no-store");
    expect(r?.headers.get("cache-control")).not.toMatch(/max-age=[1-9]/);
  });

  it("carries HSTS, because this hop is where a first visit is decided", () => {
    const r = redirectToCanonicalHost({ url: `http://www.${APEX}/` });
    expect(r?.headers.get("strict-transport-security")).toContain("max-age=31536000");
  });

  it("leaves the apex alone", () => {
    expect(redirectToCanonicalHost({ url: `https://${APEX}/` })).toBeNull();
  });

  it("leaves local development alone", () => {
    // The preview and the E2E suite both serve from a loopback address, and a
    // redirect there is a redirect to a host that is not running.
    expect(redirectToCanonicalHost({ url: "http://127.0.0.1:3100/" })).toBeNull();
    expect(redirectToCanonicalHost({ url: "http://localhost:3000/devex-rates/" })).toBeNull();
  });

  it("leaves every other host alone, including one that merely contains www", () => {
    expect(redirectToCanonicalHost({ url: "https://devexcalculator-org.workers.dev/" })).toBeNull();
    expect(redirectToCanonicalHost({ url: `https://api.${APEX}/` })).toBeNull();
    expect(redirectToCanonicalHost({ url: `https://wwwx${APEX}/` })).toBeNull();
    expect(redirectToCanonicalHost({ url: `https://www.www.${APEX}/` })).toBeNull();
  });

  it("does not redirect to itself", () => {
    const r = redirectToCanonicalHost({ url: `https://www.${APEX}/` });
    expect(new URL(r!.headers.get("location")!).host).not.toBe(`www.${APEX}`);
  });

  it("answers nothing rather than a redirect to the host it came from", () => {
    // The guard that would have turned an outage into a no-op. If the apex
    // were ever configured as `www.…`, the rewrite would land on the request's
    // own host, and a 301 there is an infinite loop in a reader's browser.
    for (const url of [`https://${APEX}/`, `https://${APEX}/devex-rates/`]) {
      const r = redirectToCanonicalHost({ url });
      expect(r, url).toBeNull();
    }
  });

  it("survives a URL it cannot parse", () => {
    expect(redirectToCanonicalHost({ url: "not a url" })).toBeNull();
  });
});
