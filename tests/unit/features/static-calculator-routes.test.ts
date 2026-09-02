import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * What keeps the calculator's two document routes out of the request path.
 *
 * `/` and `/devex-fees-and-taxes/` read the shared calculator link from the
 * server's `searchParams`, and that alone made both documents a request-time
 * render in all seven published locales. On the Workers Free plan such a
 * render gets 10 ms of CPU. On 2026-09-02 it stopped fitting: `wrangler tail`
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
];

const VIEWS: readonly (readonly [string, string])[] = [
  ["home", "src/views/home.tsx"],
  ["fees and taxes", "src/views/devex-fees-and-taxes.tsx"],
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
