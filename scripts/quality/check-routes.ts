/**
 * Route, metadata and structured-data verification against a running server.
 *
 * Checks the rendered HTML rather than the manifest, so it catches anything
 * that goes wrong between the two: a canonical that does not match the URL, a
 * second H1 introduced by a component, JSON-LD that fails to parse, a sitemap
 * entry that 404s.
 *
 * Run with `npm run validate:routes` after a build, or point it at a preview
 * with `BASE_URL=… npm run validate:routes`.
 */
import { indexableRoutes } from "../../src/lib/content/route-registry";
import { siteConfig } from "../../src/config/site";
import {
  extractCanonical,
  extractH1s,
  extractJsonLd,
  extractMeta,
  extractTitle,
  startServer,
} from "./server";

const failures: string[] = [];
const fail = (message: string) => failures.push(message);

async function main(): Promise<void> {
  const server = await startServer();

  try {
    console.log(`\nChecking ${indexableRoutes.length} indexable routes at ${server.baseUrl}`);

    const titles = new Map<string, string[]>();
    const descriptions = new Map<string, string[]>();

    for (const record of indexableRoutes) {
      const url = `${server.baseUrl}${record.route}`;
      const response = await fetch(url, { redirect: "manual" });

      if (response.status !== 200) {
        fail(`${record.route} returned ${response.status}, expected 200.`);
        continue;
      }

      const html = await response.text();

      // Exactly one H1. More than one is a structural problem, not a style one.
      const h1s = extractH1s(html);
      if (h1s.length === 0) fail(`${record.route} has no H1.`);
      if (h1s.length > 1) fail(`${record.route} has ${h1s.length} H1 elements.`);

      // Canonical must be absolute, HTTPS, and point at this exact route.
      const canonical = extractCanonical(html);
      const expected = `${siteConfig.url}${record.route}`;
      if (!canonical) {
        fail(`${record.route} has no canonical link.`);
      } else if (canonical !== expected) {
        fail(`${record.route} canonical is "${canonical}", expected "${expected}".`);
      }

      // Title and description present and unique.
      const title = extractTitle(html);
      if (!title) {
        fail(`${record.route} has no title.`);
      } else {
        titles.set(title, [...(titles.get(title) ?? []), record.route]);
      }

      const description = extractMeta(html, "description");
      if (!description) {
        fail(`${record.route} has no meta description.`);
      } else {
        descriptions.set(description, [...(descriptions.get(description) ?? []), record.route]);
      }

      // The meta keywords tag is explicitly forbidden.
      if (extractMeta(html, "keywords") !== null) {
        fail(`${record.route} emits a meta keywords tag.`);
      }

      // Open Graph and Twitter.
      for (const key of ["og:title", "og:description", "og:url", "og:image", "og:type"]) {
        if (!extractMeta(html, key)) fail(`${record.route} is missing ${key}.`);
      }
      if (!extractMeta(html, "twitter:card")) fail(`${record.route} is missing twitter:card.`);

      // An indexable page must not carry a noindex directive.
      const robots = extractMeta(html, "robots");
      if (robots && /noindex/i.test(robots)) {
        fail(`${record.route} is in the sitemap but sends robots "${robots}".`);
      }

      // Structured data must parse and must match what the manifest declares.
      let graphs: unknown[];
      try {
        graphs = extractJsonLd(html);
      } catch (error) {
        fail(`${record.route} has JSON-LD that does not parse: ${String(error)}`);
        continue;
      }
      if (graphs.length === 0) {
        fail(`${record.route} emits no JSON-LD.`);
      }
      for (const graph of graphs) {
        const nodes = (graph as { "@graph"?: { "@type"?: string }[] })["@graph"] ?? [];
        const types = new Set(nodes.map((node) => node["@type"]));
        // Types that need a truthful qualifying use case this site does not have.
        for (const forbidden of ["Product", "Review", "AggregateRating", "FAQPage", "QAPage"]) {
          if (types.has(forbidden)) {
            fail(`${record.route} emits unsupported schema type ${forbidden}.`);
          }
        }
        if (record.schemaTypes.includes("BreadcrumbList") && !types.has("BreadcrumbList")) {
          fail(`${record.route} declares BreadcrumbList but does not emit it.`);
        }
      }

      // Images need alt text and explicit dimensions.
      for (const img of html.matchAll(/<img\b[^>]*>/gi)) {
        const tag = img[0];
        if (!/\salt=/i.test(tag)) fail(`${record.route} has an <img> with no alt attribute.`);
        if (!/\swidth=/i.test(tag) || !/\sheight=/i.test(tag)) {
          fail(`${record.route} has an <img> with no explicit width and height.`);
        }
      }
    }

    for (const [title, routes] of titles) {
      if (routes.length > 1) fail(`Duplicate title across ${routes.join(", ")}: "${title}"`);
    }
    for (const [description, routes] of descriptions) {
      if (routes.length > 1) {
        fail(`Duplicate description across ${routes.join(", ")}: "${description.slice(0, 60)}…"`);
      }
    }

    // Crawl infrastructure.
    for (const path of ["/robots.txt", "/sitemap.xml", "/llms.txt", "/manifest.webmanifest"]) {
      const response = await fetch(`${server.baseUrl}${path}`);
      if (!response.ok) fail(`${path} returned ${response.status}.`);
    }

    // The sitemap must list exactly the indexable routes, no more and no less.
    const sitemapXml = await (await fetch(`${server.baseUrl}/sitemap.xml`)).text();
    const sitemapUrls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] ?? "");
    const expectedUrls = new Set(indexableRoutes.map((r) => `${siteConfig.url}${r.route}`));
    for (const url of sitemapUrls) {
      if (!expectedUrls.has(url)) fail(`Sitemap contains unexpected URL: ${url}`);
    }
    for (const url of expectedUrls) {
      if (!sitemapUrls.includes(url)) fail(`Sitemap is missing ${url}`);
    }
    console.log(`  sitemap lists ${sitemapUrls.length} URLs`);

    // A missing page must 404, not redirect to the homepage.
    const missing = await fetch(`${server.baseUrl}/this-page-does-not-exist/`, {
      redirect: "manual",
    });
    if (missing.status !== 404) {
      fail(`A missing route returned ${missing.status}, expected 404.`);
    }

    // Security headers on a dynamic response.
    const homepage = await fetch(`${server.baseUrl}/`);
    for (const header of [
      "content-security-policy",
      "x-content-type-options",
      "referrer-policy",
      "permissions-policy",
    ]) {
      if (!homepage.headers.get(header)) fail(`Homepage is missing the ${header} header.`);
    }

    /*
     * The API surface must stay out of the index.
     *
     * The status check is here so a broken endpoint cannot pass the noindex
     * check by never answering. `/api/health/` is the one route whose 503 is a
     * designed answer rather than a fault — it reports that the rate registry
     * is due for review or the collector has stopped recording, which is true
     * of any machine not running the cron. Demanding a 200 from it would be
     * demanding the opposite of what it promises, so both of its documented
     * codes are accepted and anything else still fails. The noindex assertion,
     * which is what this block is actually for, applies either way.
     */
    const API_SURFACE: ReadonlyArray<readonly [string, readonly number[]]> = [
      ["/api/health/", [200, 503]],
      ["/api/rates/", [200]],
    ];
    for (const [path, allowed] of API_SURFACE) {
      const response = await fetch(`${server.baseUrl}${path}`);
      if (!allowed.includes(response.status)) fail(`${path} returned ${response.status}.`);
      const tag = response.headers.get("x-robots-tag");
      if (!tag || !tag.includes("noindex")) fail(`${path} is missing an x-robots-tag: noindex.`);
    }
  } finally {
    await server.stop();
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} route check failure(s):`);
    for (const failure of failures) console.error(`  ERROR  ${failure}`);
    process.exit(1);
  }

  console.log("\nRoute checks passed.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
