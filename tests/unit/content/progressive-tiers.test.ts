import { describe, expect, it } from "vitest";
import sourceRegistry from "@/data/source-registry.json";
import { getMarketplaceScheme } from "@/lib/calculations/rate-registry";

/**
 * The one published figure that is prose on purpose.
 *
 * `data.sources.roblox-marketplace-fees.facts.2` summarises the progressive
 * Marketplace share as a sentence — `1x=30%, 1.3x=37% … 6x and above=70%` —
 * while `/robux-tax-calculator/` renders the same ten tiers as a table from
 * `marketplace.schemes[].progressiveTiers`.
 *
 * Both were left as prose deliberately: tokenising ten tiers inside one
 * sentence, in seven languages, trades a small staleness risk for a larger
 * chance of putting a percentage against the wrong multiple. What it leaves
 * behind is a page that can contradict itself in silence — the table saying one
 * thing and the citation beside it another — if the registry ever moves.
 *
 * So this asserts the ends. The first tier is the floor a creator starts at and
 * the last is the ceiling they can reach, which are the two figures anyone
 * actually acts on; if either moves in the registry, the sentence has to be
 * rewritten and this says so.
 */

interface SourceRecord {
  readonly id: string;
  readonly factsSupported?: readonly string[];
}

const FACT_ID = "roblox-marketplace-fees";
const FACT_INDEX = 2;

function progressiveFact(): string {
  const sources = (sourceRegistry as { sources?: readonly SourceRecord[] }).sources ??
    (sourceRegistry as unknown as readonly SourceRecord[]);
  const record = [...sources].find((entry) => entry.id === FACT_ID);
  if (!record?.factsSupported) throw new Error(`No factsSupported on "${FACT_ID}".`);
  const fact = record.factsSupported[FACT_INDEX];
  if (fact === undefined) throw new Error(`No fact ${FACT_INDEX} on "${FACT_ID}".`);
  return fact;
}

describe("the progressive Marketplace share", () => {
  const scheme = getMarketplaceScheme("marketplace-avatar-item");
  const tiers = scheme.progressiveTiers ?? [];

  it("has tiers in the registry to compare against", () => {
    expect(tiers.length).toBeGreaterThan(1);
  });

  it("states the same opening tier as the table renders", () => {
    const first = tiers[0];
    expect(first).toBeDefined();
    if (!first) return;

    // `1x=30%` — the multiple and its share, exactly as the sentence writes it.
    const written = new RegExp(
      `\\b${first.priceFloorMultiple.replace(".", "\\.")}x\\s*=\\s*${first.creatorSharePercent}%`,
    );
    expect(
      progressiveFact(),
      `The registry opens at ${first.priceFloorMultiple}x = ${first.creatorSharePercent}%. ` +
        "Update the sentence in src/data/source-registry.json, then the six translations.",
    ).toMatch(written);
  });

  it("states the same top tier as the table renders", () => {
    const last = tiers[tiers.length - 1];
    expect(last).toBeDefined();
    if (!last) return;

    // The top row is written "6x and above=70%" rather than as a bare multiple.
    const written = new RegExp(
      `\\b${last.priceFloorMultiple.replace(".", "\\.")}x[^=]*=\\s*${last.creatorSharePercent}%`,
    );
    expect(
      progressiveFact(),
      `The registry tops out at ${last.priceFloorMultiple}x = ${last.creatorSharePercent}%. ` +
        "Update the sentence in src/data/source-registry.json, then the six translations.",
    ).toMatch(written);
  });

  it("agrees with the scheme's own headline creator share at the top tier", () => {
    // The top of the progression is the same number as the in-experience share,
    // and the page says so; if they ever diverge the sentence needs rewriting.
    const last = tiers[tiers.length - 1];
    if (!last) return;
    expect(Number(last.creatorSharePercent)).toBeGreaterThanOrEqual(
      Number(scheme.creatorSharePercent),
    );
  });
});
