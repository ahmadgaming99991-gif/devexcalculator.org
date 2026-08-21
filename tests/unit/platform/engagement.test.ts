import { describe, expect, it } from "vitest";
import { engagement, hoursPerDauPerDay } from "@/lib/platform/metrics";

/**
 * The competitor this page is measured against shows "Total Registrations" and
 * an "Estimated Global Session Length". Roblox publishes neither, and these
 * tests are what stop that gap being filled with a number nobody can source.
 */
describe("engagement figures", () => {
  it("carries only reported figures in the data file", () => {
    // A derived figure in the data file would arrive with no visible
    // derivation. Anything derived is computed in code, where it can be read.
    for (const figure of engagement.figures) {
      expect(figure.origin).toBe("reported");
    }
  });

  it("derives hours per active user per day from the two reported totals", () => {
    // 29 billion hours ÷ 123 million daily actives ÷ 91 days.
    expect(hoursPerDauPerDay()).toBe("2.6");
  });

  it("follows the reported figures rather than a written-down answer", () => {
    const doubled = {
      ...engagement,
      reported: { ...engagement.reported, hoursBillions: "58" },
    };
    // Twice the hours over the same users and days is twice the time each.
    expect(hoursPerDauPerDay(doubled)).toBe("5.2");
  });

  it("records what Roblox does not publish, and why", () => {
    const ids = engagement.notPublished.map((entry) => entry.id);
    expect(ids).toContain("registrations");
    expect(ids).toContain("session-length");
    for (const entry of engagement.notPublished) {
      expect(entry.reason.length).toBeGreaterThan(40);
    }
  });
});
