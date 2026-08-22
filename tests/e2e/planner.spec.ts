import { expect, test } from "@playwright/test";
import { describeOverflow, measureOverflow } from "../support/overflow";

/**
 * The earnings goal planner.
 *
 * The arithmetic is pinned by unit tests; these assert the promises the page
 * makes around it — that nothing is filled in on the reader's behalf, that a
 * date is never presented as a decision Roblox has made, and that the section
 * still says something with the island switched off.
 */

const ROUTE = "/usd-to-robux/#planner";

/** A local calendar date `days` from today, matching `<input type="date">`. */
function localDateIn(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

test.describe("earnings goal planner", () => {
  test("turns a pace into a date, and says what kind of date it is", async ({ page }) => {
    await page.goto(ROUTE);
    const planner = page.locator("#planner");

    await planner.getByLabel("Payout you are aiming for").fill("500");
    await planner.getByLabel("Earned Robux you expect to earn").fill("1000");
    await planner.getByLabel("Per", { exact: true }).selectOption("day");

    // 500 / 0.0038 = 131,578.9 → 131,579 Robux; at 1,000 a day that is 132.
    await expect(planner.getByText("131,579 R$").first()).toBeVisible();
    await expect(planner.getByText(/About 132 days away/)).toBeVisible();
    // The projection must never read as a payment date.
    await expect(planner.getByText(/not a date Roblox will pay on/)).toBeVisible();
  });

  test("gives no date for a pace of zero rather than dividing by it", async ({ page }) => {
    await page.goto(ROUTE);
    const planner = page.locator("#planner");

    await planner.getByLabel("Earned Robux you expect to earn").fill("0");
    await expect(planner.getByText("No date, at this pace.")).toBeVisible();
  });

  test("works back from a date to a required pace", async ({ page }) => {
    await page.goto(ROUTE);
    const planner = page.locator("#planner");

    await planner.getByLabel("Payout you are aiming for").fill("114");
    await planner.getByRole("button", { name: "When I need it" }).click();
    await planner.locator('input[type="date"]').fill(localDateIn(30));

    // 30,000 Robux across 30 days is exactly 1,000 a day.
    await expect(planner.getByText("1,000 Earned Robux a day.")).toBeVisible();
    await expect(planner.getByText(/rounded up: earning the rounded-down amount would miss/)).toBeVisible();
  });

  test("counts the reader's own calendar day, not a UTC one", async ({ page }) => {
    await page.goto(ROUTE);
    const planner = page.locator("#planner");

    await planner.getByRole("button", { name: "When I need it" }).click();
    // Tomorrow on the reader's calendar is in the future wherever they are.
    // Anchoring the plan to UTC made this read as "already arrived" for
    // anyone whose local day was ahead of it.
    await planner.locator('input[type="date"]').fill(localDateIn(1));
    await expect(planner.getByText("That date has already arrived.")).toHaveCount(0);
    await expect(planner.getByText(/Earned Robux a day\./)).toBeVisible();
  });

  test("fills in no fee and no tax on the reader's behalf", async ({ page }) => {
    await page.goto(ROUTE);
    const planner = page.locator("#planner");

    await planner.getByText("Fees and tax (optional)").click();
    for (const label of [
      "Payment provider fee",
      "Flat fee per payout",
      "Your own tax estimate",
    ]) {
      await expect(planner.getByLabel(label)).toHaveValue("");
    }

    // With nothing entered there is no deduction table at all: an untouched
    // planner must not imply that anything has been taken off.
    await expect(planner.getByText("Estimated amount you keep")).toHaveCount(0);
    await expect(
      planner.getByText(/publishes no default fee and no tax rate/),
    ).toBeVisible();
  });

  test("applies fees before tax once they are entered", async ({ page }) => {
    await page.goto(ROUTE);
    const planner = page.locator("#planner");

    await planner.getByLabel("Payout you are aiming for").fill("1000");
    await planner.getByText("Fees and tax (optional)").click();
    await planner.getByLabel("Payment provider fee").fill("2");
    await planner.getByLabel("Your own tax estimate").fill("10");

    await expect(
      planner.getByText("Your own tax estimate, on what is left after fees"),
    ).toBeVisible();
    await expect(planner.getByText("Estimated amount you keep")).toBeVisible();
  });

  test("never says a plan will be approved", async ({ page }) => {
    await page.goto(ROUTE);
    const planner = page.locator("#planner");

    await expect(planner.getByText(/does not mean the request will be approved/)).toBeVisible();

    const text = ((await planner.textContent()) ?? "").toLowerCase();
    for (const forbidden of ["you will be approved", "you are eligible", "guaranteed"]) {
      expect(text, `planner claims "${forbidden}"`).not.toContain(forbidden);
    }

    // "Roblox will pay on" appears here, and must only ever appear as the
    // thing a projection is not. A substring ban would forbid the disclaimer
    // itself, so this checks how the phrase is used rather than whether it
    // occurs — in either of the two negations the copy uses.
    for (const index of allIndexesOf(text, "roblox will pay on")) {
      expect(
        text.slice(Math.max(0, index - 30), index),
        "the phrase appears without being negated",
      ).toMatch(/(?:not|nothing here is) a date $/);
    }
  });

  test("explains itself with JavaScript disabled", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/usd-to-robux/");

    const section = page.locator("#planner");
    await expect(section.getByRole("heading", { name: "How long it takes at your pace" })).toBeVisible();
    // The formula and the limitation are server-rendered prose, so the
    // section is not an empty heading for a reader without the island.
    await expect(section.getByText(/days = remaining Earned Robux/)).toBeVisible();
    await expect(section.getByText(/Roblox publishes no DevEx processing time/)).toBeVisible();

    await context.close();
  });

  test("does not scroll sideways at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(ROUTE);
    await page.locator("#planner").getByLabel("Payout you are aiming for").fill("1000000");

    const report = await measureOverflow(page);
    expect(report.overflow, describeOverflow("/usd-to-robux/ with the planner", report)).toBeLessThanOrEqual(0);
  });
});

/** Every index at which `needle` occurs, so each use can be checked. */
function allIndexesOf(haystack: string, needle: string): number[] {
  const found: number[] = [];
  let at = haystack.indexOf(needle);
  while (at !== -1) {
    found.push(at);
    at = haystack.indexOf(needle, at + needle.length);
  }
  return found;
}
