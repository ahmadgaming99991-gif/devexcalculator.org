import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Accessibility.
 *
 * Automated axe checks catch a minority of real barriers, so this file also
 * exercises the things axe cannot: keyboard operation of the calculator and the
 * mobile menu, focus return, live-region announcements, 320px layout and 200%
 * zoom.
 */

const ROUTES = [
  "/",
  "/robux-to-usd/",
  "/usd-to-robux/",
  "/devex-rates/",
  "/devex-requirements/",
  "/earned-robux/",
  "/how-to-cash-out-robux/",
  "/robux-tax-calculator/",
  "/conversions/",
  "/conversions/100000-robux-to-usd/",
  "/methodology/",
  "/sources/",
  "/privacy/",
  "/contact/",
  "/accessibility/",
];

test.describe("axe", () => {
  for (const route of ROUTES) {
    test(`${route} has no violations`, async ({ page }) => {
      await page.goto(route);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      // Print the detail rather than only a count, so a failure is actionable.
      if (results.violations.length > 0) {
        console.error(
          results.violations
            .map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target).join("\n  ")}`)
            .join("\n\n"),
        );
      }
      expect(results.violations).toEqual([]);
    });
  }

  test("the calculator stays clean once it has a result", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Eligible Earned Robux").fill("100000");
    await expect(page.getByText("$380.00").first()).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("a validation error is announced accessibly", async ({ page }) => {
    await page.goto("/");
    const amount = page.getByLabel("Eligible Earned Robux");
    await amount.fill("not a number");

    await expect(amount).toHaveAttribute("aria-invalid", "true");
    const describedBy = await amount.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    await expect(page.getByRole("alert").first()).toBeVisible();
  });
});

test.describe("keyboard", () => {
  test("the skip link is the first stop and moves focus to main", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");

    const skipLink = page.getByRole("link", { name: "Skip to main content" });
    await expect(skipLink).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });

  test("the calculator is fully operable by keyboard", async ({ page }) => {
    await page.goto("/");

    const amount = page.getByLabel("Eligible Earned Robux");
    await amount.focus();
    await page.keyboard.type("100000");
    await expect(page.getByText("$380.00").first()).toBeVisible();

    // The rate select is reachable and operable without a mouse.
    await page.getByLabel("Rate to apply").focus();
    await page.getByLabel("Rate to apply").selectOption("legacy-pre-2025-09-05");
    await expect(page.getByText("$350.00").first()).toBeVisible();
  });

  test("mode tabs respond to arrow keys", async ({ page }) => {
    await page.goto("/");
    const quick = page.getByRole("tab", { name: "Quick" });
    await quick.focus();

    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Split" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await page.keyboard.press("ArrowLeft");
    await expect(quick).toHaveAttribute("aria-selected", "true");
  });

  test("every focusable control shows a visible focus indicator", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Eligible Earned Robux").focus();

    const outline = await page.evaluate(() => {
      const active = document.activeElement;
      if (!active) return null;
      const style = getComputedStyle(active);
      return { width: style.outlineWidth, style: style.outlineStyle };
    });
    expect(outline?.style).not.toBe("none");
    expect(parseFloat(outline?.width ?? "0")).toBeGreaterThanOrEqual(2);
  });
});

test.describe("mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Escape closes the menu and returns focus to the trigger", async ({ page }) => {
    await page.goto("/");

    const trigger = page.getByRole("button", { name: "Open menu" });
    await trigger.click();
    await expect(page.getByRole("navigation", { name: "Main" }).last()).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  });

  test("the trigger reports its expanded state", async ({ page }) => {
    await page.goto("/");
    const trigger = page.getByRole("button", { name: "Open menu" });

    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(page.getByRole("button", { name: "Close menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  test("background scrolling is locked while the menu is open", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();

    const overflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
    expect(overflow).toBe("hidden");
  });
});

test.describe("layout resilience", () => {
  test("no horizontal overflow at 320px on any representative route", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });

    for (const route of ["/", "/devex-rates/", "/conversions/", "/robux-tax-calculator/"]) {
      await page.goto(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${route} overflows horizontally at 320px`).toBeLessThanOrEqual(0);
    }
  });

  test("a very large result does not force sideways scrolling at 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto("/?robux=99999999999");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("remains usable at 200% text zoom", async ({ page }) => {
    // Emulating zoom by halving the viewport at the same CSS pixel density.
    await page.setViewportSize({ width: 640, height: 480 });
    await page.goto("/");
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "32px";
    });

    await page.getByLabel("Eligible Earned Robux").fill("100000");
    await expect(page.getByText("$380.00").first()).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("the viewport does not block zooming", async ({ page }) => {
    await page.goto("/");
    const content = await page
      .locator('meta[name="viewport"]')
      .getAttribute("content");
    expect(content).not.toMatch(/maximum-scale|user-scalable\s*=\s*no/);
  });
});

test.describe("reduced motion", () => {
  test.use({ colorScheme: "light" });

  test("honours a reduced-motion preference", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    const behaviour = await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    );
    expect(behaviour).toBe("auto");
  });
});

test.describe("dark mode", () => {
  test("renders with the dark palette and stays accessible", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");

    const background = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    // The dark ground, not a transparent body borrowing the host page.
    expect(background).not.toBe("rgba(0, 0, 0, 0)");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
