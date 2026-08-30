import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadCatalog } from "../../../scripts/i18n/audit/catalog";
import { approvalClaimKeys } from "../../../scripts/i18n/audit/checks";
import { LAUNCH_LOCALES } from "@/i18n/config";

/**
 * The register has to keep up with the catalog, and prose does not.
 *
 * `docs/i18n/critical-claims.md` records a per-locale verdict on every string
 * carrying the claim that meeting the minimum is not approval. The list of
 * those strings is derived from the English catalog by `approvalClaimKeys()`,
 * so it grows the day somebody writes a new page — and nothing about writing
 * that page makes anyone open the register.
 *
 * A sentence in the register saying "all thirty-one are covered" would then be
 * a claim in prose that no mechanism enforces, which is the failure this
 * repository has now produced five times. This is the mechanism: a new
 * approval claim fails the suite until its six translations have been read and
 * written down.
 */

const ROOT = join(__dirname, "..", "..", "..");
const REGISTER = join(ROOT, "docs", "i18n", "critical-claims.md");
const LOCALES = join(ROOT, "src", "i18n", "locales");

const register = readFileSync(REGISTER, "utf8");
const keys = approvalClaimKeys(loadCatalog(LOCALES, "en"));
/* The languages that actually have a catalog to read; the rest are planned. */
const translated = LAUNCH_LOCALES.filter((locale) => locale !== "en");

describe("the approval-claim register", () => {
  it("has something to cover", () => {
    expect(keys.length).toBeGreaterThan(0);
    expect(translated).toHaveLength(6);
  });

  it("names every key that carries the claim", () => {
    const missing = keys.filter((key) => !register.includes(key));
    expect(missing, "approval claims added to the catalog but never reviewed").toEqual([]);
  });

  /**
   * The arithmetic in the register's own summary, checked against the catalog.
   *
   * "31 keys × 6 locales = 186 translated sentences" is the one line a reader
   * skims instead of counting the tables. If a key is added and the register is
   * extended without that line being updated, the line is the part that lies.
   */
  it("states a coverage count that matches the catalog", () => {
    const stated = register.match(/(\d+) keys × (\d+) locales = (\d+) translated sentences/u);
    expect(stated, "the coverage summary line is missing or reworded").not.toBeNull();

    const [, statedKeys, statedLocales, statedTotal] = stated as RegExpMatchArray;
    expect(Number(statedKeys)).toBe(keys.length);
    expect(Number(statedLocales)).toBe(translated.length);
    expect(Number(statedTotal)).toBe(keys.length * translated.length);
  });

  /**
   * The disclaimer is load-bearing, so it is asserted like a figure.
   *
   * The register's value depends on nobody reading it as a native review. The
   * two sentences that say so are the ones most likely to be trimmed by
   * somebody tightening the prose later.
   */
  it("keeps saying what it is not", () => {
    expect(register).toContain("It is not a native review");
    expect(register).toMatch(/fluent softening that keeps its negation word/u);
  });
});
