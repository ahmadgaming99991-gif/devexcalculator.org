import { routeRegistry } from "@/lib/content/route-registry";
import type { KeywordRecord } from "./pipeline";

/**
 * Derived graphs: entities, questions and internal links.
 *
 * The internal-link graph is derived from the content manifest rather than
 * declared separately, so a link that exists in the manifest and a link that
 * exists on the page cannot drift apart: `ContextualLinks` and the JSON-LD
 * both render from `record.internalLinks`, which is the same array this reads.
 *
 * That derivation is the whole guarantee. This used to add "the validator
 * checks the rendered pages against this graph", which no validator does —
 * `check-links.ts` crawls the rendered pages and reports broken links,
 * redirects and nofollow, and never compares an href to this graph. The
 * sentence described a check that would be worth having as though it existed,
 * which is worse than not having it.
 */

export interface EntityNode {
  readonly entity: string;
  readonly aliases: readonly string[];
  readonly routes: readonly string[];
  readonly sourceIds: readonly string[];
  readonly keywordCount: number;
  readonly relationship: string;
}

const ENTITY_DEFINITIONS: ReadonlyArray<{
  entity: string;
  aliases: readonly string[];
  sourceIds: readonly string[];
  relationship: string;
}> = [
  {
    entity: "Roblox Corporation",
    aliases: ["Roblox"],
    sourceIds: ["roblox-devex-program"],
    relationship: "Operates the Roblox platform and the Developer Exchange programme. Not affiliated with this site.",
  },
  {
    entity: "Developer Exchange Program",
    aliases: ["DevEx", "dev ex", "dev x", "devx", "developer exchange", "dev exchange"],
    sourceIds: ["roblox-devex-program"],
    relationship: "The official Roblox programme that converts eligible Earned Robux into currency.",
  },
  {
    entity: "Robux",
    aliases: ["robux", "rbx", "robucks"],
    sourceIds: ["roblox-devex-program"],
    relationship: "The Roblox virtual currency. Only the earned portion of a balance is eligible for DevEx.",
  },
  {
    entity: "Earned Robux",
    aliases: ["earned robux", "qualifying robux"],
    sourceIds: ["roblox-devex-program", "roblox-monetization-overview"],
    relationship: "Robux accumulated through creator activity, and the only category DevEx converts.",
  },
  {
    entity: "Roblox Creator Hub",
    aliases: ["create.roblox.com", "creator hub"],
    sourceIds: ["roblox-devex-program"],
    relationship: "Publishes the official DevEx documentation this site cites.",
  },
  {
    entity: "DevEx portal",
    aliases: ["devex portal"],
    sourceIds: ["roblox-devex-program"],
    relationship: "Where a DevEx request is submitted. A valid portal account is a documented requirement.",
  },
  {
    entity: "standard rate",
    aliases: ["current devex rate", "0.0038"],
    sourceIds: ["roblox-devex-program"],
    relationship: "0.0038 USD per eligible Earned Robux, effective 5 September 2025 at 10:00 PT.",
  },
  {
    entity: "legacy rate",
    aliases: ["old devex rate", "0.0035"],
    sourceIds: ["roblox-devex-program"],
    relationship: "0.0035 USD per Earned Robux, applied to balances earned before the September 2025 transition.",
  },
  {
    entity: "U.S. 18+ rate",
    aliases: ["us 18 plus rate", "0.0054"],
    sourceIds: ["roblox-devex-program"],
    relationship: "0.0054 USD per Robux for certain Earned Robux from verified United States players aged 18 or over.",
  },
  {
    entity: "USD",
    aliases: ["us dollars", "dollars", "$"],
    sourceIds: ["roblox-devex-program"],
    relationship: "The currency the DevEx rate is denominated in and the base of every calculation here.",
  },
  {
    entity: "European Central Bank",
    aliases: ["ecb"],
    sourceIds: ["ecb-exchange-rates"],
    relationship: "Publishes the euro reference rates used to derive local-currency estimates.",
  },
  {
    entity: "Marketplace fee",
    aliases: ["roblox tax", "platform commission", "revenue share"],
    sourceIds: ["roblox-marketplace-fees", "roblox-monetization-overview"],
    relationship: "The commission Roblox retains when Robux are spent, applied before DevEx and never twice.",
  },
  {
    entity: "identity verification",
    aliases: ["age verification"],
    sourceIds: ["roblox-devex-program"],
    relationship: "Part of the DevEx eligibility requirements and of the U.S. 18+ rate conditions.",
  },
  {
    entity: "tax information",
    aliases: ["w-9", "w-8"],
    sourceIds: ["roblox-devex-program"],
    relationship: "An IRS form W-9 or W-8 must be on file before a DevEx request can proceed.",
  },
];

export function buildEntityMap(records: readonly KeywordRecord[]) {
  const counts = new Map<string, number>();
  for (const record of records) {
    if (record.status !== "included") continue;
    for (const entity of record.entities) {
      counts.set(entity, (counts.get(entity) ?? 0) + 1);
    }
  }

  const nodes: EntityNode[] = ENTITY_DEFINITIONS.map((definition) => ({
    entity: definition.entity,
    aliases: definition.aliases,
    sourceIds: definition.sourceIds,
    keywordCount: counts.get(definition.entity) ?? 0,
    routes: routeRegistry
      .filter((route) =>
        route.entities.some(
          (e) =>
            e === definition.entity ||
            definition.aliases.some((alias) => alias.toLowerCase() === e.toLowerCase()),
        ),
      )
      .map((route) => route.route),
    relationship: definition.relationship,
  }));

  return { entities: nodes };
}

// ---------------------------------------------------------------------------
// Question map
// ---------------------------------------------------------------------------

export interface PaaEntry {
  readonly question: string;
  readonly canonicalRoute: string;
  readonly section: string;
  readonly answeredOnPage: boolean;
  readonly sourceIds: readonly string[];
  readonly updateSensitivity: "high" | "medium" | "low";
}

/**
 * Questions mapped to exactly one canonical route and section.
 *
 * Sourced from the FAQ blocks already published in the content manifest plus
 * the question-form queries in the supplied keyword data, so nothing here is
 * a question the site does not actually answer.
 */
export function buildPaaMap(records: readonly KeywordRecord[]) {
  const fromManifest: PaaEntry[] = routeRegistry.flatMap((route) =>
    route.faqs.map((faq) => ({
      question: faq.question,
      canonicalRoute: route.route,
      section: "faqs",
      answeredOnPage: true,
      sourceIds: faq.sourceIds ?? [],
      updateSensitivity: route.rateSensitive ? ("high" as const) : ("low" as const),
    })),
  );

  // Question-form queries from the exports, mapped to the route that owns them.
  const fromData = records
    .filter(
      (record) =>
        record.status === "included" &&
        record.targetRoute !== null &&
        /^(how|what|why|when|who|does|do|can|is|are)\b/.test(record.comparisonKey),
    )
    .map<PaaEntry>((record) => ({
      question: record.keywordNormalized,
      canonicalRoute: record.targetRoute as string,
      section: record.targetSection ?? "content",
      answeredOnPage: false,
      sourceIds: [],
      updateSensitivity: "medium" as const,
    }));

  // One canonical owner per question.
  const seen = new Set<string>();
  const questions: PaaEntry[] = [];
  for (const entry of [...fromManifest, ...fromData]) {
    const key = entry.question.toLowerCase().replace(/[?]/g, "").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    questions.push(entry);
  }

  return {
    total: questions.length,
    answeredOnPage: questions.filter((q) => q.answeredOnPage).length,
    questions,
  };
}

// ---------------------------------------------------------------------------
// Internal-link graph
// ---------------------------------------------------------------------------

export interface LinkEdge {
  readonly from: string;
  readonly to: string;
  readonly anchor: string;
  readonly relationship: string;
}

export function buildInternalLinkMap() {
  const edges: LinkEdge[] = [];
  const knownRoutes = new Set(routeRegistry.map((r) => r.route));

  for (const route of routeRegistry) {
    for (const link of route.internalLinks) {
      edges.push({
        from: route.route,
        to: link.route,
        anchor: link.anchor,
        relationship: link.relationship,
      });
    }
  }

  const inbound = new Map<string, number>();
  for (const edge of edges) {
    inbound.set(edge.to, (inbound.get(edge.to) ?? 0) + 1);
  }

  const orphans = routeRegistry
    .filter((route) => route.indexation === "index" && route.route !== "/")
    .filter((route) => (inbound.get(route.route) ?? 0) === 0)
    .map((route) => route.route);

  const brokenTargets = edges.filter((edge) => !knownRoutes.has(edge.to)).map((e) => e.to);

  // Repeated identical anchor text pointing at one destination reads as an
  // exact-match link block rather than natural contextual linking.
  const anchorCounts = new Map<string, number>();
  for (const edge of edges) {
    const key = `${edge.to}::${edge.anchor.toLowerCase()}`;
    anchorCounts.set(key, (anchorCounts.get(key) ?? 0) + 1);
  }
  const overusedAnchors = [...anchorCounts.entries()]
    .filter(([, count]) => count > 3)
    .map(([key, count]) => ({ key, count }));

  return {
    edgeCount: edges.length,
    nodeCount: routeRegistry.length,
    orphans,
    brokenTargets: [...new Set(brokenTargets)],
    overusedAnchors,
    inboundCounts: Object.fromEntries(
      routeRegistry.map((route) => [route.route, inbound.get(route.route) ?? 0]),
    ),
    edges,
  };
}
