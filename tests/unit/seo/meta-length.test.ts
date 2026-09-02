import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Titles and descriptions that survive a search result intact.
 *
 * Google truncates a title around 60 characters and a description around 160,
 * and the tail is where these sentences put the thing that distinguishes them —
 * "with a source for every figure", "quarter by quarter". A truncated
 * description is not a penalty; it is the sentence not being read.
 *
 * This was not caught by anything until a site-wide audit measured the built
 * HTML: 9 titles and 37 descriptions were over, **all of them translations**.
 * English fit, and German, French, Spanish, Portuguese and Indonesian run
 * fifteen to twenty-five per cent longer for the same sentence. So the check
 * has to be per locale, and it has to run on the dictionary rather than on one
 * language's rendered output.
 *
 * The limits are the truncation points with a little room, not a style rule.
 */

const TITLE_LIMIT = 65;
const DESCRIPTION_LIMIT = 165;

/** What a `{token}` is worth when the page renders. */
const SAMPLE = "0,0038";
const TOKEN = /\{[a-zA-Z_][a-zA-Z0-9_]*\}/g;

const rendered = (value: string) => value.replace(TOKEN, SAMPLE);

const locales = readdirSync("src/i18n/locales", { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

describe("meta length", () => {
  it("has locales to check, so a passing run means something", () => {
    expect(locales.length).toBeGreaterThanOrEqual(7);
  });

  for (const locale of locales) {
    const routes = JSON.parse(readFileSync(`src/i18n/locales/${locale}/routes.json`, "utf8")) as Record<
      string,
      unknown
    >;

    const entries = Object.entries(routes).filter(
      (entry): entry is [string, Record<string, unknown>] =>
        typeof entry[1] === "object" && entry[1] !== null && !Array.isArray(entry[1]),
    );

    it(`${locale}: every title fits a search result`, () => {
      const over = entries
        .filter(([, v]) => typeof v.title === "string" && rendered(v.title as string).length > TITLE_LIMIT)
        .map(([k, v]) => `${k} (${rendered(v.title as string).length}) ${v.title as string}`);
      expect(over, `over ${TITLE_LIMIT} characters`).toEqual([]);
    });

    it(`${locale}: every description fits a search result`, () => {
      const over = entries
        .filter(
          ([, v]) =>
            typeof v.metaDescription === "string" &&
            rendered(v.metaDescription as string).length > DESCRIPTION_LIMIT,
        )
        .map(([k, v]) => `${k} (${rendered(v.metaDescription as string).length})`);
      expect(over, `over ${DESCRIPTION_LIMIT} characters`).toEqual([]);
    });

    it(`${locale}: no title or description is empty`, () => {
      const empty = entries
        .filter(([, v]) =>
          (typeof v.title === "string" && v.title.trim() === "") ||
          (typeof v.metaDescription === "string" && v.metaDescription.trim() === ""),
        )
        .map(([k]) => k);
      expect(empty).toEqual([]);
    });
  }
});
