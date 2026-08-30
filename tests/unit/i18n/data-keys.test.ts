import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { dataKeys } from "@/i18n/data-text";
import { allRates, marketplaceSchemes } from "@/lib/calculations/rate-registry";
import { RATE_WORDS, SCHEME_WORDS } from "@/i18n/data-words";

/**
 * "The only place that knows how a registry row maps to its key", checked.
 *
 * `data-text.ts` has said that in its header for as long as it has existed,
 * and `data-words.ts` was building the same six templates a directory away.
 * Both were correct, so nothing failed — until somebody renamed one.
 *
 * The templates are now in `dataKeys` and both callers read them from there.
 * This is the part that keeps it true: a third place writing `data.rates.…`
 * with an interpolated id fails here.
 */

const ROOT = join(__dirname, "..", "..", "..");
const SRC = join(ROOT, "src");

/** Every `.ts`/`.tsx` file under `src`. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/u.test(entry) ? [path] : [];
  });
}

/**
 * A `data.` key built by interpolating an id — the shape being centralised.
 *
 * Literal keys like `t("data.minimum.note")` are not this: they name one
 * string, there is nothing to keep in step, and demanding they move would be
 * ceremony. What matters is a template that has to agree with another
 * template somewhere else.
 */
const INTERPOLATED_DATA_KEY = /`data\.[a-zA-Z]+\.\$\{/u;

/**
 * Comments masked before searching.
 *
 * `data-words.ts` explains itself by quoting the very template it no longer
 * writes. A prose mention is not a second implementation, and reporting it
 * would push the next author to describe their code less clearly to keep a
 * test quiet.
 */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/gu, " ");
}

describe("registry rows map to keys in one place", () => {
  it("reads a real source tree", () => {
    const files = sources(SRC);
    expect(files.length).toBeGreaterThan(50);
    expect(files.some((file) => file.endsWith(`i18n${sep}data-text.ts`))).toBe(true);
  });

  it("has no second place building a data key from an id", () => {
    const offenders = sources(SRC)
      .filter((file) => !file.endsWith(`i18n${sep}data-text.ts`))
      .filter((file) => INTERPOLATED_DATA_KEY.test(code(readFileSync(file, "utf8"))))
      .map((file) => relative(ROOT, file));

    expect(offenders, "these build a `data.` key themselves; use `dataKeys`").toEqual([]);
  });

  /**
   * The word lists and the read helpers have to name the same keys.
   *
   * Asserted on the values rather than on the fact that both import
   * `dataKeys`, so it still holds if one of them is rewritten.
   */
  it("gives the client-word lists exactly the keys the helpers read", () => {
    const expectedRates = allRates.flatMap((rate) => [
      dataKeys.rateLabel(rate),
      dataKeys.rateShortLabel(rate),
      dataKeys.rateSummary(rate),
      ...(rate.conditionNote === null ? [] : [dataKeys.rateCondition(rate)]),
    ]);
    expect([...RATE_WORDS].sort()).toEqual([...expectedRates].sort());

    const expectedSchemes = marketplaceSchemes.flatMap((scheme) => [
      dataKeys.schemeLabel(scheme),
      dataKeys.schemeDescription(scheme),
    ]);
    expect([...SCHEME_WORDS].sort()).toEqual([...expectedSchemes].sort());
  });

  it("still produces the keys the catalog actually holds", () => {
    // Guards against the templates being centralised into a wrong shape:
    // every key here must exist in the English `data` namespace.
    const catalog = JSON.parse(
      readFileSync(join(SRC, "i18n", "locales", "en", "data.json"), "utf8"),
    ) as Record<string, unknown>;

    const read = (key: string): unknown =>
      key
        .replace(/^data\./u, "")
        .split(".")
        .reduce<unknown>(
          (node, part) =>
            node !== null && typeof node === "object"
              ? (node as Record<string, unknown>)[part]
              : undefined,
          catalog,
        );

    for (const key of [...RATE_WORDS, ...SCHEME_WORDS]) {
      expect(typeof read(key), key).toBe("string");
    }
  });
});
