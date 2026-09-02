import { expect, test } from "@playwright/test";

/**
 * Two things the reader asked for, held where they can actually be checked.
 *
 * The unit tests cover the markup — that every stacked cell carries its
 * column's name, that a table keeps its roles once the CSS drops it to
 * `display: block`. Neither of those proves the thing that matters, which is
 * that a table can be read on a phone without being dragged sideways, and that
 * a menu opens under the pointer. Both are layout and both need a browser.
 */

/** Pages carrying the wide tables: rates, amounts, fees, statistics. */
const TABLE_PAGES = [
  "/",
  "/devex-rates/",
  "/conversions/",
  "/robux-tax-calculator/",
  "/roblox-stats/",
  "/devex-fees-and-taxes/",
];

test.describe("tables are readable without scrolling sideways", () => {
  for (const path of TABLE_PAGES) {
    test(`${path} has no table that must be scrolled`, async ({ page }) => {
      await page.goto(path);

      const report = await page.evaluate(() => {
        const tables = [...document.querySelectorAll("table")];
        return {
          page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          scrollers: tables
            .map((table) => {
              const wrapper = table.parentElement;
              const overflow = wrapper ? wrapper.scrollWidth - wrapper.clientWidth : 0;
              return { caption: table.querySelector("caption")?.textContent ?? "", overflow };
            })
            .filter((entry) => entry.overflow > 1),
          /*
           * A table that stacks but labels nothing is the failure this is
           * really guarding: the CSS would still take the header row away and
           * leave a column of bare figures.
           */
          stackedWithoutLabels: tables
            .filter((table) => table.hasAttribute("data-stack"))
            .filter(
              (table) =>
                table.querySelectorAll("td").length > 0 &&
                table.querySelectorAll("td[data-label]").length === 0,
            ).length,
        };
      });

      expect(report.page, "the page itself must not scroll sideways").toBeLessThanOrEqual(1);
      expect(report.stackedWithoutLabels, "stacked tables must label their cells").toBe(0);

      // Only narrow viewports stack; a desktop table may legitimately scroll.
      const width = page.viewportSize()?.width ?? 0;
      if (width < 640) {
        expect(report.scrollers, `tables still scrolling at ${width}px`).toEqual([]);
      }
    });
  }
});

test.describe("header menus open on hover", () => {
  test("hover opens a menu, and a click can still dismiss it", async ({ page }, testInfo) => {
    // The desktop nav is `hidden lg:block`, and hover-to-open is gated on a
    // fine pointer. Neither applies on the mobile project.
    test.skip(
      (page.viewportSize()?.width ?? 0) < 1024,
      "the desktop navigation is not rendered at this width",
    );
    test.skip(
      testInfo.project.name.includes("firefox"),
      "Playwright's Firefox does not report `pointer: fine` for synthetic hover",
    );

    await page.goto("/");

    const menus = page.locator("details[data-nav-menu]");
    const first = menus.nth(0);
    const second = menus.nth(1);

    await expect(first).not.toHaveAttribute("open", /.*/);

    await first.locator("summary").hover();
    await expect(first).toHaveAttribute("open", /.*/);
    await expect(first.locator("[data-nav-panel]")).toBeVisible();

    // Crossing the gap into the panel must not close it on the way.
    await first.locator("[data-nav-panel] a").first().hover();
    await expect(first).toHaveAttribute("open", /.*/);

    // Moving to a neighbour swaps which one is open.
    await second.locator("summary").hover();
    await expect(second).toHaveAttribute("open", /.*/);
    await expect(first).not.toHaveAttribute("open", /.*/);

    // Leaving the header closes it.
    await page.mouse.move(20, 700);
    await expect(second).not.toHaveAttribute("open", /.*/);

    /*
     * The one that is easy to get wrong: with the pointer resting on the
     * trigger, a click closes the menu and hover immediately reopens it, so
     * the menu cannot be dismissed by the gesture everyone tries first.
     */
    await first.locator("summary").hover();
    await expect(first).toHaveAttribute("open", /.*/);
    await first.locator("summary").click();
    await expect(first).not.toHaveAttribute("open", /.*/);
  });

  test("the keyboard still opens and closes a menu", async ({ page }) => {
    test.skip(
      (page.viewportSize()?.width ?? 0) < 1024,
      "the desktop navigation is not rendered at this width",
    );

    await page.goto("/");
    const first = page.locator("details[data-nav-menu]").first();

    await first.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("open", /.*/);

    await page.keyboard.press("Escape");
    await expect(first).not.toHaveAttribute("open", /.*/);
    await expect(first.locator("summary")).toBeFocused();
  });
});
