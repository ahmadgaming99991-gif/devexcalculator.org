import { absoluteUrl, siteConfig } from "@/config/site";
import { breadcrumbTrail, getRoute } from "@/lib/content/route-registry";
import { getTranslator, type Translate } from "@/i18n/get-dictionary";
import { localizedRoute, routeLabels } from "@/i18n/localized-route";
import { getLocaleMeta } from "@/i18n/config";
import { localizedPath } from "@/i18n/locale-path";
import type { Locale } from "@/i18n/types";
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

/**
 * The canonical URL of a route in one language.
 *
 * `absoluteUrl` returns the English address for every locale, so a Spanish
 * page used to identify itself by the English URL — two pages claiming one
 * `@id`, which is the one thing a graph is supposed to make impossible.
 */
function localeUrl(locale: Locale, route: string): string {
  return absoluteUrl(localizedPath(locale, route));
}
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

function websiteNode(locale: Locale, t: Translate): JsonObject {
  const sameAs = profileUrls();

  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${siteConfig.url}/`,
    name: t("seo.site.name"),
    description: t("seo.site.description"),
    inLanguage: getLocaleMeta(locale).locale,
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

function breadcrumbNode(
  locale: Locale,
  record: RouteRecord,
  t: Translate,
  label: (route: string) => string,
): JsonObject | null {
  const trail = breadcrumbTrail(record.route);
  if (trail.length === 0) return null;

  const items = [...trail, record].map((entry, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: entry.route === "/" ? t("schema.labels.breadcrumbHome") : label(entry.route),
    item: localeUrl(locale, entry.route),
  }));

  return {
    "@type": "BreadcrumbList",
    "@id": `${localeUrl(locale, record.route)}#breadcrumb`,
    itemListElement: items,
  };
}

function webApplicationNode(locale: Locale, record: RouteRecord, t: Translate): JsonObject {
  return {
    "@type": "WebApplication",
    "@id": `${localeUrl(locale, record.route)}#app`,
    name: record.h1,
    url: localeUrl(locale, record.route),
    description: record.metaDescription,
    applicationCategory: "FinanceApplication",
    operatingSystem: t("schema.webApplication.operatingSystem"),
    browserRequirements: t("schema.webApplication.browserRequirements"),
    inLanguage: getLocaleMeta(locale).locale,
    // The calculator is genuinely free with no account and no paid tier.
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    isAccessibleForFree: true,
  };
}

function itemListNode(
  locale: Locale,
  record: RouteRecord,
  label: (route: string) => string,
): JsonObject | null {
  // Only list the children this page visibly links to, so the markup matches
  // what a reader actually sees.
  const children = record.internalLinks
    .filter((link) => link.relationship === "child")
    .map((link) => getRoute(link.route))
    .filter((child): child is RouteRecord => child !== null);

  if (children.length === 0) return null;

  return {
    "@type": "ItemList",
    "@id": `${localeUrl(locale, record.route)}#list`,
    numberOfItems: children.length,
    itemListElement: children.map((child, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: label(child.route),
      url: localeUrl(locale, child.route),
    })),
  };
}

function pageNode(locale: Locale, record: RouteRecord): JsonObject {
  const type = record.schemaTypes.includes("CollectionPage")
    ? "CollectionPage"
    : record.schemaTypes.includes("AboutPage")
      ? "AboutPage"
      : record.schemaTypes.includes("ContactPage")
        ? "ContactPage"
        : "WebPage";

  return {
    "@type": type,
    "@id": `${localeUrl(locale, record.route)}#page`,
    url: localeUrl(locale, record.route),
    name: record.title,
    description: record.metaDescription,
    inLanguage: getLocaleMeta(locale).locale,
    isPartOf: { "@id": WEBSITE_ID },
    dateModified: record.dateModified,
    ...(breadcrumbTrail(record.route).length > 0
      ? { breadcrumb: { "@id": `${localeUrl(locale, record.route)}#breadcrumb` } }
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
const DATASETS = (
  t: Translate,
): Readonly<
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
> => ({
  "/roblox-stats/": {
    name: t("schema.datasets.stats.name"),
    description: t("schema.datasets.stats.description"),
    temporalCoverage: "2024-01-01/..",
    measurementTechnique: t("schema.datasets.stats.measurementTechnique"),
    distributions: [
      { format: "text/csv", path: "/api/stats/?format=csv" },
      { format: "text/csv", path: "/api/stats/?format=csv-unpublished" },
      { format: "application/json", path: "/api/stats/" },
    ],
  },
  "/platform/": {
    name: t("schema.datasets.platform.name"),
    description: t("schema.datasets.platform.description"),
    temporalCoverage: "..",
    measurementTechnique: t("schema.datasets.platform.measurementTechnique"),
    distributions: [
      { format: "text/csv", path: "/api/platform/?format=csv" },
      { format: "text/csv", path: "/api/platform/?series=experiences&format=csv" },
      { format: "application/json", path: "/api/platform/" },
    ],
  },
});

function datasetNode(locale: Locale, record: RouteRecord, t: Translate): JsonObject | null {
  const dataset = DATASETS(t)[record.route];
  if (!dataset) return null;

  return {
    "@type": "Dataset",
    "@id": `${localeUrl(locale, record.route)}#dataset`,
    name: dataset.name,
    description: dataset.description,
    url: localeUrl(locale, record.route),
    isAccessibleForFree: true,
    inLanguage: getLocaleMeta(locale).locale,
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

/** Builds the JSON-LD graph for one route, in one language. */
export function buildGraph(
  locale: Locale,
  record: RouteRecord,
  t: Translate,
  label: (route: string) => string,
): JsonObject {
  const nodes: JsonObject[] = [];

  if (record.schemaTypes.includes("WebSite")) nodes.push(websiteNode(locale, t));

  const publisher = publisherNode();
  if (publisher && record.schemaTypes.includes("WebSite")) nodes.push(publisher);

  nodes.push(pageNode(locale, record));

  if (record.schemaTypes.includes("WebApplication")) {
    nodes.push(webApplicationNode(locale, record, t));
  }

  const breadcrumb = breadcrumbNode(locale, record, t, label);
  if (breadcrumb && record.schemaTypes.includes("BreadcrumbList")) nodes.push(breadcrumb);

  if (record.schemaTypes.includes("ItemList")) {
    const list = itemListNode(locale, record, label);
    if (list) nodes.push(list);
  }

  if (record.schemaTypes.includes("Dataset")) {
    const dataset = datasetNode(locale, record, t);
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
export async function JsonLd({
  locale,
  route,
}: {
  readonly locale: Locale;
  readonly route: string;
}) {
  const registryRecord = getRoute(route);
  if (!registryRecord || registryRecord.indexation !== "index") return null;

  const record = await localizedRoute(locale, route);
  const t = await getTranslator(locale, ["schema", "seo"]);
  const label = await routeLabels(locale);

  const json = JSON.stringify(buildGraph(locale, record, t, label)).replace(/</g, "\\u003c");

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  );
}
