import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Visual capture.
 *
 * Produces screenshots for manual review rather than asserting against golden
 * images. Pixel comparison across three browsers and nine viewports generates
 * more false failures than it catches real regressions, and the specification
 * is explicit that passing automated tests is not visual acceptance — a person
 * has to look at these.
 *
 * What is asserted automatically is the thing a screenshot cannot show
 * reliably: that nothing overflows horizontally at any captured width.
 *
 * Run with `npm run test:visual`. Output lands in tests/visual/__screenshots__/.
 */

const OUTPUT = join(__dirname, "__screenshots__");
mkdirSync(OUTPUT, { recursive: true });

const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "425x887", width: 425, height: 887 },
  { name: "390x844", width: 390, height: 844 },
  { name: "360x800", width: 360, height: 800 },
  { name: "320x568", width: 320, height: 568 },
] as const;

const SCENARIOS = [
  { name: "home-quick", path: "/" },
  { name: "home-result", path: "/?robux=100000" },
  { name: "home-advanced", path: "/?mode=advanced&standard=80000&legacy=20000" },
  { name: "home-target", path: "/?mode=target&target=1000&current=131579" },
  { name: "home-large-number", path: "/?robux=99999999999" },
  { name: "home-below-minimum", path: "/?robux=10000" },
  { name: "robux-to-usd", path: "/robux-to-usd/" },
  { name: "devex-rates", path: "/devex-rates/" },
  { name: "devex-requirements", path: "/devex-requirements/" },
  { name: "conversions", path: "/conversions/" },
  { name: "amount-page", path: "/conversions/100000-robux-to-usd/" },
  { name: "tax-calculator", path: "/robux-tax-calculator/" },
  { name: "legal-article", path: "/privacy/" },
  { name: "not-found", path: "/this-page-does-not-exist/" },
] as const;

test.describe("visual capture", () => {
  for (const viewport of VIEWPORTS) {
    test(`${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const scenario of SCENARIOS) {
        await page.goto(scenario.path);
        await page.waitForLoadState("networkidle");

        await page.screenshot({
          path: join(OUTPUT, `${scenario.name}--${viewport.name}.png`),
          fullPage: true,
        });

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(
          overflow,
          `${scenario.name} overflows horizontally at ${viewport.name}`,
        ).toBeLessThanOrEqual(0);
      }
    });
  }

  test("validation error state", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByLabel("Eligible Earned Robux").fill("not a number");
    await expect(page.getByRole("alert").first()).toBeVisible();
    await page.screenshot({ path: join(OUTPUT, "validation-error--390x844.png"), fullPage: true });
  });

  test("FX unavailable state", async ({ page }) => {
    await page.route("**/api/fx/**", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          error: {
            code: "FX_UNAVAILABLE",
            message:
              "Local-currency estimates are temporarily unavailable. The USD calculator still works.",
          },
        }),
      }),
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/?robux=100000&currency=GBP");
    await expect(page.getByText(/temporarily unavailable/i)).toBeVisible();
    await page.screenshot({ path: join(OUTPUT, "fx-unavailable--1440x900.png"), fullPage: true });
  });

  test("mobile navigation open", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.screenshot({ path: join(OUTPUT, "mobile-nav-open--390x844.png") });
  });

  test("dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    for (const viewport of [
      { name: "1440x900", width: 1440, height: 900 },
      { name: "390x844", width: 390, height: 844 },
    ]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const path of ["/?robux=100000", "/devex-rates/"]) {
        await page.goto(path);
        const label = path === "/devex-rates/" ? "rates" : "home-result";
        await page.screenshot({
          path: join(OUTPUT, `dark-${label}--${viewport.name}.png`),
          fullPage: true,
        });
      }
    }
  });

  test("200 percent text zoom", async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 900 });
    await page.goto("/?robux=100000");
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "32px";
    });
    await page.screenshot({ path: join(OUTPUT, "zoom-200--640x900.png"), fullPage: true });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
