import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import ratesJson from "../../../src/data/rates.json";
import {
  CHECK_INTERVAL_MINUTES,
  checkRateSource,
  compareToRegistry,
  dueForCheck,
  findGroupedAmounts,
  findRateFigures,
  isRecognisable,
  readDocument,
  readSourceUpdatedAt,
  type ExpectedFigures,
  type SourceObservation,
} from "../../../src/lib/rates/source-check";

/**
 * The fixture is the real document, fetched from Roblox on 23 August 2026 and
 * committed unmodified. That matters: an extractor tested only against markup
 * written to suit it proves nothing about the page it will actually read.
 */
const FIXTURE = readFileSync(
  fileURLToPath(new URL("../../fixtures/roblox-devex-page.md", import.meta.url)),
  "utf8",
);

/** What the site publishes today, read from the registry rather than typed. */
const published: ExpectedFigures = {
  rates: ratesJson.rates.map((rate) => rate.usdPerRobux),
  minimum: ratesJson.minimum.eligibleEarnedRobux,
};

function observation(overrides: Partial<SourceObservation> = {}): SourceObservation {
  return {
    checkedAt: "2026-08-23T06:00:00.000Z",
    status: "read",
    url: "https://create.roblox.com/docs/en-us/production/monetization/developer-exchange.md",
    httpStatus: 200,
    rates: ["0.0038", "0.0054", "0.0035"],
    amounts: ["30,000"],
    sourceUpdatedAt: "2026-08-20T18:01:26Z",
    detail: null,
    ...overrides,
  };
}

describe("reading Roblox's document", () => {
  it("finds every rate figure and nothing else", () => {
    expect(findRateFigures(FIXTURE)).toEqual(["0.0038", "0.0054", "0.0035"]);
  });

  it("finds the minimum and no other grouped figure", () => {
    expect(findGroupedAmounts(FIXTURE)).toEqual(["30,000"]);
  });

  it("reads Roblox's own statement of when the page last changed", () => {
    expect(readSourceUpdatedAt(FIXTURE)).toBe("2026-08-20T18:01:26Z");
  });

  it("recognises the document", () => {
    expect(isRecognisable(FIXTURE)).toBe(true);
  });
});

describe("the registry and the document agree", () => {
  /**
   * The point of the whole feature, asserted against the real registry rather
   * than a copy of it. Editing a rate in `rates.json` without the source
   * document changing fails here — which is the review this check exists to
   * force, happening at the earliest possible moment.
   */
  it("reports unchanged for the figures the site publishes today", () => {
    const result = compareToRegistry(
      readDocument(FIXTURE, "2026-08-23T06:00:00.000Z", 200),
      published,
    );
    expect(result.status).toBe("unchanged");
    expect(result.missingRates).toEqual([]);
    expect(result.unexpectedRates).toEqual([]);
    expect(result.minimumFound).toBe(true);
    expect(result.sourceUpdatedAt).toBe("2026-08-20T18:01:26Z");
  });
});

describe("a document that cannot be recognised", () => {
  const CHALLENGE = "<html><body>Checking your browser before you continue.</body></html>";

  it("is unreadable, not a page with every rate removed", () => {
    const read = readDocument(CHALLENGE, "2026-08-23T06:00:00.000Z", 200);
    expect(read.status).toBe("unreadable");
    expect(read.rates).toEqual([]);
  });

  it("never reports the site's own figures as changed", () => {
    // The failure this guards against: an outage reading as "Roblox has
    // withdrawn the DevEx rate", which is the loudest possible false alarm.
    for (const body of [CHALLENGE, "", "   ", "Not Found"]) {
      const result = compareToRegistry(
        readDocument(body, "2026-08-23T06:00:00.000Z", 200),
        published,
      );
      expect(result.status, `"${body.slice(0, 20)}" was judged`).toBe("unreadable");
    }
  });
});

describe("comparison", () => {
  it("says unknown when no check has run", () => {
    expect(compareToRegistry(null, published).status).toBe("unknown");
  });

  it("notices a rate the document no longer states", () => {
    const result = compareToRegistry(
      observation({ rates: ["0.0054", "0.0035"] }),
      { rates: ["0.0038", "0.0054", "0.0035"], minimum: 30_000 },
    );
    expect(result.status).toBe("changed");
    expect(result.missingRates).toEqual(["0.0038"]);
    expect(result.detail).toContain("0.0038");
  });

  it("notices a rate the document has gained", () => {
    // A fourth rate is the change most likely to be missed by a check that
    // only looked for the ones it already knew about.
    const result = compareToRegistry(
      observation({ rates: ["0.0038", "0.0054", "0.0035", "0.0061"] }),
      { rates: ["0.0038", "0.0054", "0.0035"], minimum: 30_000 },
    );
    expect(result.status).toBe("changed");
    expect(result.unexpectedRates).toEqual(["0.0061"]);
  });

  it("notices the minimum changing", () => {
    const result = compareToRegistry(observation({ amounts: ["25,000"] }), {
      rates: ["0.0038", "0.0054", "0.0035"],
      minimum: 30_000,
    });
    expect(result.status).toBe("changed");
    expect(result.minimumFound).toBe(false);
    expect(result.detail).toContain("30,000");
  });

  it("reads a grouped figure and a plain integer as the same number", () => {
    const result = compareToRegistry(observation({ amounts: ["30,000"] }), {
      rates: ["0.0038", "0.0054", "0.0035"],
      minimum: 30_000,
    });
    expect(result.status).toBe("unchanged");
  });

  it("claims nothing from an unreachable check", () => {
    const result = compareToRegistry(
      observation({ status: "unreachable", rates: [], amounts: [], detail: "Roblox returned 503." }),
      published,
    );
    expect(result.status).toBe("unreadable");
    expect(result.detail).toBe("Roblox returned 503.");
  });
});

describe("scheduling", () => {
  const now = new Date("2026-08-23T12:00:00.000Z");

  it("checks when nothing has been recorded", () => {
    expect(dueForCheck(null, now)).toBe(true);
  });

  it("does not check again inside the interval", () => {
    const recent = new Date(now.getTime() - (CHECK_INTERVAL_MINUTES - 1) * 60 * 1000);
    expect(dueForCheck(observation({ checkedAt: recent.toISOString() }), now)).toBe(false);
  });

  it("checks once the interval has passed", () => {
    const old = new Date(now.getTime() - CHECK_INTERVAL_MINUTES * 60 * 1000);
    expect(dueForCheck(observation({ checkedAt: old.toISOString() }), now)).toBe(true);
  });

  it("checks again when the stored date is unusable", () => {
    expect(dueForCheck(observation({ checkedAt: "not a date" }), now)).toBe(true);
  });
});

/** A KV stand-in. `put` records, `get` replays, as the real binding does. */
function fakeStore(initial: unknown = null) {
  const values = new Map<string, string>();
  if (initial) values.set("rate-source", JSON.stringify(initial));
  return {
    values,
    get: async (key: string) => {
      const raw = values.get(key);
      return raw === undefined ? null : JSON.parse(raw);
    },
    put: async (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("the scheduled run", () => {
  const now = new Date("2026-08-23T12:00:00.000Z");

  it("makes no request when a check is not due", async () => {
    const recent = new Date(now.getTime() - 60 * 1000).toISOString();
    const store = fakeStore(observation({ checkedAt: recent }));
    const fetchImpl = vi.fn();

    const result = await checkRateSource(store, now, fetchImpl as unknown as typeof fetch);

    expect(result).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("records what the document said", async () => {
    const store = fakeStore();
    const fetchImpl = vi.fn(async () => new Response(FIXTURE, { status: 200 }));

    const result = await checkRateSource(store, now, fetchImpl as unknown as typeof fetch);

    expect(result?.status).toBe("read");
    expect(result?.rates).toEqual(["0.0038", "0.0054", "0.0035"]);
    expect(store.values.has("rate-source")).toBe(true);
  });

  it("records a refusal rather than losing it", async () => {
    // A check that stopped working must be visible as a date that stopped
    // moving, which needs the failure written down, not swallowed.
    const store = fakeStore();
    const fetchImpl = vi.fn(async () => new Response("nope", { status: 503 }));

    const result = await checkRateSource(store, now, fetchImpl as unknown as typeof fetch);

    expect(result?.status).toBe("unreachable");
    expect(result?.httpStatus).toBe(503);
    expect(result?.detail).toContain("503");
  });

  it("records a thrown request rather than propagating it", async () => {
    const store = fakeStore();
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });

    const result = await checkRateSource(store, now, fetchImpl as unknown as typeof fetch);

    expect(result?.status).toBe("unreachable");
    expect(result?.detail).toBe("network down");
  });

  it("keeps the last known source date across a failure", async () => {
    const store = fakeStore(
      observation({ checkedAt: "2026-08-22T00:00:00.000Z", sourceUpdatedAt: "2026-08-20T18:01:26Z" }),
    );
    const fetchImpl = vi.fn(async () => new Response("", { status: 500 }));

    const result = await checkRateSource(store, now, fetchImpl as unknown as typeof fetch);

    expect(result?.sourceUpdatedAt).toBe("2026-08-20T18:01:26Z");
  });
});
