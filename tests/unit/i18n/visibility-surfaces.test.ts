import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The eight surfaces `visibility.ts` says it governs, checked one at a time.
 *
 * That file's header says "every surface asks the same two questions, so there
 * is no sixth place somebody forgets", and then lists eight. Three of them —
 * the sitemap, IndexNow and `llms.txt` — were not asking, and the sentence
 * saying they were is what stopped anyone from checking. `publication-
 * surfaces.test.ts` now asserts what those three *emit*.
 *
 * This asserts the wiring instead, which is the part that generalises: a
 * surface that decides which locales to emit has to get that decision from
 * `visibility.ts` and nowhere else. It would have caught the gap on the day
 * `sitemap.ts` was written, before any of the three had a behavioural test.
 *
 * **The list is six, not eight, and that distinction is the correction.** Two
 * of the eight do not choose a locale set: navigation and internal links are
 * handed the locale of the page being rendered, and that page exists only
 * because route generation already asked. Listing them beside the six implies
 * a check they cannot have.
 */

const ROOT = join(__dirname, "..", "..", "..");

/** Surfaces that choose which locales to emit, and must ask to do it. */
const CHOOSING_SURFACES: readonly (readonly [string, string])[] = [
  ["route generation", "src/app/(intl)/[locale]/layout.tsx"],
  ["language selector", "src/components/layout/site-header.tsx"],
  ["hreflang", "src/lib/seo/localized-metadata.ts"],
  ["sitemap", "src/app/sitemap.ts"],
  ["IndexNow", "src/lib/seo/indexnow.ts"],
  ["llms.txt", "src/lib/content/llms.ts"],
];

/** The helpers that answer "may this locale appear?" and "does it render?". */
const ASKS = /\b(publicLocales|renderableLocales|isPubliclyVisible|isRenderable)\b/u;

describe("every surface that chooses a locale set asks visibility.ts", () => {
  it.each(CHOOSING_SURFACES)("%s (%s)", (_surface, file) => {
    const source = readFileSync(join(ROOT, file), "utf8");

    expect(source, `${file} does not import from @/i18n/visibility`).toMatch(
      /from "@\/i18n\/visibility"/u,
    );
    expect(source, `${file} imports visibility but never asks it`).toMatch(ASKS);
  });

  /**
   * The two that inherit rather than choose.
   *
   * Asserted so the distinction is recorded rather than remembered: if either
   * ever starts choosing a locale set of its own, this test is the thing that
   * says the header's list needs revisiting.
   */
  it.each([
    ["navigation", "src/config/navigation.ts"],
    ["internal links", "src/i18n/localized-route.ts"],
  ])("%s takes the locale it is given (%s)", (_surface, file) => {
    const source = readFileSync(join(ROOT, file), "utf8");
    expect(source, `${file} now chooses locales; visibility.ts's list is stale`).not.toMatch(
      /from "@\/i18n\/visibility"/u,
    );
  });
});
