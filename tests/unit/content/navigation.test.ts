import { describe, expect, it } from "vitest";
import {
  footerNavigation,
  navigationGroups,
  primaryDestination,
  primaryNavigation,
} from "../../../src/config/navigation";
import {
  indexableRoutes,
  primaryNavRoutes,
  routeRegistry,
} from "../../../src/lib/content/route-registry";

/**
 * The header is now a grouped menu rather than a flat row, which means a route
 * can be linked from the site without being reachable from any page's own
 * navigation. These assertions are what stops that happening quietly.
 */

describe("navigation groups", () => {
  it("gives every group a unique id and at least two destinations", () => {
    const ids = navigationGroups.map((group) => group.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const group of navigationGroups) {
      expect(group.heading.length, `${group.id} has no heading`).toBeGreaterThan(0);
      // A disclosure holding one link is a link wearing an extra interaction.
      expect(group.items.length, `${group.id} is too small to be a group`).toBeGreaterThan(1);
    }
  });

  it("never repeats a destination within one group", () => {
    for (const group of navigationGroups) {
      const hrefs = group.items.map((entry) => entry.href);
      expect(new Set(hrefs).size, `${group.id} repeats a destination`).toBe(hrefs.length);
    }
  });

  it("gives every destination a label and a description", () => {
    for (const entry of primaryNavigation) {
      expect(entry.label.length, `${entry.href} has no label`).toBeGreaterThan(0);
      // The description is the reason for grouping at all: it answers "why
      // would I go there", which a bare label cannot.
      expect(entry.description.length, `${entry.href} has no description`).toBeGreaterThan(0);
    }
  });

  it("keeps the calculator reachable without opening a menu", () => {
    expect(primaryDestination.href).toBe("/");
    // It also belongs in Tools, for a reader who opens that menu looking for
    // the full set. Both are deliberate.
    const tools = navigationGroups.find((group) => group.id === "tools");
    expect(tools?.items.some((entry) => entry.href === "/")).toBe(true);
  });

  it("collapses the flat list, which the link validator reads", () => {
    const hrefs = primaryNavigation.map((entry) => entry.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);

    const grouped = navigationGroups.flatMap((group) =>
      group.items.map((entry) => entry.href),
    );
    expect(new Set(hrefs)).toEqual(new Set(grouped));
  });

  it("points only at routes that exist and are indexable", () => {
    const indexable = new Set(indexableRoutes.map((record) => record.route));

    for (const entry of [...primaryNavigation, ...footerNavigation.flatMap((g) => g.items)]) {
      expect(indexable.has(entry.href), `${entry.href} is not an indexable route`).toBe(true);
    }
  });

  it("agrees with the registry's own inPrimaryNav flag", () => {
    // The flag had drifted to nine routes while the header carried eight, and
    // nothing read it, so nothing could notice. Asserting both directions is
    // what makes it a fact about the site rather than a leftover field.
    expect(new Set(primaryNavRoutes.map((record) => record.route))).toEqual(
      new Set(primaryNavigation.map((entry) => entry.href)),
    );
  });

  it("labels each destination the way its own route record does", () => {
    // Labels are read from the registry rather than written again in the
    // navigation, so a page renamed in one place cannot keep an old name in
    // the menus. This asserts that wiring, not the labels themselves.
    const byRoute = new Map(routeRegistry.map((record) => [record.route, record]));
    for (const entry of primaryNavigation) {
      expect(entry.label).toBe(byRoute.get(entry.href)?.navLabel);
    }
  });
});
