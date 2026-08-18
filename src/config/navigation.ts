import { requireRoute } from "@/lib/content/route-registry";

/**
 * Navigation structure.
 *
 * Every entry resolves through `requireRoute`, so a typo or a removed page
 * fails the build rather than shipping a broken link in the header.
 */

export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly description: string;
}

function item(route: string, description: string): NavItem {
  const record = requireRoute(route);
  return { href: record.route, label: record.navLabel, description };
}

export const primaryNavigation: readonly NavItem[] = [
  item("/", "Convert Earned Robux to an estimated USD payout"),
  item("/robux-to-usd/", "Creator payout compared with purchase price"),
  item("/usd-to-robux/", "Work backwards from a payout goal"),
  item("/devex-rates/", "Current, legacy and conditional rates"),
  item("/roblox-stats/", "What Roblox pays creators, from its filings"),
  item("/calculators/", "Every calculator on the site"),
  item("/guides/", "Explanatory guides in reading order"),
];

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
