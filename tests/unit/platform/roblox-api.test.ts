import { describe, expect, it } from "vitest";
import { mergeGameDetails, parseSorts } from "@/lib/platform/roblox-api";
import { getQuote, parseFinnhub, REQUIRED_ENVIRONMENT } from "@/lib/platform/market-data";

/**
 * Parsing is tested against the shape Roblox actually returned, including the
 * awkward parts: several sorts before the first one carrying games, and rows
 * missing fields. A parser that trusts the payload would put `undefined` on a
 * page the first time Roblox changed something.
 */
const SAMPLE = {
  sorts: [
    { contentType: "Filters", sortDisplayName: "", filters: [] },
    {
      sortDisplayName: "Top Trending",
      games: [
        { universeId: 6035872082, name: "RIVALS", playerCount: 173084, creatorName: "Nosniy" },
        { universeId: 2711375305, name: "Catalog Avatar Creator", playerCount: 85670 },
        { universeId: 111, playerCount: 5 },
        { name: "No id", playerCount: 5 },
        { universeId: 222, name: "No count" },
      ],
    },
  ],
};

describe("Roblox explore payload", () => {
  it("reads the first sort that actually contains games", () => {
    const parsed = parseSorts(SAMPLE);
    expect(parsed?.sortName).toBe("Top Trending");
  });

  it("keeps only rows carrying an id, a name and a player count", () => {
    const parsed = parseSorts(SAMPLE);
    expect(parsed?.experiences.map((entry) => entry.name)).toEqual([
      "RIVALS",
      "Catalog Avatar Creator",
    ]);
  });

  it("reports the ranking Roblox named rather than inventing a label", () => {
    const parsed = parseSorts({
      sorts: [{ sortDisplayName: "Up-and-Coming", games: [{ universeId: 1, name: "A", playerCount: 2 }] }],
    });
    expect(parsed?.sortName).toBe("Up-and-Coming");
  });

  it("falls back to a neutral label when Roblox names no ranking", () => {
    const parsed = parseSorts({
      sorts: [{ sortDisplayName: "  ", games: [{ universeId: 1, name: "A", playerCount: 2 }] }],
    });
    expect(parsed?.sortName).toBe("Roblox ranking");
  });

  it("returns null for a payload that is not an explore response", () => {
    expect(parseSorts(null)).toBeNull();
    expect(parseSorts({})).toBeNull();
    expect(parseSorts({ sorts: [] })).toBeNull();
    expect(parseSorts({ sorts: [{ games: [] }] })).toBeNull();
  });

  it("leaves visits null until the games endpoint supplies them", () => {
    const parsed = parseSorts(SAMPLE);
    expect(parsed?.experiences.every((entry) => entry.visits === null)).toBe(true);
  });
});

describe("merging game details", () => {
  const base = parseSorts(SAMPLE)?.experiences ?? [];

  it("fills in visits and max players by universe id", () => {
    const merged = mergeGameDetails(base, {
      data: [{ id: 6035872082, visits: 9_000_000, maxPlayers: 20 }],
    });

    expect(merged[0]?.visits).toBe(9_000_000);
    expect(merged[0]?.maxPlayers).toBe(20);
    // Untouched rows keep their nulls rather than borrowing another row's.
    expect(merged[1]?.visits).toBeNull();
  });

  it("returns the experiences unchanged when the details payload is unusable", () => {
    expect(mergeGameDetails(base, null)).toEqual(base);
    expect(mergeGameDetails(base, { data: "nonsense" })).toEqual(base);
  });
});

describe("market data", () => {
  it("reports itself unconfigured, naming what is missing", async () => {
    const state = await getQuote({});
    expect(state.status).toBe("unconfigured");
    if (state.status === "unconfigured") {
      expect(state.missing).toEqual([...REQUIRED_ENVIRONMENT]);
    }
  });

  it("stays unconfigured when only one of the two variables is set", async () => {
    const state = await getQuote({ STOCK_PROVIDER: "finnhub" });
    expect(state.status).toBe("unconfigured");
    if (state.status === "unconfigured") {
      expect(state.missing).toEqual(["STOCK_API_KEY"]);
    }
  });

  it("refuses a provider it has no adapter for, rather than guessing", async () => {
    const state = await getQuote({ STOCK_PROVIDER: "mystery", STOCK_API_KEY: "k" });
    expect(state.status).toBe("unavailable");
  });

  it("parses a provider quote", () => {
    const quote = parseFinnhub({ c: 37.93, t: 1_755_500_000 });
    expect(quote?.price).toBe("37.93");
    expect(quote?.currency).toBe("USD");
    expect(quote?.symbol).toBe("RBLX");
  });

  it("treats a zero or missing price as no price at all", () => {
    // The endpoint answers with zero for an unknown symbol rather than failing,
    // and a zero price rendered as a quote would be a fabricated figure.
    expect(parseFinnhub({ c: 0, t: 1 })).toBeNull();
    expect(parseFinnhub({})).toBeNull();
    expect(parseFinnhub(null)).toBeNull();
  });
});
