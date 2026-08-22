import { describe, expect, it } from "vitest";
import {
  LOW_CTR,
  MINIMUM_IMPRESSIONS,
  cannibalisation,
  lowClickThrough,
  parseCount,
  parseRate,
  positionOpportunities,
  toPath,
  unservedAmounts,
  type PageQueryRow,
  type QueryRow,
} from "../../../src/lib/seo/search-console";
import { indexableRoutes } from "../../../src/lib/content/route-registry";

/**
 * Real Search Console exports are private and never committed, so this is the
 * only place the analysis can be tested. What matters is that a finding is
 * always evidence and never an instruction.
 */

function query(overrides: Partial<QueryRow> = {}): QueryRow {
  return { query: "robux to usd", clicks: 10, impressions: 1_000, ctr: 0.01, position: 9, ...overrides };
}

function pageQuery(overrides: Partial<PageQueryRow> = {}): PageQueryRow {
  return { ...query(), page: "/robux-to-usd/", ...overrides };
}

describe("reading the export's own formats", () => {
  it("reads a percentage as a fraction and a plain number as itself", () => {
    expect(parseRate("3.4%")).toBeCloseTo(0.034);
    expect(parseRate("12.7")).toBeCloseTo(12.7);
    expect(parseRate("")).toBe(0);
  });

  it("reads grouped counts", () => {
    expect(parseCount("1,234")).toBe(1_234);
    expect(parseCount("0")).toBe(0);
    expect(parseCount("not a number")).toBe(0);
  });

  it("reduces an exported URL to a comparable path", () => {
    expect(toPath("https://devexcalculator.org/robux-to-usd/")).toBe("/robux-to-usd/");
    expect(toPath("/platform/")).toBe("/platform/");
    expect(toPath("robux-to-usd/")).toBe("/robux-to-usd/");
    expect(toPath("  ")).toBe("");
  });
});

describe("position opportunities", () => {
  it("reports only the band where a change plausibly moves something", () => {
    const rows = [
      query({ query: "already first", position: 1.2 }),
      query({ query: "movable", position: 11 }),
      query({ query: "far back", position: 47 }),
    ];
    expect(positionOpportunities(rows).map((finding) => finding.subject)).toEqual(["movable"]);
  });

  it("ignores queries with too few impressions to conclude from", () => {
    const rows = [query({ position: 9, impressions: MINIMUM_IMPRESSIONS - 1 })];
    expect(positionOpportunities(rows)).toHaveLength(0);
  });

  it("orders by impressions, not by position", () => {
    // A query at 6.1 with forty impressions is not more worth fixing than one
    // at 14 with four thousand.
    const rows = [
      query({ query: "close but tiny", position: 6.1, impressions: 100 }),
      query({ query: "further but large", position: 14, impressions: 4_000 }),
    ];
    expect(positionOpportunities(rows).map((finding) => finding.subject)).toEqual([
      "further but large",
      "close but tiny",
    ]);
  });
});

describe("click-through", () => {
  it("adds a page's queries up before judging it", () => {
    const rows = [
      pageQuery({ page: "/guides/", clicks: 1, impressions: 400 }),
      pageQuery({ page: "/guides/", clicks: 1, impressions: 400 }),
    ];
    const findings = lowClickThrough(rows);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.impressions).toBe(800);
  });

  it("says nothing about a page that is clicked", () => {
    const rows = [pageQuery({ page: "/guides/", clicks: 200, impressions: 1_000 })];
    expect(200 / 1_000).toBeGreaterThan(LOW_CTR);
    expect(lowClickThrough(rows)).toHaveLength(0);
  });
});

describe("cannibalisation", () => {
  it("reports a query answered by two pages, and names both", () => {
    const rows = [
      pageQuery({ page: "/robux-to-usd/", impressions: 600 }),
      pageQuery({ page: "/", impressions: 300 }),
    ];
    const findings = cannibalisation(rows);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.detail).toContain("/robux-to-usd/");
    expect(findings[0]?.detail).toContain("/ (300)");
    expect(findings[0]?.impressions).toBe(900);
  });

  it("says nothing about a query with one page", () => {
    expect(cannibalisation([pageQuery({ impressions: 5_000 })])).toHaveLength(0);
  });

  it("treats differently written forms of one query as one query", () => {
    const rows = [
      pageQuery({ query: "Robux To USD", page: "/robux-to-usd/", impressions: 600 }),
      pageQuery({ query: "robux to usd", page: "/", impressions: 300 }),
    ];
    expect(cannibalisation(rows)).toHaveLength(1);
  });
});

describe("unserved amounts", () => {
  it("proposes an amount with demand and no page", () => {
    const findings = unservedAmounts([
      query({ query: "40000 robux to usd", impressions: 900 }),
    ]);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.subject).toBe("40,000 Robux");
    // The wording is load-bearing: this is evidence, not an instruction.
    expect(findings[0]?.detail).toContain("publication gate still applies");
  });

  it("says nothing about an amount that already has a page", () => {
    const published = indexableRoutes.find((record) =>
      record.route.startsWith("/conversions/") && record.route.includes("-robux-to-usd/"),
    );
    expect(published, "no amount page exists to test against").toBeDefined();

    const amount = published!.route.replace("/conversions/", "").replace("-robux-to-usd/", "");
    const findings = unservedAmounts([
      query({ query: `${amount} robux to usd`, impressions: 5_000 }),
    ]);
    expect(findings).toHaveLength(0);
  });

  it("ignores a number that is not an amount", () => {
    expect(unservedAmounts([query({ query: "devex rates 2023", impressions: 5_000 })])).toHaveLength(
      0,
    );
  });

  it("adds an amount's differently written queries together", () => {
    const findings = unservedAmounts([
      query({ query: "40000 robux to usd", impressions: 30 }),
      query({ query: "how much is 40k robux", impressions: 30 }),
    ]);
    // Neither reaches the threshold alone; together they do.
    expect(findings).toHaveLength(1);
    expect(findings[0]?.impressions).toBe(60);
  });
});
