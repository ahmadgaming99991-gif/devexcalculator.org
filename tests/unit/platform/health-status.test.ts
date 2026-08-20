import { describe, expect, it } from "vitest";
import { healthStatusCode, isHealthy, worstState } from "@/lib/api/health-status";

/**
 * The regression these guard against shipped and sat in production: the health
 * endpoint returned `{"ok": true}` with a 200 whatever state the site was in,
 * so a rate registry three months past review — the one failure this site
 * cannot afford — answered exactly like a healthy one.
 */
describe("health status", () => {
  it("takes the worst of several states", () => {
    expect(worstState(["fresh", "stale"])).toBe("stale");
    expect(worstState(["critical", "fresh"])).toBe("critical");
    expect(worstState(["unknown", "fresh"])).toBe("fresh");
  });

  it("reports unknown when there is nothing to judge", () => {
    expect(worstState([])).toBe("unknown");
    expect(worstState(["unknown", "unknown"])).toBe("unknown");
  });

  it("fails on critical", () => {
    expect(isHealthy("critical")).toBe(false);
    expect(healthStatusCode("critical")).toBe(503);
  });

  it("does not fail on stale", () => {
    // Stale is shown in the body and left at 200 on purpose: an alert that
    // fires on something nobody needs to act on gets muted, and a muted alert
    // is no better than the hardcoded `true` this replaced.
    expect(isHealthy("stale")).toBe(true);
    expect(healthStatusCode("stale")).toBe(200);
  });

  it("does not fail on an unobservable environment", () => {
    // No KV binding in a local run or in CI. An absence of evidence is not
    // evidence of a fault, and treating it as one would fail every build.
    expect(healthStatusCode("unknown")).toBe(200);
    expect(healthStatusCode("fresh")).toBe(200);
  });
});
