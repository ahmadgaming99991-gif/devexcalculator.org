/**
 * Where each component's words live, and which section a line falls in.
 *
 * Shared by every extractor rather than copied into each. Two copies of this
 * map would drift the first time a page moved namespace, and the symptom would
 * be a paragraph written to a key nothing reads — silent, because the page
 * still renders its own literal.
 */

import { readFileSync } from "node:fs";

/**
 * Which namespace each page's prose belongs in, and under which key.
 *
 * Explicit rather than derived from the path: `/platform/stock/` is platform
 * prose and `/robux-tax-calculator/` is marketplace prose, and no path rule
 * gets both right. A page missing from this map is a build failure rather than
 * prose that quietly goes nowhere.
 */
export const PLACEMENT: Readonly<Record<string, readonly [namespace: string, prefix: string]>> = {
  "src/app/page.tsx": ["calculator", "home.body"],
  "src/app/about/page.tsx": ["trust", "about.body"],
  "src/app/accessibility/page.tsx": ["legal", "accessibility.body"],
  "src/app/api/page.tsx": ["trust", "api.body"],
  "src/app/calculators/page.tsx": ["guides", "calculators.body"],
  "src/app/error.tsx": ["errors", "boundary.prose"],
  "src/app/layout.tsx": ["common", "shell.body"],
  "src/app/changelog/page.tsx": ["trust", "changelog.body"],
  "src/app/contact/page.tsx": ["contact", "page.body"],
  "src/app/conversions/page.tsx": ["rates", "conversions.body"],
  "src/app/conversions/[slug]/page.tsx": ["rates", "amountPage.body"],
  "src/app/corrections/page.tsx": ["trust", "corrections.body"],
  "src/app/devex-fees-and-taxes/page.tsx": ["rates", "feesAndTaxes.body"],
  "src/app/devex-rate-history/page.tsx": ["rates", "rateHistory.body"],
  "src/app/devex-rates/page.tsx": ["rates", "devexRates.body"],
  "src/app/devex-requirements/page.tsx": ["rates", "requirements.body"],
  "src/app/disclaimer/page.tsx": ["legal", "disclaimer.body"],
  "src/app/earned-robux/page.tsx": ["rates", "earnedRobux.body"],
  "src/app/editorial-policy/page.tsx": ["trust", "editorialPolicy.body"],
  "src/app/guides/page.tsx": ["guides", "index.body"],
  "src/app/how-to-cash-out-robux/page.tsx": ["guides", "cashOut.body"],
  "src/app/methodology/page.tsx": ["trust", "methodology.body"],
  "src/app/not-found.tsx": ["errors", "notFound.prose"],
  "src/app/platform/page.tsx": ["platform", "live.body"],
  "src/app/platform/stock/page.tsx": ["platform", "stock.body"],
  "src/app/privacy/page.tsx": ["legal", "privacy.body"],
  "src/app/roblox-stats/page.tsx": ["platform", "stats.body"],
  "src/app/robux-tax-calculator/page.tsx": ["rates", "robuxTax.body"],
  "src/app/robux-to-usd/page.tsx": ["rates", "robuxToUsd.body"],
  "src/app/sources/page.tsx": ["trust", "sources.body"],
  "src/app/terms/page.tsx": ["legal", "terms.body"],
  "src/app/usd-to-robux/page.tsx": ["rates", "usdToRobux.body"],
  "src/components/content/index.tsx": ["common", "content.body"],
  "src/components/ui/index.tsx": ["common", "ui.body"],
  "src/features/devex/components/actions.tsx": ["calculator", "actions.body"],
  "src/features/devex/components/controls.tsx": ["calculator", "controls.body"],
  "src/components/content/tables.tsx": ["common", "tables.body"],
  "src/components/content/data-download.tsx": ["common", "download.body"],
  "src/components/layout/nav-disclosures.tsx": ["navigation", "disclosures.body"],
  "src/features/contact/contact-form.tsx": ["contact", "form.body"],
  "src/features/devex/calculator.tsx": ["calculator", "body"],
  "src/features/marketplace/calculator.tsx": ["marketplace", "body"],
  "src/features/devex/components/results.tsx": ["calculator", "results.body"],
  "src/features/devex/group-split.tsx": ["calculator", "groupSplit.body"],
  "src/features/devex/planner.tsx": ["calculator", "planner.body"],
  "src/features/devex/preparation-checklist.tsx": ["calculator", "preparation.body"],
  "src/components/seo/analytics-consent.tsx": ["common", "consent.body"],
  "src/components/seo/analytics.tsx": ["common", "analytics.body"],
  "src/components/layout/rate-source-check.tsx": ["common", "sourceCheck.body"],
  "src/components/layout/site-footer.tsx": ["common", "footer.body"],
  "src/components/layout/site-header.tsx": ["common", "header.body"],
  "src/components/layout/footer-status.tsx": ["common", "footer.status"],
  "src/components/layout/desktop-navigation.tsx": ["navigation", "desktop.body"],
  "src/components/layout/mobile-navigation.tsx": ["navigation", "mobile.body"],
  "src/components/layout/breadcrumbs.tsx": ["navigation", "breadcrumbs.body"],
  "src/components/layout/social-links.tsx": ["common", "social.body"],
  "src/components/layout/theme-toggle.tsx": ["common", "theme.body"],
  "src/components/layout/logo.tsx": ["common", "logo.body"],
  "src/components/content/maintainer-line.tsx": ["common", "byline.body"],
  "src/components/diagrams/index.tsx": ["common", "diagrams.body"],
  "src/components/charts/index.tsx": ["common", "charts.body"],
  "src/features/devex/currency-select.tsx": ["calculator", "currency.body"],
  "src/features/devex/saved-calculations.tsx": ["calculator", "saved.body"],
  "src/app/authors/page.tsx": ["trust", "authors.body"],
  "src/app/authors/[slug]/page.tsx": ["trust", "authorPage.body"],
};

/**
 * The `<Section id="…">` a line falls inside.
 *
 * Read from the component itself rather than from a report, because a report
 * has already lost the surrounding markup. Falls back to `intro` for anything
 * above the first section — every one of these pages opens with a lead
 * paragraph before its first anchor.
 */
export function sectionMarks(absolutePath: string): { line: number; id: string }[] {
  const lines = readFileSync(absolutePath, "utf8").split(/\r?\n/);
  const marks: { line: number; id: string }[] = [];
  lines.forEach((line, index) => {
    const match = /\bid=["']([a-z0-9-]+)["']/.exec(line);
    if (match?.[1]) marks.push({ line: index + 1, id: match[1] });
  });
  return marks;
}

/** `rate-comparison` becomes `rateComparison`, so it reads as a key. */
export function camel(value: string): string {
  return value.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** The section key a given line belongs to. */
export function sectionKeyFor(absolutePath: string, line: number): string {
  let section = "intro";
  for (const mark of sectionMarks(absolutePath)) {
    if (mark.line <= line) section = mark.id;
    else break;
  }
  return camel(section);
}
