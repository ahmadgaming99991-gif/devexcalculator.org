import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  FOOTER_GROUPS,
  HEADER_GROUPS,
  PRIMARY_ROUTE,
  footerNavigationRoutes,
  getNavigation,
  primaryNavigationRoutes,
  type Navigation,
} from "../../../src/config/navigation";
import {
  indexableRoutes,
  primaryNavRoutes,
  routeRegistry,
} from "../../../src/lib/content/route-registry";

/**
 * The header is a grouped menu rather than a flat row, which means a route can
 * be linked from the site without being reachable from any page's own
 * navigation. These assertions are what stops that happening quietly.
 *
 * Structure and words are now separate: the routes are synchronous data and
 * the labels come from a dictionary. Both halves are checked here, because
 * either can break the menus on its own — a route missing from a group is a
 * page nobody can reach, and a label missing from the dictionary is a menu
 * that throws.
 */

let english: Navigation;
let reviewLocalesWere: string | undefined;

beforeAll(async () => {
  /*
   * The six launch locales are `status: "review"` and do not render unless
   * this is set — which is the point of the flag, and would otherwise make the
   * one assertion here that a translated menu links within its own language
   * either skip silently in CI or fail on a developer's machine depending on
   * their shell.
   */
  reviewLocalesWere = process.env.ENABLE_REVIEW_LOCALES;
  process.env.ENABLE_REVIEW_LOCALES = "true";
  english = await getNavigation("en");
});

afterAll(() => {
  if (reviewLocalesWere === undefined) delete process.env.ENABLE_REVIEW_LOCALES;
  else process.env.ENABLE_REVIEW_LOCALES = reviewLocalesWere;
});

describe("navigation structure", () => {
  it("gives every group a unique id and at least two destinations", () => {
    const ids = [...HEADER_GROUPS, ...FOOTER_GROUPS].map((group) => group.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const group of HEADER_GROUPS) {
      // A disclosure holding one link is a link wearing an extra interaction.
      expect(group.routes.length, `${group.id} is too small to be a group`).toBeGreaterThan(1);
    }
  });

  it("never repeats a destination within one group", () => {
    for (const group of [...HEADER_GROUPS, ...FOOTER_GROUPS]) {
      expect(new Set(group.routes).size, `${group.id} repeats a destination`).toBe(
        group.routes.length,
      );
    }
  });

  it("keeps the calculator reachable without opening a menu", () => {
    expect(PRIMARY_ROUTE).toBe("/");
    // It also belongs in Tools, for a reader who opens that menu looking for
    // the full set. Both are deliberate.
    const tools = HEADER_GROUPS.find((group) => group.id === "tools");
    expect(tools?.routes).toContain("/");
  });

  it("collapses the flat list, which the link validator reads", () => {
    expect(new Set(primaryNavigationRoutes).size).toBe(primaryNavigationRoutes.length);

    const grouped = HEADER_GROUPS.flatMap((group) => group.routes);
    expect(new Set(primaryNavigationRoutes)).toEqual(new Set(grouped));
  });

  it("points only at routes that exist and are indexable", () => {
    const indexable = new Set(indexableRoutes.map((record) => record.route));

    for (const route of [...primaryNavigationRoutes, ...footerNavigationRoutes]) {
      expect(indexable.has(route), `${route} is not an indexable route`).toBe(true);
    }
  });

  it("agrees with the registry's own inPrimaryNav flag", () => {
    // The flag had drifted to nine routes while the header carried eight, and
    // nothing read it, so nothing could notice. Asserting both directions is
    // what makes it a fact about the site rather than a leftover field.
    expect(new Set(primaryNavRoutes.map((record) => record.route))).toEqual(
      new Set(primaryNavigationRoutes),
    );
  });
});

describe("navigation words", () => {
  it("gives every destination a label and a description", () => {
    const everything = [
      english.primary,
      ...english.headerGroups.flatMap((group) => group.items),
      ...english.footerGroups.flatMap((group) => group.items),
    ];
    for (const entry of everything) {
      expect(entry.label.length, `${entry.href} has no label`).toBeGreaterThan(0);
    }

    // Only the header carries descriptions: they are the reason for grouping
    // at all, answering "why would I go there" where a bare label cannot. The
    // footer renders labels only, so a description there would be a sentence
    // nobody reads and somebody translates.
    for (const entry of [english.primary, ...english.headerGroups.flatMap((g) => g.items)]) {
      expect(entry.description.length, `${entry.href} has no description`).toBeGreaterThan(0);
    }
  });

  it("gives every group a heading", () => {
    for (const group of [...english.headerGroups, ...english.footerGroups]) {
      expect(group.heading.length, `${group.id} has no heading`).toBeGreaterThan(0);
    }
  });

  it("labels each destination the way its own route record does", () => {
    /*
     * The English dictionary was extracted from the registry, so these must
     * still agree — a page renamed in the registry and not re-extracted would
     * keep its old name in the menus, in seven languages.
     *
     * Only English. The other locales are translations of these words and are
     * supposed to differ; the coverage validator is what holds them to the
     * same set of keys.
     */
    const byRoute = new Map(routeRegistry.map((record) => [record.route, record]));
    for (const entry of english.headerGroups.flatMap((group) => group.items)) {
      expect(entry.label).toBe(byRoute.get(entry.href)?.navLabel);
    }
  });

  it("links within the locale it was asked for", async () => {
    const spanish = await getNavigation("es");
    for (const entry of spanish.headerGroups.flatMap((group) => group.items)) {
      expect(entry.href.startsWith("/es/"), `${entry.href} leaves the locale`).toBe(true);
    }
    // English is the unprefixed tree and must never gain an `/en/`.
    for (const entry of english.headerGroups.flatMap((group) => group.items)) {
      expect(entry.href.startsWith("/en/")).toBe(false);
    }
  });
});
