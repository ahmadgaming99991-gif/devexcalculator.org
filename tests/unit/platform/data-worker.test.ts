import { afterEach, describe, expect, it, vi } from "vitest";
import {
  KEYS,
  SCHEMA,
  dayKey,
  dayKeys,
  shardOf,
  type Details,
  type Live,
} from "../../../workers/platform-data/src/contracts";
import { dispatch, unitFor } from "../../../workers/platform-data/src/dispatch";
import { collectLive, parseSorts } from "../../../workers/platform-data/src/units/live";
import { appendHistory } from "../../../workers/platform-data/src/units/history";
import { appendHighlights } from "../../../workers/platform-data/src/units/highlights";
import { pick, refreshDetails } from "../../../workers/platform-data/src/units/enrichment";
import { rollUpTotals } from "../../../workers/platform-data/src/units/rollup";
import worker from "../../../workers/platform-data/src/index";
import type { Env, PlatformStore } from "../../../workers/platform-data/src/store";

/**
 * The scheduled half of the platform data plane.
 *
 * These tests exist because the units run on a Cron Trigger against a live
 * upstream, where nobody is watching. Every one of them encodes a rule the
 * site's honesty depends on: what a failed refresh must leave alone, which
 * timestamp belongs to which field, and what a gap in a chart means.
 */

/** A KV double with the two methods the store actually uses. */
function makeStore(seed: Record<string, unknown> = {}) {
  const data = new Map<string, string>(Object.entries(seed).map(([k, v]) => [k, JSON.stringify(v)]));
  const writes: string[] = [];
  const store: PlatformStore = {
    get: async (key) => {
      const raw = data.get(key);
      return raw === undefined ? null : (JSON.parse(raw) as unknown);
    },
    put: async (key, value) => {
      writes.push(key);
      data.set(key, value);
    },
  };
  return {
    env: { PLATFORM_DATA: store } satisfies Env,
    writes,
    read: <T>(key: string): T | null => {
      const raw = data.get(key);
      return raw === undefined ? null : (JSON.parse(raw) as T);
    },
    has: (key: string) => data.has(key),
  };
}

const SORTS = {
  sorts: [
    { contentType: "Filters", filters: [] },
    {
      sortId: "top-trending",
      topicLayoutData: { topicTitle: "Top Trending" },
      subtitle: "What is busy",
      games: [
        {
          universeId: 111,
          name: "One",
          playerCount: 900,
          rootPlaceId: 11,
          isSponsored: false,
          ageRecommendationDisplayName: "Maturity: Minimal",
        },
        {
          universeId: 222,
          name: "Two",
          playerCount: 400,
          rootPlaceId: 22,
          isSponsored: true,
          // The same label as 111, so interning has something to de-duplicate.
          ageRecommendationDisplayName: "Maturity: Minimal",
        },
        // No maturity at all: it must stay null rather than acquire a default.
        { universeId: 333, playerCount: 10 },
        { name: "no id", playerCount: 5 },
        { universeId: 444, name: "no count" },
      ],
    },
    {
      sortId: "up-and-coming",
      topicLayoutData: { topicTitle: "Up and Coming" },
      // The same experience in two rankings must be one row and one count.
      games: [{ universeId: 111, name: "One", playerCount: 900, rootPlaceId: 11 }],
    },
    { sortId: "empty", games: [] },
  ],
};

const DETAILS = {
  data: [
    {
      id: 111,
      visits: 12_345,
      maxPlayers: 50,
      favoritedCount: 999,
      genre: "Adventure",
      /*
       * Deliberately absent. Production proved this endpoint does not carry
       * `ageRecommendationDisplayName`: across 150 enriched rows every one came
       * back null while `genre`, from the same response, was populated 150/150.
       * The fixture used to include it, which is why the tests agreed with the
       * bug instead of catching it.
       */
      creator: { name: "Studio", hasVerifiedBadge: true },
    },
  ],
};

const VOTES = { data: [{ id: 111, upVotes: 90, downVotes: 10 }] };

function jsonResponse(body: unknown, at = "Mon, 31 Aug 2026 12:00:00 GMT"): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { date: at } });
}

/** Answers each upstream host from a table, so a test states what it expects. */
function stubFetch(table: { sorts?: unknown; details?: unknown; votes?: unknown; fail?: string[] }) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input: RequestInfo | URL) => {
    const url = String(input);
    const which = url.includes("get-sorts") ? "sorts" : url.includes("/votes") ? "votes" : "details";
    if (table.fail?.includes(which)) return new Response("nope", { status: 500 });
    const body = table[which as "sorts" | "details" | "votes"];
    if (body === undefined) return new Response("nope", { status: 404 });
    return jsonResponse(body);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sorts parsing", () => {
  it("keeps only rows carrying both an id and a count", () => {
    const parsed = parseSorts(SORTS);
    expect(Object.keys(parsed.experiences).sort()).toEqual(["111", "222", "333"]);
  });

  it("counts an experience once even when several rankings list it", () => {
    const parsed = parseSorts(SORTS);
    expect(parsed.players).toBe(900 + 400 + 10);
    expect(parsed.byRanking["up-and-coming"]).toEqual([111]);
  });

  it("drops a ranking with no usable games rather than publishing an empty one", () => {
    const parsed = parseSorts(SORTS);
    expect(parsed.rankings.map((entry) => entry.id)).toEqual(["top-trending", "up-and-coming"]);
  });

  it("uses Roblox's own ranking ids and never a list of its own", () => {
    const parsed = parseSorts({ sorts: [{ sortId: "a-sort-nobody-hardcoded", games: [{ universeId: 1, playerCount: 2 }] }] });
    expect(parsed.rankings[0]?.id).toBe("a-sort-nobody-hardcoded");
  });

  it("returns nothing usable for a payload it does not recognise", () => {
    expect(parseSorts({ nope: true }).rankings).toEqual([]);
    expect(parseSorts(null).rankings).toEqual([]);
  });
});

describe("the collection unit", () => {
  it("stores one write and one subrequest per cycle", async () => {
    stubFetch({ sorts: SORTS });
    const kv = makeStore();
    const report = await collectLive(kv.env);

    expect(report.outcome).toBe("recorded");
    expect(report.subrequests).toBe(1);
    expect(report.writes).toBe(1);
    expect(kv.writes).toEqual([KEYS.live]);
  });

  it("dates the observation by Roblox's clock, not by ours", async () => {
    stubFetch({ sorts: SORTS });
    const kv = makeStore();
    await collectLive(kv.env);
    expect(kv.read<Live>(KEYS.live)?.observedAt).toBe("2026-08-31T12:00:00.000Z");
  });

  it("writes nothing when the upstream fails, so the previous reading survives", async () => {
    stubFetch({ fail: ["sorts"] });
    const previous = { schema: SCHEMA, observedAt: "2026-08-30T00:00:00.000Z" };
    const kv = makeStore({ [KEYS.live]: previous });

    const report = await collectLive(kv.env);
    expect(report.outcome).toBe("skipped");
    expect(kv.writes).toEqual([]);
    expect(kv.read<Live>(KEYS.live)?.observedAt).toBe("2026-08-30T00:00:00.000Z");
  });

  it("writes nothing when the response parses to no rankings", async () => {
    stubFetch({ sorts: { sorts: [] } });
    const kv = makeStore();
    const report = await collectLive(kv.env);
    expect(report.outcome).toBe("skipped");
    expect(kv.writes).toEqual([]);
  });

  it("appends today's total to the series it already carries", async () => {
    stubFetch({ sorts: SORTS });
    const day = dayKey(Date.parse("2026-08-31T12:00:00.000Z"));
    const kv = makeStore({
      [KEYS.live]: { schema: SCHEMA, todayDay: day, today: [[1, 5]], experiences: {}, rankings: [] },
    });
    await collectLive(kv.env);
    expect(kv.read<Live>(KEYS.live)?.today).toHaveLength(2);
  });

  it("starts a new series across a day boundary instead of mixing two days", async () => {
    stubFetch({ sorts: SORTS });
    const kv = makeStore({
      [KEYS.live]: { schema: SCHEMA, todayDay: "20260101", today: [[1, 5]], experiences: {}, rankings: [] },
    });
    await collectLive(kv.env);
    const live = kv.read<Live>(KEYS.live)!;
    expect(live.todayDay).toBe(dayKey(Date.parse("2026-08-31T12:00:00.000Z")));
    expect(live.today).toHaveLength(1);
  });
});

describe("history day buckets", () => {
  const observedAt = "2026-08-31T12:00:00.000Z";
  const day = dayKey(Date.parse(observedAt));

  function liveValue(): Live {
    return {
      schema: SCHEMA,
      observedAt,
      collector: { outcome: "recorded", lastRunAt: observedAt, consecutiveFailures: 0, detail: null },
      source: { status: "read", detail: null },
      rankings: [{ id: "r", name: "R", subtitle: null, size: 1 }],
      defaultRanking: "r",
      platform: { players: 900, experiences: 1, rankings: 1 },
      byRanking: { r: [111] },
      experiences: { "111": { i: 111, r: null, n: "One", p: 900, s: false, a: null } },
      maturity: [],
      today: [],
      todayDay: day,
    };
  }

  it("writes only the bucket for the shard and day it was asked for", async () => {
    const kv = makeStore({ [KEYS.live]: liveValue() });
    const shard = shardOf(111);
    const report = await appendHistory(kv.env, shard);

    expect(report.outcome).toBe("recorded");
    expect(kv.writes).toEqual([KEYS.history(shard, day)]);
  });

  it("touches no other shard's bucket", async () => {
    const kv = makeStore({ [KEYS.live]: liveValue() });
    const other = (shardOf(111) + 1) % 4;
    await appendHistory(kv.env, other);
    expect(kv.read<{ p: Record<string, unknown> }>(KEYS.history(other, day))?.p).toEqual({});
  });

  it("pads a newly seen experience with nulls rather than back-filling it", async () => {
    const shard = shardOf(111);
    const kv = makeStore({
      [KEYS.live]: liveValue(),
      [KEYS.history(shard, day)]: { schema: SCHEMA, shard, day, at: [1, 2, 3], p: {} },
    });
    await appendHistory(kv.env, shard);
    expect(kv.read<{ p: Record<string, (number | null)[]> }>(KEYS.history(shard, day))!.p["111"]).toEqual([
      null,
      null,
      null,
      900,
    ]);
  });

  it("records an experience that was not observed as null, never as zero", async () => {
    const shard = shardOf(999);
    const kv = makeStore({
      [KEYS.live]: liveValue(),
      [KEYS.history(shard, day)]: { schema: SCHEMA, shard, day, at: [1], p: { "999": [10] } },
    });
    await appendHistory(kv.env, shard);
    expect(kv.read<{ p: Record<string, (number | null)[]> }>(KEYS.history(shard, day))!.p["999"]).toEqual([10, null]);
  });

  it("does not record the same observation twice when a trigger repeats", async () => {
    const shard = shardOf(111);
    const kv = makeStore({ [KEYS.live]: liveValue() });
    await appendHistory(kv.env, shard);
    const second = await appendHistory(kv.env, shard);
    expect(second.outcome).toBe("skipped");
    expect(kv.writes).toHaveLength(1);
  });

  it("writes into the day the observation belongs to, not the day it ran", async () => {
    const kv = makeStore({ [KEYS.live]: { ...liveValue(), observedAt: "2026-08-30T23:59:00.000Z" } });
    const shard = shardOf(111);
    await appendHistory(kv.env, shard);
    expect(kv.writes).toEqual([KEYS.history(shard, "20260830")]);
  });

  it("does nothing at all when no observation has been collected", async () => {
    const kv = makeStore();
    const report = await appendHistory(kv.env, 0);
    expect(report.outcome).toBe("skipped");
    expect(kv.writes).toEqual([]);
  });
});

describe("shard mapping", () => {
  it("is deterministic and stable for the same id", () => {
    expect(shardOf(6035872082)).toBe(shardOf("6035872082"));
    expect(shardOf(111)).toBe(shardOf(111));
  });

  it("stays inside the shard count", () => {
    for (let id = 1; id < 500; id += 7) {
      expect(shardOf(id)).toBeGreaterThanOrEqual(0);
      expect(shardOf(id)).toBeLessThan(4);
    }
  });
});

describe("retention windows", () => {
  it("asks for exactly the days a window covers, newest last", () => {
    const now = Date.parse("2026-08-31T12:00:00.000Z");
    expect(dayKeys(now, 3)).toEqual(["20260829", "20260830", "20260831"]);
    expect(dayKeys(now, 14)).toHaveLength(14);
  });

  it("gives every write the retention window as a TTL", async () => {
    stubFetch({ sorts: SORTS });
    const seen: (number | undefined)[] = [];
    const env: Env = {
      PLATFORM_DATA: {
        get: async () => null,
        put: async (_key, _value, options) => {
          seen.push(options?.expirationTtl);
        },
      },
    };
    await collectLive(env);
    expect(seen).toEqual([14 * 24 * 60 * 60]);
  });
});

describe("enrichment rotation", () => {
  const now = Date.parse("2026-08-31T12:00:00.000Z");
  const iso = (offsetHours: number) => new Date(now - offsetHours * 3_600_000).toISOString();

  it("takes never-enriched ids before anything else", () => {
    const rows = { a: { o: iso(1) } as never, b: { o: iso(99) } as never };
    expect(pick(["a", "b", "new"], rows, 0, 1)).toEqual(["new"]);
  });

  it("then takes rows missing the fields the table shows", () => {
    const complete = { v: 1, f: 1, c: "x", o: iso(1) } as never;
    const incomplete = { v: null, f: 1, c: "x", o: iso(1) } as never;
    expect(pick(["good", "gap"], { good: complete, gap: incomplete }, 0, 1)).toEqual(["gap"]);
  });

  it("then takes the least recently refreshed", () => {
    const row = (hours: number) => ({ v: 1, f: 1, c: "x", o: iso(hours) }) as never;
    expect(pick(["fresh", "stale"], { fresh: row(1), stale: row(10) }, 0, 1)).toEqual(["stale"]);
  });

  it("rotates so an evenly stamped set cannot starve", () => {
    const row = { v: 1, f: 1, c: "x", o: iso(1) } as never;
    const rows = { a: row, b: row, c: row };
    const first = pick(["a", "b", "c"], rows, 0, 1);
    const second = pick(["a", "b", "c"], rows, 1, 1);
    expect(first).not.toEqual(second);
  });

  it("refreshes only the shard it was given", async () => {
    stubFetch({ details: DETAILS, votes: VOTES });
    const shard = shardOf(111);
    const kv = makeStore({
      [KEYS.live]: { schema: SCHEMA, rankings: [], experiences: { "111": { i: 111, n: "One", p: 1, r: null, s: false } } },
    });
    const report = await refreshDetails(kv.env, shard);
    expect(report.outcome).toBe("recorded");
    expect(kv.writes).toEqual([KEYS.details(shard)]);
  });
});

describe("detail timestamps", () => {
  const live = {
    schema: SCHEMA,
    rankings: [],
    experiences: { "111": { i: 111, n: "One", p: 1, r: null, s: false } },
  };

  it("stamps a row with the time its own refresh was dated", async () => {
    stubFetch({ details: DETAILS, votes: VOTES });
    const shard = shardOf(111);
    const kv = makeStore({ [KEYS.live]: live });
    await refreshDetails(kv.env, shard);
    expect(kv.read<{ rows: Record<string, { o: string }> }>(KEYS.details(shard))!.rows["111"]!.o).toBe(
      "2026-08-31T12:00:00.000Z",
    );
  });

  it("never restamps a row it did not refresh", async () => {
    const shard = shardOf(111);
    // Dated inside the retention window, so the row is kept rather than pruned:
    // the claim under test is about the stamp, not about eviction.
    const untouchedAt = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const old = { v: 1, m: 1, c: "Old", cv: false, u: 1, d: 1, f: 1, g: "g", a: "a", o: untouchedAt };
    const kv = makeStore({
      [KEYS.live]: live,
      [KEYS.details(shard)]: { schema: SCHEMA, shard, cursor: 0, rows: { "111": old, "999": { ...old } } },
    });
    stubFetch({ details: DETAILS, votes: VOTES });
    await refreshDetails(kv.env, shard);
    const rows = kv.read<{ rows: Record<string, { o: string }> }>(KEYS.details(shard))!.rows;
    expect(rows["111"]!.o).toBe("2026-08-31T12:00:00.000Z");
    expect(rows["999"]!.o).toBe(untouchedAt);
  });

  it("drops a row that left the rankings and has aged past the retention window", async () => {
    const shard = shardOf(111);
    const ancient = { v: 1, m: 1, c: "Old", cv: false, u: 1, d: 1, f: 1, g: "g", a: "a", o: "2026-01-01T00:00:00.000Z" };
    const kv = makeStore({
      [KEYS.live]: live,
      [KEYS.details(shard)]: { schema: SCHEMA, shard, cursor: 0, rows: { "999": ancient } },
    });
    stubFetch({ details: DETAILS, votes: VOTES });
    await refreshDetails(kv.env, shard);
    expect(kv.read<{ rows: Record<string, unknown> }>(KEYS.details(shard))!.rows["999"]).toBeUndefined();
  });

  it("keeps the last known-good values when the refresh fails", async () => {
    const shard = shardOf(111);
    const old = { v: 42, m: 1, c: "Old", cv: false, u: 1, d: 1, f: 7, g: "g", a: "a", o: "2026-01-01T00:00:00.000Z" };
    const kv = makeStore({
      [KEYS.live]: live,
      [KEYS.details(shard)]: { schema: SCHEMA, shard, cursor: 0, rows: { "111": old } },
    });
    stubFetch({ fail: ["details"] });

    const report = await refreshDetails(kv.env, shard);
    expect(report.outcome).toBe("skipped");
    expect(kv.writes).toEqual([]);
    const rows = kv.read<{ rows: Record<string, typeof old> }>(KEYS.details(shard))!.rows;
    expect(rows["111"]).toEqual(old);
  });

  it("keeps previous vote counts when only the votes call fails", async () => {
    const shard = shardOf(111);
    const old = { v: 1, m: 1, c: "Old", cv: false, u: 88, d: 12, f: 1, g: "g", a: "a", o: "2026-01-01T00:00:00.000Z" };
    const kv = makeStore({
      [KEYS.live]: live,
      [KEYS.details(shard)]: { schema: SCHEMA, shard, cursor: 0, rows: { "111": old } },
    });
    stubFetch({ details: DETAILS, fail: ["votes"] });

    const report = await refreshDetails(kv.env, shard);
    expect(report.outcome).toBe("recorded");
    expect(report.detail).toMatch(/votes unavailable/i);
    const row = kv.read<{ rows: Record<string, typeof old> }>(KEYS.details(shard))!.rows["111"]!;
    expect([row.u, row.d]).toEqual([88, 12]);
    expect(row.v).toBe(12_345);
  });
});

describe("highlights", () => {
  const observedAt = "2026-08-31T12:00:00.000Z";
  const live = {
    schema: SCHEMA,
    observedAt,
    rankings: [],
    experiences: {
      "111": { i: 111, n: "One", p: 900, r: null, s: false },
      "222": { i: 222, n: "Two", p: 400, r: null, s: false },
    },
  };

  it("appends one point per series without opening a history bucket", async () => {
    const kv = makeStore({ [KEYS.live]: live });
    const report = await appendHighlights(kv.env);
    expect(report.outcome).toBe("recorded");
    expect(kv.writes).toEqual([KEYS.highlights]);
  });

  it("keeps a series whose experience dropped out, recording the gap as null", async () => {
    const kv = makeStore({
      [KEYS.live]: live,
      [KEYS.highlights]: {
        schema: SCHEMA,
        at: [1],
        series: [{ id: "555", name: "Gone", players: [10] }],
      },
    });
    await appendHighlights(kv.env);
    const stored = kv.read<{ series: { id: string; players: (number | null)[] }[] }>(KEYS.highlights)!;
    expect(stored.series.find((entry) => entry.id === "555")?.players).toEqual([10, null]);
  });

  it("does not record the same observation twice", async () => {
    const kv = makeStore({ [KEYS.live]: live });
    await appendHighlights(kv.env);
    const second = await appendHighlights(kv.env);
    expect(second.outcome).toBe("skipped");
    expect(kv.writes).toHaveLength(1);
  });
});

describe("the totals rollup", () => {
  /** A live value shaped enough to pass the store's guard. */
  const liveCarrying = (day: string) => ({
    schema: SCHEMA,
    rankings: [],
    experiences: {},
    todayDay: day,
    today: [[1, 2]],
  });

  it("archives a finished day and leaves an unfinished one alone", async () => {
    const today = dayKey(Date.now());
    const inProgress = makeStore({ [KEYS.live]: liveCarrying(today) });
    expect((await rollUpTotals(inProgress.env)).outcome).toBe("skipped");
    expect(inProgress.writes).toEqual([]);

    const finished = makeStore({ [KEYS.live]: liveCarrying("20260101") });
    expect((await rollUpTotals(finished.env)).outcome).toBe("recorded");
    expect(finished.writes).toEqual([KEYS.totals("20260101")]);
  });

  it("is safe to run twice", async () => {
    const kv = makeStore({ [KEYS.live]: liveCarrying("20260101") });
    await rollUpTotals(kv.env);
    const second = await rollUpTotals(kv.env);
    expect(second.outcome).toBe("skipped");
    expect(kv.writes).toHaveLength(1);
  });
});

describe("the schema gate", () => {
  it("treats a value from another schema version as absent rather than as data", async () => {
    const kv = makeStore({ [KEYS.live]: { schema: 99, experiences: { "1": {} }, rankings: [] } });
    const report = await appendHistory(kv.env, 0);
    expect(report.outcome).toBe("skipped");
    expect(report.detail).toMatch(/no live observation/i);
  });

  it("treats an unparseable value as absent rather than throwing", async () => {
    const env: Env = {
      PLATFORM_DATA: {
        get: async () => {
          throw new Error("store unavailable");
        },
        put: async () => undefined,
      },
    };
    const report = await appendHighlights(env);
    expect(report.outcome).toBe("skipped");
  });
});

describe("the dispatcher", () => {
  it("gives every five-minute slot exactly one unit", () => {
    const at = (h: number, m: number) => new Date(Date.UTC(2026, 7, 31, h, m));
    expect(unitFor(at(0, 0))?.kind).toBe("live");
    expect(unitFor(at(0, 15))?.kind).toBe("live");
    expect(unitFor(at(0, 5))?.kind).toBe("history");
    expect(unitFor(at(0, 50))?.kind).toBe("history");
    expect(unitFor(at(0, 10))?.kind).toBe("highlights");
    expect(unitFor(at(0, 25))?.kind).toBe("enrichment");
    expect(unitFor(at(0, 40))?.kind).toBe("rollup");
    expect(unitFor(at(0, 55))).toBeNull();
  });

  it("covers all four history shards within one hour", () => {
    const shards = [5, 20, 35, 50].map((minute) => unitFor(new Date(Date.UTC(2026, 7, 31, 3, minute)))?.shard);
    expect([...new Set(shards)].sort()).toEqual([0, 1, 2, 3]);
  });

  it("rotates the enrichment shard with the hour", () => {
    const shards = [0, 1, 2, 3].map((hour) => unitFor(new Date(Date.UTC(2026, 7, 31, hour, 25)))?.shard);
    expect(shards).toEqual([0, 1, 2, 3]);
  });

  it("never runs two units in one invocation", async () => {
    stubFetch({ sorts: SORTS });
    const kv = makeStore();
    await dispatch(kv.env, new Date(Date.UTC(2026, 7, 31, 0, 0)));
    // The collection unit and nothing else: no history bucket, no highlights.
    expect(kv.writes).toEqual([KEYS.live]);
  });

  it("reports a throwing unit as failed instead of rejecting", async () => {
    const env: Env = {
      PLATFORM_DATA: {
        get: async () => null,
        put: async () => {
          throw new Error("write refused");
        },
      },
    };
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    stubFetch({ sorts: SORTS });
    const report = await dispatch(env, new Date(Date.UTC(2026, 7, 31, 0, 0)));
    expect(report.outcome).toBe("failed");
  });
});

describe("write budget", () => {
  /**
   * The figure the Free plan's 1,000 writes a day is judged against.
   *
   * Counted from the units themselves rather than from a comment, so a unit
   * that starts writing a second key fails this rather than quietly consuming
   * the migration's headroom.
   */
  it("is 241 writes a day for the whole schedule", async () => {
    stubFetch({ sorts: SORTS, details: DETAILS, votes: VOTES });

    const observedAt = "2026-08-31T12:00:00.000Z";
    const seed = {
      [KEYS.live]: {
        schema: SCHEMA,
        observedAt,
        todayDay: dayKey(Date.parse(observedAt)),
        today: [],
        rankings: [],
        experiences: { "111": { i: 111, n: "One", p: 900, r: null, s: false } },
      },
    };

    const counts = {
      live: (await (async () => {
        const kv = makeStore(seed);
        await collectLive(kv.env);
        return kv.writes.length;
      })()) * 96,
      history: (await (async () => {
        const kv = makeStore(seed);
        await appendHistory(kv.env, shardOf(111));
        return kv.writes.length;
      })()) * 96,
      highlights: (await (async () => {
        const kv = makeStore(seed);
        await appendHighlights(kv.env);
        return kv.writes.length;
      })()) * 24,
      enrichment: (await (async () => {
        const kv = makeStore(seed);
        await refreshDetails(kv.env, shardOf(111));
        return kv.writes.length;
      })()) * 24,
      rollup: 1,
    };

    expect(counts).toEqual({ live: 96, history: 96, highlights: 24, enrichment: 24, rollup: 1 });
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(241);
    expect(total).toBeLessThan(1_000);
  });
});

/**
 * Maturity, and the endpoint it actually comes from.
 *
 * This block exists because of a real production regression. v1 read Roblox's
 * `ageRecommendationDisplayName` from the explore/sorts row and displayed it.
 * v2 kept only five fields from that same payload and asked the games endpoint
 * for maturity instead — an endpoint that does not carry it — so the field was
 * null on every row in production while `genre`, from the same games response,
 * was populated on all of them.
 *
 * The tests that should have caught it did not, because the fixture put the
 * field on the games row. A fixture that agrees with the mistake tests nothing.
 */
describe("maturity comes from the payload Roblox publishes it in", () => {
  it("parses maturity from the sorts row", () => {
    const parsed = parseSorts(SORTS);
    const label = parsed.maturity[parsed.experiences["111"]!.a!];
    expect(label).toBe("Maturity: Minimal");
  });

  it("interns repeated labels instead of storing each one", () => {
    const parsed = parseSorts(SORTS);
    // Two experiences share a label; the dictionary holds it once.
    expect(parsed.maturity).toEqual(["Maturity: Minimal"]);
    expect(parsed.experiences["111"]!.a).toBe(0);
    expect(parsed.experiences["222"]!.a).toBe(0);
  });

  it("leaves maturity null where Roblox published none, with no default", () => {
    const parsed = parseSorts(SORTS);
    expect(parsed.experiences["333"]!.a).toBeNull();
    expect(parsed.maturity).not.toContain("");
    expect(parsed.maturity.every((label) => label.startsWith("Maturity: "))).toBe(true);
  });

  it("survives the collection cycle into stored live state", async () => {
    stubFetch({ sorts: SORTS });
    const kv = makeStore();
    await collectLive(kv.env);

    const live = kv.read<Live>(KEYS.live)!;
    expect(live.maturity).toEqual(["Maturity: Minimal"]);
    expect(live.maturity[live.experiences["111"]!.a!]).toBe("Maturity: Minimal");
    expect(live.experiences["333"]!.a).toBeNull();
  });

  it("adds no KV write and no Roblox subrequest", async () => {
    stubFetch({ sorts: SORTS });
    const kv = makeStore();
    const report = await collectLive(kv.env);

    // The whole point of reading it here: the payload was already in hand.
    expect(report.subrequests).toBe(1);
    expect(report.writes).toBe(1);
    expect(kv.writes).toEqual([KEYS.live]);
  });

  it("never lets enrichment's null erase a real label from sorts", async () => {
    stubFetch({ sorts: SORTS, details: DETAILS, votes: VOTES });
    const kv = makeStore();
    await collectLive(kv.env);
    await refreshDetails(kv.env, shardOf(111));

    const stored = kv.read<Details>(KEYS.details(shardOf(111)));
    // Enrichment genuinely has nothing to offer here - the games endpoint does
    // not carry the field - and that nothing must not win.
    expect(stored?.rows["111"]?.a ?? null).toBeNull();

    const live = kv.read<Live>(KEYS.live)!;
    expect(live.maturity[live.experiences["111"]!.a!]).toBe("Maturity: Minimal");
  });

  it("serves the resolved label on the row, not inside the enrichment object", async () => {
    stubFetch({ sorts: SORTS, details: DETAILS, votes: VOTES });
    const kv = makeStore();
    await collectLive(kv.env);
    await refreshDetails(kv.env, shardOf(111));

    const response = await worker.fetch(
      new Request("https://api.devexcalculator.org/v1/platform/rankings"),
      kv.env,
    );
    const body = (await response.json()) as {
      data: { experiences: { i: number; a: string | null; x: { a: string | null } | null }[] };
    };
    const one = body.data.experiences.find((row) => row.i === 111)!;
    const three = body.data.experiences.find((row) => row.i === 333);

    expect(one.a).toBe("Maturity: Minimal");
    // Present even where enrichment holds null, and absent where Roblox
    // published nothing - never a fabricated default.
    expect(one.x?.a ?? null).toBeNull();
    if (three) expect(three.a).toBeNull();
  });
});
