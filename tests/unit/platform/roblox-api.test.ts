import { describe, expect, it } from "vitest";
import {
  approvalPercent,
  experienceUrl,
  mergeGameDetails,
  parseRankings,
  parseSorts,
  type ExperienceObservation,
} from "@/lib/platform/roblox-api";
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

  it("takes the creator, favourites and canonical path from the detail row", () => {
    // Explore names no creator at all, so this endpoint is the only source for
    // it; the page attributes each experience to a name it was actually given.
    const merged = mergeGameDetails(base, {
      data: [
        {
          id: 6035872082,
          visits: 1,
          favoritedCount: 29_443_904,
          canonicalUrlPath: "/games/4924922222/Brookhaven-RP",
          creator: { name: "Brookhaven by Voldex", hasVerifiedBadge: true },
        },
      ],
    });

    expect(merged[0]?.creatorName).toBe("Brookhaven by Voldex");
    expect(merged[0]?.creatorVerified).toBe(true);
    expect(merged[0]?.favourites).toBe(29_443_904);
    expect(merged[0]?.urlPath).toBe("/games/4924922222/Brookhaven-RP");
  });

  it("does not claim a verified badge for a creator that has none", () => {
    const merged = mergeGameDetails(base, {
      data: [{ id: 6035872082, creator: { name: "Someone" } }],
    });
    expect(merged[0]?.creatorVerified).toBe(false);
  });

  it("returns the experiences unchanged when the details payload is unusable", () => {
    expect(mergeGameDetails(base, null)).toEqual(base);
    expect(mergeGameDetails(base, { data: "nonsense" })).toEqual(base);
  });
});

/**
 * Roblox sends several rankings in one response — Top Trending, Top Playing
 * Now, Up-and-Coming and more, around ninety experiences each. Only the first
 * was ever read, so the rest of a response the site had already paid for was
 * discarded.
 */
describe("every published ranking", () => {
  const MULTI = {
    sorts: [
      { sortId: "filters_v5", sortDisplayName: "", games: [] },
      {
        sortId: "top-trending",
        sortDisplayName: "Top Trending",
        subtitle: "Rising fast",
        games: [{ universeId: 1, name: "A", playerCount: 10 }],
      },
      {
        sortId: "top-playing-now",
        sortDisplayName: "Top Playing Now",
        games: [
          { universeId: 2, name: "B", playerCount: 20 },
          { universeId: 3, name: "C", playerCount: 30 },
        ],
      },
    ],
  };

  it("returns each sort that carries experiences, skipping the filter descriptor", () => {
    expect(parseRankings(MULTI).map((ranking) => ranking.id)).toEqual([
      "top-trending",
      "top-playing-now",
    ]);
  });

  it("reports how many experiences each ranking holds", () => {
    expect(parseRankings(MULTI).map((ranking) => ranking.size)).toEqual([1, 2]);
  });

  it("keeps Roblox's own subtitle, and null where there is none", () => {
    const [trending, playing] = parseRankings(MULTI);
    expect(trending?.subtitle).toBe("Rising fast");
    expect(playing?.subtitle).toBeNull();
  });

  it("still reads the first ranking for the collector, unchanged", () => {
    // The stored series was built from the first sort. If this ever starts
    // returning a different one, every point before the change becomes
    // incomparable with every point after it.
    expect(parseSorts(MULTI)?.sortName).toBe("Top Trending");
  });

  it("returns an empty list rather than throwing on a foreign payload", () => {
    expect(parseRankings(null)).toEqual([]);
    expect(parseRankings({ sorts: "nonsense" })).toEqual([]);
  });
});

describe("fields carried in the ranking payload", () => {
  const RICH = {
    sorts: [
      {
        sortId: "top-playing-now",
        sortDisplayName: "Top Playing Now",
        games: [
          {
            universeId: 1686885941,
            rootPlaceId: 4924922222,
            name: "Brookhaven 🏡RP",
            playerCount: 339303,
            totalUpVotes: 8443519,
            totalDownVotes: 1386866,
            isSponsored: false,
            ageRecommendationDisplayName: "Maturity: Minimal",
            genreL1: "Roleplay & Avatar Sim",
          },
        ],
      },
    ],
  };

  const row = parseRankings(RICH)[0]?.experiences[0] as ExperienceObservation;

  it("reads votes, genre, maturity and the place id Roblox already sent", () => {
    expect(row.upVotes).toBe(8_443_519);
    expect(row.downVotes).toBe(1_386_866);
    expect(row.genre).toBe("Roleplay & Avatar Sim");
    expect(row.maturity).toBe("Maturity: Minimal");
    expect(row.rootPlaceId).toBe(4_924_922_222);
  });

  it("derives approval from Roblox's two counts and nothing else", () => {
    // 8443519 / (8443519 + 1386866)
    expect(approvalPercent(row)).toBeCloseTo(85.89, 1);
  });

  it("has no approval to report when nobody has voted", () => {
    expect(approvalPercent({ ...row, upVotes: 0, downVotes: 0 })).toBeNull();
    expect(approvalPercent({ ...row, upVotes: null })).toBeNull();
  });

  it("links to the experience, preferring Roblox's canonical path", () => {
    expect(experienceUrl(row)).toBe("https://www.roblox.com/games/4924922222");
    expect(experienceUrl({ ...row, urlPath: "/games/49/Brookhaven-RP" })).toBe(
      "https://www.roblox.com/games/49/Brookhaven-RP",
    );
  });

  it("has no link rather than a broken one when Roblox omits the place", () => {
    expect(experienceUrl({ ...row, rootPlaceId: null })).toBeNull();
  });

  it("marks a sponsored placement so a paid slot is not read as a ranking", () => {
    const sponsored = parseRankings({
      sorts: [
        {
          sortId: "s",
          sortDisplayName: "S",
          games: [{ universeId: 1, name: "Ad", playerCount: 1, isSponsored: true }],
        },
      ],
    })[0]?.experiences[0];
    expect(sponsored?.isSponsored).toBe(true);
    expect(row.isSponsored).toBe(false);
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
