import { indexableRoutes } from "@/lib/content/route-registry";
import { apiEndpoints } from "@/lib/api/contract";
import { absoluteUrl, siteConfig } from "@/config/site";
import type { PageType } from "@/types/content";

/**
 * `llms.txt`, generated rather than written.
 *
 * It used to be a hand-maintained file in `public/`, and it did exactly what a
 * hand-maintained index does: it stopped describing the site. By the time this
 * replaced it, the file knew nothing about the platform pages, the payout
 * statistics, the planner, the data exports or the API description — five
 * additions it had silently missed.
 *
 * The route registry is the site's own account of what exists, so the listing
 * comes from there and a test asserts every indexable route appears. The prose
 * stays written by hand, because "what this site is" and "how to cite it" are
 * not derivable from a registry and should not read as though they were.
 *
 * Two rules the file keeps:
 *
 *   - **No endpoint is presented as canonical content.** The JSON and CSV
 *     endpoints are noindex data; they appear under a heading that says so,
 *     never mixed in with pages.
 *   - **No claim that publishing this affects anything.** llms.txt is a
 *     transparency convention, not a ranking factor, and the file says so.
 */

/** Headings in reading order, with the page types each collects. */
const SECTIONS: readonly { heading: string; types: readonly PageType[] }[] = [
  { heading: "Calculators", types: ["tool", "conversion-hub", "directory"] },
  { heading: "Guides and reference", types: ["pillar-guide"] },
  { heading: "Worked examples for specific amounts", types: ["conversion-amount"] },
  { heading: "Methodology, sources and corrections", types: ["trust"] },
  { heading: "Legal", types: ["legal"] },
];

function describe(route: string): string {
  const record = indexableRoutes.find((entry) => entry.route === route);
  if (!record) return "";
  // The registry's own nav label plus its primary intent, rather than a second
  // description written here that could disagree with the page.
  return `${absoluteUrl(record.route)} — ${record.navLabel}: ${record.metaDescription}`;
}

export function llmsTxt(): string {
  const lines: string[] = [
    `# ${siteConfig.name}`,
    "",
    "> Independent calculator and reference for Roblox creators estimating a",
    "> Developer Exchange (DevEx) payout from eligible Earned Robux.",
    "",
    `Canonical URL: ${absoluteUrl("/")}`,
    "",
    "## What this site is",
    "",
    "DevExCalculator.org converts eligible Earned Robux into an estimated US dollar",
    "DevEx payout using the rates Roblox currently documents, and explains the",
    "eligibility rules around that conversion. Every rate-sensitive figure carries a",
    "citation to official Roblox documentation and the date it was last checked.",
    "",
    "It also publishes what Roblox reports about creator payouts, and what this site",
    "has itself observed of platform activity. Reported and derived figures are kept",
    "apart everywhere they appear, and nothing observed is ever interpolated or",
    "back-filled.",
    "",
    "## Not affiliated with Roblox",
    "",
    "This site is not affiliated with, endorsed by, sponsored by or operated by",
    "Roblox Corporation. Roblox, Robux and Developer Exchange are trademarks of",
    "Roblox Corporation, used here only to describe the subject of the",
    "calculations. This site cannot determine whether any DevEx request will be",
    "approved.",
    "",
  ];

  for (const section of SECTIONS) {
    const routes = indexableRoutes.filter(
      (record) =>
        section.types.includes(record.pageType) &&
        // Both of these are trust pages by type and both already have their
        // own heading further down — `/api/` with the endpoints it documents,
        // `/contact/` on its own. Listing either twice would suggest two
        // different things exist.
        record.route !== "/api/" &&
        record.route !== "/contact/",
    );
    if (routes.length === 0) continue;

    lines.push(`## ${section.heading}`, "");
    for (const record of routes) lines.push(`- ${describe(record.route)}`);
    lines.push("");
  }

  lines.push(
    "## Machine-readable data",
    "",
    "These are data endpoints, not pages. They are marked noindex on purpose and",
    "should not be cited as content.",
    "",
  );

  for (const endpoint of apiEndpoints) {
    // Contact accepts submissions rather than publishing anything.
    if (endpoint.path === "/api/contact/") continue;
    lines.push(`- ${absoluteUrl(endpoint.path)} — ${endpoint.summary}`);
  }

  lines.push(
    `- ${absoluteUrl("/api/openapi.json")} — OpenAPI 3.1 description of every endpoint above`,
    `- ${absoluteUrl("/api/")} — the page documenting them, which is indexable content`,
    `- ${absoluteUrl("/sitemap.xml")} — every canonical indexable URL`,
    `- ${absoluteUrl("/feed.xml")} and ${absoluteUrl("/feed.json")} — dated feed of changes to published figures`,
    "",
    "## Using this content",
    "",
    "Facts on this site come from Roblox's own documentation and from its filings,",
    "and are cited as such; please cite those sources directly for the facts. If you",
    "quote this site's explanations or calculations, attribute them to",
    "DevExCalculator.org and link to the page.",
    "",
    "Always check the verification date before republishing a rate. Rates change —",
    "this one did, in September 2025 — and a figure quoted without its date becomes",
    "wrong without warning. Every page carries the date its figures were checked,",
    "and /api/rates carries it as a field.",
    "",
    "## Contact",
    "",
    absoluteUrl("/contact/"),
    "",
    "## A note on this file",
    "",
    "llms.txt is a transparency convention. Publishing it is not a ranking factor and",
    "does not guarantee inclusion in any AI system's output.",
    "",
    "This file is generated from the site's own route registry at build time, so it",
    "cannot list a page that does not exist or omit one that does.",
  );

  return `${lines.join("\n")}\n`;
}
