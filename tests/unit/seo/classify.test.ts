import { describe, expect, it } from "vitest";
import { assignRoute, classifyKeyword, ROUTES } from "@/lib/seo/classify";
import { extractAmount } from "@/lib/seo/normalize";

const routeFor = (keyword: string): string | null => {
  const classification = classifyKeyword(keyword);
  return assignRoute(classification, extractAmount(keyword)?.amount ?? null).targetRoute;
};

const intentOf = (keyword: string) => classifyKeyword(keyword).primaryIntent;

describe("core DevEx calculator intent", () => {
  it.each([
    "devex calculator",
    "roblox devex calculator",
    "devex calc",
    "dev ex calculator",
    "dev x calculator",
    "robux devex calculator",
    "devex converter",
    "devex to usd",
    "developer exchange roblox calculator",
    "roblox dev ex calculator",
  ])("routes %s to the homepage", (keyword) => {
    expect(routeFor(keyword)).toBe(ROUTES.home);
  });

  it("does not create separate routes for spelling variants", () => {
    const routes = new Set(
      ["devex calculator", "dev ex calculator", "dev x calculator", "devx calculator", "devex calc"].map(
        routeFor,
      ),
    );
    expect(routes.size).toBe(1);
  });
});

describe("generic conversion intent", () => {
  it.each([
    "robux to usd",
    "robux calculator",
    "robux converter",
    "robux to money converter",
    "robux to usd calculator",
    "robux to dollars",
    "roblox to usd",
    "convert robux to money",
    "robux to real money converter",
  ])("routes %s to the Robux-to-USD page", (keyword) => {
    expect(routeFor(keyword)).toBe(ROUTES.robuxToUsd);
  });

  it("routes misspellings to the same page as the correct spelling", () => {
    for (const variant of ["robus to usd", "rubux to usd", "robix to usd", "robucks to usd", "robux to $"]) {
      expect(routeFor(variant)).toBe(ROUTES.robuxToUsd);
    }
  });

  it("routes a tool query with no named currency to the converter", () => {
    expect(routeFor("roblox calculator")).toBe(ROUTES.robuxToUsd);
    expect(routeFor("robux exchange")).toBe(ROUTES.robuxToUsd);
  });
});

describe("reverse intent", () => {
  it.each(["usd to robux", "usd to robux calculator", "money to robux", "dollars to robux calculator"])(
    "routes %s to the payout target page",
    (keyword) => {
      expect(routeFor(keyword)).toBe(ROUTES.usdToRobux);
    },
  );

  it("keeps the two directions on separate routes", () => {
    expect(routeFor("robux to usd")).not.toBe(routeFor("usd to robux"));
  });
});

describe("rate intent", () => {
  it.each([
    "devex rates",
    "devex rate",
    "roblox devex rate",
    "devex exchange rate",
    "robux conversion rate",
    "dev ex rates",
    "devex prices",
  ])("routes %s to the rates page", (keyword) => {
    expect(routeFor(keyword)).toBe(ROUTES.devexRates);
  });

  it("routes a dated rate query to the history page", () => {
    expect(routeFor("roblox devex rates 2023")).toBe(ROUTES.devexRateHistory);
  });

  it("does not mistake an amount for a year", () => {
    // "2000" here is the amount, not the year.
    expect(intentOf("how much is 2000 robux in dollars")).toBe("numeric-amount-conversion");
    expect(routeFor("how much is 2000 robux in dollars")).toBe(ROUTES.conversions);
  });
});

describe("numeric and local-currency intent", () => {
  it("routes an amount query to the conversion hub", () => {
    expect(routeFor("100,000 robux to usd")).toBe(ROUTES.conversions);
    expect(routeFor("1 million robux to usd")).toBe(ROUTES.conversions);
  });

  it("provides a calculator query-state fallback for amounts", () => {
    const classification = classifyKeyword("100000 robux to usd");
    const assignment = assignRoute(classification, 100_000);
    expect(assignment.fallbackRoute).toBe("/robux-to-usd/?robux=100000");
    // An amount never claims canonical ownership on its own.
    expect(assignment.canonicalOwner).toBe(false);
  });

  it("classifies a non-USD amount as local-currency intent", () => {
    expect(intentOf("3000 robux to cad")).toBe("local-currency-conversion");
    expect(intentOf("1 million robux in pounds")).toBe("local-currency-conversion");
  });
});

describe("marketplace fee intent", () => {
  it("routes Roblox tax queries to the marketplace fee calculator", () => {
    expect(routeFor("roblox tax")).toBe(ROUTES.robuxTaxCalculator);
    expect(routeFor("tax roblox")).toBe(ROUTES.robuxTaxCalculator);
  });

  it("keeps marketplace fee separate from DevEx", () => {
    expect(routeFor("roblox tax")).not.toBe(routeFor("devex calculator"));
  });
});

describe("eligibility, definition and process intent", () => {
  it("routes minimum and requirement queries to the requirements page", () => {
    expect(routeFor("devex minimum")).toBe(ROUTES.devexRequirements);
    expect(routeFor("devex requirements")).toBe(ROUTES.devexRequirements);
  });

  it("routes Earned Robux queries to the definition page", () => {
    expect(routeFor("earned robux")).toBe(ROUTES.earnedRobux);
  });

  it("routes cash-out queries to the process guide", () => {
    expect(routeFor("cash out robux")).toBe(ROUTES.howToCashOut);
    expect(routeFor("sell robux to usd")).toBe(ROUTES.howToCashOut);
  });
});

describe("exclusions", () => {
  it("excludes competitor brand queries", () => {
    const classification = classifyKeyword("rbxtax");
    expect(classification.status).toBe("excluded");
    expect(classification.exclusionReason).toBe("competitor-brand-navigational");
    expect(routeFor("rbxtax")).toBeNull();
  });

  it("excludes a non-Latin query rather than machine-translating a page for it", () => {
    const classification = classifyKeyword("roblox幣值");
    expect(classification.status).toBe("excluded");
    expect(classification.exclusionReason).toBe("non-latin-locale-unsupported");
  });

  it("excludes an unrelated Roblox tool", () => {
    expect(classifyKeyword("visits to robux calculator").status).toBe("excluded");
  });

  it("never assigns a route to an excluded keyword", () => {
    for (const keyword of ["rbxtax", "rbx tax", "roblox幣值", "visits to robux calculator"]) {
      expect(routeFor(keyword)).toBeNull();
    }
  });
});

describe("determinism", () => {
  it("produces the same classification on repeated runs", () => {
    const keywords = ["devex calculator", "robux to usd", "100k robux to usd", "roblox tax"];
    for (const keyword of keywords) {
      const first = classifyKeyword(keyword);
      const second = classifyKeyword(keyword);
      expect(first).toEqual(second);
    }
  });

  it("attaches a rationale to every classification", () => {
    for (const keyword of ["devex calculator", "rbxtax", "robux to usd", "roblox tax"]) {
      expect(classifyKeyword(keyword).rationale.length).toBeGreaterThan(10);
    }
  });
});
