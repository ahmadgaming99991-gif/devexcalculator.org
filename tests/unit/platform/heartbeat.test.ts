import { beforeEach, describe, expect, it } from "vitest";
import {
  assessCollector,
  COLLECTOR_CRITICAL_MINUTES,
  COLLECTOR_STALE_MINUTES,
  readHeartbeat,
  recordHeartbeat,
  type Heartbeat,
} from "@/lib/platform/heartbeat";
import { COLLECTION_INTERVAL_MINUTES, type HistoryStore } from "@/lib/platform/history";

/**
 * These tests exist because the failure they describe is silent by design.
 *
 * The collector swallows its own errors on purpose, so nothing about a stopped
 * collector is visible from the outside except what this module records. If the
 * merge below is wrong — if a failing run overwrites the last success, or a
 * skipped run reads as a fresh observation — the site reports itself healthy
 * while its chart quietly stops advancing, which is the exact outcome the
 * heartbeat was added to prevent.
 */

function fakeStore(): HistoryStore & { readonly data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    async get(key) {
      const raw = data.get(key);
      return raw === undefined ? null : JSON.parse(raw);
    },
    async put(key, value) {
      data.set(key, value);
    },
  };
}

const NOW = new Date("2026-08-20T12:00:00.000Z");

function minutesAgo(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString();
}

function heartbeat(overrides: Partial<Heartbeat> = {}): Heartbeat {
  return {
    at: minutesAgo(1),
    outcome: "recorded",
    detail: null,
    lastRecordedAt: minutesAgo(1),
    experiences: 400,
    players: 5_000_000,
    consecutiveFailures: 0,
    ...overrides,
  };
}

describe("recording the collector's pulse", () => {
  let store: ReturnType<typeof fakeStore>;

  beforeEach(() => {
    store = fakeStore();
  });

  it("has nothing to report before the first run", async () => {
    expect(await readHeartbeat(store)).toBeNull();
  });

  it("records the upstream instant, not the run's own clock", async () => {
    const observedAt = "2026-08-20T11:47:00.000Z";
    const written = await recordHeartbeat(
      store,
      { outcome: "recorded", observedAt, experiences: 412, players: 5_100_000 },
      NOW,
    );

    // The age reported to an operator has to be the age of the data. A run
    // that fetches an observation Roblox stamped ten minutes ago is ten
    // minutes behind, however promptly the cron fired.
    expect(written.lastRecordedAt).toBe(observedAt);
    expect(written.at).toBe(NOW.toISOString());
    expect(written.consecutiveFailures).toBe(0);
  });

  it("keeps the last successful observation when a later run is skipped", async () => {
    const observedAt = minutesAgo(20);
    await recordHeartbeat(store, { outcome: "recorded", observedAt, players: 5_000_000 }, NOW);
    const after = await recordHeartbeat(
      store,
      { outcome: "skipped", detail: "Roblox returned 429." },
      NOW,
    );

    // The whole point of the merge: a failing run must not erase the record of
    // the last one that worked, because that record is what says how stale the
    // data now is.
    expect(after.lastRecordedAt).toBe(observedAt);
    expect(after.players).toBe(5_000_000);
    expect(after.outcome).toBe("skipped");
    expect(after.detail).toBe("Roblox returned 429.");
  });

  it("counts consecutive failures and resets on the next success", async () => {
    await recordHeartbeat(store, { outcome: "skipped", detail: "429" }, NOW);
    await recordHeartbeat(store, { outcome: "failed", detail: "write failed" }, NOW);
    const third = await recordHeartbeat(store, { outcome: "skipped", detail: "429" }, NOW);
    expect(third.consecutiveFailures).toBe(3);

    const recovered = await recordHeartbeat(
      store,
      { outcome: "recorded", observedAt: NOW.toISOString() },
      NOW,
    );
    expect(recovered.consecutiveFailures).toBe(0);
    expect(recovered.detail).toBeNull();
  });
});

describe("judging whether the collector is still alive", () => {
  it("calls a recent observation fresh and carries no complaint", () => {
    const health = assessCollector(heartbeat(), { now: NOW });
    expect(health.state).toBe("fresh");
    expect(health.ageMinutes).toBe(1);
    expect(health.detail).toBeNull();
  });

  it("tolerates a single missed run", () => {
    const health = assessCollector(
      heartbeat({ lastRecordedAt: minutesAgo(COLLECTION_INTERVAL_MINUTES + 1) }),
      { now: NOW },
    );
    // One gap is a hiccup. Failing here would train whoever watches this to
    // ignore it, which costs more than the gap does.
    expect(health.state).toBe("fresh");
  });

  it("turns stale at the threshold, not after it", () => {
    const health = assessCollector(
      heartbeat({
        lastRecordedAt: minutesAgo(COLLECTOR_STALE_MINUTES),
        outcome: "skipped",
        detail: "Roblox returned 429.",
        consecutiveFailures: 4,
      }),
      { now: NOW },
    );
    expect(health.state).toBe("stale");
    // The reason is worth surfacing while it is happening.
    expect(health.detail).toBe("Roblox returned 429.");
  });

  it("turns critical at the threshold", () => {
    const health = assessCollector(
      heartbeat({ lastRecordedAt: minutesAgo(COLLECTOR_CRITICAL_MINUTES) }),
      { now: NOW },
    );
    expect(health.state).toBe("critical");
    expect(health.ageMinutes).toBe(COLLECTOR_CRITICAL_MINUTES);
  });

  it("is critical when the collector runs but has never recorded anything", () => {
    const health = assessCollector(
      heartbeat({ outcome: "failed", lastRecordedAt: null, detail: "write failed" }),
      { now: NOW },
    );
    // A pulse with no data behind it is worse than no pulse: the cron is
    // firing, so nothing else will notice.
    expect(health.state).toBe("critical");
    expect(health.lastRunAt).not.toBeNull();
  });

  it("claims nothing about a collector with no build time to judge it by", () => {
    const health = assessCollector(null, { now: NOW, deployedAt: null });
    expect(health.state).toBe("unknown");
  });

  it("waits out the grace period after a deploy before complaining", () => {
    const health = assessCollector(null, {
      now: NOW,
      deployedAt: minutesAgo(COLLECTION_INTERVAL_MINUTES),
    });
    // A deploy a moment ago has not given the cron a chance to fire yet.
    expect(health.state).toBe("unknown");
  });

  it("calls a cron that has never fired since the deploy critical", () => {
    const health = assessCollector(null, { now: NOW, deployedAt: minutesAgo(6 * 60) });
    // This is the case a missing Cron Trigger produces, and it is the one that
    // would otherwise go unnoticed indefinitely.
    expect(health.state).toBe("critical");
    expect(health.detail).toContain("has not run once");
  });

  it("does not read clock skew as data from the future", () => {
    const health = assessCollector(
      heartbeat({ lastRecordedAt: new Date(NOW.getTime() + 90_000).toISOString() }),
      { now: NOW },
    );
    expect(health.ageMinutes).toBe(0);
    expect(health.state).toBe("fresh");
  });
});
