import { expect, test } from "@playwright/test";
import { getLocaleMeta } from "../../src/i18n/config";
import { renderableLocales } from "../../src/i18n/visibility";
import { formatCurrency, formatRobux } from "../../src/lib/calculations/format";
import { getRateValue } from "../../src/lib/calculations/rate-registry";
import { standardRateId } from "../../src/lib/calculations/devex";
import { Rational } from "../../src/lib/calculations/rational";
import type { Locale } from "../../src/i18n/types";
import calculatorPtBR from "../../src/i18n/locales/pt-BR/calculator.json";
import calculatorEs from "../../src/i18n/locales/es/calculator.json";
import calculatorId from "../../src/i18n/locales/id/calculator.json";
import calculatorFr from "../../src/i18n/locales/fr/calculator.json";
import calculatorDe from "../../src/i18n/locales/de/calculator.json";
import calculatorTr from "../../src/i18n/locales/tr/calculator.json";

/**
 * The calculator, in every language the build renders.
 *
 * The rest of the suite drives the site in English and would pass unchanged if
 * every other language were broken, because it looks for English labels. Three
 * things can only fail in a translated page, and each of them fails silently:
 *
 *   1. **The islands never get their words.** A Client Component is handed the
 *      strings it renders, by key, from its server parent. A key the parent
 *      forgot throws at render — in that one language, on that one page, in the
 *      browser. Nothing in the build sees it.
 *
 *   2. **The reader cannot type a number.** German writes a hundred thousand as
 *      `100.000`. If the parser reads only the English shape, the reader's own
 *      keyboard produces an error on the site's main input, and the figure the
 *      site prints back is one they cannot type.
 *
 *   3. **The output is formatted for the wrong country.** A French page that
 *      answers `$3,800.00` has done the arithmetic correctly and still looks
 *      like somebody else's page.
 *
 * So this drives the real page in each locale, types the number the way that
 * locale writes it, and asserts the payout formatted the way that locale
 * formats it. Every expectation is computed from the same registry and the same
 * formatter the page uses, so a rate change moves the test with the site rather
 * than breaking it.
 *
 * Runs only against a build with `ENABLE_REVIEW_LOCALES=true`; with the flag
 * off, `renderableLocales()` is English alone and this suite is empty, which is
 * the correct behaviour for a production build where those URLs are 404.
 */

const AMOUNT = 100_000;
const standardRate = getRateValue(standardRateId);
const expectedPayout = Rational.fromInt(AMOUNT).mul(standardRate);

/** How this locale's reader would type the amount, using its own separators. */
function asTyped(locale: Locale): string {
  return formatRobux(locale, AMOUNT);
}


/**
 * The amount input's label, in each language.
 *
 * Static imports rather than a path built from the locale: a dynamic import
 * here would be a second way to reach a dictionary, and the reason there is
 * exactly one is that the other ways are how a language ends up half-loaded.
 */
const AMOUNT_LABEL: Partial<Record<Locale, string>> = {
  "pt-BR": calculatorPtBR.inputs.eligibleEarnedRobux.label,
  es: calculatorEs.inputs.eligibleEarnedRobux.label,
  id: calculatorId.inputs.eligibleEarnedRobux.label,
  fr: calculatorFr.inputs.eligibleEarnedRobux.label,
  de: calculatorDe.inputs.eligibleEarnedRobux.label,
  tr: calculatorTr.inputs.eligibleEarnedRobux.label,
};

function amountLabel(locale: Locale): string {
  const label = AMOUNT_LABEL[locale];
  if (label === undefined) throw new Error(`No amount label recorded for "${locale}".`);
  return label;
}

const targets = renderableLocales().filter((meta) => meta.locale !== "en");

test.describe("localized calculator", () => {
  test.skip(
    targets.length === 0,
    "No review locales in this build. Rebuild with ENABLE_REVIEW_LOCALES=true.",
  );

  for (const meta of targets) {
    const locale = meta.locale;

    test.describe(`${locale}`, () => {
      test("renders the homepage in its own language", async ({ page }) => {
        await page.goto(`${meta.prefix}/`);

        // The attribute a screen reader pronounces from. Wrong here and every
        // other assertion below is decoration.
        await expect(page.locator("html")).toHaveAttribute("lang", meta.htmlLang);
        await expect(page.locator("html")).toHaveAttribute("dir", meta.direction);
      });

      test("converts an amount typed the way this locale writes it", async ({ page }) => {
        await page.goto(`${meta.prefix}/`);

        const input = page.getByLabel(amountLabel(locale));

        // Typed with this locale's group separator — the shape its own reader
        // produces, and the shape the page itself prints.
        await input.fill(asTyped(locale));

        /*
         * Scoped to the result, and that is the whole point of this assertion.
         *
         * An earlier version searched the page for the expected payout and
         * took the first match, which passed while the calculator was broken:
         * `formatCurrency(locale, 380, "USD")` also appears in the worked-
         * examples table further down, so the test found a static figure and
         * reported success. The calculator was reading `100.000` as a hundred
         * and answering $0.38, and this test said it was fine.
         */
        const result = page.getByTestId("primary-result");
        await expect(result).toContainText(formatCurrency(locale, expectedPayout, "USD"));
      });

      test("an island that throws would fail here, not silently", async ({ page }) => {
        // A missing key throws inside the Client Component. React logs it and
        // renders nothing where the island was, so the page still returns 200:
        // the only way to see it is to watch the console while the island
        // hydrates.
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        page.on("console", (message) => {
          if (message.type() === "error") errors.push(message.text());
        });

        await page.goto(`${meta.prefix}/`);
        await page.getByLabel(amountLabel(locale)).fill(asTyped(locale));
        await expect(page.getByTestId("primary-result")).toContainText(
          formatCurrency(locale, expectedPayout, "USD"),
        );

        expect(errors, `console errors on ${meta.prefix}/`).toEqual([]);
      });

      test("stays in this language when a link is followed", async ({ page }) => {
        await page.goto(`${meta.prefix}/devex-rates/`);

        const hrefs = await page.locator("a[href^='/']").evaluateAll((links) =>
          links.map((link) => link.getAttribute("href") ?? ""),
        );

        // Endpoints and documents have one address and no localized form.
        const pageLinks = hrefs.filter(
          (href) => !/^\/(api|feed|sitemap|llms|robots|opensearch|manifest)/.test(href),
        );

        const strayed = pageLinks.filter((href) => !href.startsWith(`${meta.prefix}/`));
        expect(strayed, `links leaving ${locale}`).toEqual([]);
      });

      test("carries noindex while it awaits a native review", async ({ page }) => {
        await page.goto(`${meta.prefix}/`);
        const robots = await page
          .locator('meta[name="robots"]')
          .first()
          .getAttribute("content");

        // `ENABLE_REVIEW_LOCALES` decides whether these pages render. It must
        // never decide whether they may be indexed.
        expect(getLocaleMeta(locale).status).toBe("review");
        expect(robots ?? "").toContain("noindex");
      });
    });
  }
});
