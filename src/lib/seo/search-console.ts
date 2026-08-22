import { comparisonKey, extractAmount } from "./normalize";
import { indexableRoutes } from "@/lib/content/route-registry";

/**
 * Reading a Search Console export.
 *
 * Search Console is the only source of what people actually type. The
 * publication gate has been waiting on it since launch: sixty-three amount
 * pages are held because the corpus this site was built from is two competitor
 * exports, and a competitor's rankings are not demand.
 *
 * This turns an export into findings. It does not turn findings into pages —
 * every one is a proposal, and the gate in `docs/seo/indexation-policy.md`
 * still decides, because query volume is one of its criteria and not the
 * whole of it.
 *
 * The analysis lives here rather than in the script so it can be tested
 * without a real export, which is the only way to test it at all: real
 * exports are private and are never committed.
 */

export interface QueryRow {
  readonly query: string;
  readonly clicks: number;
  readonly impressions: number;
  /** Click-through rate as a fraction, not a percentage. */
  readonly ctr: number;
  readonly position: number;
}

export interface PageQueryRow extends QueryRow {
  /** Path only, with the origin stripped, so it can be matched to a route. */
  readonly page: string;
}

/**
 * Where an opportunity is worth acting on.
 *
 * Positions 5–20 are the band where a page is already understood to be
 * relevant and is not yet being clicked. Above 5 the work is content quality;
 * below 20 a title rewrite is not what is wrong.
 */
export const OPPORTUNITY_BAND = { from: 5, to: 20 } as const;

/** Below this, a page is being shown and passed over. */
export const LOW_CTR = 0.02;

/** Too few impressions to conclude anything from. */
export const MINIMUM_IMPRESSIONS = 50;

export interface Finding {
  readonly kind:
    | "position-opportunity"
    | "low-ctr"
    | "cannibalisation"
    | "unserved-amount";
  readonly subject: string;
  readonly detail: string;
  /** Impressions behind the finding, so the report can be ordered by weight. */
  readonly impressions: number;
}

/**
 * Queries ranking in the band where a change plausibly moves them.
 *
 * Sorted by impressions rather than by position: a query at 6.1 with forty
 * impressions is not more worth fixing than one at 14 with four thousand.
 */
export function positionOpportunities(rows: readonly QueryRow[]): readonly Finding[] {
  return rows
    .filter(
      (row) =>
        row.impressions >= MINIMUM_IMPRESSIONS &&
        row.position >= OPPORTUNITY_BAND.from &&
        row.position <= OPPORTUNITY_BAND.to,
    )
    .map((row) => ({
      kind: "position-opportunity" as const,
      subject: row.query,
      detail: `Position ${row.position.toFixed(1)} on ${row.impressions.toLocaleString("en-US")} impressions, ${row.clicks} click${row.clicks === 1 ? "" : "s"}.`,
      impressions: row.impressions,
    }))
    .sort(byImpressions);
}

/** Pages shown often and clicked rarely — usually a title or a snippet. */
export function lowClickThrough(rows: readonly PageQueryRow[]): readonly Finding[] {
  const byPage = new Map<string, { clicks: number; impressions: number }>();

  for (const row of rows) {
    const existing = byPage.get(row.page) ?? { clicks: 0, impressions: 0 };
    byPage.set(row.page, {
      clicks: existing.clicks + row.clicks,
      impressions: existing.impressions + row.impressions,
    });
  }

  const findings: Finding[] = [];
  for (const [page, totals] of byPage) {
    if (totals.impressions < MINIMUM_IMPRESSIONS) continue;
    const ctr = totals.clicks / totals.impressions;
    if (ctr >= LOW_CTR) continue;
    findings.push({
      kind: "low-ctr",
      subject: page,
      detail: `${(ctr * 100).toFixed(2)}% click-through on ${totals.impressions.toLocaleString("en-US")} impressions.`,
      impressions: totals.impressions,
    });
  }
  return findings.sort(byImpressions);
}

/**
 * One query answered by more than one page.
 *
 * Reported, never acted on automatically. Two pages ranking for a query is
 * sometimes cannibalisation and sometimes two genuinely different intents
 * sharing a phrase, and only reading them tells you which.
 */
export function cannibalisation(rows: readonly PageQueryRow[]): readonly Finding[] {
  const byQuery = new Map<string, Map<string, number>>();

  for (const row of rows) {
    if (row.impressions <= 0) continue;
    // `comparisonKey`, not `normalizeKeyword`: the latter tidies Unicode but
    // leaves case alone, so "Robux To USD" and "robux to usd" would count as
    // two different queries answered by one page each — the opposite finding.
    const key = comparisonKey(row.query);
    const pages = byQuery.get(key) ?? new Map<string, number>();
    pages.set(row.page, (pages.get(row.page) ?? 0) + row.impressions);
    byQuery.set(key, pages);
  }

  const findings: Finding[] = [];
  for (const [query, pages] of byQuery) {
    if (pages.size < 2) continue;
    const total = [...pages.values()].reduce((sum, value) => sum + value, 0);
    if (total < MINIMUM_IMPRESSIONS) continue;

    const ranked = [...pages.entries()].sort((a, b) => b[1] - a[1]);
    findings.push({
      kind: "cannibalisation",
      subject: query,
      detail: `${pages.size} pages share this query: ${ranked
        .map(([page, impressions]) => `${page} (${impressions.toLocaleString("en-US")})`)
        .join(", ")}.`,
      impressions: total,
    });
  }
  return findings.sort(byImpressions);
}

/**
 * Amount queries with real demand and no page of their own.
 *
 * This is the finding the held amount pages have been waiting for. It is still
 * only the first of the gate's criteria: a proposal here means the demand
 * exists, not that a page should be built.
 */
export function unservedAmounts(rows: readonly QueryRow[]): readonly Finding[] {
  const published = new Set(
    indexableRoutes
      .map((record) => record.route)
      .filter((route) => route.startsWith("/conversions/")),
  );

  const byAmount = new Map<number, { impressions: number; clicks: number; queries: Set<string> }>();

  for (const row of rows) {
    const amount = extractAmount(row.query);
    if (!amount) continue;
    const existing = byAmount.get(amount.amount) ?? {
      impressions: 0,
      clicks: 0,
      queries: new Set<string>(),
    };
    existing.impressions += row.impressions;
    existing.clicks += row.clicks;
    existing.queries.add(row.query);
    byAmount.set(amount.amount, existing);
  }

  const findings: Finding[] = [];
  for (const [amount, totals] of byAmount) {
    if (totals.impressions < MINIMUM_IMPRESSIONS) continue;
    const route = `/conversions/${amount}-robux-to-usd/`;
    if (published.has(route)) continue;

    findings.push({
      kind: "unserved-amount",
      subject: `${amount.toLocaleString("en-US")} Robux`,
      detail: `${totals.impressions.toLocaleString("en-US")} impressions across ${totals.queries.size} quer${totals.queries.size === 1 ? "y" : "ies"}, no page at ${route}. A proposal only: the publication gate still applies.`,
      impressions: totals.impressions,
    });
  }
  return findings.sort(byImpressions);
}

function byImpressions(a: Finding, b: Finding): number {
  // Impressions descending, then subject, so the report is byte-identical for
  // the same input. A report that reorders itself cannot be diffed.
  return b.impressions - a.impressions || a.subject.localeCompare(b.subject);
}

/** Strips an origin from an exported page URL, leaving a comparable path. */
export function toPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    return new URL(trimmed).pathname;
  } catch {
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }
}

/** Reads Search Console's percentage and position columns. */
export function parseRate(value: string): number {
  const cleaned = value.replace(/[%\s]/g, "").replace(/,/g, "");
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return 0;
  // The export writes CTR as "3.4%"; a fraction is what the analysis wants.
  return value.includes("%") ? parsed / 100 : parsed;
}

export function parseCount(value: string): number {
  const parsed = Number.parseInt(value.replace(/[,\s]/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
