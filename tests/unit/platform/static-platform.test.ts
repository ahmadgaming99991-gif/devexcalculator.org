import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_RANGE, toQuery } from "@/components/platform/url-state";
import { PLATFORM_DASHBOARD_WORDS } from "@/components/platform/dashboard.words";
import { PLATFORM_API_BASE } from "@/lib/platform/data-api";
import { routeRegistry } from "@/lib/content/route-registry";
import { claimsIn, scanFreshnessClaims } from "../../../scripts/content/freshness-claims";

/**
 * What makes `/platform/` a static document, asserted from the source.
 *
 * These are not stylistic checks. A route that exports `revalidate`, or accepts
 * `searchParams`, is a route Next must render per request — and a per-request
 * render of this page measured a median of 134 ms of CPU against the Workers
 * Free plan's 10 ms limit, which is what produced `error code: 1102` in
 * production. Each assertion below is one of the specific things that would
 * silently put the route back into that state.
 */

const read = (path: string) => readFileSync(path, "utf8");

/**
 * The source with its comments removed.
 *
 * These assertions are about what the route *does*, and the comments beside
 * them explain exactly which mistakes they guard against - naming the very
 * identifiers being forbidden. Matching against raw text would make a file that
 * documents its own constraint fail the constraint.
 */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const EN_PAGE = "src/app/(en)/platform/page.tsx";
const INTL_PAGE = "src/app/(intl)/[locale]/platform/page.tsx";
const VIEW = "src/views/platform.tsx";

describe("the platform routes are prerenderable", () => {
  for (const [label, path] of [
    ["English", EN_PAGE],
    ["localised", INTL_PAGE],
  ] as const) {
    describe(label, () => {
      const source = code(path);

      it("exports no route-segment config that forces a dynamic render", () => {
        expect(source).not.toMatch(/export\s+const\s+revalidate/);
        expect(source).not.toMatch(/export\s+const\s+dynamic\b/);
        expect(source).not.toMatch(/export\s+const\s+fetchCache/);
        expect(source).not.toMatch(/force-dynamic/);
      });

      it("does not accept searchParams", () => {
        // Accepting it is enough: a route whose props include `searchParams` is
        // dynamic whether or not the value is read.
        expect(source).not.toContain("searchParams");
      });

      it("reaches no request-scoped API", () => {
        for (const forbidden of ["next/headers", "cookies(", "headers(", "connection("]) {
          expect(source, forbidden).not.toContain(forbidden);
        }
      });
    });
  }
});

describe("the reader path never calls Roblox", () => {
  const view = code(VIEW);

  it("the view imports no upstream client", () => {
    expect(view).not.toContain("roblox-api");
    expect(view).not.toContain("apis.roblox.com");
    expect(view).not.toContain("games.roblox.com");
  });

  it("the view reads no observation store", () => {
    // Reading KV during render is a per-request dependency even when the
    // response is identical, and it is how the old page paid for its charts.
    expect(view).not.toContain("getHistoryStore");
    expect(view).not.toContain("readSeries");
    expect(view).not.toContain("readGameHistory");
  });

  it("the browser talks to this site's own data plane and nowhere else", () => {
    expect(PLATFORM_API_BASE.startsWith("https://")).toBe(true);
    expect(new URL(PLATFORM_API_BASE).hostname.endsWith("devexcalculator.org")).toBe(true);
  });
});

describe("dashboard words", () => {
  const words = read("src/components/platform/dashboard.tsx");

  it("hands the island its words instead of a dictionary", () => {
    /*
     * A dictionary reached from a client module is a dictionary in the browser
     * bundle: every namespace, in all seven languages, on this page. A type
     * import of the translator's shape is erased and costs nothing, so what is
     * forbidden is a value import of the loader, not a mention of it.
     */
    const valueImports = [...words.matchAll(/^import\s+(?!type\s)[^;]*?from\s+"([^"]+)"/gm)].map(
      (match) => match[1]!,
    );
    expect(valueImports).not.toContain("@/i18n/get-dictionary");
    expect(words).toContain("translatorFor");
  });

  it("lists every key the island reads", () => {
    const used = [...words.matchAll(/t\(\s*"([a-z][\w.]+)"/gi)].map((match) => match[1]!);
    const missing = [...new Set(used)].filter((key) => !PLATFORM_DASHBOARD_WORDS.includes(key));
    expect(missing, `Not in PLATFORM_DASHBOARD_WORDS: ${missing.join(", ")}`).toEqual([]);
  });

  it("names each key exactly once", () => {
    const duplicates = PLATFORM_DASHBOARD_WORDS.filter(
      (key, index) => PLATFORM_DASHBOARD_WORDS.indexOf(key) !== index,
    );
    expect(duplicates).toEqual([]);
  });
});

describe("query state", () => {
  it("keeps the default view at the canonical, query-free URL", () => {
    expect(toQuery({ ranking: null, days: DEFAULT_RANGE, experience: null })).toBe("");
  });

  it("writes only what differs from the default", () => {
    expect(toQuery({ ranking: "top-playing-now", days: DEFAULT_RANGE, experience: null })).toBe(
      "?ranking=top-playing-now",
    );
    expect(toQuery({ ranking: null, days: 1, experience: null })).toBe("?days=1");
  });

  it("keeps every selection when one of them changes", () => {
    // The ranking tabs used to build their own URLs and drop `days`, so
    // choosing a 24-hour chart and then another ranking reset the range.
    expect(toQuery({ ranking: "top-playing-now", days: 1, experience: 111 })).toBe(
      "?ranking=top-playing-now&days=1&experience=111",
    );
  });
});

describe("the static document still says what the page is", () => {
  const view = code(VIEW);

  it("keeps the method, freshness, limitations, downloads and FAQs outside the island", () => {
    for (const marker of [
      "platform.method.heading",
      "platform.method.freshnessBody",
      "platform.method.provenanceBody",
      "platform.limits.heading",
      "platform.download.heading",
      "platform.faqsHeading",
    ]) {
      expect(view, marker).toContain(marker);
    }
  });

  it("states every limitation, including the two-clock one", () => {
    for (const marker of [
      "platform.limits.notPlatformWide",
      "platform.limits.rankedSubset",
      "platform.limits.noBackfill",
      "platform.limits.twoClocks",
      "platform.limits.notPayout",
    ]) {
      expect(view, marker).toContain(marker);
    }
  });

  it("tells a reader without JavaScript what is missing and where the data is", () => {
    expect(view).toContain("<noscript>");
    expect(view).toContain("platform.dashboard.noScriptBody");
  });

  it("keeps the structured data, breadcrumbs and related links", () => {
    for (const marker of ["JsonLd", "Breadcrumbs", "RelatedLinks", "EstimateDisclaimer"]) {
      expect(view, marker).toContain(marker);
    }
  });
});

describe("provenance", () => {
  const record = routeRegistry.find((entry) => entry.route === "/platform/");

  it("has a platform route to describe", () => {
    expect(record).toBeDefined();
  });

  /**
   * The claim that became false, in every language that carried it.
   *
   * Nothing is fetched because a reader opened the page: the data is collected
   * on a schedule and stored, and the browser reads the stored copy. Any
   * sentence still saying otherwise is a false statement about how the site
   * works, which is the one kind of error this project treats as serious.
   *
   * An earlier version of this test matched two literal phrases against the
   * English registry alone. It passed while all seven locales still said the
   * players were counted "at the moment this page was served", because the
   * catalogues were never read and that was a third spelling. It now runs the
   * same rules the `validate:freshness` gate runs, over the same files.
   */
  it("makes no request-time freshness claim in any of the seven languages", () => {
    expect(scanFreshnessClaims().map((finding) => `${finding.where} — ${finding.text}`)).toEqual([]);
  });

  /*
   * A validator is only worth its cost if it fails on the mistake that got
   * through. These are the exact strings that shipped, checked against the
   * rules that now exist to catch them.
   */
  it.each([
    ["en", "with the players in each at the moment this page was served."],
    ["en", "What is being played right now"],
    ["de", "mit den Spielern in jeder zu dem Moment, in dem diese Seite ausgeliefert wurde."],
    ["es", "con los jugadores en cada una en el momento en que se sirvió esta página."],
    ["fr", "avec le nombre de joueurs dans chacune au moment où cette page a été servie."],
    ["id", "beserta jumlah pemain di masing-masing pada saat halaman ini disajikan."],
    ["pt-BR", "com os jogadores em cada uma no momento em que esta página foi servida."],
    ["tr", "bu sayfanın sunulduğu andaki oyuncu sayıları."],
  ] as const)("would have caught the %s claim that shipped", (locale, text) => {
    expect(claimsIn(text, locale, "fixture")).not.toEqual([]);
  });

  it("leaves a reader's own question alone", () => {
    // The searcher's phrasing is not the site's claim; the answer corrects it.
    expect(record?.faqs?.[0]?.question).toMatch(/right now/i);
  });

  it("says instead that collection is scheduled and dated", () => {
    expect(record?.quickAnswer).toMatch(/every 15 minutes/i);
    expect(record?.quickAnswer).toMatch(/carries the time it was observed/i);
  });

  it("keeps the canonical query-free, so query variants are not indexable duplicates", () => {
    expect(record?.route).toBe("/platform/");
    expect(record?.indexation).toBe("index");
  });
});
