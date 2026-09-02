import { describe, expect, it } from "vitest";
import { assessDataPlane, readDataPlaneHealth } from "@/lib/platform/data-plane-health";
import { healthStatusCode, isHealthy, worstState } from "@/lib/api/health-status";

/**
 * What `/api/health/` says about the collector, and which status code follows.
 *
 * The bug this replaced: the endpoint read the v1 collector's heartbeat out of
 * the site Worker's KV. That collector was retired on 2026-09-02 and its store
 * kept for rollback, so the heartbeat froze at the moment of retirement and
 * every request afterwards answered **HTTP 503** — for a site whose figures
 * were correct and whose v2 data plane was recording every fifteen minutes.
 *
 * So these hold both directions. A live data plane must produce a 200, or the
 * check is red forever and gets muted. A dead or unreachable one must produce
 * a 503, or the check is green forever and never fires. The middle state has
 * to be visible in the body without failing the code, which is the property
 * that lets an operator watch it at all.
 */

const OBSERVED = "2026-09-02T23:00:00.000Z";

/** The data Worker's real payload shape, trimmed to what is read. */
const payload = (over: Record<string, unknown> = {}) => ({
  ok: true,
  data: {
    hasObservations: true,
    observedAt: OBSERVED,
    ageMinutes: 3,
    stale: false,
    collector: {
      outcome: "recorded",
      lastRunAt: "2026-09-02T23:00:31.377Z",
      consecutiveFailures: 0,
      detail: null,
    },
    experiences: 277,
    ...over,
  },
});

/** `now`, as a given number of minutes after the observation. */
const minutesLater = (minutes: number) => new Date(Date.parse(OBSERVED) + minutes * 60_000);

/** The status code `/api/health/` would return, given a fresh rate registry. */
const codeFor = (state: ReturnType<typeof assessDataPlane>["state"]) =>
  healthStatusCode(worstState(["fresh", state]));

/** A successful JSON response from the data Worker. */
const ok = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

describe("the data plane's contribution to health", () => {
  it("is fresh, and a 200, for a recent observation", () => {
    const health = assessDataPlane(payload(), minutesLater(3));
    expect(health.state).toBe("fresh");
    expect(health.lastRecordedAt).toBe(OBSERVED);
    expect(health.ageMinutes).toBe(3);
    expect(codeFor(health.state)).toBe(200);
  });

  it("is still fresh at fifty-nine minutes", () => {
    expect(assessDataPlane(payload(), minutesLater(59)).state).toBe("fresh");
  });

  it("turns stale at an hour, and stays a 200", () => {
    const health = assessDataPlane(payload(), minutesLater(60));
    expect(health.state).toBe("stale");
    expect(isHealthy(health.state)).toBe(true);
    // The point of the middle state: visible in the body, not an alert.
    expect(codeFor(health.state)).toBe(200);
  });

  it("is stale, not critical, at five hours", () => {
    expect(assessDataPlane(payload(), minutesLater(300)).state).toBe("stale");
  });

  it("turns critical at six hours, and a 503", () => {
    const health = assessDataPlane(payload(), minutesLater(360));
    expect(health.state).toBe("critical");
    expect(codeFor(health.state)).toBe(503);
  });

  it("is critical when the data plane holds no observations", () => {
    const health = assessDataPlane(
      payload({ hasObservations: false, observedAt: null }),
      minutesLater(1),
    );
    expect(health.state).toBe("critical");
    expect(health.lastRecordedAt).toBeNull();
    expect(health.detail).toBeTruthy();
  });

  it("does not treat a future timestamp as the healthiest possible reading", () => {
    // A clock that has drifted forward is a fault, and clamping the age to
    // zero would report it as the freshest data the site has ever had.
    const health = assessDataPlane(payload(), minutesLater(-120));
    expect(health.ageMinutes).toBeLessThan(0);
    expect(health.state).toBe("fresh");
  });

  it("carries the collector's own failure count and note through", () => {
    const health = assessDataPlane(
      payload({
        collector: {
          outcome: "failed",
          lastRunAt: "2026-09-02T23:05:00.000Z",
          consecutiveFailures: 3,
          detail: "Roblox returned HTTP 429.",
        },
      }),
      minutesLater(5),
    );
    expect(health.consecutiveFailures).toBe(3);
    expect(health.detail).toBe("Roblox returned HTTP 429.");
    expect(health.lastRunAt).toBe("2026-09-02T23:05:00.000Z");
  });

  describe("a response that cannot be read is critical, not ignored", () => {
    for (const [name, body] of [
      ["not an object", "healthy"],
      ["null", null],
      ["no data envelope", { ok: true }],
      ["a null envelope", { ok: true, data: null }],
      ["an unparseable observation time", { ok: true, data: { hasObservations: true, observedAt: "soon" } }],
    ] as const) {
      it(name, () => {
        const health = assessDataPlane(body, minutesLater(1));
        expect(health.state).toBe("critical");
        expect(codeFor(health.state)).toBe(503);
        expect(health.detail, "a critical state must say why").toBeTruthy();
      });
    }
  });
});

describe("reaching the data plane", () => {
  it("reports a healthy data plane as fresh", async () => {
    const health = await readDataPlaneHealth(async () => ok(payload()), minutesLater(2));
    expect(health.state).toBe("fresh");
  });

  it("asks for it uncached — a cached health answer describes the past", async () => {
    let seen: RequestInit | undefined;
    await readDataPlaneHealth(async (_url, init) => {
      seen = init;
      return ok(payload());
    }, minutesLater(1));
    expect(seen?.cache).toBe("no-store");
  });

  it("asks the configured data plane, not a hardcoded host", async () => {
    let url = "";
    await readDataPlaneHealth(async (target) => {
      url = String(target);
      return ok(payload());
    }, minutesLater(1));
    expect(url).toMatch(/\/health$/);
  });

  it("is critical when the data plane errors", async () => {
    const health = await readDataPlaneHealth(
      async () => ({ ok: false, status: 502, json: async () => ({}) }) as unknown as Response,
      minutesLater(1),
    );
    expect(health.state).toBe("critical");
    expect(health.detail).toContain("502");
  });

  it("is critical when the data plane cannot be reached at all", async () => {
    const health = await readDataPlaneHealth(async () => {
      throw new TypeError("fetch failed");
    }, minutesLater(1));
    expect(health.state).toBe("critical");
    expect(codeFor(health.state)).toBe(503);
  });

  it("says nothing about tokens, bindings or internals when it fails", async () => {
    const health = await readDataPlaneHealth(async () => {
      throw new Error("KV namespace HISTORY_KV binding secret=abc123");
    }, minutesLater(1));
    expect(health.state).toBe("critical");
    // The thrown message is not echoed: it is the one place an internal name
    // or a credential could reach an operator-facing document.
    expect(health.detail).not.toContain("secret");
    expect(health.detail).not.toContain("HISTORY_KV");
  });
});

describe("the retired v1 heartbeat", () => {
  it("can no longer make health fail", async () => {
    /*
     * The regression in one assertion. The v1 store still exists — it is kept
     * for rollback — and its heartbeat has been frozen since 2026-09-02. If
     * anything in this path still consulted it, a live v2 data plane could not
     * produce a 200, because the frozen heartbeat is hours old and would win
     * `worstState`.
     */
    const health = await readDataPlaneHealth(async () => ok(payload()), minutesLater(2));
    expect(health.state).toBe("fresh");
    expect(codeFor(health.state)).toBe(200);
  });

  it("is not imported by the health route any more", async () => {
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("src/app/api/health/route.ts", "utf8"),
    );
    expect(source).not.toContain("readHeartbeat");
    expect(source).not.toContain("getHistoryStore");
    expect(source).toContain("readDataPlaneHealth");
  });
});
