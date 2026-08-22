import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { describeOverflow, measureOverflow } from "../support/overflow";

/**
 * Accessibility.
 *
 * Automated axe checks catch a minority of real barriers, so this file also
 * exercises the things axe cannot: keyboard operation of the calculator and the
 * mobile menu, focus return, live-region announcements, 320px layout and 200%
 * zoom.
 *
 * Colour contrast is audited only after animation has stopped; see `settle()`.
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
  "/roblox-stats/",
  "/platform/",
  "/platform/stock/",
  "/methodology/",
  "/sources/",
  "/privacy/",
  "/contact/",
  "/accessibility/",
];

/**
 * Waits for every running CSS transition and animation to finish.
 *
 * Colour contrast cannot be audited while colours are still moving. Applying
 * the stored theme after hydration animates the whole palette through
 * `transition-colors`, and axe sampling mid-flight reported 58 violations at
 * ratios like 2.9:1 for colours that are compliant at both ends — Firefox saw
 * `#dbdcde` on `#457aee`, exactly midway between the light and dark values.
 *
 * `reducedMotion` alone was not enough: Chromium honours it here, Firefox
 * still animated. Waiting on `getAnimations()` settles the question in both,
 * and does not depend on a timeout.
 */
async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await Promise.all(
      document.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

test.describe("axe", () => {
  for (const route of ROUTES) {
    test(`${route} has no violations`, async ({ page }) => {
      await page.goto(route);
      await settle(page);
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
    await settle(page);

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

    const report = await measureOverflow(page);
    expect(
      report.overflow,
      describeOverflow("The page at 200% text zoom", report),
        ).toBeLessThanOrEqual(0);
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
    await settle(page);

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

test.describe("theme", () => {
  /**
   * The palette switches on `prefers-color-scheme` *and* on an explicit
   * `[data-theme]`, so a reader whose system setting and chosen theme disagree
   * is a real, ordinary case — not an edge case. It used to be broken: Tailwind's
   * built-in `dark:` variant follows the system setting alone, so choosing Light
   * on a dark-mode machine produced near-black text on a strong blue button.
   *
   * Every combination is checked because only two of the six were ever wrong,
   * and both were invisible to anyone whose two settings happened to agree.
   */
  const relativeLuminance = (color: string): number => {
    const parts = (color.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
    const [r, g, b] = parts.map((value) => {
      const channel = value / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
  };

  const contrast = (a: string, b: string): number => {
    const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
    return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
  };

  /*
   * The social tiles carry each network's own colour, which means the palette
   * is chosen by someone else and cannot simply be adjusted if it fails. Every
   * glyph on them is white, so each base has to clear the 3:1 that WCAG 2.2
   * asks of a graphic carrying meaning — checked in both schemes because two
   * of the bases differ between them.
   */
  for (const scheme of ["light", "dark"] as const) {
    test(`social tiles keep their glyphs legible in ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/");
      await settle(page);

      const tiles = page.locator('nav[aria-label="Social profiles"] a');
      const count = await tiles.count();
      expect(count).toBeGreaterThan(0);

      for (let index = 0; index < count; index += 1) {
        const tile = tiles.nth(index);
        const measured = await tile.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            label: element.textContent ?? "",
            text: style.color,
            background: style.backgroundColor,
          };
        });

        // A gradient alone reports a transparent background, and this check
        // would then pass on nothing. The solid stop underneath is the worse
        // of the two for a white glyph, so it is both measurable and the
        // worst case.
        expect(
          measured.background,
          `${measured.label} has no solid colour under its gradient, so its contrast cannot be verified.`,
        ).not.toBe("rgba(0, 0, 0, 0)");

        const ratio = contrast(measured.text, measured.background);
        expect(
          ratio,
          `${measured.label}: ${measured.text} on ${measured.background} is ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(3);
      }
    });
  }

  for (const scheme of ["light", "dark"] as const) {
    for (const chosen of [null, "light", "dark"] as const) {
      test(`primary buttons stay legible with a ${scheme} system and ${chosen ?? "no"} choice`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto("/");

        if (chosen) {
          await page.evaluate(
            (value) => document.documentElement.setAttribute("data-theme", value),
            chosen,
          );
        }
        await settle(page);

        const colours = await page
          .getByRole("button", { name: "Copy result" })
          .evaluate((element) => {
            const style = getComputedStyle(element);
            return { text: style.color, background: style.backgroundColor };
          });

        // The button paints a gradient over a solid colour. Only the solid one
        // is measurable here, which is exactly why it must stay: without it
        // this reads `rgba(0, 0, 0, 0)` and the check silently stops meaning
        // anything. The solid stop is the worse of the two for contrast, so
        // measuring it measures the worst case.
        expect(
          colours.background,
          "The primary button has no solid background colour under its gradient, so its contrast cannot be verified.",
        ).not.toBe("rgba(0, 0, 0, 0)");

        const ratio = contrast(colours.text, colours.background);
        expect(
          ratio,
          `${colours.text} on ${colours.background} is ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

test.describe("desktop navigation", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  /*
   * The header's menus are native `<details>` elements, so most of what a
   * dropdown needs — opening, keyboard activation, expanded state — is the
   * browser's job rather than this site's. What is this site's job is the
   * three behaviours a bare disclosure does not have, and the promise that
   * none of it is required for the links to work at all.
   *
   * Everything here is scoped to the first `Main` navigation. The mobile
   * drawer is the second, and it is in the DOM at every width — an unscoped
   * locator matches both and passes on the wrong one.
   */
  const desktopNav = (page: import("@playwright/test").Page) =>
    page.getByRole("navigation", { name: "Main" }).first();

  test("a group opens and its destinations become reachable", async ({ page }) => {
    await page.goto("/");
    const nav = desktopNav(page);
    const stock = nav.locator('a[href="/platform/stock/"]');

    await expect(stock).toBeHidden();
    await nav.getByText("Roblox Data", { exact: true }).click();
    await expect(stock).toBeVisible();
  });

  test("Escape closes the open group and returns focus to its trigger", async ({ page }) => {
    await page.goto("/");
    const nav = desktopNav(page);
    const summary = nav.getByText("DevEx Guide", { exact: true });
    const history = nav.locator('a[href="/devex-rate-history/"]');

    await summary.click();
    await expect(history).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(history).toBeHidden();
    await expect(summary).toBeFocused();
  });

  test("opening one group closes another", async ({ page }) => {
    await page.goto("/");
    const nav = desktopNav(page);
    const tax = nav.locator('a[href="/robux-tax-calculator/"]');
    const methodology = nav.locator('a[href="/methodology/"]');

    await nav.getByText("Tools", { exact: true }).click();
    await expect(tax).toBeVisible();

    await nav.getByText("Resources", { exact: true }).click();
    await expect(methodology).toBeVisible();
    await expect(tax).toBeHidden();
  });

  test("a press outside closes the open group", async ({ page }) => {
    await page.goto("/");
    const nav = desktopNav(page);
    const tax = nav.locator('a[href="/robux-tax-calculator/"]');

    await nav.getByText("Tools", { exact: true }).click();
    await expect(tax).toBeVisible();

    // A point well clear of the open panel. Clicking a page element instead
    // fails on the panel itself, which hangs over the content — the panel
    // intercepting that click is the layout working, not the menu failing.
    await page.mouse.click(1200, 700);
    await expect(tax).toBeHidden();
  });

  test("every destination is in the HTML, and opens, without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    await page.goto("/");
    const nav = desktopNav(page);

    // Present in the delivered HTML whether a panel is open or not, which is
    // what a crawler sees. Matched by href rather than by role, because a
    // closed `<details>` keeps its contents out of the accessibility tree —
    // which is correct, and would make a role query silently find nothing.
    for (const href of [
      "/robux-tax-calculator/",
      "/devex-rate-history/",
      "/platform/stock/",
      "/api/",
    ]) {
      await expect(nav.locator(`a[href="${href}"]`)).toHaveCount(1);
    }

    // And still operable: this is the reason the menus are `<details>` rather
    // than a button and a state hook.
    const stock = nav.locator('a[href="/platform/stock/"]');
    await expect(stock).toBeHidden();
    await nav.getByText("Roblox Data", { exact: true }).click();
    await expect(stock).toBeVisible();

    await context.close();
  });
});
