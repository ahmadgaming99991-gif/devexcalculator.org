import { KEYWORD_EXPORT_COLUMNS, mapColumns, parseCsv, parseMetric } from "./csv";
import {
  amountEntityId,
  amountSlug,
  comparisonKey,
  extractAmount,
  extractCurrency,
  extractEntities,
  formatAmountDisplay,
  normalizeKeyword,
  spellingFamily,
} from "./normalize";
import {
  assignRoute,
  classifyKeyword,
  ROUTES,
  type Classification,
  type KeywordStatus,
  type PrimaryIntent,
} from "./classify";
import { scoreKeyword, type PriorityBand, type ScoreResult } from "./score";

/**
 * The keyword intelligence pipeline.
 *
 * Deliberately free of filesystem access so every stage is unit-testable and
 * so no part of it can be pulled into the browser bundle. The calling script
 * supplies file contents and writes the results.
 *
 * The central invariant: every source row ends in exactly one status, and the
 * counts reconcile. `validateAccounting` enforces that and the build fails if
 * a single row goes missing.
 */

export interface SourceFile {
  readonly fileName: string;
  readonly content: string;
  readonly sha256: string;
  readonly byteSize: number;
}

export interface Overrides {
  /** Keyword comparison key -> forced route. */
  readonly routeOverrides: Readonly<Record<string, string>>;
  /** Keyword comparison key -> forced exclusion reason. */
  readonly exclusions: Readonly<Record<string, string>>;
  /** Cluster id -> label/parent overrides. */
  readonly clusterOverrides: Readonly<Record<string, { label?: string; parentTopic?: string }>>;
  /** Amount entity id -> manual publication decision. */
  readonly publicationOverrides: Readonly<Record<string, "approved" | "review" | "excluded">>;
}

export const EMPTY_OVERRIDES: Overrides = {
  routeOverrides: {},
  exclusions: {},
  clusterOverrides: {},
  publicationOverrides: {},
};

export interface KeywordRecord {
  readonly keywordRaw: string;
  readonly keywordNormalized: string;
  readonly comparisonKey: string;
  readonly sourceFile: string;
  readonly sourceRow: number;
  readonly volume: number;
  readonly organicTraffic: number;
  readonly paidTraffic: number;
  readonly averagePosition: number;
  readonly locations: number;
  readonly topLocation: string;
  readonly topLocationCode: string;
  readonly topLocationVolume: number;
  readonly topLocationTraffic: number;
  readonly spellingFamily: string;
  readonly primaryIntent: PrimaryIntent;
  readonly secondaryIntents: readonly string[];
  readonly entities: readonly string[];
  readonly amountRobux: number | null;
  readonly amountEntityId: string | null;
  readonly amountDisplay: string | null;
  readonly currency: string | null;
  readonly targetRoute: string | null;
  readonly fallbackRoute: string | null;
  readonly targetSection: string | null;
  readonly canonicalOwner: boolean;
  readonly status: KeywordStatus;
  readonly exclusionReasonCode: string | null;
  readonly exclusionReason: string | null;
  readonly priority: PriorityBand;
  readonly strategicPriorityScore: number;
  readonly quickWinScore: number;
  readonly mappingConfidence: number;
  readonly notes: string;
  readonly overrideApplied: string | null;
}

export interface FileSummary {
  readonly fileName: string;
  readonly sha256: string;
  readonly byteSize: number;
  readonly encoding: string;
  readonly delimiter: string;
  readonly hadBom: boolean;
  readonly headers: readonly string[];
  readonly missingColumns: readonly string[];
  readonly unmappedHeaders: readonly string[];
  readonly rowCount: number;
  readonly summedVolume: number;
  readonly summedOrganicTraffic: number;
  readonly expectedRowCount: number | null;
  readonly expectedVolume: number | null;
  readonly expectedOrganicTraffic: number | null;
  readonly checkpointMatches: boolean;
  readonly checkpointNotes: string;
}

/**
 * Checkpoints recorded in the master specification. These are anomaly
 * detectors, not targets: a mismatch means the export changed or the parser
 * regressed, and is reported rather than forced to agree.
 */
const CHECKPOINTS: Readonly<
  Record<string, { rows: number; volume: number; organicTraffic: number }>
> = {
  "rbxtax.com-devex.html-organic-keywords-path_2026-08-17_14-15-54.csv": {
    rows: 82,
    volume: 14_270,
    organicTraffic: 1_564,
  },
  "romonitorstats.com-devex-calculator-organic_2026-08-17_14-15-10.csv": {
    rows: 362,
    volume: 81_220,
    organicTraffic: 13_534,
  },
};

export interface PipelineResult {
  readonly generatedAt: string;
  readonly files: readonly FileSummary[];
  readonly records: readonly KeywordRecord[];
  readonly accounting: AccountingSummary;
}

export interface AccountingSummary {
  readonly totalSourceRows: number;
  readonly byStatus: Readonly<Record<KeywordStatus, number>>;
  readonly reconciles: boolean;
  readonly uniqueComparisonKeys: number;
  readonly duplicateVariantRows: number;
}

/** Runs normalisation, classification, routing and scoring over every row. */
export function runPipeline(
  files: readonly SourceFile[],
  overrides: Overrides = EMPTY_OVERRIDES,
  generatedAt: string = new Date().toISOString(),
): PipelineResult {
  const fileSummaries: FileSummary[] = [];
  const staged: Array<Omit<KeywordRecord, "priority" | "strategicPriorityScore" | "quickWinScore"> & {
    classification: Classification;
  }> = [];

  /**
   * Pass one: parse every file and record the metrics, without deciding
   * anything about duplicates yet.
   */
  interface RawRow {
    readonly file: string;
    readonly sourceRow: number;
    readonly raw: string;
    readonly key: string;
    readonly volume: number;
    readonly organicTraffic: number;
    readonly values: Readonly<Record<string, string>>;
  }

  const rawRows: RawRow[] = [];

  for (const file of files) {
    const parsed = parseCsv(file.content);
    const mapped = mapColumns(parsed, KEYWORD_EXPORT_COLUMNS);

    let summedVolume = 0;
    let summedOrganicTraffic = 0;

    for (const row of mapped.rows) {
      const raw = row.values.keyword ?? "";
      // A completely blank line at the end of a file is not a keyword row.
      if (raw.trim() === "" && (row.values.volume ?? "") === "") continue;

      const volume = parseMetric(row.values.volume ?? "");
      const organicTraffic = parseMetric(row.values.organicTraffic ?? "");
      summedVolume += volume;
      summedOrganicTraffic += organicTraffic;

      rawRows.push({
        file: file.fileName,
        sourceRow: row.sourceRow,
        raw,
        key: comparisonKey(raw),
        volume,
        organicTraffic,
        values: row.values,
      });
    }

    recordFileSummary(file, parsed, mapped, summedVolume, summedOrganicTraffic);
  }

  /**
   * Pass two: pick the canonical row for each normalised keyword.
   *
   * The same keyword appears in both exports with different metrics — for
   * example `robux to usd` is 30 in one file and 16,470 in the other. Keeping
   * whichever row happened to be read first would let filename ordering
   * discard the stronger demand signal, so the row with the highest volume
   * wins, then the higher organic traffic, then file order as a stable
   * tie-break. Every other row is retained as a duplicate variant for
   * evidence.
   */
  const canonicalRow = new Map<string, RawRow>();
  for (const row of rawRows) {
    const current = canonicalRow.get(row.key);
    if (
      current === undefined ||
      row.volume > current.volume ||
      (row.volume === current.volume && row.organicTraffic > current.organicTraffic)
    ) {
      canonicalRow.set(row.key, row);
    }
  }

  /** Pass three: classify, route and stage every row. */
  {
    for (const rawRow of rawRows) {
      const { raw, key } = rawRow;
      const canonical = canonicalRow.get(key);
      const isDuplicate = canonical !== rawRow;
      const volume = rawRow.volume;
      const organicTraffic = rawRow.organicTraffic;
      const row = { sourceRow: rawRow.sourceRow, values: rawRow.values };
      const file = { fileName: rawRow.file };

      const extracted = extractAmount(raw);
      const amount = extracted?.amount ?? null;

      let classification = classifyKeyword(raw);
      let overrideApplied: string | null = null;

      // Manual exclusion override wins over any automated decision.
      const forcedExclusion = overrides.exclusions[key];
      if (forcedExclusion !== undefined) {
        classification = {
          ...classification,
          status: "excluded",
          exclusionReason: "intent-mismatch",
          rationale: forcedExclusion,
          confidence: 1,
        };
        overrideApplied = "exclusion";
      }

      const route = assignRoute(classification, amount);
      const forcedRoute = overrides.routeOverrides[key];
      const targetRoute = forcedRoute ?? route.targetRoute;
      if (forcedRoute !== undefined) overrideApplied = "route";

      const status: KeywordStatus = isDuplicate ? "duplicate-variant" : classification.status;

      staged.push({
        keywordRaw: raw,
        keywordNormalized: normalizeKeyword(raw),
        comparisonKey: key,
        sourceFile: file.fileName,
        sourceRow: row.sourceRow,
        volume,
        organicTraffic,
        paidTraffic: parseMetric(row.values.paidTraffic ?? ""),
        averagePosition: parseMetric(row.values.averagePosition ?? ""),
        locations: parseMetric(row.values.locations ?? ""),
        topLocation: row.values.topLocation ?? "",
        topLocationCode: row.values.topLocationCode ?? "",
        topLocationVolume: parseMetric(row.values.topLocationVolume ?? ""),
        topLocationTraffic: parseMetric(row.values.topLocationTraffic ?? ""),
        spellingFamily: spellingFamily(raw),
        primaryIntent: classification.primaryIntent,
        secondaryIntents: classification.secondaryIntents,
        entities: extractEntities(raw),
        amountRobux: amount,
        amountEntityId: amount === null ? null : amountEntityId(amount),
        amountDisplay: amount === null ? null : formatAmountDisplay(amount),
        currency: extractCurrency(raw),
        targetRoute,
        fallbackRoute: route.fallbackRoute,
        targetSection: route.targetSection,
        // Only the strongest occurrence of a key can be a canonical owner.
        canonicalOwner: route.canonicalOwner && !isDuplicate,
        status,
        exclusionReasonCode: classification.exclusionReason,
        exclusionReason: classification.status === "excluded" ? classification.rationale : null,
        mappingConfidence: classification.confidence,
        notes: isDuplicate
          ? `Same normalised keyword as ${canonical?.file} row ${canonical?.sourceRow}, which carries the stronger metrics (volume ${canonical?.volume}). Metrics from this row retained for evidence.`
          : classification.rationale,
        overrideApplied,
        classification,
      });
    }
  }

  function recordFileSummary(
    file: SourceFile,
    parsed: ReturnType<typeof parseCsv>,
    mapped: ReturnType<typeof mapColumns>,
    summedVolume: number,
    summedOrganicTraffic: number,
  ): void {
    const checkpoint = CHECKPOINTS[file.fileName];
    const rowCount = mapped.rows.length;
    const matches =
      checkpoint === undefined ||
      (rowCount === checkpoint.rows &&
        summedVolume === checkpoint.volume &&
        summedOrganicTraffic === checkpoint.organicTraffic);

    fileSummaries.push({
      fileName: file.fileName,
      sha256: file.sha256,
      byteSize: file.byteSize,
      encoding: parsed.hadBom ? "UTF-8 with BOM" : "UTF-8",
      delimiter: parsed.delimiter,
      hadBom: parsed.hadBom,
      headers: parsed.headers,
      missingColumns: mapped.missingColumns,
      unmappedHeaders: mapped.unmappedHeaders,
      rowCount,
      summedVolume,
      summedOrganicTraffic,
      expectedRowCount: checkpoint?.rows ?? null,
      expectedVolume: checkpoint?.volume ?? null,
      expectedOrganicTraffic: checkpoint?.organicTraffic ?? null,
      checkpointMatches: matches,
      checkpointNotes: checkpoint
        ? matches
          ? "Recomputed row count and metric sums match the specification checkpoint exactly."
          : "Recomputed values differ from the specification checkpoint. Investigate before relying on this export."
        : "No checkpoint recorded for this file.",
    });
  }

  // Route keyword counts feed the internal-link-support score component, so
  // scoring runs as a second pass once every row has a route.
  const routeCounts = new Map<string, number>();
  for (const record of staged) {
    if (record.targetRoute && record.status === "included") {
      routeCounts.set(record.targetRoute, (routeCounts.get(record.targetRoute) ?? 0) + 1);
    }
  }

  const coreToolRoutes = new Set<string>([
    ROUTES.home,
    ROUTES.robuxToUsd,
    ROUTES.usdToRobux,
    ROUTES.robuxTaxCalculator,
  ]);

  const records: KeywordRecord[] = staged.map((record) => {
    const score: ScoreResult = scoreKeyword({
      classification:
        record.status === "duplicate-variant"
          ? { ...record.classification, status: "duplicate-variant" }
          : record.classification,
      volume: record.volume,
      organicTraffic: record.organicTraffic,
      averagePosition: record.averagePosition,
      amount: record.amountRobux,
      routeKeywordCount: record.targetRoute ? (routeCounts.get(record.targetRoute) ?? 0) : 0,
      routeIsCoreTool: record.targetRoute ? coreToolRoutes.has(record.targetRoute) : false,
    });

    const { classification: _classification, ...rest } = record;
    return {
      ...rest,
      priority: record.status === "duplicate-variant" ? "P3" : score.priorityBand,
      strategicPriorityScore: score.strategicPriorityScore,
      quickWinScore: score.quickWinScore,
    };
  });

  return {
    generatedAt,
    files: fileSummaries,
    records,
    accounting: buildAccounting(records),
  };
}

function buildAccounting(records: readonly KeywordRecord[]): AccountingSummary {
  const byStatus: Record<KeywordStatus, number> = {
    included: 0,
    excluded: 0,
    "ambiguous-review": 0,
    "duplicate-variant": 0,
  };
  for (const record of records) byStatus[record.status] += 1;

  const total = records.length;
  const summed = Object.values(byStatus).reduce((a, b) => a + b, 0);

  return {
    totalSourceRows: total,
    byStatus,
    reconciles: summed === total,
    uniqueComparisonKeys: new Set(records.map((r) => r.comparisonKey)).size,
    duplicateVariantRows: byStatus["duplicate-variant"],
  };
}

// ---------------------------------------------------------------------------
// Clustering
// ---------------------------------------------------------------------------

export interface Cluster {
  readonly id: string;
  readonly label: string;
  readonly parentTopic: string;
  readonly primaryKeyword: string;
  readonly secondaryVariants: readonly string[];
  readonly searchIntent: PrimaryIntent;
  readonly userTask: string;
  readonly uniqueKeywordCount: number;
  /** Sum of volume over unique normalised keywords only. */
  readonly nonOverlappingVolume: number;
  /** Sum over every source row, which double counts cross-file duplicates. */
  readonly rawSummedVolume: number;
  readonly rawVolumeWarning: string;
  readonly organicTrafficEvidence: number;
  readonly topLocations: readonly string[];
  readonly recommendedRoute: string;
  readonly distinctValueRationale: string;
  readonly cannibalizationRisks: readonly string[];
  readonly contentRequirements: readonly string[];
  readonly publicationPriority: PriorityBand;
  readonly reviewState: "auto-approved" | "needs-review";
}

const CLUSTER_TASKS: Readonly<Record<PrimaryIntent, string>> = {
  "core-devex-calculator": "Convert an eligible Earned Robux balance into an estimated USD DevEx payout.",
  "devex-rate": "Find the current DevEx rate and what it pays per 1,000 Robux.",
  "devex-rate-history": "Understand how the DevEx rate changed and which balance uses which rate.",
  "us-18-plus-rate": "Understand the conditional United States 18+ rate and who it applies to.",
  "generic-robux-to-usd": "Convert Robux to US dollars and understand why payout and purchase price differ.",
  "reverse-usd-to-robux": "Work out how many Earned Robux a target payout requires.",
  "numeric-amount-conversion": "See what one specific Robux amount is worth.",
  "local-currency-conversion": "See an estimated payout in a currency other than USD.",
  "earned-robux-definition": "Find out which Robux count as Earned Robux.",
  "devex-eligibility": "Check the minimum and the requirements for a DevEx request.",
  "cash-out-process": "Learn the steps for converting Robux into real money.",
  "fees-payment": "Understand fees taken after the DevEx conversion.",
  taxes: "Understand the tax implications of a DevEx payout.",
  "marketplace-tax": "Work out the Roblox marketplace fee on a sale.",
  "calculator-comparison": "Compare available calculators.",
  "brand-navigational": "Reach a specific brand.",
  "informational-definition": "Understand what DevEx is.",
  troubleshooting: "Resolve a problem with a DevEx request.",
  "off-topic": "Out of scope.",
  "ambiguous-review": "Undetermined.",
};

const CLUSTER_LABELS: Readonly<Record<PrimaryIntent, string>> = {
  "core-devex-calculator": "DevEx calculator",
  "devex-rate": "DevEx rates",
  "devex-rate-history": "DevEx rate history",
  "us-18-plus-rate": "Conditional U.S. 18+ rate",
  "generic-robux-to-usd": "Robux to USD",
  "reverse-usd-to-robux": "USD to Robux and payout goals",
  "numeric-amount-conversion": "Specific amount conversions",
  "local-currency-conversion": "Local-currency conversions",
  "earned-robux-definition": "Earned Robux",
  "devex-eligibility": "DevEx requirements",
  "cash-out-process": "Cashing out Robux",
  "fees-payment": "DevEx fees",
  taxes: "DevEx taxes",
  "marketplace-tax": "Roblox marketplace fee",
  "calculator-comparison": "Calculator comparison",
  "brand-navigational": "Brand navigation",
  "informational-definition": "What DevEx is",
  troubleshooting: "Troubleshooting",
  "off-topic": "Off topic",
  "ambiguous-review": "Needs review",
};

const CLUSTER_PARENTS: Readonly<Record<PrimaryIntent, string>> = {
  "core-devex-calculator": "DevEx Calculator",
  "informational-definition": "DevEx Calculator",
  "devex-rate": "DevEx Rates",
  "devex-rate-history": "DevEx Rates",
  "us-18-plus-rate": "DevEx Rates",
  "generic-robux-to-usd": "Robux to USD",
  "numeric-amount-conversion": "Robux to USD",
  "local-currency-conversion": "Robux to USD",
  "reverse-usd-to-robux": "Robux to USD",
  "earned-robux-definition": "Eligibility and Process",
  "devex-eligibility": "Eligibility and Process",
  "cash-out-process": "Eligibility and Process",
  "fees-payment": "Eligibility and Process",
  taxes: "Eligibility and Process",
  "marketplace-tax": "Creator Finance Calculators",
  "calculator-comparison": "Creator Finance Calculators",
  "brand-navigational": "Excluded",
  troubleshooting: "Excluded",
  "off-topic": "Excluded",
  "ambiguous-review": "Review",
};

/** Groups included keywords into auditable, rule-derived clusters. */
export function buildClusters(
  records: readonly KeywordRecord[],
  overrides: Overrides = EMPTY_OVERRIDES,
): Cluster[] {
  const groups = new Map<PrimaryIntent, KeywordRecord[]>();
  for (const record of records) {
    if (record.status !== "included") continue;
    const list = groups.get(record.primaryIntent) ?? [];
    list.push(record);
    groups.set(record.primaryIntent, list);
  }

  const clusters: Cluster[] = [];

  for (const [intent, members] of groups) {
    const sorted = [...members].sort((a, b) => b.volume - a.volume || b.organicTraffic - a.organicTraffic);
    const primary = sorted[0];
    if (!primary) continue;

    // Non-overlapping volume counts each normalised keyword once.
    const seen = new Set<string>();
    let nonOverlappingVolume = 0;
    for (const member of sorted) {
      if (seen.has(member.comparisonKey)) continue;
      seen.add(member.comparisonKey);
      nonOverlappingVolume += member.volume;
    }

    const locationCounts = new Map<string, number>();
    for (const member of sorted) {
      if (!member.topLocation) continue;
      locationCounts.set(member.topLocation, (locationCounts.get(member.topLocation) ?? 0) + 1);
    }

    const id = `cluster-${intent}`;
    const override = overrides.clusterOverrides[id];

    clusters.push({
      id,
      label: override?.label ?? CLUSTER_LABELS[intent],
      parentTopic: override?.parentTopic ?? CLUSTER_PARENTS[intent],
      primaryKeyword: primary.keywordNormalized,
      secondaryVariants: sorted.slice(1, 30).map((m) => m.keywordNormalized),
      searchIntent: intent,
      userTask: CLUSTER_TASKS[intent],
      uniqueKeywordCount: seen.size,
      nonOverlappingVolume,
      rawSummedVolume: sorted.reduce((sum, m) => sum + m.volume, 0),
      rawVolumeWarning:
        "Raw summed volume adds overlapping variants together and must not be presented as a traffic forecast.",
      organicTrafficEvidence: sorted.reduce((sum, m) => sum + m.organicTraffic, 0),
      topLocations: [...locationCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name]) => name),
      recommendedRoute: primary.targetRoute ?? ROUTES.home,
      distinctValueRationale: CLUSTER_TASKS[intent],
      cannibalizationRisks: cannibalizationRisksFor(intent),
      contentRequirements: contentRequirementsFor(intent),
      publicationPriority: sorted.reduce<PriorityBand>(
        (best, m) => (bandRank(m.priority) < bandRank(best) ? m.priority : best),
        "P3",
      ),
      reviewState: intent === "ambiguous-review" ? "needs-review" : "auto-approved",
    });
  }

  return clusters.sort((a, b) => b.nonOverlappingVolume - a.nonOverlappingVolume);
}

function bandRank(band: PriorityBand): number {
  return { P0: 0, P1: 1, P2: 2, P3: 3, REVIEW: 4, EXCLUDED: 5 }[band];
}

function cannibalizationRisksFor(intent: PrimaryIntent): string[] {
  switch (intent) {
    case "generic-robux-to-usd":
      return [
        "Overlaps the homepage unless the page leads with the purchase-price versus DevEx-payout distinction.",
      ];
    case "numeric-amount-conversion":
      return [
        "Amount pages duplicate the conversion hub unless each adds rate comparison, reverse tables and its own context.",
      ];
    case "informational-definition":
      return ["Shares the homepage; served as a section rather than a separate route."];
    case "us-18-plus-rate":
      return ["Shares the rates page; served as a section rather than a separate route."];
    case "local-currency-conversion":
      return ["Served by the currency selector, not by a page per currency."];
    default:
      return [];
  }
}

function contentRequirementsFor(intent: PrimaryIntent): string[] {
  const base = ["Source citation with a visible last-verified date", "Estimate disclaimer"];
  switch (intent) {
    case "core-devex-calculator":
      return [...base, "Working calculator above the fold", "Rate comparison", "Threshold meter"];
    case "devex-rate":
      return [...base, "Current rate table with effective dates", "Per-1,000 and per-30,000 examples"];
    case "generic-robux-to-usd":
      return [...base, "Explicit DevEx payout versus purchase price comparison"];
    case "reverse-usd-to-robux":
      return [...base, "Target calculator with round-up logic", "Progress against a current balance"];
    case "numeric-amount-conversion":
      return [...base, "Server-rendered amount table", "Rate comparison columns"];
    case "devex-eligibility":
      return [...base, "Official requirement list", "Explicit warning that the threshold is not approval"];
    case "marketplace-tax":
      return [...base, "After-fee and before-fee modes", "Scope and exclusions"];
    default:
      return base;
  }
}

// ---------------------------------------------------------------------------
// Amount entities and the publish gate
// ---------------------------------------------------------------------------

export interface AmountEntity {
  readonly entityId: string;
  readonly amount: number;
  readonly display: string;
  readonly slug: string;
  readonly route: string;
  /** Every raw keyword that maps to this one amount. */
  readonly variants: readonly string[];
  readonly totalVolume: number;
  readonly totalOrganicTraffic: number;
  readonly publicationStatus: "approved" | "review" | "excluded";
  readonly gateResults: Readonly<Record<string, boolean>>;
  readonly rationale: string;
}

/** Amounts allowed a standalone route at launch, kept deliberately small. */
export const MAX_LAUNCH_AMOUNT_PAGES = 12;

/**
 * Decides which amounts earn a standalone indexable page.
 *
 * The specification permits a standalone amount page only when it clears every
 * gate, and caps the launch set. Everything else maps to the conversion hub or
 * to calculator query state, which is what keeps this from becoming a doorway
 * page farm.
 */
export function buildAmountEntities(
  records: readonly KeywordRecord[],
  overrides: Overrides = EMPTY_OVERRIDES,
): AmountEntity[] {
  const grouped = new Map<string, KeywordRecord[]>();
  for (const record of records) {
    if (record.amountEntityId === null) continue;
    if (record.status === "excluded") continue;
    const list = grouped.get(record.amountEntityId) ?? [];
    list.push(record);
    grouped.set(record.amountEntityId, list);
  }

  const entities: AmountEntity[] = [];

  for (const [entityId, members] of grouped) {
    const amount = members[0]?.amountRobux;
    if (amount === undefined || amount === null) continue;

    // Volume is counted once per unique normalised keyword.
    const seen = new Set<string>();
    let totalVolume = 0;
    let totalOrganicTraffic = 0;
    for (const member of members) {
      if (seen.has(member.comparisonKey)) continue;
      seen.add(member.comparisonKey);
      totalVolume += member.volume;
      totalOrganicTraffic += member.organicTraffic;
    }

    const gateResults = {
      meaningfulDemand: totalVolume >= 300,
      distinctIntent: seen.size >= 2,
      // A round amount reads as a real query rather than a scraped long tail.
      isRoundAmount: isRoundAmount(amount),
      // Below the minimum an amount cannot be cashed out at all, so a page
      // about it would mislead more than it helps.
      atOrAboveMinimum: amount >= 30_000,
      withinSafeRange: amount <= 100_000_000,
    };

    const passesAll = Object.values(gateResults).every(Boolean);

    entities.push({
      entityId,
      amount,
      display: formatAmountDisplay(amount),
      slug: amountSlug(amount),
      route: `${ROUTES.conversions}${amountSlug(amount)}/`,
      variants: [...new Set(members.map((m) => m.keywordRaw))].sort(),
      totalVolume,
      totalOrganicTraffic,
      publicationStatus: passesAll ? "approved" : "review",
      gateResults,
      rationale: passesAll
        ? "Clears every publication gate: demonstrated demand, several distinct query variants, a round amount at or above the DevEx minimum."
        : failureRationale(gateResults),
    });
  }

  // Rank by demand, then apply manual overrides and the launch cap.
  entities.sort((a, b) => b.totalVolume - a.totalVolume || b.amount - a.amount);

  let approvedCount = 0;
  return entities.map((entity) => {
    const override = overrides.publicationOverrides[entity.entityId];
    const status = override ?? entity.publicationStatus;

    if (status === "approved") {
      if (approvedCount >= MAX_LAUNCH_AMOUNT_PAGES) {
        return {
          ...entity,
          publicationStatus: "review",
          rationale: `Clears the quality gates but falls outside the launch cap of ${MAX_LAUNCH_AMOUNT_PAGES} amount pages. Queued for reassessment against real Search Console data.`,
        };
      }
      approvedCount += 1;
    }

    return {
      ...entity,
      publicationStatus: status,
      rationale:
        override === undefined
          ? entity.rationale
          : `Manual publication override applied: ${override}.`,
    };
  });
}

function isRoundAmount(amount: number): boolean {
  if (amount >= 1_000_000) return amount % 1_000_000 === 0;
  if (amount >= 100_000) return amount % 50_000 === 0;
  if (amount >= 10_000) return amount % 10_000 === 0;
  return amount % 1_000 === 0;
}

function failureRationale(gates: Readonly<Record<string, boolean>>): string {
  const failed: string[] = [];
  if (!gates.meaningfulDemand) failed.push("demand below the standalone-page threshold");
  if (!gates.distinctIntent) failed.push("too few distinct query variants");
  if (!gates.isRoundAmount) failed.push("not a round amount that reads as a real query");
  if (!gates.atOrAboveMinimum) failed.push("below the 30,000 Earned Robux DevEx minimum");
  if (!gates.withinSafeRange) failed.push("outside the safe display range");
  return `Held at review: ${failed.join(", ")}. Served by the conversion hub and calculator query state instead.`;
}
