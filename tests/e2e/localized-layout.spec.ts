import { expect, test } from "@playwright/test";
import { renderableLocales } from "../../src/i18n/visibility";
import { indexableRoutes } from "../../src/lib/content/route-registry";

/**
 * Layout, in the languages that break it.
 *
 * Files passing is not the same as pages working. German compounds run half
 * again as long as their English source — `Developer-Exchange-Aufwendungen` for
 * "developer exchange fees" — and French and Portuguese are longer still. A
 * translated site fails first at the narrow end, in a nav item that wraps onto
 * two lines, a table that pushes the page sideways, a button whose label no
 * longer fits inside it.
 *
 * Horizontal overflow is asserted rather than eyeballed, at the widths a real
 * device actually has, because it is the one layout failure that makes a page
 * unusable rather than untidy: the reader scrolls right to find the rest of a
 * sentence and the whole column moves with it.
 *
 * The pages checked are the ones with the most to go wrong — the calculator,
 * the rate tables, the live charts, the long legal prose — rather than all
 * thirty-six in six languages at five widths, which is nine hundred renders and
 * finds nothing the first dozen do not.
 *
 * Needs a build with `ENABLE_REVIEW_LOCALES=true`; with the flag off the locale
 * list is English alone and this suite is empty.
 */

const WIDTHS = [360, 390, 768, 1024, 1440];

/** Where long words and wide tables meet a narrow screen. */
const PAGES = [
  "/",
  "/devex-rates/",
  "/devex-requirements/",
  "/roblox-stats/",
  "/conversions/",
  "/terms/",
];

const targets = renderableLocales().filter((meta) => meta.locale !== "en");
const known = new Set(indexableRoutes.map((record) => record.route));

test.describe("localized layout", () => {
  test.skip(
    targets.length === 0,
    "No review locales in this build. Rebuild with ENABLE_REVIEW_LOCALES=true.",
  );

  for (const meta of targets) {
    for (const route of PAGES) {
      test(`${meta.locale} ${route} fits every width`, async ({ page }) => {
        expect(known.has(route), `${route} is not an indexable route`).toBe(true);

        const overflowing: string[] = [];

        for (const width of WIDTHS) {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(`${meta.prefix}${route}`);
          await page.waitForLoadState("networkidle");

          const scroll = await page.evaluate(() => ({
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: document.documentElement.clientWidth,
          }));

          // A pixel of slack: sub-pixel rounding on a scaled viewport is not a
          // layout defect and reporting it teaches people to ignore this.
          if (scroll.documentWidth > scroll.viewportWidth + 1) {
            overflowing.push(
              `${width}px: document is ${scroll.documentWidth}px wide in a ${scroll.viewportWidth}px viewport`,
            );
          }
        }

        expect(overflowing, `${meta.locale} ${route}`).toEqual([]);
      });
    }
  }

  test("the calculator stays usable at the narrowest width in every language", async ({ page }) => {
    // 360px is the narrowest phone in the matrix, and the calculator is the
    // one thing on the site that has to work there.
    for (const meta of targets) {
      await page.setViewportSize({ width: 360, height: 900 });
      await page.goto(`${meta.prefix}/`);

      const input = page.locator('input[inputMode="numeric"]').first();
      await expect(input, `${meta.locale} amount input`).toBeVisible();

      const box = await input.boundingBox();
      expect(box, `${meta.locale} input has no box`).not.toBeNull();
      if (box) {
        // Inside the viewport, and tall enough to hit with a thumb.
        expect(box.x, `${meta.locale} input starts off-screen`).toBeGreaterThanOrEqual(-1);
        expect(box.x + box.width, `${meta.locale} input runs past the edge`).toBeLessThanOrEqual(361);
        expect(box.height, `${meta.locale} input is too short to tap`).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test("renders in both themes without a console error", async ({ page }) => {
    for (const meta of targets) {
      for (const scheme of ["light", "dark"] as const) {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => {
          if (message.type() === "error") errors.push(message.text());
        });

        await page.emulateMedia({ colorScheme: scheme });
        await page.setViewportSize({ width: 390, height: 900 });
        await page.goto(`${meta.prefix}/`);
        await page.waitForLoadState("networkidle");

        // The body has to paint its own ground in both themes; a transparent
        // one borrows whatever is behind it and can land dark-on-dark.
        const background = await page.evaluate(
          () => getComputedStyle(document.body).backgroundColor,
        );
        expect(background, `${meta.locale} ${scheme} body background`).not.toBe(
          "rgba(0, 0, 0, 0)",
        );
        expect(errors, `${meta.locale} ${scheme}`).toEqual([]);
      }
    }
  });
});
