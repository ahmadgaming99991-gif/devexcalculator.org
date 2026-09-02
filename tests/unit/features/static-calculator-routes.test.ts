import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * What keeps the calculator's two document routes out of the request path.
 *
 * `/` and `/devex-fees-and-taxes/` read the shared calculator link from the
 * server's `searchParams`, and that alone made both documents a request-time
 * render in all seven published locales. On 2026-09-02 the homepage render
 * stopped fitting the Workers Free plan's CPU allowance: `wrangler tail`
 * recorded `outcome: exceededCpu` on `https://devexcalculator.org/`, and every
 * reader whose request missed the edge cache was served `error 1102`.
 *
 * The query string is now read in the browser, by the client island that
 * already owns the address bar. These assertions are the guard against it
 * quietly moving back to the server — the same shape as the ones that hold
 * `/platform/` static, for the same reason and after the same incident.
 *
 * The build-output half of this is `npm run validate:static-routes`, which
 * asserts all fourteen documents are actually in the prerender manifest. A
 * source check cannot see a dynamic API reached through a shared component.
 */

const read = (path: string) => readFileSync(path, "utf8");

/**
 * The source with its comments removed.
 *
 * The comments beside these routes explain the very mistake being forbidden,
 * and name `searchParams` while doing it. Matching raw text would make a file
 * that documents its own constraint fail that constraint.
 */
const code = (path: string) =>
  read(path)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const ROUTES: readonly (readonly [string, string])[] = [
  ["English home", "src/app/(en)/page.tsx"],
  ["localised home", "src/app/(intl)/[locale]/page.tsx"],
  ["English fees and taxes", "src/app/(en)/devex-fees-and-taxes/page.tsx"],
  ["localised fees and taxes", "src/app/(intl)/[locale]/devex-fees-and-taxes/page.tsx"],
  ["English conversions", "src/app/(en)/conversions/page.tsx"],
  ["localised conversions", "src/app/(intl)/[locale]/conversions/page.tsx"],
  ["English Robux to USD", "src/app/(en)/robux-to-usd/page.tsx"],
  ["localised Robux to USD", "src/app/(intl)/[locale]/robux-to-usd/page.tsx"],
  ["English USD to Robux", "src/app/(en)/usd-to-robux/page.tsx"],
  ["localised USD to Robux", "src/app/(intl)/[locale]/usd-to-robux/page.tsx"],
  ["English stock", "src/app/(en)/platform/stock/page.tsx"],
  ["localised stock", "src/app/(intl)/[locale]/platform/stock/page.tsx"],
];

const VIEWS: readonly (readonly [string, string])[] = [
  ["home", "src/views/home.tsx"],
  ["fees and taxes", "src/views/devex-fees-and-taxes.tsx"],
  ["conversions", "src/views/conversions.tsx"],
  ["Robux to USD", "src/views/robux-to-usd.tsx"],
  ["USD to Robux", "src/views/usd-to-robux.tsx"],
];

describe("the calculator document routes are prerenderable", () => {
  for (const [label, path] of ROUTES) {
    describe(label, () => {
      const source = code(path);

      it("does not accept searchParams", () => {
        // Accepting it is enough: a route whose props include `searchParams`
        // is dynamic whether or not the value is ever read.
        expect(source).not.toContain("searchParams");
      });

      it("exports no route-segment config that forces a dynamic render", () => {
        expect(source).not.toMatch(/export\s+const\s+revalidate/);
        expect(source).not.toMatch(/export\s+const\s+dynamic\b/);
        expect(source).not.toMatch(/export\s+const\s+fetchCache/);
        expect(source).not.toMatch(/force-dynamic/);
      });

      it("reaches no request-scoped API", () => {
        for (const forbidden of ["next/headers", "cookies(", "headers(", "connection("]) {
          expect(source, forbidden).not.toContain(forbidden);
        }
      });
    });
  }

  for (const [label, path] of VIEWS) {
    describe(`the ${label} view`, () => {
      const source = code(path);

      it("takes no searchParams and parses no query string", () => {
        expect(source).not.toContain("searchParams");
        expect(source).not.toContain("parseCalculatorState");
      });

      it("hands the island the canonical default state", () => {
        expect(source).toContain("initialState={defaultState}");
      });
    });
  }
});

describe("the island reads the shared link itself", () => {
  const calculator = read("src/features/devex/calculator.tsx");

  it("captures the query string once, outside render", () => {
    /*
     * Once, at module evaluation. The calculator rewrites the address bar on
     * every keystroke, so a snapshot that re-read `location.search` per render
     * would return a new value constantly and `useSyncExternalStore` would
     * never settle.
     */
    expect(calculator).toContain(
      'const initialSearch = typeof window === "undefined" ? "" : window.location.search;',
    );
  });

  it("adopts it through the hydration-safe reader rather than an effect", () => {
    expect(calculator).toContain("useClientValue(() => initialSearch");
    expect(calculator).toContain("parseCalculatorState(new URLSearchParams(hydratedSearch))");
  });

  it("still keeps the reader's own edits and back-forward navigation", () => {
    expect(calculator).toContain("setStateOverride");
    expect(calculator).toContain('window.addEventListener("popstate"');
    expect(calculator).toContain("window.history.pushState");
    expect(calculator).toContain("window.history.replaceState");
  });

  it("pushes a history entry only for a change the reader made", () => {
    // On a shared `?mode=target` link the mode changes at the hydration commit
    // with nobody having touched anything. Pushing there would add an entry on
    // load and make the first Back press a no-op.
    expect(calculator).toContain(
      "const modeChanged = stateOverride !== null && previousMode.current !== mode;",
    );
  });
});

describe("the calculator is told its own localized path", () => {
  /**
   * `pathname` is what the island rewrites the address bar to and what a share
   * link is built from. Every view passed the bare English `ROUTE`, so on any
   * prefixed locale the URL-sync effect compared `/de/` against `/`, never
   * matched, and rewrote the address bar to the English path on mount. Nothing
   * navigated, because `replaceState` does not — the reader only found out on
   * a reload, or when the person they sent the link to opened it in English.
   *
   * Found on production while verifying the prerender change, on `/de/`, where
   * `?target=1000` became `/?target=1000` before the page had finished
   * settling. It predates that change and affects all five calculator views.
   */
  const VIEWS_WITH_A_CALCULATOR = [
    "src/views/home.tsx",
    "src/views/devex-fees-and-taxes.tsx",
    "src/views/conversions.tsx",
    "src/views/robux-to-usd.tsx",
    "src/views/usd-to-robux.tsx",
  ];

  for (const path of VIEWS_WITH_A_CALCULATOR) {
    it(`${path} passes the localized route, not the English one`, () => {
      const source = code(path);
      expect(source).toContain("pathname={localizedPath(locale, ROUTE)}");
      expect(source).not.toContain("pathname={ROUTE}");
    });
  }
});

describe("the stock page reads its price after load, not while rendering", () => {
  const view = code("src/views/platform-stock.tsx");

  it("does not read the quote during the render", () => {
    // `getQuote` on this side of the boundary is a provider call inside a page
    // render, which is what cost 884 ms of CPU per cold request.
    expect(view).not.toContain("getQuote");
    expect(view).not.toContain("readQuote");
    expect(view).not.toContain("getCloudflareContext");
  });

  it("hands the moving figure to an island and says so without JavaScript", () => {
    expect(view).toContain("<StockQuote");
    expect(view).toContain("<noscript>");
    expect(view).toContain("platform.stock.noScriptBody");
  });

  it("keeps the document itself server rendered", () => {
    for (const marker of ["JsonLd", "Breadcrumbs", "RelatedLinks", "FAQAccordion", "EstimateDisclaimer"]) {
      expect(view, marker).toContain(marker);
    }
  });

  it("still renders every state the provider can be in", () => {
    const island = code("src/components/platform/stock-quote.tsx");
    for (const marker of [
      "platform.stock.loadingTitle",
      "platform.stock.notLatestBadge",
      "platform.stock.providerSilentTitle",
      "platform.stock.noPriceConfiguredTitle",
    ]) {
      expect(island, marker).toContain(marker);
    }
  });

  it("marks the provider's English reason as English", () => {
    // It is a machine diagnostic in one language, quoted inside translated
    // prose on six others.
    expect(code("src/components/platform/stock-quote.tsx")).toContain('lang="en"');
  });
});

describe("the planner does not state a date it cannot know", () => {
  const planner = code("src/features/devex/planner.tsx");

  it("uses the dateless headline until the reader's day is known", () => {
    // Prerendered, `startDate` is the build's day. The number of days does not
    // depend on the start; the projected date does.
    expect(planner).toContain("calculator.planner.paceHeadlineNoDate");
    expect(planner).toContain("knowsReaderDay");
  });
});
