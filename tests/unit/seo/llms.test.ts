import { describe, expect, it } from "vitest";
import { llmsTxt } from "../../../src/lib/content/llms";
import { indexableRoutes, routeRegistry } from "../../../src/lib/content/route-registry";
import { apiEndpoints } from "../../../src/lib/api/contract";
import { absoluteUrl } from "../../../src/config/site";

/**
 * The hand-written `llms.txt` drifted until it knew nothing about five whole
 * features. These assertions are the reason the generated one cannot.
 */

describe("llms.txt", () => {
  const body = llmsTxt();

  it("lists every indexable route exactly once", () => {
    for (const record of indexableRoutes) {
      const url = absoluteUrl(record.route);
      const occurrences = body.split(url).length - 1;
      // The homepage URL is a prefix of every other, so count whole lines.
      const listed = body
        .split("\n")
        .filter((line) => line.startsWith(`- ${url} —`) || line === url).length;
      expect(occurrences, `${record.route} is missing from llms.txt`).toBeGreaterThan(0);
      expect(listed, `${record.route} is listed ${listed} times`).toBe(1);
    }
  });

  it("lists no route that is noindex or unpublished", () => {
    const excluded = routeRegistry.filter(
      (record) => record.status !== "published" || record.indexation !== "index",
    );
    for (const record of excluded) {
      expect(body, `${record.route} should not be listed`).not.toContain(
        `- ${absoluteUrl(record.route)} —`,
      );
    }
  });

  it("names every published data endpoint", () => {
    for (const endpoint of apiEndpoints) {
      if (endpoint.path === "/api/contact/") continue; // Accepts, publishes nothing.
      expect(body, `${endpoint.path} is missing`).toContain(absoluteUrl(endpoint.path));
    }
    expect(body).toContain(absoluteUrl("/api/openapi.json"));
    expect(body).toContain(absoluteUrl("/feed.xml"));
  });

  it("keeps endpoints out of the content sections", () => {
    // Everything before the data heading is content. A noindex endpoint listed
    // there would be an invitation to cite data as though it were a page.
    const [content = ""] = body.split("## Machine-readable data");
    expect(content).not.toContain("/api/rates/");
    expect(content).not.toContain("/api/platform/");
    expect(content).not.toContain("/sitemap.xml");
  });

  it("keeps the claims it must keep and makes none it must not", () => {
    // Whitespace collapsed: the prose is hard-wrapped, so a sentence that
    // spans two lines is still one claim.
    const prose = body.replace(/\s+/g, " ");

    expect(prose).toContain("Not affiliated with Roblox");
    expect(prose).toContain("cannot determine whether any DevEx request will be approved");
    // llms.txt is a convention, not a ranking factor, and the file says so.
    expect(prose).toContain("not a ranking factor");
    expect(prose.toLowerCase()).not.toContain("improves ranking");
    expect(prose.toLowerCase()).not.toContain("guaranteed");
  });

  it("is deterministic", () => {
    // Generated into a static response; a file that differs between renders
    // would change on every deploy for no reason.
    expect(llmsTxt()).toBe(body);
  });
});
