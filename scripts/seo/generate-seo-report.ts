/**
 * SEO validation and reporting.
 *
 * `npm run validate:seo` runs this with `--check`, which regenerates the
 * intelligence files from the source exports and fails on any error. Without
 * the flag it also writes the human-readable report to docs/seo/.
 *
 * The checks here are the ones that protect crawl quality: every source row
 * accounted for, one canonical owner per keyword, no duplicate metadata, no
 * unapproved amount page, and agreement between the manifest, the sitemap and
 * the publish queue.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateAll } from "./analyze-keywords";
import { buildAmountEntities, buildClusters, type KeywordRecord } from "../../src/lib/seo/pipeline";
import { buildCannibalizationMap, buildPublishQueue } from "../../src/lib/seo/publish";
import { buildInternalLinkMap } from "../../src/lib/seo/graphs";
import { indexableRoutes, routeRegistry } from "../../src/lib/content/route-registry";
import { DOCS_SEO_DIR } from "./paths";

const checkOnly = process.argv.includes("--check");
const failures: string[] = [];

function fail(message: string): void {
  failures.push(message);
}

// The same overrides the generation run used, so the validator sees the manual
// publication decisions rather than the raw automated gate results.
const { pipeline: result, overrides } = generateAll();
const clusters = buildClusters(result.records, overrides);
const amounts = buildAmountEntities(result.records, overrides);
const cannibalization = buildCannibalizationMap(result.records, amounts);
const publishQueue = buildPublishQueue(result.records, amounts);
const linkMap = buildInternalLinkMap();

console.log("\nSEO validation");

// ---------------------------------------------------------------------------
// Row accounting: every supplied row must end in exactly one status.
// ---------------------------------------------------------------------------

const expectedRows = result.files.reduce((sum, file) => sum + file.rowCount, 0);
if (result.accounting.totalSourceRows !== expectedRows) {
  fail(
    `Row accounting: ${result.accounting.totalSourceRows} records from ${expectedRows} source rows.`,
  );
}
if (!result.accounting.reconciles) {
  fail("Row accounting: statuses do not sum to the record count.");
}
for (const file of result.files) {
  if (!file.checkpointMatches) {
    fail(`Checkpoint mismatch in ${file.fileName}: ${file.checkpointNotes}`);
  }
  if (file.missingColumns.length > 0) {
    fail(`${file.fileName} is missing expected columns: ${file.missingColumns.join(", ")}`);
  }
}
console.log(`  rows accounted for: ${result.accounting.totalSourceRows}/${expectedRows}`);

// ---------------------------------------------------------------------------
// Ownership
// ---------------------------------------------------------------------------

const owners = new Map<string, Set<string>>();
for (const record of result.records) {
  if (record.status !== "included" || !record.canonicalOwner || !record.targetRoute) continue;
  owners.set(record.comparisonKey, (owners.get(record.comparisonKey) ?? new Set()).add(record.targetRoute));
}
const multiOwned = [...owners.entries()].filter(([, routes]) => routes.size > 1);
if (multiOwned.length > 0) {
  fail(`${multiOwned.length} keyword(s) have more than one canonical owner.`);
}
console.log(`  canonical owners: ${owners.size} keywords, ${multiOwned.length} conflicts`);

// Every route a keyword is assigned to must exist in the content manifest.
const manifestRoutes = new Set(routeRegistry.map((r) => r.route));
const unknownTargets = new Set(
  result.records
    .filter((r) => r.status === "included" && r.targetRoute && !manifestRoutes.has(r.targetRoute))
    .map((r) => r.targetRoute as string),
);
if (unknownTargets.size > 0) {
  fail(`Keywords target routes that do not exist: ${[...unknownTargets].join(", ")}`);
}

// ---------------------------------------------------------------------------
// Cannibalisation and publication
// ---------------------------------------------------------------------------

if (cannibalization.errorCount > 0) {
  for (const finding of cannibalization.findings.filter((f) => f.severity === "error")) {
    fail(`Cannibalisation [${finding.code}] ${finding.routes.join(", ")}: ${finding.detail}`);
  }
}
console.log(`  cannibalisation: ${cannibalization.errorCount} errors`);

const blocked = publishQueue.entries.filter((e) => e.blockers.length > 0);
for (const entry of blocked) {
  fail(`Publish queue: ${entry.route} is blocked — ${entry.blockers.join("; ")}`);
}
console.log(
  `  publish queue: ${publishQueue.eligibleForSitemap} eligible, ${publishQueue.blocked} blocked`,
);

// The sitemap and the publish queue must agree exactly.
const sitemapRoutes = new Set(indexableRoutes.map((r) => r.route));
const eligibleRoutes = new Set(
  publishQueue.entries.filter((e) => e.eligibleForSitemap).map((e) => e.route),
);
for (const route of sitemapRoutes) {
  if (!eligibleRoutes.has(route)) {
    fail(`Sitemap contains ${route}, which the publish queue does not consider eligible.`);
  }
}
for (const route of eligibleRoutes) {
  if (!sitemapRoutes.has(route)) {
    fail(`Publish queue considers ${route} eligible but it is not in the sitemap.`);
  }
}

// ---------------------------------------------------------------------------
// Internal links
// ---------------------------------------------------------------------------

if (linkMap.brokenTargets.length > 0) {
  fail(`Broken internal link targets: ${linkMap.brokenTargets.join(", ")}`);
}
if (linkMap.overusedAnchors.length > 0) {
  for (const anchor of linkMap.overusedAnchors) {
    fail(`Anchor text repeated ${anchor.count} times: ${anchor.key}`);
  }
}
console.log(`  internal links: ${linkMap.edgeCount} edges, ${linkMap.orphans.length} orphans`);

// ---------------------------------------------------------------------------
// Amount page control
// ---------------------------------------------------------------------------

const approved = amounts.filter((a) => a.publicationStatus === "approved");
if (approved.length > 20) {
  fail(`${approved.length} amount pages approved; the launch cap is a conservative 10–20.`);
}
console.log(`  amount pages: ${approved.length} approved, ${amounts.length - approved.length} held`);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (!checkOnly) {
  mkdirSync(DOCS_SEO_DIR, { recursive: true });
  writeFileSync(join(DOCS_SEO_DIR, "seo-validation-report.md"), buildReport(), "utf8");
  console.log("\n  wrote docs/seo/seo-validation-report.md");
}

if (failures.length > 0) {
  console.error(`\n${failures.length} SEO validation failure(s):`);
  for (const failure of failures) console.error(`  ERROR  ${failure}`);
  process.exit(1);
}

console.log("\nSEO validation passed.");

function buildReport(): string {
  const byStatus = result.accounting.byStatus;
  const topRoutes = [...owners.entries()].reduce<Map<string, number>>((map, [, routes]) => {
    for (const route of routes) map.set(route, (map.get(route) ?? 0) + 1);
    return map;
  }, new Map());

  return `# SEO validation report

Generated ${result.generatedAt}. Regenerate with \`npm run validate:seo\`.

## Source exports

| File | Rows | Volume | Traffic | Checkpoint | SHA-256 |
|---|---:|---:|---:|---|---|
${result.files
  .map(
    (f) =>
      `| \`${f.fileName}\` | ${f.rowCount} | ${f.summedVolume.toLocaleString("en-US")} | ${f.summedOrganicTraffic.toLocaleString("en-US")} | ${f.checkpointMatches ? "match" : "MISMATCH"} | \`${f.sha256.slice(0, 16)}…\` |`,
  )
  .join("\n")}

Metrics are third-party estimates from the supplied exports, not measured traffic.

## Row accounting

Every source row ends in exactly one status.

| Status | Rows |
|---|---:|
| Included | ${byStatus.included} |
| Duplicate variant | ${byStatus["duplicate-variant"]} |
| Excluded | ${byStatus.excluded} |
| Ambiguous, needs review | ${byStatus["ambiguous-review"]} |
| **Total** | **${result.accounting.totalSourceRows}** |

Unique normalised keywords: ${result.accounting.uniqueComparisonKeys}.

A duplicate variant is the same normalised keyword appearing in both exports.
The row carrying the stronger metrics becomes the canonical owner; the other is
retained as evidence rather than discarded.

## Route ownership

${[...topRoutes.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([route, count]) => `- \`${route}\` — ${count} canonical keywords`)
  .join("\n")}

## Clusters

| Cluster | Keywords | Non-overlapping volume | Route | Priority |
|---|---:|---:|---|---|
${clusters
  .map(
    (c) =>
      `| ${c.label} | ${c.uniqueKeywordCount} | ${c.nonOverlappingVolume.toLocaleString("en-US")} | \`${c.recommendedRoute}\` | ${c.publicationPriority} |`,
  )
  .join("\n")}

Non-overlapping volume counts each normalised keyword once. Raw summed volume
adds overlapping variants together and is recorded in the generated JSON with a
warning attached; neither is a traffic forecast.

## Amount pages

${approved.length} approved of ${amounts.length} candidates.

| Amount | Volume | Variants | Status |
|---|---:|---:|---|
${amounts
  .slice(0, 20)
  .map(
    (a) =>
      `| ${a.display} | ${a.totalVolume.toLocaleString("en-US")} | ${a.variants.length} | ${a.publicationStatus} |`,
  )
  .join("\n")}

## Exclusions

${
  result.records.filter((r) => r.status === "excluded").length === 0
    ? "None."
    : result.records
        .filter((r) => r.status === "excluded")
        .map((r: KeywordRecord) => `- \`${r.keywordRaw}\` — ${r.exclusionReasonCode}: ${r.exclusionReason}`)
        .join("\n")
}

## Checks

- Canonical owner conflicts: ${multiOwned.length}
- Cannibalisation errors: ${cannibalization.errorCount}
- Blocked routes in the publish queue: ${publishQueue.blocked}
- Broken internal link targets: ${linkMap.brokenTargets.length}
- Orphan indexable routes: ${linkMap.orphans.length}
- Sitemap entries: ${indexableRoutes.length}
`;
}
