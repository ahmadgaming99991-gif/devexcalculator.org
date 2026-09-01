import { describe, expect, it } from "vitest";
import { KEYS, SCHEMA, dayKey, shardOf } from "../../../workers/platform-data/src/contracts";
import worker from "../../../workers/platform-data/src/index";
import type { Env, PlatformStore } from "../../../workers/platform-data/src/store";

/**
 * The public read surface of the platform data plane.
 *
 * Two properties are load-bearing and neither is visible from the response
 * body. A failure must never be stored — a cached outage outlives the outage,
 * and a 503 held at the edge for two minutes is a working site pretending to be
 * broken. And the browser allowlist must stay an allowlist: this Worker serves
 * one origin and must not hand a permission to a site it does not serve.
 */

/*
 * Dated relative to now, not fixed.
 *
 * Two of these endpoints assemble their answer from the day buckets the
 * *current* date names - that is the whole point of day-bucketing - so a
 * fixture pinned to a literal date passes on the day it was written and fails
 * every day after it.
 */
const OBSERVED_AT = new Date().toISOString();
const TODAY = dayKey(Date.parse(OBSERVED_AT));

function envWith(seed: Record<string, unknown>): Env {
  const data = new Map(Object.entries(seed).map(([k, v]) => [k, JSON.stringify(v)]));
  const store: PlatformStore = {
    get: async (key) => {
      const raw = data.get(key);
      return raw === undefined ? null : (JSON.parse(raw) as unknown);
    },
    put: async (key, value) => {
      data.set(key, value);
    },
  };
  return { PLATFORM_DATA: store };
}

const LIVE = {
  schema: SCHEMA,
  observedAt: OBSERVED_AT,
  collector: { outcome: "recorded", lastRunAt: OBSERVED_AT, consecutiveFailures: 0, detail: null },
  source: { status: "read", detail: null },
  rankings: [
    { id: "top-trending", name: "Top Trending", subtitle: null, size: 2 },
    { id: "up-and-coming", name: "Up and Coming", subtitle: null, size: 1 },
  ],
  defaultRanking: "top-trending",
  platform: { players: 1300, experiences: 2, rankings: 2 },
  byRanking: { "top-trending": [111, 222], "up-and-coming": [111] },
  experiences: {
    "111": { i: 111, r: 11, n: "One", p: 900, s: false },
    "222": { i: 222, r: 22, n: "Two", p: 400, s: true },
  },
  today: [[Date.parse(OBSERVED_AT), 1300]],
  todayDay: TODAY,
};

const populated = () =>
  envWith({
    [KEYS.live]: LIVE,
    [KEYS.details(shardOf(111))]: {
      schema: SCHEMA,
      shard: shardOf(111),
      cursor: 0,
      rows: {
        "111": { v: 5, m: 10, c: "Studio", cv: true, u: 90, d: 10, f: 3, g: "Adventure", a: "Maturity: Minimal", o: "2026-08-31T06:00:00.000Z" },
      },
    },
    [KEYS.highlights]: { schema: SCHEMA, at: [1, 2], series: [{ id: "111", name: "One", players: [1, 2] }] },
    [KEYS.history(shardOf(111), TODAY)]: {
      schema: SCHEMA,
      shard: shardOf(111),
      day: TODAY,
      at: [1, 2, 3],
      p: { "111": [10, null, 30] },
    },
  });

const call = (path: string, env: Env, init?: RequestInit) =>
  worker.fetch(new Request(`https://api.devexcalculator.org${path}`, init), env);

describe("the rankings endpoint", () => {
  it("joins enrichment onto the rows it serves", async () => {
    const body = await (await call("/v1/platform/rankings", populated())).json() as {
      data: { experiences: { i: number; x: unknown }[] };
    };
    expect(body.data.experiences.map((row) => row.i)).toEqual([111, 222]);
    expect(body.data.experiences[0]!.x).not.toBeNull();
    // A row nobody has enriched yet is null, never an object of zeroes.
    expect(body.data.experiences[1]!.x).toBeNull();
  });

  it("carries the observation time in the body, so cache age cannot be mistaken for it", async () => {
    const body = await (await call("/v1/platform/rankings", populated())).json() as { meta: { observedAt: string } };
    expect(body.meta.observedAt).toBe(OBSERVED_AT);
  });

  it("falls back to Roblox's own default for a ranking it did not publish", async () => {
    const body = await (await call("/v1/platform/rankings?ranking=invented", populated())).json() as {
      data: { ranking: string };
    };
    expect(body.data.ranking).toBe("top-trending");
  });

  it("serves a ranking Roblox did publish", async () => {
    const body = await (await call("/v1/platform/rankings?ranking=up-and-coming", populated())).json() as {
      data: { ranking: string; experiences: unknown[] };
    };
    expect(body.data.ranking).toBe("up-and-coming");
    expect(body.data.experiences).toHaveLength(1);
  });
});

describe("cache semantics", () => {
  it("lets the edge hold a successful read for a fraction of the collection interval", async () => {
    const response = await call("/v1/platform/rankings", populated());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=0, s-maxage=120, must-revalidate");
  });

  it("holds enrichment longer, because it changes on a slower clock", async () => {
    const response = await call("/v1/platform/highlights", populated());
    expect(response.headers.get("cache-control")).toContain("s-maxage=900");
  });

  it("never stores a failure", async () => {
    const empty = envWith({});
    for (const path of [
      "/v1/platform/rankings",
      "/v1/platform/totals",
      "/v1/platform/highlights",
      "/v1/platform/experience/111",
      "/v1/platform/nope",
    ]) {
      const response = await call(path, empty);
      expect(response.ok, `${path} unexpectedly succeeded`).toBe(false);
      expect(response.headers.get("cache-control"), `${path} was cacheable`).toBe("no-store");
    }
  });

  it("never stores a bad request either", async () => {
    const response = await call("/v1/platform/experience/0", populated());
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("keeps every response out of search results", async () => {
    const response = await call("/v1/platform/rankings", populated());
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
  });
});

describe("CORS", () => {
  it("allows the site's own origin", async () => {
    const response = await call("/v1/platform/rankings", populated(), {
      headers: { origin: "https://devexcalculator.org" },
    });
    expect(response.headers.get("access-control-allow-origin")).toBe("https://devexcalculator.org");
  });

  it("never answers with a wildcard", async () => {
    for (const origin of ["https://devexcalculator.org", "https://evil.example", "null"]) {
      const response = await call("/v1/platform/rankings", populated(), { headers: { origin } });
      expect(response.headers.get("access-control-allow-origin")).not.toBe("*");
    }
  });

  it("gives an unrecognised origin no permission at all", async () => {
    const response = await call("/v1/platform/rankings", populated(), {
      headers: { origin: "https://devexcalculator.org.evil.example" },
    });
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("varies on Origin, so one origin's answer is not served to another", async () => {
    const response = await call("/v1/platform/rankings", populated(), {
      headers: { origin: "https://devexcalculator.org" },
    });
    expect(response.headers.get("vary")).toContain("Origin");
  });

  it("answers a preflight without exposing more than the read methods", async () => {
    const response = await call("/v1/platform/rankings", populated(), {
      method: "OPTIONS",
      headers: { origin: "https://devexcalculator.org" },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toBe("GET, HEAD, OPTIONS");
  });
});

describe("methods", () => {
  it("is a read-only surface", async () => {
    for (const method of ["POST", "PUT", "DELETE", "PATCH"]) {
      const response = await call("/v1/platform/rankings", populated(), { method });
      expect(response.status, method).toBe(405);
      expect(response.headers.get("allow")).toBe("GET, HEAD, OPTIONS");
    }
  });

  it("exposes no write path and no diagnostic route", async () => {
    const env = populated();
    for (const path of ["/__proof/collect", "/__proof/a", "/debug", "/v1/platform/collect", "/admin"]) {
      const response = await call(path, env);
      expect(response.status, path).toBe(404);
    }
  });
});

describe("series endpoints", () => {
  it("drops an unobserved hour rather than charting it as zero", async () => {
    const body = await (await call("/v1/platform/experience/111?days=1", populated())).json() as {
      data: { points: [number, number][] };
    };
    expect(body.data.points).toEqual([
      [1, 10],
      [3, 30],
    ]);
  });

  it("says an experience has no recorded history instead of drawing an empty chart", async () => {
    const response = await call("/v1/platform/experience/987654", populated());
    expect(response.status).toBe(404);
  });

  it("assembles totals from the archive and today together", async () => {
    const env = envWith({
      [KEYS.live]: LIVE,
      [KEYS.totals(dayKey(Date.now() - 86_400_000))]: {
        schema: SCHEMA,
        day: dayKey(Date.now() - 86_400_000),
        points: [[1, 5]],
      },
    });
    const body = await (await call("/v1/platform/totals?days=3", env)).json() as {
      data: { points: [number, number][] };
    };
    expect(body.data.points.length).toBeGreaterThanOrEqual(1);
    // Ascending, so a chart can draw it without sorting on the reader's device.
    const times = body.data.points.map(([at]) => at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it("falls back to the widest window for a range it does not offer", async () => {
    const body = await (await call("/v1/platform/totals?days=999", populated())).json() as {
      data: { days: number };
    };
    expect(body.data.days).toBe(14);
  });
});

describe("health", () => {
  it("answers even when nothing has been collected", async () => {
    const body = await (await call("/health", envWith({}))).json() as {
      data: { hasObservations: boolean; stale: boolean; ageMinutes: number | null };
    };
    expect(body.data.hasObservations).toBe(false);
    expect(body.data.stale).toBe(true);
    expect(body.data.ageMinutes).toBeNull();
  });

  it("is never cached", async () => {
    const response = await call("/health", populated());
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
