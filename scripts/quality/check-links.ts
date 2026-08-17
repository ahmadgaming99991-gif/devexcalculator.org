/**
 * Internal link crawler.
 *
 * Crawls from the homepage, follows every internal link, and reports anything
 * that would waste a crawl budget or dead-end a reader: a broken link, a link
 * to a redirect rather than its destination, a redirect chain, or an internal
 * link marked nofollow.
 *
 * External links are checked for `rel` safety attributes but are not requested
 * — hammering third-party sites on every CI run would be rude and flaky.
 */
import { indexableRoutes } from "../../src/lib/content/route-registry";
import { extractHrefs, startServer } from "./server";

const failures: string[] = [];
const warnings: string[] = [];

const fail = (message: string) => failures.push(message);
const warn = (message: string) => warnings.push(message);

/** Paths that legitimately live outside the crawlable page set. */
const NON_PAGE_PREFIXES = ["/api/", "/_next/", "/icons/", "/images/"];
const NON_PAGE_EXACT = new Set([
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/manifest.webmanifest",
  "/opengraph-image",
  "/apple-icon",
  "/icon.svg",
]);

async function main(): Promise<void> {
  const server = await startServer();

  try {
    const queue: string[] = ["/"];
    const seen = new Set<string>();
    const statusCache = new Map<string, number>();
    let pagesCrawled = 0;
    let linksChecked = 0;

    console.log(`\nCrawling from ${server.baseUrl}/`);

    while (queue.length > 0) {
      const path = queue.shift();
      if (path === undefined || seen.has(path)) continue;
      seen.add(path);

      const response = await fetch(`${server.baseUrl}${path}`, { redirect: "manual" });
      statusCache.set(path, response.status);

      if (response.status !== 200) continue;
      pagesCrawled += 1;

      const html = await response.text();

      for (const href of extractHrefs(html)) {
        linksChecked += 1;

        // External links: check safety attributes, do not request.
        if (/^https?:\/\//i.test(href)) {
          const anchorPattern = new RegExp(
            `<a\\b[^>]*href=["']${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'][^>]*>`,
            "i",
          );
          const tag = html.match(anchorPattern)?.[0] ?? "";
          if (/target=["']_blank["']/i.test(tag) && !/rel=["'][^"']*noopener/i.test(tag)) {
            fail(`${path} opens ${href} in a new tab without rel="noopener".`);
          }
          continue;
        }

        if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
          continue;
        }

        const target = href.split("#")[0]?.split("?")[0] ?? "";
        if (target === "") continue;
        if (NON_PAGE_EXACT.has(target)) continue;
        if (NON_PAGE_PREFIXES.some((prefix) => target.startsWith(prefix))) continue;

        // Internal links must not be nofollowed.
        const linkTag = html.match(
          new RegExp(`<a\\b[^>]*href=["']${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"']*["'][^>]*>`, "i"),
        )?.[0];
        if (linkTag && /rel=["'][^"']*nofollow/i.test(linkTag)) {
          fail(`${path} marks the internal link to ${target} as nofollow.`);
        }

        let status = statusCache.get(target);
        if (status === undefined) {
          const linkResponse = await fetch(`${server.baseUrl}${target}`, { redirect: "manual" });
          status = linkResponse.status;
          statusCache.set(target, status);

          // A link pointing at a redirect costs an extra round trip for every
          // reader and every crawler. Link to the destination instead.
          if (status >= 300 && status < 400) {
            const location = linkResponse.headers.get("location") ?? "unknown";
            fail(`${path} links to ${target}, which redirects (${status}) to ${location}.`);

            const second = await fetch(new URL(location, server.baseUrl), { redirect: "manual" });
            if (second.status >= 300 && second.status < 400) {
              fail(`Redirect chain: ${target} → ${location} → ${second.headers.get("location")}`);
            }
          }
        }

        if (status === 404) {
          fail(`${path} links to ${target}, which returns 404.`);
        } else if (status >= 400) {
          fail(`${path} links to ${target}, which returns ${status}.`);
        }

        if (status === 200 && !seen.has(target)) {
          queue.push(target);
        }
      }
    }

    console.log(`  crawled ${pagesCrawled} pages, checked ${linksChecked} links`);

    // Every indexable route must be reachable by following links from the
    // homepage. A page only a sitemap knows about is weakly discoverable.
    for (const record of indexableRoutes) {
      if (!seen.has(record.route)) {
        fail(`${record.route} is indexable but was not reachable by crawling from the homepage.`);
      }
    }

    // The www host must redirect once, preserving path and query.
    const wwwTest = await fetch(`${server.baseUrl}/devex-rates/?test=1`, {
      headers: { host: "www.devexcalculator.org" },
      redirect: "manual",
    });
    if (wwwTest.status >= 300 && wwwTest.status < 400) {
      const location = wwwTest.headers.get("location") ?? "";
      if (!location.includes("/devex-rates/") || !location.includes("test=1")) {
        fail(`www redirect dropped the path or query: ${location}`);
      }
    } else {
      // Locally the Host header may not reach the proxy; production is verified
      // separately by the post-deploy check.
      warn(
        `www redirect could not be exercised locally (status ${wwwTest.status}); verify after deployment.`,
      );
    }
  } finally {
    await server.stop();
  }

  for (const warning of warnings) console.warn(`  warning  ${warning}`);

  if (failures.length > 0) {
    console.error(`\n${failures.length} link check failure(s):`);
    for (const failure of failures) console.error(`  ERROR  ${failure}`);
    process.exit(1);
  }

  console.log("\nLink checks passed.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
