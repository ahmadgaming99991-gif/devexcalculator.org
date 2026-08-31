import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LAUNCH_LOCALES,
  getDirection,
  getLocaleMeta,
  isPublishedLocale,
  isRtl,
  isSupportedLocale,
  localeRegistry,
  publishedLocales,
} from "../../../src/i18n/config";
import {
  getLocaleFromPath,
  localizedPath,
  parseLocaleSegment,
  stripLocalePrefix,
  switchLocalePath,
} from "../../../src/i18n/locale-path";

/**
 * These functions are the first thing a hostile URL reaches, and the last
 * thing between a half-finished translation and production HTML. Most of the
 * tests below assert a refusal.
 */

describe("the registry", () => {
  it("keeps every locale code, prefix and hreflang unique", () => {
    for (const field of ["locale", "prefix", "hreflang"] as const) {
      const values = localeRegistry.map((meta) => meta[field]).filter((v) => v !== "");
      expect(new Set(values).size, `duplicate ${field}`).toBe(values.length);
    }
  });

  it("gives English no prefix, and nothing else an empty one", () => {
    // `/en/` would be a second indexable copy of the site competing with the
    // original — the most common way a multilingual rollout does damage.
    expect(getLocaleMeta("en").prefix).toBe("");
    for (const meta of localeRegistry) {
      if (meta.locale === "en") continue;
      expect(meta.prefix, `${meta.locale} has no prefix`).not.toBe("");
      expect(meta.prefix.startsWith("/"), `${meta.locale} prefix needs a leading slash`).toBe(true);
      expect(meta.prefix.endsWith("/"), `${meta.locale} prefix must not end in a slash`).toBe(false);
      expect(meta.prefix).toBe(meta.prefix.toLowerCase());
    }
  });

  it("publishes exactly the locales somebody has decided to publish", () => {
    /*
     * Turkish joined English on 2026-08-31 — read by the maintainer, published
     * on that basis by the owner's decision (D-046). The list is written out
     * rather than derived so that a locale going public is an edit to this
     * line, made by somebody who had to think about it, and not a side effect
     * of editing the registry.
     */
    expect(publishedLocales().map((m) => m.locale)).toEqual(["en", "tr"]);
    expect(isPublishedLocale("tr")).toBe(true);
    expect(isPublishedLocale("pt-BR")).toBe(false);
    expect(isPublishedLocale("ar")).toBe(false);
  });

  it("publishes nothing that nobody has read", () => {
    // The line `publishReadiness` holds, restated where it is visible: a
    // machine-drafted locale is one no person has been through, and it cannot
    // be public whatever else is true of it.
    for (const meta of publishedLocales()) {
      expect(meta.qualityReview, `${meta.locale} is published`).not.toBe("machine-drafted");
      expect(meta.qualityReview, `${meta.locale} is published`).not.toBe("none");
    }
  });

  it("never claims a review that has not happened", () => {
    // `status` and `qualityReview` are separate fields on purpose. Claiming a
    // native reviewer who does not exist is the same class of fabrication as
    // a verification date nobody earned.
    for (const meta of localeRegistry) {
      if (meta.qualityReview !== "native-reviewed") continue;
      throw new Error(
        `${meta.locale} claims native review; no native reviewer is recorded in docs/i18n/`,
      );
    }
    expect(getLocaleMeta("en").qualityReview).toBe("source");
  });

  it("declares a direction for every locale, including the RTL one it has not built yet", () => {
    for (const meta of localeRegistry) {
      expect(["ltr", "rtl"]).toContain(meta.direction);
    }
    // Arabic is listed while unpublished precisely so the logical-property and
    // `dir` work is designed against a real record rather than a hypothetical.
    expect(isRtl("ar")).toBe(true);
    expect(getDirection("en")).toBe("ltr");
  });

  it("gives Spanish and Arabic no search region", () => {
    // A language is not a country. Attaching one to Spanish would invite a
    // currency or tax assumption this site must never make.
    expect(getLocaleMeta("es").searchRegion).toBeNull();
    expect(getLocaleMeta("ar").searchRegion).toBeNull();
  });

  it("uses the separator Intl actually emits for French", () => {
    // U+202F, a narrow no-break space. A plain space here would make the
    // locale-aware parser reject a number the site itself formatted.
    const french = getLocaleMeta("fr");
    expect(french.groupSeparator).toBe(" ");
    const formatted = new Intl.NumberFormat("fr-FR").format(1000);
    expect(formatted).toContain(french.groupSeparator);
  });

  it("recognises only declared locales", () => {
    expect(isSupportedLocale("pt-BR")).toBe(true);
    expect(isSupportedLocale("pt")).toBe(false);
    expect(isSupportedLocale("EN")).toBe(false);
    expect(isSupportedLocale("")).toBe(false);
    expect(isSupportedLocale("../../etc/passwd")).toBe(false);
  });

  it("has a record for every launch locale", () => {
    for (const locale of LAUNCH_LOCALES) {
      expect(isSupportedLocale(locale), `${locale} is not in the registry`).toBe(true);
    }
    expect(LAUNCH_LOCALES).toHaveLength(7);
    expect(LAUNCH_LOCALES[0]).toBe(DEFAULT_LOCALE);
  });
});

describe("reading a locale out of a path", () => {
  it("finds the prefixed ones", () => {
    expect(getLocaleFromPath("/pt-br/devex-rates/")).toBe("pt-BR");
    expect(getLocaleFromPath("/es/")).toBe("es");
    expect(getLocaleFromPath("/zh-hans/devex-rates/")).toBe("zh-Hans");
  });

  it("treats an unprefixed path as English", () => {
    expect(getLocaleFromPath("/")).toBe("en");
    expect(getLocaleFromPath("/devex-rates/")).toBe("en");
  });

  it("does not mistake a route that merely starts with a locale's letters", () => {
    // `/id/` is Indonesian; `/identity/` is not.
    expect(getLocaleFromPath("/identity/")).toBe("en");
    expect(getLocaleFromPath("/estimates/")).toBe("en");
    expect(getLocaleFromPath("/deutschland/")).toBe("en");
  });

  it("prefers the longer prefix", () => {
    expect(getLocaleFromPath("/zh-hant/")).toBe("zh-Hant");
  });
});

describe("stripping and rebuilding", () => {
  it("round-trips every locale through its own path", () => {
    for (const meta of localeRegistry) {
      for (const route of ["/", "/devex-rates/", "/conversions/30000-robux-to-usd/"]) {
        const localized = localizedPath(meta.locale, route);
        expect(stripLocalePrefix(localized), `${meta.locale} ${route}`).toBe(route);
        expect(getLocaleFromPath(localized)).toBe(meta.locale);
      }
    }
  });

  it("never produces /en/", () => {
    expect(localizedPath("en", "/devex-rates/")).toBe("/devex-rates/");
    expect(localizedPath("en", "/")).toBe("/");
    // Even when handed an already-localized path.
    expect(localizedPath("en", "/es/devex-rates/")).toBe("/devex-rates/");
  });

  it("always ends in a slash", () => {
    // The site's canonical policy. A helper that sometimes omits it puts a
    // redirect inside an hreflang cluster, which invalidates the cluster.
    for (const meta of localeRegistry) {
      for (const route of ["/", "/devex-rates", "/devex-rates/"]) {
        expect(localizedPath(meta.locale, route).endsWith("/")).toBe(true);
      }
    }
  });

  it("re-points a path that already carries a different prefix", () => {
    expect(localizedPath("de", "/es/conversions/100000-robux-to-usd/")).toBe(
      "/de/conversions/100000-robux-to-usd/",
    );
  });
});

describe("switching language", () => {
  it("keeps the query string, because a shared calculation lives in it", () => {
    expect(switchLocalePath("id", "/", "?robux=100000&mode=split")).toBe(
      "/id/?robux=100000&mode=split",
    );
    expect(switchLocalePath("de", "/es/conversions/100000-robux-to-usd/")).toBe(
      "/de/conversions/100000-robux-to-usd/",
    );
  });

  it("drops a hash the target route does not have", () => {
    // A fragment that does not exist on the destination scrolls nowhere and
    // reads as broken, so the caller has to confirm it before it is kept.
    expect(switchLocalePath("fr", "/devex-rates/", "", "#history", false)).toBe("/fr/devex-rates/");
    expect(switchLocalePath("fr", "/devex-rates/", "", "#history", true)).toBe(
      "/fr/devex-rates/#history",
    );
  });

  it("tolerates a query string with or without its question mark", () => {
    expect(switchLocalePath("tr", "/", "robux=5000")).toBe("/tr/?robux=5000");
    expect(switchLocalePath("tr", "/", "?robux=5000")).toBe("/tr/?robux=5000");
    expect(switchLocalePath("tr", "/", "?")).toBe("/tr/");
  });
});

describe("parsing a raw route segment", () => {
  it("reads the URL segment, which is the prefix and not the locale tag", () => {
    expect(parseLocaleSegment("es")).toBe("es");
    // Portuguese is `pt-BR` as a tag and `/pt-br/` as a URL. Accepting the
    // tag as well would give every Portuguese page two addresses, which is
    // what happened: the build prerendered `/pt-BR/…` while every link on
    // those pages pointed at `/pt-br/…`.
    expect(parseLocaleSegment("pt-br")).toBe("pt-BR");
    expect(parseLocaleSegment("pt-BR")).toBeNull();
  });

  it("refuses anything that is not exactly a declared locale", () => {
    // This value comes from the URL. It decides a dynamic import path, so a
    // near-miss must be a 404 rather than a lookup.
    for (const hostile of [
      "EN",
      "PT-BR",
      "..",
      "../en",
      "../../etc/passwd",
      "en/../../secrets",
      "%2e%2e",
      "",
      " ",
      "en ",
      "és",
    ]) {
      expect(parseLocaleSegment(hostile), `accepted "${hostile}"`).toBeNull();
    }
  });
});
