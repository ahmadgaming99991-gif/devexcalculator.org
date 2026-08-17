/**
 * Content manifest validation.
 *
 * Runs as its own gate (`npm run validate:content`) and in CI. Everything it
 * checks is something that would otherwise ship silently: a duplicate title, a
 * route with no parent, a rate-sensitive page with no source, an internal link
 * pointing at a page that does not exist.
 *
 * Exits non-zero on any error so a broken manifest cannot reach production.
 */
import { indexableRoutes, routeRegistry } from "../../src/lib/content/route-registry";
import { footerNavigation, primaryNavigation } from "../../src/config/navigation";
import { getSource } from "../../src/lib/calculations/rate-registry";
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from "../../src/lib/seo/metadata";
import { approvedAmountValues } from "../../src/lib/content/amount-pages";

interface Finding {
  readonly level: "error" | "warning";
  readonly route: string;
  readonly message: string;
}

const findings: Finding[] = [];
const error = (route: string, message: string) =>
  findings.push({ level: "error", route, message });
const warn = (route: string, message: string) =>
  findings.push({ level: "warning", route, message });

const knownRoutes = new Set(routeRegistry.map((record) => record.route));

// ---------------------------------------------------------------------------
// Per-route checks
// ---------------------------------------------------------------------------

for (const record of routeRegistry) {
  const { route } = record;

  // URL shape.
  if (route !== "/" && !route.endsWith("/")) {
    error(route, "Route must end with a trailing slash to match the canonical policy.");
  }
  if (route !== route.toLowerCase()) {
    error(route, "Route must be lowercase.");
  }
  if (route.includes("?") || route.includes("#")) {
    error(route, "Route must not contain a query string or fragment.");
  }

  // Required text.
  for (const [field, value] of [
    ["title", record.title],
    ["metaDescription", record.metaDescription],
    ["h1", record.h1],
    ["navLabel", record.navLabel],
    ["quickAnswer", record.quickAnswer],
  ] as const) {
    if (value.trim() === "") error(route, `${field} is empty.`);
  }

  // Metadata length. These are warnings: a long title is truncated in search
  // results but is not broken, and forcing every title under the limit would
  // sometimes mean a worse title.
  if (record.title.length > MAX_TITLE_LENGTH) {
    warn(
      route,
      `Title is ${record.title.length} characters; search results usually truncate past ${MAX_TITLE_LENGTH}.`,
    );
  }
  if (record.metaDescription.length > MAX_DESCRIPTION_LENGTH) {
    warn(
      route,
      `Description is ${record.metaDescription.length} characters; usually truncated past ${MAX_DESCRIPTION_LENGTH}.`,
    );
  }

  // A quick answer that is too short is not answering anything.
  const quickAnswerWords = record.quickAnswer.trim().split(/\s+/).length;
  if (quickAnswerWords < 25) {
    error(route, `Quick answer is only ${quickAnswerWords} words; it needs to actually answer.`);
  }
  if (quickAnswerWords > 120) {
    warn(route, `Quick answer is ${quickAnswerWords} words; it stops being quick.`);
  }

  // Hierarchy.
  if (route !== "/" && record.parent === null) {
    error(route, "Every route except the homepage needs a parent for breadcrumbs.");
  }
  if (record.parent !== null && !knownRoutes.has(record.parent)) {
    error(route, `Parent "${record.parent}" is not in the manifest.`);
  }
  if (record.parent === route) {
    error(route, "A route cannot be its own parent.");
  }

  // Sourcing: a page making time-sensitive claims must cite something.
  if (record.rateSensitive && record.sourceIds.length === 0) {
    error(route, "Rate-sensitive page has no sourceIds.");
  }
  for (const id of record.sourceIds) {
    try {
      getSource(id);
    } catch {
      error(route, `References unknown source "${id}".`);
    }
  }
  for (const faq of record.faqs) {
    for (const id of faq.sourceIds ?? []) {
      try {
        getSource(id);
      } catch {
        error(route, `FAQ "${faq.question}" references unknown source "${id}".`);
      }
    }
  }

  // Internal links.
  for (const link of record.internalLinks) {
    if (!knownRoutes.has(link.route)) {
      error(route, `Internal link points at "${link.route}", which is not in the manifest.`);
      continue;
    }
    const target = routeRegistry.find((r) => r.route === link.route);
    if (target && target.indexation === "noindex") {
      error(route, `Internal link points at noindex route "${link.route}".`);
    }
    if (link.anchor.trim().length < 4) {
      error(route, `Internal link to "${link.route}" has an anchor too short to be descriptive.`);
    }
  }
  if (record.internalLinks.some((link) => link.route === route)) {
    error(route, "Route links to itself.");
  }

  // Structure.
  if (record.schemaTypes.length === 0) {
    error(route, "No structured-data types declared.");
  }
  if (record.indexation === "index" && record.sections.length === 0) {
    error(route, "Indexable route declares no sections.");
  }
  const sectionIds = record.sections.map((section) => section.id);
  if (new Set(sectionIds).size !== sectionIds.length) {
    error(route, "Duplicate section ids.");
  }

  // Dates.
  for (const [field, value] of [
    ["lastReviewedAt", record.lastReviewedAt],
    ["dateModified", record.dateModified],
  ] as const) {
    if (Number.isNaN(Date.parse(value))) error(route, `${field} is not a valid date.`);
  }

  // Amount pages must correspond to an approved amount.
  if (record.pageType === "conversion-amount") {
    const amount = Number(route.match(/(\d+)-robux-to-usd/)?.[1] ?? "0");
    if (!approvedAmountValues.includes(amount)) {
      error(route, "Amount page is published for an amount that is not approved.");
    }
  }
}

// ---------------------------------------------------------------------------
// Cross-route checks
// ---------------------------------------------------------------------------

function checkUnique(label: string, read: (r: (typeof routeRegistry)[number]) => string): void {
  const seen = new Map<string, string[]>();
  for (const record of indexableRoutes) {
    const key = read(record).trim().toLowerCase();
    seen.set(key, [...(seen.get(key) ?? []), record.route]);
  }
  for (const [value, routes] of seen) {
    if (routes.length > 1) {
      error(routes.join(", "), `Duplicate ${label}: "${value}"`);
    }
  }
}

checkUnique("title", (r) => r.title);
checkUnique("meta description", (r) => r.metaDescription);
checkUnique("H1", (r) => r.h1);

/*
 * Orphans: an indexable page nothing links to cannot be found by a crawler
 * following links, no matter what the sitemap says.
 *
 * Header and footer links count. They are ordinary crawlable anchors rendered
 * on every page, so a route reachable only from the footer is genuinely
 * reachable — but it gets a warning, because a page with no contextual link
 * from related content is weakly connected even when it is not orphaned.
 */
const contextualLinks = new Set(routeRegistry.flatMap((r) => r.internalLinks.map((l) => l.route)));
const navigationLinks = new Set([
  ...primaryNavigation.map((item) => item.href),
  ...footerNavigation.flatMap((group) => group.items.map((item) => item.href)),
]);

for (const record of indexableRoutes) {
  if (record.route === "/") continue;
  if (contextualLinks.has(record.route)) continue;
  if (navigationLinks.has(record.route)) {
    warn(
      record.route,
      "Reachable only from the header or footer; no contextual link from related content.",
    );
    continue;
  }
  error(record.route, "Orphan: nothing links to this route.");
}

// Every declared parent should also be reachable as a link from its child, so
// the visible navigation matches the declared hierarchy.
for (const record of routeRegistry) {
  if (record.parent === null) continue;
  const linksToParent = record.internalLinks.some((link) => link.route === record.parent);
  if (!linksToParent) {
    warn(record.route, `Does not link back to its parent "${record.parent}".`);
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const errors = findings.filter((f) => f.level === "error");
const warnings = findings.filter((f) => f.level === "warning");

console.log(`Content manifest: ${routeRegistry.length} routes, ${indexableRoutes.length} indexable`);

for (const finding of warnings) {
  console.warn(`  warning  ${finding.route}: ${finding.message}`);
}
for (const finding of errors) {
  console.error(`  ERROR    ${finding.route}: ${finding.message}`);
}

if (errors.length > 0) {
  console.error(`\n${errors.length} error(s). Content validation failed.`);
  process.exit(1);
}

console.log(`  ${warnings.length} warning(s), 0 errors. Content validation passed.`);
