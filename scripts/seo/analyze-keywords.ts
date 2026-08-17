/**
 * Keyword pipeline entry point.
 *
 * Reads the preserved source exports, runs the pure pipeline, and writes every
 * `seo/generated/*.json` artefact. Run with `npm run seo:analyze`.
 *
 * Regenerating is always safe: the source CSVs are read-only inputs and the
 * generated directory is fully derived, so the whole intelligence layer can be
 * rebuilt from the exports plus the override files at any time.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  buildAmountEntities,
  buildClusters,
  runPipeline,
  type Overrides,
  type PipelineResult,
  type SourceFile,
} from "../../src/lib/seo/pipeline";
import { ROUTES } from "../../src/lib/seo/classify";
import { buildEntityMap, buildInternalLinkMap, buildPaaMap } from "../../src/lib/seo/graphs";
import {
  buildCannibalizationMap,
  buildPublishQueue,
} from "../../src/lib/seo/publish";
import { REPO_ROOT, SEO_GENERATED, SEO_OVERRIDES, SEO_SOURCE } from "./paths";

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex").toUpperCase();
}

function readOverrides(): Overrides {
  const read = <T>(file: string, key: string, fallback: T): T => {
    try {
      const parsed = JSON.parse(readFileSync(join(SEO_OVERRIDES, file), "utf8"));
      return (parsed[key] as T) ?? fallback;
    } catch {
      return fallback;
    }
  };

  return {
    exclusions: read("exclusions.json", "exclusions", {}),
    routeOverrides: read("route-overrides.json", "routes", {}),
    clusterOverrides: read("cluster-overrides.json", "clusters", {}),
    publicationOverrides: read("publication-overrides.json", "amounts", {}),
  };
}

function loadSourceFiles(): SourceFile[] {
  const files = readdirSync(SEO_SOURCE).filter((name) => name.toLowerCase().endsWith(".csv"));
  if (files.length === 0) {
    throw new Error(`No CSV exports found in ${SEO_SOURCE}`);
  }
  return files.sort().map((fileName) => {
    const buffer = readFileSync(join(SEO_SOURCE, fileName));
    return {
      fileName,
      content: buffer.toString("utf8"),
      sha256: sha256(buffer),
      byteSize: buffer.byteLength,
    };
  });
}

function write(fileName: string, data: unknown): void {
  mkdirSync(SEO_GENERATED, { recursive: true });
  writeFileSync(join(SEO_GENERATED, fileName), `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`  wrote seo/generated/${fileName}`);
}

export interface GenerateResult {
  readonly pipeline: PipelineResult;
  /** Returned so validators apply the same manual decisions this run did. */
  readonly overrides: Overrides;
}

export function generateAll(): GenerateResult {
  const overrides = readOverrides();
  const files = loadSourceFiles();
  const result = runPipeline(files, overrides);
  const clusters = buildClusters(result.records, overrides);
  const amounts = buildAmountEntities(result.records, overrides);

  console.log("Keyword pipeline");
  for (const file of result.files) {
    console.log(
      `  ${file.fileName}: ${file.rowCount} rows, volume ${file.summedVolume}, traffic ${file.summedOrganicTraffic} — checkpoint ${file.checkpointMatches ? "OK" : "MISMATCH"}`,
    );
  }

  write("dataset-summary.json", {
    generatedAt: result.generatedAt,
    files: result.files,
    accounting: result.accounting,
    note: "Metrics are third-party estimates from the supplied exports, not guaranteed traffic.",
  });

  write("keyword-intelligence.json", {
    generatedAt: result.generatedAt,
    totalRecords: result.records.length,
    clusters,
    records: result.records,
  });

  write("keyword-route-map.json", {
    generatedAt: result.generatedAt,
    routes: buildRouteMap(result),
  });

  write("content-priority-map.json", {
    generatedAt: result.generatedAt,
    bands: buildPriorityBands(result),
  });

  write("keyword-exclusions.json", {
    generatedAt: result.generatedAt,
    excluded: result.records
      .filter((r) => r.status === "excluded")
      .map((r) => ({
        keywordRaw: r.keywordRaw,
        status: r.status,
        reasonCode: r.exclusionReasonCode,
        reason: r.exclusionReason,
        candidateRoute: null,
        sourceFile: r.sourceFile,
        sourceRow: r.sourceRow,
      })),
    ambiguous: result.records
      .filter((r) => r.status === "ambiguous-review")
      .map((r) => ({
        keywordRaw: r.keywordRaw,
        status: r.status,
        reason: r.notes,
        sourceFile: r.sourceFile,
        sourceRow: r.sourceRow,
      })),
    duplicateVariants: result.records
      .filter((r) => r.status === "duplicate-variant")
      .map((r) => ({
        keywordRaw: r.keywordRaw,
        comparisonKey: r.comparisonKey,
        note: r.notes,
        sourceFile: r.sourceFile,
        sourceRow: r.sourceRow,
      })),
  });

  write("entity-map.json", buildEntityMap(result.records));
  write("paa-map.json", buildPaaMap(result.records));
  write("internal-link-map.json", buildInternalLinkMap());
  write("cannibalization-map.json", buildCannibalizationMap(result.records, amounts));
  write("publish-queue.json", buildPublishQueue(result.records, amounts));

  write("amount-entities.json", {
    generatedAt: result.generatedAt,
    approvedCount: amounts.filter((a) => a.publicationStatus === "approved").length,
    entities: amounts,
  });

  console.log(
    `\n  ${result.records.length} source rows accounted for: ` +
      Object.entries(result.accounting.byStatus)
        .map(([k, v]) => `${v} ${k}`)
        .join(", "),
  );

  return { pipeline: result, overrides };
}

function buildRouteMap(result: PipelineResult) {
  const byRoute = new Map<string, typeof result.records[number][]>();
  for (const record of result.records) {
    if (record.status !== "included" || !record.targetRoute) continue;
    const list = byRoute.get(record.targetRoute) ?? [];
    list.push(record);
    byRoute.set(record.targetRoute, list);
  }

  return [...byRoute.entries()]
    .map(([route, records]) => {
      const sorted = [...records].sort((a, b) => b.volume - a.volume);
      return {
        route,
        isCanonicalOwner: true,
        primaryKeyword: sorted[0]?.keywordNormalized ?? "",
        keywordCount: sorted.length,
        uniqueKeywordCount: new Set(sorted.map((r) => r.comparisonKey)).size,
        nonOverlappingVolume: dedupeVolume(sorted),
        topKeywords: sorted.slice(0, 25).map((r) => ({
          keyword: r.keywordNormalized,
          volume: r.volume,
          organicTraffic: r.organicTraffic,
          intent: r.primaryIntent,
          priority: r.priority,
        })),
      };
    })
    .sort((a, b) => b.nonOverlappingVolume - a.nonOverlappingVolume);
}

function dedupeVolume(records: readonly { comparisonKey: string; volume: number }[]): number {
  const seen = new Set<string>();
  let total = 0;
  for (const record of records) {
    if (seen.has(record.comparisonKey)) continue;
    seen.add(record.comparisonKey);
    total += record.volume;
  }
  return total;
}

function buildPriorityBands(result: PipelineResult) {
  const bands = new Map<string, typeof result.records[number][]>();
  for (const record of result.records) {
    const list = bands.get(record.priority) ?? [];
    list.push(record);
    bands.set(record.priority, list);
  }

  return [...bands.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([band, records]) => ({
      band,
      count: records.length,
      routes: [...new Set(records.map((r) => r.targetRoute).filter(Boolean))],
      topKeywords: [...records]
        .sort((a, b) => b.strategicPriorityScore - a.strategicPriorityScore)
        .slice(0, 20)
        .map((r) => ({
          keyword: r.keywordNormalized,
          route: r.targetRoute,
          strategicPriorityScore: r.strategicPriorityScore,
          quickWinScore: r.quickWinScore,
        })),
    }));
}

export { ROUTES, REPO_ROOT };

// Run when invoked directly rather than imported by a validator.
if (process.argv[1] && process.argv[1].includes("analyze-keywords")) {
  generateAll();
}
