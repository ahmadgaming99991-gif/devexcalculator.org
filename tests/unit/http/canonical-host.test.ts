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

  it("survives a URL it cannot parse", () => {
    expect(redirectToCanonicalHost({ url: "not a url" })).toBeNull();
  });
});
