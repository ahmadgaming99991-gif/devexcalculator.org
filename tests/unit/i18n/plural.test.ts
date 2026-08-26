import { describe, expect, it } from "vitest";
import { pluralForm } from "@/i18n/plural";
import { LAUNCH_LOCALES } from "@/i18n/config";

/**
 * The rule every call site used to inline was `count === 1`, which is the
 * English rule with no label on it. These pin where that is wrong.
 */

describe("pluralForm", () => {
  it("agrees with Intl for every shipped locale and every small count", () => {
    // The check is against `Intl.PluralRules` rather than a table written here,
    // because a table written here is a second opinion that can drift from CLDR.
    for (const locale of LAUNCH_LOCALES) {
      const rules = new Intl.PluralRules(locale);
      for (let count = 0; count <= 40; count += 1) {
        const expected = rules.select(count) === "one" ? "one" : "other";
        expect(pluralForm(locale, count), `${locale} ${count}`).toBe(expected);
      }
    }
  });

  it("gives zero the singular in French and Brazilian Portuguese", () => {
    // The defect this file exists for: `0 jours` where French wants `0 jour`.
    expect(pluralForm("fr", 0)).toBe("one");
    expect(pluralForm("pt-BR", 0)).toBe("one");
  });

  it("gives zero the plural everywhere else this site ships", () => {
    for (const locale of ["en", "es", "de", "tr", "id"]) {
      expect(pluralForm(locale, 0), locale).toBe("other");
    }
  });

  it("differs from `count === 1` exactly where the languages differ", () => {
    /*
     * Proof that the change was needed, and that it changes nothing else.
     *
     * Three disagreements, and they are not equally serious. `pt-BR:0` and
     * `fr:0` were visible: those catalogs have a real singular and a real
     * plural, so zero was rendering the wrong one. `id:1` was not — Indonesian
     * has no singular/plural distinction, `Intl` reports only `other`, and all
     * twelve Indonesian plural groups carry identical text for both forms, so
     * picking the wrong key printed the same sentence. Correct either way, and
     * worth pinning so a future edit to one of those forms cannot make it
     * visible without this failing.
     */
    const disagreements: string[] = [];
    for (const locale of LAUNCH_LOCALES) {
      for (let count = 0; count <= 40; count += 1) {
        const inlined = count === 1 ? "one" : "other";
        if (pluralForm(locale, count) !== inlined) disagreements.push(`${locale}:${count}`);
      }
    }
    expect(disagreements.sort()).toEqual(["fr:0", "id:1", "pt-BR:0"]);
  });

  it("falls back to the English rule for a tag it does not know", () => {
    expect(pluralForm("xx-YY", 1)).toBe("one");
    expect(pluralForm("xx-YY", 0)).toBe("other");
  });
});
