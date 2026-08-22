import { requireRoute } from "@/lib/content/route-registry";

/**
 * Navigation structure.
 *
 * Every entry resolves through `requireRoute`, so a typo or a removed page
 * fails the build rather than shipping a broken link in the header.
 *
 * One configuration drives the desktop menus, the mobile drawer, the
 * no-JavaScript fallback and the link validator. The header used to hold a
 * flat row of eight links, which was already the most a 1280px row could carry
 * beside the lockup and the theme control — and it left thirteen real
 * destinations, including the guides, the API and the marketplace calculator,
 * reachable only from the footer.
 *
 * Grouping them is what makes the rest of the site visible from any page. The
 * labels come from each route's own `navLabel` rather than being written again
 * here, so a page renamed in the registry is renamed in the menus.
 */

export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly description: string;
}

export interface NavGroup {
  /** Stable id, used for the disclosure's DOM ids. */
  readonly id: string;
  readonly heading: string;
  readonly items: readonly NavItem[];
}

function item(route: string, description: string): NavItem {
  const record = requireRoute(route);
  return { href: record.route, label: record.navLabel, description };
}

/**
 * The one destination that is never behind a disclosure.
 *
 * The site is a calculator first. Putting its own link inside a menu would
 * mean a reader who arrived on a guide needs two interactions to reach the
 * thing they came for.
 */
export const primaryDestination: NavItem = item(
  "/",
  "Convert Earned Robux to an estimated USD payout",
);

export const navigationGroups: readonly NavGroup[] = [
  {
    id: "tools",
    heading: "Tools",
    items: [
      primaryDestination,
      item("/robux-to-usd/", "Creator payout compared with purchase price"),
      item("/usd-to-robux/", "Work backwards from a payout goal"),
      item("/robux-tax-calculator/", "What a marketplace sale leaves you"),
      item("/conversions/", "Worked examples for common amounts"),
      item("/calculators/", "Every calculator on the site"),
    ],
  },
  {
    id: "devex-guide",
    heading: "DevEx Guide",
    items: [
      item("/devex-rates/", "Current, legacy and conditional rates"),
      item("/devex-requirements/", "Eligibility and the 30,000 minimum"),
      item("/earned-robux/", "Which Robux actually count"),
      item("/how-to-cash-out-robux/", "The request, step by step"),
      item("/devex-fees-and-taxes/", "What is taken out, and by whom"),
      item("/devex-rate-history/", "Every rate change, dated"),
      item("/guides/", "Explanatory guides in reading order"),
    ],
  },
  {
    id: "roblox-data",
    heading: "Roblox Data",
    items: [
      item("/roblox-stats/", "What Roblox pays creators, from its filings"),
      item("/platform/", "Live player counts from Roblox public endpoints"),
      item("/platform/stock/", "Reported results, with no fabricated price"),
    ],
  },
  {
    id: "resources",
    heading: "Resources",
    items: [
      item("/api/", "Read these figures as JSON"),
      item("/methodology/", "How every figure is calculated"),
      item("/sources/", "Sources and verification dates"),
      item("/changelog/", "Every change to the published figures"),
      item("/corrections/", "Report something wrong"),
    ],
  },
];

/**
 * Every header destination as one flat list, de-duplicated.
 *
 * The calculator appears both as the standalone link and inside Tools, which
 * is right in the menus and wrong in a list used to answer "is this route
 * linked from the header" — so it is collapsed here rather than in the groups.
 */
export const primaryNavigation: readonly NavItem[] = (() => {
  const seen = new Set<string>();
  const flat: NavItem[] = [];
  for (const group of navigationGroups) {
    for (const entry of group.items) {
      if (seen.has(entry.href)) continue;
      seen.add(entry.href);
      flat.push(entry);
    }
  }
  return flat;
})();

export const footerNavigation: readonly {
  readonly heading: string;
  readonly items: readonly NavItem[];
}[] = [
  {
    heading: "Calculators",
    items: [
      item("/", "DevEx payout estimate"),
      item("/robux-to-usd/", "Robux to USD"),
      item("/usd-to-robux/", "Payout target"),
      item("/robux-tax-calculator/", "Marketplace fee"),
      item("/conversions/", "Common amounts"),
    ],
  },
  {
    heading: "Guides",
    items: [
      item("/devex-rates/", "Current rates"),
      item("/devex-requirements/", "Requirements and minimum"),
      item("/earned-robux/", "What Earned Robux means"),
      item("/how-to-cash-out-robux/", "Cashing out"),
      item("/devex-rate-history/", "Rate history"),
      item("/devex-fees-and-taxes/", "Fees and taxes"),
      item("/roblox-stats/", "Payout statistics"),
      item("/platform/", "Platform activity"),
      item("/platform/stock/", "Roblox stock"),
    ],
  },
  {
    heading: "Trust",
    items: [
      item("/about/", "About this site"),
      item("/methodology/", "How figures are calculated"),
      item("/sources/", "Sources and dates"),
      item("/editorial-policy/", "Editorial policy"),
      item("/corrections/", "Corrections"),
      item("/changelog/", "Changelog"),
      // The raw registry sits under Trust rather than beside the calculators:
      // its point is that the figures can be checked, not that it is a tool.
      item("/api/", "Rates API"),
    ],
  },
  {
    heading: "Legal",
    items: [
      item("/privacy/", "Privacy policy"),
      item("/terms/", "Terms of use"),
      item("/disclaimer/", "Disclaimer"),
      item("/accessibility/", "Accessibility statement"),
      item("/contact/", "Contact"),
    ],
  },
];
