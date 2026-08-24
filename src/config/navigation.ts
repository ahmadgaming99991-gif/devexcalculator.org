import { requireRoute } from "@/lib/content/route-registry";
import { getNamespace } from "@/i18n/get-dictionary";
import { localizedPath } from "@/i18n/locale-path";
import { flatRouteKey } from "@/i18n/route-key";
import type { Locale } from "@/i18n/types";

/**
 * Navigation structure.
 *
 * Every route resolves through `requireRoute`, so a typo or a removed page
 * fails the build rather than shipping a broken link in the header.
 *
 * One configuration drives the desktop menus, the mobile drawer, the
 * no-JavaScript fallback and the link validator. The header used to hold a
 * flat row of eight links, which was already the most a 1280px row could carry
 * beside the lockup and the theme control — and it left thirteen real
 * destinations, including the guides, the API and the marketplace calculator,
 * reachable only from the footer.
 *
 * **Structure and words are separate here.** The structure is a list of routes
 * and group ids, synchronous, and it is what the link validator and the tests
 * read: they are asking which pages the header reaches, which is the same
 * question in every language. The words come from the `navigation` dictionary
 * and are fetched per locale.
 *
 * That split is not tidiness. The descriptions used to be written into this
 * file as arguments — `item("/api/", "Read these figures as JSON")` — and the
 * extractor never saw them, because a bare call argument in a `.ts` file does
 * not look like prose from the outside. Twenty-one reader-facing sentences sat
 * in the header of every page and in no dictionary, and the hardcoded-English
 * count read zero the whole time. Holding them as keys means there is no
 * literal left to miss.
 */

export interface NavItem {
  readonly href: string;
  readonly label: string;
}

/**
 * A header destination, which also answers "why would I go there".
 *
 * The footer's links carry no description, and that is the point of the two
 * types: the footer renders labels only, so a description written for it would
 * be a sentence nobody reads and somebody translates. Seven of them were
 * exactly that before this split.
 */
export interface DescribedNavItem extends NavItem {
  readonly description: string;
}

export interface NavGroup<Item extends NavItem = NavItem> {
  /** Stable id, used for the disclosure's DOM ids and as the heading's key. */
  readonly id: string;
  readonly heading: string;
  readonly items: readonly Item[];
}

/** A group as structure alone: which routes, under which id. */
interface GroupShape {
  readonly id: string;
  readonly routes: readonly string[];
}

/**
 * The one destination that is never behind a disclosure.
 *
 * The site is a calculator first. Putting its own link inside a menu would
 * mean a reader who arrived on a guide needs two interactions to reach the
 * thing they came for.
 */
export const PRIMARY_ROUTE = "/";

export const HEADER_GROUPS: readonly GroupShape[] = [
  {
    id: "tools",
    routes: [
      PRIMARY_ROUTE,
      "/robux-to-usd/",
      "/usd-to-robux/",
      "/robux-tax-calculator/",
      "/conversions/",
      "/calculators/",
    ],
  },
  {
    id: "devexGuide",
    routes: [
      "/devex-rates/",
      "/devex-requirements/",
      "/earned-robux/",
      "/how-to-cash-out-robux/",
      "/devex-fees-and-taxes/",
      "/devex-rate-history/",
      "/guides/",
    ],
  },
  {
    id: "robloxData",
    routes: ["/roblox-stats/", "/platform/", "/platform/stock/"],
  },
  {
    id: "resources",
    routes: ["/api/", "/methodology/", "/sources/", "/changelog/", "/corrections/"],
  },
];

export const FOOTER_GROUPS: readonly GroupShape[] = [
  {
    id: "calculators",
    routes: [
      "/",
      "/robux-to-usd/",
      "/usd-to-robux/",
      "/robux-tax-calculator/",
      "/conversions/",
    ],
  },
  {
    id: "guides",
    routes: [
      "/devex-rates/",
      "/devex-requirements/",
      "/earned-robux/",
      "/how-to-cash-out-robux/",
      "/devex-rate-history/",
      "/devex-fees-and-taxes/",
      "/roblox-stats/",
      "/platform/",
      "/platform/stock/",
    ],
  },
  {
    id: "trust",
    routes: [
      "/about/",
      "/methodology/",
      "/sources/",
      "/editorial-policy/",
      "/corrections/",
      "/changelog/",
      // The raw registry sits under Trust rather than beside the calculators:
      // its point is that the figures can be checked, not that it is a tool.
      "/api/",
    ],
  },
  {
    id: "legal",
    routes: ["/privacy/", "/terms/", "/disclaimer/", "/accessibility/", "/contact/"],
  },
];

/**
 * Every header destination as one flat list of routes, de-duplicated.
 *
 * The calculator appears both as the standalone link and inside Tools, which
 * is right in the menus and wrong in a list used to answer "is this route
 * linked from the header" — so it is collapsed here rather than in the groups.
 */
export const primaryNavigationRoutes: readonly string[] = (() => {
  const seen = new Set<string>();
  for (const group of HEADER_GROUPS) {
    for (const route of group.routes) seen.add(requireRoute(route).route);
  }
  return [...seen];
})();

export const footerNavigationRoutes: readonly string[] = FOOTER_GROUPS.flatMap((group) =>
  group.routes.map((route) => requireRoute(route).route),
);

interface NavigationStrings {
  readonly groups: Readonly<Record<string, string>>;
  readonly routes: Readonly<Record<string, string>>;
  readonly descriptions: Readonly<Record<string, string>>;
}

/** The header and footer menus, worded for one language and linked within it. */
export interface Navigation {
  readonly primary: DescribedNavItem;
  readonly headerGroups: readonly NavGroup<DescribedNavItem>[];
  readonly footerGroups: readonly NavGroup[];
}

export async function getNavigation(locale: Locale): Promise<Navigation> {
  const strings = await getNamespace<NavigationStrings>(locale, "navigation");

  const need = (
    table: Readonly<Record<string, string>>,
    key: string,
    what: string,
  ): string => {
    const value = table[key];
    if (value === undefined) {
      throw new Error(`No "navigation.${what}.${key}" in locale "${locale}".`);
    }
    return value;
  };

  const toItem = (route: string): NavItem => {
    const record = requireRoute(route);
    return {
      // Every link in a localized page stays in that locale. A header that
      // sends a Spanish reader to an English page is the leak this prevents.
      href: localizedPath(locale, record.route),
      label: need(strings.routes, flatRouteKey(record.route), "routes"),
    };
  };

  const describe = (route: string): DescribedNavItem => ({
    ...toItem(route),
    description: need(strings.descriptions, flatRouteKey(route), "descriptions"),
  });

  const toGroup = <Item extends NavItem>(
    shape: GroupShape,
    item: (route: string) => Item,
  ): NavGroup<Item> => ({
    id: shape.id,
    heading: need(strings.groups, shape.id, "groups"),
    items: shape.routes.map(item),
  });

  return {
    primary: describe(PRIMARY_ROUTE),
    headerGroups: HEADER_GROUPS.map((shape) => toGroup(shape, describe)),
    footerGroups: FOOTER_GROUPS.map((shape) => toGroup(shape, toItem)),
  };
}
