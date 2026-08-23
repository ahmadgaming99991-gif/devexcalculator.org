import { absoluteUrl, siteConfig } from "@/config/site";
import { breadcrumbTrail, getRoute } from "@/lib/content/route-registry";
import type { RouteRecord } from "@/types/content";

/**
 * Structured data.
 *
 * Only types the visible page actually supports are emitted. Specifically:
 *   - No FAQPage. Google removed FAQ rich results for most sites, so the
 *     markup would exist purely for its own sake.
 *   - No Organization while `organizationName` is unconfigured, because
 *     emitting one would mean inventing a legal entity.
 *   - No Product, Review or AggregateRating anywhere. There is no product
 *     being sold and no genuine ratings to report.
 *
 * Stable `@id` values anchor each node to its canonical URL so the graph can
 * be referenced across pages without duplication.
 */

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
interface JsonObject {
  [key: string]: JsonValue | undefined;
}

const WEBSITE_ID = `${siteConfig.url}/#website`;
const PUBLISHER_ID = `${siteConfig.url}/#publisher`;

/**
 * Profiles this site operates, for `sameAs`.
 *
 * Read from the same configuration the footer renders from, so a profile
 * cannot be linked in one place and denied in the other. Placed on the WebSite
 * node rather than a publisher: `organizationName` is still null, so no
 * Organization is emitted, and claiming these under an entity that does not
 * exist would be worse than not claiming them.
 */
function profileUrls(): string[] {
  return Object.values(siteConfig.social).filter(
    (url): url is string => typeof url === "string" && url.length > 0,
  );
}

function websiteNode(): JsonObject {
  const sameAs = profileUrls();

  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${siteConfig.url}/`,
    name: siteConfig.name,
    description: siteConfig.description,
    inLanguage: siteConfig.locale,
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(siteConfig.organizationName ? { publisher: { "@id": PUBLISHER_ID } } : {}),
  };
}

/**
 * A publisher node is emitted only when a real organisation name is
 * configured. Until then the site has no verified legal identity to claim.
 */
function publisherNode(): JsonObject | null {
  if (!siteConfig.organizationName) return null;
  return {
    "@type": "Organization",
    "@id": PUBLISHER_ID,
    name: siteConfig.organizationName,
    url: `${siteConfig.url}/`,
  };
}

function breadcrumbNode(record: RouteRecord): JsonObject | null {
  const trail = breadcrumbTrail(record.route);
  if (trail.length === 0) return null;

  const items = [...trail, record].map((entry, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: entry.route === "/" ? "Home" : entry.navLabel,
    item: absoluteUrl(entry.route),
  }));

  return {
    "@type": "BreadcrumbList",
    "@id": `${absoluteUrl(record.route)}#breadcrumb`,
    itemListElement: items,
  };
}

function webApplicationNode(record: RouteRecord): JsonObject {
  return {
    "@type": "WebApplication",
    "@id": `${absoluteUrl(record.route)}#app`,
    name: record.h1,
    url: absoluteUrl(record.route),
    description: record.metaDescription,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any modern web browser",
    browserRequirements: "Requires JavaScript for live calculation.",
    inLanguage: siteConfig.locale,
    // The calculator is genuinely free with no account and no paid tier.
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    isAccessibleForFree: true,
  };
}

function itemListNode(record: RouteRecord): JsonObject | null {
  // Only list the children this page visibly links to, so the markup matches
  // what a reader actually sees.
  const children = record.internalLinks
    .filter((link) => link.relationship === "child")
    .map((link) => getRoute(link.route))
    .filter((child): child is RouteRecord => child !== null);

  if (children.length === 0) return null;

  return {
    "@type": "ItemList",
    "@id": `${absoluteUrl(record.route)}#list`,
    numberOfItems: children.length,
    itemListElement: children.map((child, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: child.navLabel,
      url: absoluteUrl(child.route),
    })),
  };
}

function pageNode(record: RouteRecord): JsonObject {
  const type = record.schemaTypes.includes("CollectionPage")
    ? "CollectionPage"
    : record.schemaTypes.includes("AboutPage")
      ? "AboutPage"
      : record.schemaTypes.includes("ContactPage")
        ? "ContactPage"
        : "WebPage";

  return {
    "@type": type,
    "@id": `${absoluteUrl(record.route)}#page`,
    url: absoluteUrl(record.route),
    name: record.title,
    description: record.metaDescription,
    inLanguage: siteConfig.locale,
    isPartOf: { "@id": WEBSITE_ID },
    dateModified: record.dateModified,
    ...(breadcrumbTrail(record.route).length > 0
      ? { breadcrumb: { "@id": `${absoluteUrl(record.route)}#breadcrumb` } }
      : {}),
  };
}

/**
 * The downloads a data page actually offers.
 *
 * Keyed by route rather than derived, because a `Dataset` node is a claim that
 * files exist at these URLs. It is emitted only for the two pages that publish
 * downloads, and every distribution named here is a real endpoint that a test
 * fetches — a `DataDownload` pointing at nothing is a broken link wearing
 * structured data.
 */
const DATASETS: Readonly<
  Record<
    string,
    {
      readonly name: string;
      readonly description: string;
      readonly temporalCoverage: string;
      readonly measurementTechnique: string;
      readonly distributions: readonly { readonly format: string; readonly path: string }[];
    }
  >
> = {
  "/roblox-stats/": {
    name: "Roblox creator payout and engagement figures",
    description:
      "Developer exchange fees, revenue and engagement as Roblox reports them in its SEC filings, with each row labelled reported or derived and linked to the filing it came from. Includes the metrics Roblox does not publish, as absences with reasons.",
    temporalCoverage: "2024-01-01/..",
    measurementTechnique:
      "Transcribed from Roblox Corporation SEC filings and shareholder letters. Derived figures are computed in code from reported ones and labelled as such.",
    distributions: [
      { format: "text/csv", path: "/api/stats/?format=csv" },
      { format: "text/csv", path: "/api/stats/?format=csv-unpublished" },
      { format: "application/json", path: "/api/stats/" },
    ],
  },
  "/platform/": {
    name: "Observed Roblox player counts",
    description:
      "Player counts observed every fifteen minutes from Roblox's own public endpoints, for the experiences Roblox was ranking at the time. Nothing is interpolated and no missing observation is filled in; a gap means the collector did not run. This covers only ranked experiences and is not all of Roblox.",
    temporalCoverage: "..",
    measurementTechnique:
      "Recorded server-side from Roblox public games endpoints on a fifteen-minute schedule. Platform totals are retained fourteen days; per-experience series are sampled hourly and retained seven days.",
    distributions: [
      { format: "text/csv", path: "/api/platform/?format=csv" },
      { format: "text/csv", path: "/api/platform/?series=experiences&format=csv" },
      { format: "application/json", path: "/api/platform/" },
    ],
  },
};

function datasetNode(record: RouteRecord): JsonObject | null {
  const dataset = DATASETS[record.route];
  if (!dataset) return null;

  return {
    "@type": "Dataset",
    "@id": `${absoluteUrl(record.route)}#dataset`,
    name: dataset.name,
    description: dataset.description,
    url: absoluteUrl(record.route),
    isAccessibleForFree: true,
    inLanguage: siteConfig.locale,
    temporalCoverage: dataset.temporalCoverage,
    measurementTechnique: dataset.measurementTechnique,
    // The date the underlying figures last changed, not the build date.
    dateModified: record.dateModified,
    /*
     * No `creator` node. `Organization` is not emitted anywhere on this site
     * while `organizationName` is unset, and inventing a legal entity to
     * satisfy a schema property would be exactly the fabrication the rest of
     * the site refuses.
     */
    license: "https://creativecommons.org/licenses/by/4.0/",
    distribution: dataset.distributions.map((distribution) => ({
      "@type": "DataDownload",
      encodingFormat: distribution.format,
      contentUrl: absoluteUrl(distribution.path),
    })),
  };
}

/** Builds the JSON-LD graph for one route. */
export function buildGraph(record: RouteRecord): JsonObject {
  const nodes: JsonObject[] = [];

  if (record.schemaTypes.includes("WebSite")) nodes.push(websiteNode());

  const publisher = publisherNode();
  if (publisher && record.schemaTypes.includes("WebSite")) nodes.push(publisher);

  nodes.push(pageNode(record));

  if (record.schemaTypes.includes("WebApplication")) nodes.push(webApplicationNode(record));

  const breadcrumb = breadcrumbNode(record);
  if (breadcrumb && record.schemaTypes.includes("BreadcrumbList")) nodes.push(breadcrumb);

  if (record.schemaTypes.includes("ItemList")) {
    const list = itemListNode(record);
    if (list) nodes.push(list);
  }

  if (record.schemaTypes.includes("Dataset")) {
    const dataset = datasetNode(record);
    if (dataset) nodes.push(dataset);
  }

  return { "@context": "https://schema.org", "@graph": nodes };
}

/**
 * Renders the JSON-LD graph.
 *
 * The payload is built from typed data on the server, never from user input,
 * and `<` is escaped so the JSON can never terminate the script element early.
 */
export function JsonLd({ route }: { route: string }) {
  const record = getRoute(route);
  if (!record || record.indexation !== "index") return null;

  const json = JSON.stringify(buildGraph(record)).replace(/</g, "\\u003c");

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
}
