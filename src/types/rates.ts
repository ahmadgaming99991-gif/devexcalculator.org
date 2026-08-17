/** Shape of `src/data/rates.json`, validated at load time by the rate registry. */

export type RateStatus = "active" | "conditional" | "legacy" | "retired";

export interface RateRecord {
  /** Stable identifier referenced by content, URLs and tests. */
  readonly id: string;
  readonly label: string;
  readonly shortLabel: string;
  /** Exact decimal string. Never a `number` — see src/lib/calculations/rational.ts. */
  readonly usdPerRobux: string;
  readonly usdPerThousandRobux: string;
  readonly effectiveFrom: string | null;
  readonly effectiveTo: string | null;
  readonly status: RateStatus;
  readonly eligibilitySummary: string;
  readonly conditionNote: string | null;
  readonly sourceIds: readonly string[];
  readonly lastVerifiedAt: string;
}

export interface MinimumRecord {
  readonly eligibleEarnedRobux: number;
  readonly sourceIds: readonly string[];
  readonly lastVerifiedAt: string;
  readonly note: string;
}

export interface ProgressiveTier {
  readonly priceFloorMultiple: string;
  readonly creatorSharePercent: string;
}

export interface MarketplaceScheme {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly creatorSharePercent: string;
  readonly platformSharePercent: string;
  readonly experienceOwnerSharePercent?: string;
  readonly progressive: boolean;
  readonly progressiveTiers?: readonly ProgressiveTier[];
  readonly sourceIds: readonly string[];
}

export interface MarketplaceRecord {
  readonly lastVerifiedAt: string;
  readonly sourceIds: readonly string[];
  readonly schemes: readonly MarketplaceScheme[];
}

export interface LimitsRecord {
  readonly maxRobuxInput: number;
  readonly maxUsdTargetInput: number;
  readonly note: string;
}

export interface RateRegistry {
  readonly schemaVersion: number;
  readonly registryVersion: string;
  readonly lastVerifiedAt: string;
  readonly reviewCadenceDays: number;
  readonly criticalReviewAgeDays: number;
  readonly minimum: MinimumRecord;
  readonly rates: readonly RateRecord[];
  readonly marketplace: MarketplaceRecord;
  readonly limits: LimitsRecord;
}

export interface SourceRecord {
  readonly id: string;
  readonly publisher: string;
  readonly title: string;
  readonly url: string;
  readonly factsSupported: readonly string[];
  readonly lastCheckedAt: string;
  readonly effectiveDate: string | null;
  readonly reviewCadenceDays: number;
  readonly evidenceLabel: EvidenceLabel;
}

export interface SourceRegistry {
  readonly schemaVersion: number;
  readonly registryVersion: string;
  readonly lastVerifiedAt: string;
  readonly sources: readonly SourceRecord[];
}

/**
 * Evidence provenance labels required by the master specification.
 * An inference must never be silently promoted to an observed fact.
 */
export type EvidenceLabel =
  | "Observed in repository"
  | "Derived from supplied CSV"
  | "Observed on public competitor page"
  | "Verified through official source"
  | "Reasonable inference"
  | "New implementation decision";
