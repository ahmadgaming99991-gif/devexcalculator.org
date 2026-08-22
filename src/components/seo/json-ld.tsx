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
