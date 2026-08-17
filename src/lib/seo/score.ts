import type { Classification, PrimaryIntent } from "./classify";

/**
 * Transparent, reproducible opportunity scoring.
 *
 * Two separate scores are kept apart on purpose. Strategic priority answers
 * "how much does this matter to the site's topical authority"; quick-win
 * answers "how cheaply can we serve it well". A keyword can score high on one
 * and low on the other, and collapsing them into a single number would hide
 * exactly the trade-off a content decision needs.
 *
 * Every component is a 0–1 sub-score with a published weight, so any total can
 * be recomputed by hand from the record.
 */

export interface ScoreInput {
  readonly classification: Classification;
  readonly volume: number;
  readonly organicTraffic: number;
  readonly averagePosition: number;
  readonly amount: number | null;
  /** How many distinct keywords share this keyword's route. */
  readonly routeKeywordCount: number;
  /** Whether the owning route is a launch-critical tool page. */
  readonly routeIsCoreTool: boolean;
}

export interface ScoreComponent {
  readonly name: string;
  readonly weight: number;
  readonly value: number;
}

export interface PenaltyApplied {
  readonly code: PenaltyCode;
  readonly amount: number;
  readonly reason: string;
}

export type PenaltyCode =
  | "ambiguous-intent"
  | "thin-page-risk"
  | "near-duplicate-route-concept"
  | "trademark-legal-risk"
  | "unverifiable-facts"
  | "no-functional-differentiation"
  | "weak-source-support"
  | "high-maintenance-burden"
  | "local-currency-unavailable";

export type PriorityBand = "P0" | "P1" | "P2" | "P3" | "REVIEW" | "EXCLUDED";

export interface ScoreResult {
  readonly strategicPriorityScore: number;
  readonly quickWinScore: number;
  readonly strategicComponents: readonly ScoreComponent[];
  readonly quickWinComponents: readonly ScoreComponent[];
  readonly penalties: readonly PenaltyApplied[];
  readonly priorityBand: PriorityBand;
}

/** Log-scaled demand so one huge head term does not flatten everything else. */
function demandScore(volume: number): number {
  if (volume <= 0) return 0;
  // 16,470 is the largest volume in the supplied exports and maps to ~1.0.
  return Math.min(1, Math.log10(volume + 1) / Math.log10(20_000));
}

function trafficEvidenceScore(organicTraffic: number): number {
  if (organicTraffic <= 0) return 0;
  return Math.min(1, Math.log10(organicTraffic + 1) / Math.log10(4_000));
}

/**
 * Competitor opportunity. A competitor already ranking at position 1 for a
 * term proves demand is winnable but means the term is contested; a weaker
 * average position is a larger opening.
 */
function competitorOpportunityScore(averagePosition: number): number {
  if (averagePosition <= 0) return 0.5;
  if (averagePosition <= 1) return 0.55;
  if (averagePosition <= 2) return 0.75;
  if (averagePosition <= 3) return 0.9;
  return 1;
}

const INTENT_RELEVANCE: Readonly<Record<PrimaryIntent, number>> = {
  "core-devex-calculator": 1,
  "devex-rate": 0.95,
  "earned-robux-definition": 0.9,
  "devex-eligibility": 0.9,
  "generic-robux-to-usd": 0.85,
  "reverse-usd-to-robux": 0.8,
  "devex-rate-history": 0.75,
  "us-18-plus-rate": 0.75,
  "cash-out-process": 0.75,
  "numeric-amount-conversion": 0.7,
  "marketplace-tax": 0.65,
  "fees-payment": 0.6,
  taxes: 0.55,
  "local-currency-conversion": 0.5,
  "informational-definition": 0.5,
  "calculator-comparison": 0.3,
  troubleshooting: 0.3,
  "brand-navigational": 0,
  "off-topic": 0,
  "ambiguous-review": 0.1,
};

const INTENT_TASK_VALUE: Readonly<Record<PrimaryIntent, number>> = {
  "core-devex-calculator": 1,
  "reverse-usd-to-robux": 0.9,
  "generic-robux-to-usd": 0.9,
  "devex-rate": 0.85,
  "numeric-amount-conversion": 0.8,
  "marketplace-tax": 0.8,
  "devex-eligibility": 0.7,
  "earned-robux-definition": 0.65,
  "cash-out-process": 0.6,
  "local-currency-conversion": 0.6,
  "devex-rate-history": 0.5,
  "us-18-plus-rate": 0.5,
  "fees-payment": 0.5,
  taxes: 0.4,
  "informational-definition": 0.4,
  "calculator-comparison": 0.2,
  troubleshooting: 0.2,
  "brand-navigational": 0,
  "off-topic": 0,
  "ambiguous-review": 0.1,
};

export function scoreKeyword(input: ScoreInput): ScoreResult {
  const { classification, volume, organicTraffic, averagePosition, amount } = input;
  const intent = classification.primaryIntent;

  if (classification.status === "excluded") {
    return {
      strategicPriorityScore: 0,
      quickWinScore: 0,
      strategicComponents: [],
      quickWinComponents: [],
      penalties: [],
      priorityBand: "EXCLUDED",
    };
  }

  const demand = demandScore(volume);
  const relevance = INTENT_RELEVANCE[intent];
  const taskValue = INTENT_TASK_VALUE[intent];
  const distinctIntent = classification.confidence;
  const competitorOpportunity = competitorOpportunityScore(averagePosition);
  const trafficEvidence = trafficEvidenceScore(organicTraffic);
  // A route that already owns many sibling keywords has stronger internal-link
  // support available to it.
  const linkSupport = Math.min(1, input.routeKeywordCount / 25);

  const strategicComponents: ScoreComponent[] = [
    { name: "Search demand", weight: 0.2, value: demand },
    { name: "Topical relevance", weight: 0.2, value: relevance },
    { name: "Product/task value", weight: 0.2, value: taskValue },
    { name: "Distinct intent", weight: 0.15, value: distinctIntent },
    { name: "Competitor weakness/opportunity", weight: 0.1, value: competitorOpportunity },
    { name: "Proven traffic evidence", weight: 0.1, value: trafficEvidence },
    { name: "Internal-link support", weight: 0.05, value: linkSupport },
  ];

  // Every launch route starts from zero coverage, so the site-gap component is
  // uniformly high; it will fall as pages ship and is recomputed each run.
  const siteGap = 1;
  const effortInverse = amount !== null ? 0.9 : input.routeIsCoreTool ? 0.5 : 0.7;
  const cannibalisationSafety = amount !== null ? 0.5 : distinctIntent;
  const originalUtility = taskValue;

  const quickWinComponents: ScoreComponent[] = [
    { name: "Demand", weight: 0.2, value: demand },
    { name: "Competitor position/opportunity", weight: 0.2, value: competitorOpportunity },
    { name: "Current site gap", weight: 0.2, value: siteGap },
    { name: "Implementation effort (inverse)", weight: 0.15, value: effortInverse },
    { name: "Low cannibalisation risk", weight: 0.1, value: cannibalisationSafety },
    { name: "Original utility potential", weight: 0.1, value: originalUtility },
    { name: "Internal-link readiness", weight: 0.05, value: linkSupport },
  ];

  const penalties = collectPenalties(input);
  const penaltyTotal = penalties.reduce((sum, p) => sum + p.amount, 0);

  const strategicRaw = weightedSum(strategicComponents);
  const quickWinRaw = weightedSum(quickWinComponents);

  const strategicPriorityScore = round(clamp(strategicRaw - penaltyTotal) * 100);
  const quickWinScore = round(clamp(quickWinRaw - penaltyTotal) * 100);

  return {
    strategicPriorityScore,
    quickWinScore,
    strategicComponents,
    quickWinComponents,
    penalties,
    priorityBand: band(classification, strategicPriorityScore, input),
  };
}

function collectPenalties(input: ScoreInput): PenaltyApplied[] {
  const penalties: PenaltyApplied[] = [];
  const { classification, amount, volume } = input;

  if (classification.confidence < 0.6) {
    penalties.push({
      code: "ambiguous-intent",
      amount: 0.15,
      reason: "The search task cannot be determined confidently from the query alone.",
    });
  }

  if (amount !== null && volume < 100) {
    penalties.push({
      code: "thin-page-risk",
      amount: 0.2,
      reason: "A standalone page for this amount would substitute one number into a template.",
    });
  }

  if (amount !== null) {
    penalties.push({
      code: "near-duplicate-route-concept",
      amount: 0.1,
      reason: "Amount pages closely resemble the conversion hub unless they add distinct utility.",
    });
  }

  if (classification.primaryIntent === "brand-navigational") {
    penalties.push({
      code: "trademark-legal-risk",
      amount: 1,
      reason: "Targeting a competitor's brand name is out of scope.",
    });
  }

  if (classification.primaryIntent === "local-currency-conversion") {
    penalties.push({
      code: "local-currency-unavailable",
      amount: 0.1,
      reason:
        "Local-currency values are reference rates that depend on an external provider and cannot be stated as guaranteed payouts.",
    });
  }

  if (classification.primaryIntent === "taxes") {
    penalties.push({
      code: "high-maintenance-burden",
      amount: 0.15,
      reason: "Country tax guidance needs qualified review and ongoing maintenance.",
    });
  }

  if (classification.primaryIntent === "calculator-comparison") {
    penalties.push({
      code: "no-functional-differentiation",
      amount: 0.2,
      reason: "Comparison intent risks a page that reviews competitors rather than solving a task.",
    });
  }

  return penalties;
}

function band(
  classification: Classification,
  strategicScore: number,
  input: ScoreInput,
): PriorityBand {
  if (classification.status === "excluded") return "EXCLUDED";
  if (classification.status === "ambiguous-review") return "REVIEW";

  // Core tool, rate and eligibility routes must exist before launch regardless
  // of the score any individual keyword produces.
  const p0Intents: readonly PrimaryIntent[] = [
    "core-devex-calculator",
    "devex-rate",
    "generic-robux-to-usd",
    "devex-eligibility",
  ];
  if (p0Intents.includes(classification.primaryIntent)) return "P0";

  const p1Intents: readonly PrimaryIntent[] = [
    "reverse-usd-to-robux",
    "earned-robux-definition",
    "numeric-amount-conversion",
    "marketplace-tax",
    "cash-out-process",
    "devex-rate-history",
    "us-18-plus-rate",
  ];
  if (p1Intents.includes(classification.primaryIntent)) {
    return strategicScore >= 45 ? "P1" : "P2";
  }

  if (input.routeIsCoreTool) return "P2";
  if (strategicScore >= 35) return "P2";
  return "P3";
}

function weightedSum(components: readonly ScoreComponent[]): number {
  return components.reduce((sum, c) => sum + c.weight * c.value, 0);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
