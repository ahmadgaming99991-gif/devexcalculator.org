import { indexableRoutes, routeRegistry } from "@/lib/content/route-registry";
import { approvedAmountValues } from "@/lib/content/amount-pages";
import type { AmountEntity, KeywordRecord } from "./pipeline";

/**
 * Cannibalisation detection and the publish queue.
 *
 * These are the gates between "a keyword exists" and "a URL is in the
 * sitemap". Both return structured findings rather than throwing, so the
 * validator script can print all problems at once instead of stopping at the
 * first.
 */

export interface CannibalizationFinding {
  readonly code:
    | "multiple-canonical-owners"
    | "duplicate-title"
    | "duplicate-description"
    | "duplicate-h1"
    | "identical-keyword-sets"
    | "amount-page-not-approved"
    | "query-state-self-canonical";
  readonly severity: "error" | "warning";
  readonly detail: string;
  readonly routes: readonly string[];
}

export function buildCannibalizationMap(
  records: readonly KeywordRecord[],
  amounts: readonly AmountEntity[],
) {
  const findings: CannibalizationFinding[] = [];

  // One canonical owner per keyword.
  const owners = new Map<string, Set<string>>();
  for (const record of records) {
    if (record.status !== "included" || !record.canonicalOwner || !record.targetRoute) continue;
    const set = owners.get(record.comparisonKey) ?? new Set<string>();
    set.add(record.targetRoute);
    owners.set(record.comparisonKey, set);
  }
  for (const [keyword, routes] of owners) {
    if (routes.size > 1) {
      findings.push({
        code: "multiple-canonical-owners",
        severity: "error",
        detail: `"${keyword}" is claimed as canonical by more than one route.`,
        routes: [...routes],
      });
    }
  }

  // Duplicate metadata across indexable routes.
  findings.push(...duplicateField("title", (r) => r.title));
  findings.push(...duplicateField("description", (r) => r.metaDescription));
  findings.push(...duplicateField("h1", (r) => r.h1));

  // Near-identical target keyword sets between two indexable routes.
  for (let i = 0; i < indexableRoutes.length; i += 1) {
    for (let j = i + 1; j < indexableRoutes.length; j += 1) {
      const a = indexableRoutes[i];
      const b = indexableRoutes[j];
      if (!a || !b) continue;
      const setA = new Set([a.primaryKeyword, ...a.secondaryKeywords].map((k) => k.toLowerCase()));
      const setB = new Set([b.primaryKeyword, ...b.secondaryKeywords].map((k) => k.toLowerCase()));
      if (setA.size === 0 || setB.size === 0) continue;
      const overlap = [...setA].filter((k) => setB.has(k)).length;
      const ratio = overlap / Math.min(setA.size, setB.size);
      if (ratio >= 0.6) {
        findings.push({
          code: "identical-keyword-sets",
          severity: "error",
          detail: `${Math.round(ratio * 100)}% of the smaller keyword set is shared between these routes.`,
          routes: [a.route, b.route],
        });
      }
    }
  }

  // Every published amount route must be an approved amount.
  for (const route of indexableRoutes) {
    if (route.pageType !== "conversion-amount") continue;
    const match = route.route.match(/\/conversions\/(\d+)-robux-to-usd\/$/);
    const amount = match?.[1] ? Number(match[1]) : null;
    if (amount === null || !approvedAmountValues.includes(amount)) {
      findings.push({
        code: "amount-page-not-approved",
        severity: "error",
        detail: `Indexable amount page for an amount that is not in the approved publication list.`,
        routes: [route.route],
      });
    }
  }

  // No route may carry a query string in its canonical.
  for (const route of routeRegistry) {
    if (route.route.includes("?")) {
      findings.push({
        code: "query-state-self-canonical",
        severity: "error",
        detail: "A calculator query state must canonicalise to its clean owning route, not to itself.",
        routes: [route.route],
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    errorCount: findings.filter((f) => f.severity === "error").length,
    warningCount: findings.filter((f) => f.severity === "warning").length,
    findings,
    amountsHeldAtReview: amounts
      .filter((a) => a.publicationStatus !== "approved")
      .map((a) => ({ entityId: a.entityId, amount: a.amount, rationale: a.rationale })),
  };
}

function duplicateField(
  label: "title" | "description" | "h1",
  read: (route: (typeof indexableRoutes)[number]) => string,
): CannibalizationFinding[] {
  const groups = new Map<string, string[]>();
  for (const route of indexableRoutes) {
    const value = read(route).trim().toLowerCase();
    const list = groups.get(value) ?? [];
    list.push(route.route);
    groups.set(value, list);
  }
  return [...groups.entries()]
    .filter(([, routes]) => routes.length > 1)
    .map(([value, routes]) => ({
      code:
        label === "title"
          ? ("duplicate-title" as const)
          : label === "description"
            ? ("duplicate-description" as const)
            : ("duplicate-h1" as const),
      severity: "error" as const,
      detail: `Identical ${label}: "${value}"`,
      routes,
    }));
}

// ---------------------------------------------------------------------------
// Publish queue
// ---------------------------------------------------------------------------

export interface PublishQueueEntry {
  readonly route: string;
  readonly pageType: string;
  readonly canonicalOwnerKeywords: readonly string[];
  readonly strategicPriorityScore: number;
  readonly quickWinScore: number;
  readonly uniqueUtilityRequirement: string;
  readonly sourceRequirement: string;
  readonly contentReady: boolean;
  readonly toolReady: boolean;
  readonly internalLinksReady: boolean;
  readonly schemaReady: boolean;
  readonly indexationState: string;
  readonly manualApproval: "approved" | "pending";
  readonly blockers: readonly string[];
  readonly eligibleForSitemap: boolean;
}

const UNIQUE_UTILITY: Readonly<Record<string, string>> = {
  tool: "Provides a working calculator whose output cannot be obtained from another route on this site.",
  "pillar-guide": "Explains one topic in depth with official sources and a verification date.",
  directory: "Organises complete tools or guides with original framing, not a repeat of the navigation.",
  "conversion-hub": "Server-rendered comparison table across all three rates, plus an interactive input.",
  "conversion-amount":
    "Amount-specific context plus full rate comparison and reverse figures, beyond substituting one number.",
  trust: "Documents how the site works so a reader can judge whether to rely on it.",
  legal: "States the actual configured behaviour of the site rather than generic policy text.",
  utility: "Serves a technical purpose and stays out of the index.",
};

export function buildPublishQueue(
  records: readonly KeywordRecord[],
  amounts: readonly AmountEntity[],
) {
  const keywordsByRoute = new Map<string, KeywordRecord[]>();
  for (const record of records) {
    if (record.status !== "included" || !record.targetRoute) continue;
    const list = keywordsByRoute.get(record.targetRoute) ?? [];
    list.push(record);
    keywordsByRoute.set(record.targetRoute, list);
  }

  const approvedAmounts = new Set(
    amounts.filter((a) => a.publicationStatus === "approved").map((a) => a.amount),
  );

  const entries: PublishQueueEntry[] = routeRegistry.map((route) => {
    const keywords = keywordsByRoute.get(route.route) ?? [];
    const blockers: string[] = [];

    const contentReady = route.quickAnswer.length >= 120 && route.sections.length > 0;
    if (!contentReady) blockers.push("Quick answer or section outline incomplete.");

    const toolReady = route.pageType !== "tool" || route.sections.some((s) => s.id.includes("calculator") || s.id.includes("converter") || s.id.includes("target"));
    if (!toolReady) blockers.push("Tool page has no calculator section declared.");

    const internalLinksReady = route.internalLinks.length >= (route.route === "/" ? 5 : 2);
    if (!internalLinksReady) blockers.push("Too few contextual internal links.");

    const schemaReady = route.schemaTypes.length > 0;
    if (!schemaReady) blockers.push("No structured-data types declared.");

    const sourcesReady = !route.rateSensitive || route.sourceIds.length > 0;
    if (!sourcesReady) blockers.push("Rate-sensitive page with no source ids.");

    if (route.pageType === "conversion-amount") {
      const amount = Number(route.route.match(/(\d+)-robux-to-usd/)?.[1] ?? "0");
      if (!approvedAmounts.has(amount)) {
        blockers.push("Amount is not in the approved publication list.");
      }
    }

    const manualApproval: "approved" | "pending" =
      route.status === "published" ? "approved" : "pending";

    return {
      route: route.route,
      pageType: route.pageType,
      canonicalOwnerKeywords: keywords
        .filter((k) => k.canonicalOwner)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 15)
        .map((k) => k.keywordNormalized),
      strategicPriorityScore: Math.max(0, ...keywords.map((k) => k.strategicPriorityScore)),
      quickWinScore: Math.max(0, ...keywords.map((k) => k.quickWinScore)),
      uniqueUtilityRequirement: UNIQUE_UTILITY[route.pageType] ?? "Undefined page type.",
      sourceRequirement: route.rateSensitive
        ? "Must cite an official source and display a last-verified date."
        : "No time-sensitive claims; source citation optional.",
      contentReady,
      toolReady,
      internalLinksReady,
      schemaReady,
      indexationState: route.indexation,
      manualApproval,
      blockers,
      eligibleForSitemap:
        blockers.length === 0 && route.indexation === "index" && route.status === "published",
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    total: entries.length,
    eligibleForSitemap: entries.filter((e) => e.eligibleForSitemap).length,
    blocked: entries.filter((e) => e.blockers.length > 0).length,
    entries,
  };
}
