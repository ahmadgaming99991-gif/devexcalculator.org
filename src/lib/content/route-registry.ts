import type { RouteRecord } from "@/types/content";
import { APPROVED_AMOUNTS, amountPageRoute, computeAmountValues } from "./amount-pages";
import { formatRobux } from "@/lib/calculations/format";

/**
 * The content manifest: one record per route.
 *
 * This is the single source of truth for navigation, breadcrumbs, canonical
 * URLs, metadata, the sitemap, the internal-link graph and every SEO
 * validator. A route that is not here does not exist as far as the site's
 * crawl surface is concerned, which is what keeps sitemap, canonical and
 * link destinations from drifting apart.
 */

const REVIEWED = "2026-08-17T00:00:00Z";

const staticRoutes: readonly RouteRecord[] = [
  // -------------------------------------------------------------------------
  // Home — canonical owner of DevEx calculator intent
  // -------------------------------------------------------------------------
  {
    route: "/",
    status: "published",
    indexation: "index",
    pageType: "tool",
    title: "DevEx Calculator: Convert Earned Robux to USD",
    metaDescription:
      "What your eligible Earned Robux are worth in USD at the current 0.0038 DevEx rate, with legacy and U.S. 18+ comparisons and a source for every figure.",
    h1: "DevEx Calculator: Convert Earned Robux to USD",
    navLabel: "Calculator",
    primaryIntent: "core-devex-calculator",
    primaryKeyword: "devex calculator",
    secondaryKeywords: [
      "roblox devex calculator",
      "devex calc",
      "dev ex calculator",
      "dev x calculator",
      "robux devex calculator",
      "devex converter",
      "devex to usd",
      "devex roblox",
      "developer exchange roblox calculator",
    ],
    entities: ["Roblox", "Developer Exchange Program", "Robux", "Earned Robux", "USD"],
    sourceIds: ["roblox-devex-program"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "At the current DevEx rate of 0.0038 USD per eligible Earned Robux, 30,000 Earned Robux converts to about 114 US dollars and 100,000 converts to about 380. Only Earned Robux qualify, 30,000 is the minimum Roblox accepts, and every figure here is an estimate — Roblox alone decides which Robux qualify and whether a request is approved.",
    sections: [
      { id: "calculator", heading: "DevEx calculator" },
      { id: "rate-comparison", heading: "What each rate would pay" },
      { id: "how-it-works", heading: "How the calculation works" },
      { id: "current-rates", heading: "Current DevEx rates" },
      { id: "earned-robux", heading: "Not every Robux is an Earned Robux" },
      { id: "popular-amounts", heading: "Common amounts" },
      { id: "requirements", heading: "What Roblox requires" },
      { id: "faqs", heading: "Questions creators ask" },
    ],
    faqs: [
      {
        question: "What is the current Roblox DevEx rate?",
        answer:
          "Roblox documents a standard rate of 0.0038 USD per eligible Earned Robux, which it states as 114 USD for 30,000 Earned Robux. This rate took effect on 5 September 2025 at 10:00 PT.",
        sourceIds: ["roblox-devex-program"],
      },
      {
        question: "How much is 100,000 Earned Robux in DevEx?",
        answer:
          "100,000 eligible Earned Robux is about 380 US dollars at the standard rate before any payment-provider fees or tax. The same amount would have been 350 US dollars under the older 0.0035 rate.",
        sourceIds: ["roblox-devex-program"],
      },
      {
        question: "What is the minimum Earned Robux for DevEx?",
        answer:
          "Roblox requires a minimum of 30,000 Earned Robux in your account before you can participate in DevEx. Reaching that number is a requirement, not an approval — Roblox still reviews every request.",
        sourceIds: ["roblox-devex-program"],
      },
      {
        question: "Does every Robux balance qualify for DevEx?",
        answer:
          "No. DevEx applies to Earned Robux, which Roblox describes as Robux earned through creator activity. Purchased balances, gift card credit and other categories are treated differently, and Roblox decides which portion of a balance qualifies.",
        sourceIds: ["roblox-devex-program"],
      },
      {
        question: "Why is the DevEx rate lower than the price of buying Robux?",
        answer:
          "They are two different transactions. Buying Robux is a retail purchase with platform pricing applied; DevEx is Roblox paying a creator for eligible earnings. Neither number predicts the other, which is why this site never mixes them in one result.",
      },
      {
        question: "Can I choose which rate applies to my balance?",
        answer:
          "No. Roblox determines which portion of a balance falls under the standard rate, the legacy rate for balances earned before 5 September 2025, and the higher rate for qualifying spending by verified United States players aged 18 or over. The comparison here shows what each rate would pay, not a menu you can pick from.",
        sourceIds: ["roblox-devex-program"],
      },
    ],
    internalLinks: [
      { route: "/robux-to-usd/", anchor: "converting Robux to USD generally", relationship: "tool" },
      { route: "/devex-rates/", anchor: "the current DevEx rates in full", relationship: "child" },
      { route: "/devex-requirements/", anchor: "what Roblox requires before a payout", relationship: "child" },
      { route: "/earned-robux/", anchor: "which Robux count as Earned Robux", relationship: "child" },
      { route: "/how-to-cash-out-robux/", anchor: "how the cash-out process works", relationship: "child" },
      { route: "/calculators/", anchor: "all creator finance calculators", relationship: "child" },
      { route: "/methodology/", anchor: "how these figures are calculated", relationship: "next-step" },
      { route: "/usd-to-robux/", anchor: "work backwards from a payout goal", relationship: "tool" },
      { route: "/conversions/", anchor: "conversions for common amounts", relationship: "child" },
    ],
    schemaTypes: ["WebSite", "WebApplication", "WebPage"],
    parent: null,
    inPrimaryNav: true,
    rateSensitive: true,
    ogImageAlt:
      "DevEx Calculator: convert eligible Earned Robux into an estimated US dollar payout.",
  },

  // -------------------------------------------------------------------------
  // Robux to USD — generic conversion intent
  // -------------------------------------------------------------------------
  {
    route: "/robux-to-usd/",
    status: "published",
    indexation: "index",
    pageType: "tool",
    title: "Robux to USD: Creator Payout vs Purchase Price",
    metaDescription:
      "Two numbers answer this. Compare what DevEx pays a creator against what buying Robux costs, and convert any amount with the rate stated openly.",
    h1: "Robux to USD",
    navLabel: "Robux to USD",
    primaryIntent: "generic-robux-to-usd",
    primaryKeyword: "robux to usd",
    secondaryKeywords: [
      "robux calculator",
      "robux converter",
      "robux to money converter",
      "robux to usd calculator",
      "robux to usd converter",
      "robux to dollars",
      "roblox to usd",
      "robux conversion",
      "convert robux to usd",
    ],
    entities: ["Robux", "USD", "Roblox", "Developer Exchange Program"],
    sourceIds: ["roblox-devex-program"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "\"Robux to USD\" has two honest answers depending on who is asking. A creator cashing out eligible Earned Robux receives 0.0038 USD per Robux through DevEx, so 100,000 Robux is about 380 dollars. A player buying Robux pays a retail price set by Roblox, which is a different transaction entirely. This page keeps the two apart.",
    sections: [
      { id: "converter", heading: "Convert Robux to USD" },
      { id: "two-answers", heading: "Why there are two answers" },
      { id: "comparison", heading: "Creator payout compared with purchase price" },
      { id: "formula", heading: "The conversion formula" },
      { id: "amounts", heading: "Common amounts" },
      { id: "faqs", heading: "Questions about converting Robux" },
    ],
    faqs: [
      {
        question: "How much is 1,000 Robux in USD?",
        answer:
          "For a creator cashing out eligible Earned Robux, 1,000 Robux is 3.80 US dollars at the current DevEx rate. That figure is a payout rate, not the price a player pays to buy 1,000 Robux.",
        sourceIds: ["roblox-devex-program"],
      },
      {
        question: "Can I convert any Robux to USD?",
        answer:
          "No. Only eligible Earned Robux can be converted through DevEx, and only once your balance reaches 30,000. Robux you bought cannot be converted back into money.",
        sourceIds: ["roblox-devex-program"],
      },
      {
        question: "Why does this site not publish a single Robux purchase price?",
        answer:
          "Roblox prices Robux by package, region and platform, and those prices change. Publishing one universal purchase rate would be inventing a number, so this page explains the distinction and links to the official pricing instead.",
      },
      {
        question: "Is the conversion the same in every country?",
        answer:
          "The DevEx rate itself is stated in US dollars. Local-currency figures on this site are reference-rate estimates from the European Central Bank, and your bank or payment provider will apply its own rate and fees.",
        sourceIds: ["ecb-exchange-rates"],
      },
    ],
    internalLinks: [
      { route: "/", anchor: "the full DevEx calculator", relationship: "parent" },
      { route: "/devex-rates/", anchor: "the rate behind this conversion", relationship: "prerequisite" },
      { route: "/usd-to-robux/", anchor: "convert in the other direction", relationship: "sibling" },
      { route: "/earned-robux/", anchor: "what makes a Robux eligible", relationship: "prerequisite" },
      { route: "/conversions/", anchor: "a table of common amounts", relationship: "next-step" },
    ],
    schemaTypes: ["WebApplication", "WebPage", "BreadcrumbList"],
    parent: "/",
    inPrimaryNav: true,
    rateSensitive: true,
    ogImageAlt: "Robux to USD: creator DevEx payout compared with retail purchase price.",
  },

  // -------------------------------------------------------------------------
  // USD to Robux — reverse target intent
  // -------------------------------------------------------------------------
  {
    route: "/usd-to-robux/",
    status: "published",
    indexation: "index",
    pageType: "tool",
    title: "USD to Robux: Earned Robux Needed for a Payout Target",
    metaDescription:
      "Set a payout goal in dollars and see how many eligible Earned Robux it takes, rounded up, with progress against your current balance.",
    h1: "USD to Robux: work backwards from a payout target",
    navLabel: "Payout target",
    primaryIntent: "reverse-usd-to-robux",
    primaryKeyword: "usd to robux",
    secondaryKeywords: [
      "usd to robux calculator",
      "usd to robux converter",
      "money to robux calculator",
      "dollars to robux calculator",
      "money to robux",
      "reverse robux calculator",
    ],
    entities: ["Robux", "Earned Robux", "USD", "Developer Exchange Program"],
    sourceIds: ["roblox-devex-program"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "To reach a 1,000 US dollar DevEx payout at the current rate you need 263,158 eligible Earned Robux. The figure always rounds up, because a fraction of a Robux does not exist and rounding down would leave you short of your target. Below 30,000 Earned Robux no payout is possible regardless of the goal.",
    sections: [
      { id: "target-calculator", heading: "Earned Robux needed for your target" },
      { id: "rounding", heading: "Why the answer rounds up" },
      { id: "minimum", heading: "The minimum still applies" },
      { id: "examples", heading: "Common payout targets" },
      { id: "buying-robux", heading: "This is not about buying Robux" },
      { id: "faqs", heading: "Questions about payout targets" },
    ],
    faqs: [
      {
        question: "How many Earned Robux do I need for 1,000 USD?",
        answer:
          "263,158 eligible Earned Robux at the current 0.0038 rate. Dividing 1,000 by 0.0038 gives 263,157.89, and the result rounds up so the payout actually reaches the target.",
        sourceIds: ["roblox-devex-program"],
      },
      {
        question: "How many Earned Robux do I need for 100 USD?",
        answer:
          "26,316 Earned Robux would reach 100 dollars arithmetically, but that is below the 30,000 minimum, so you would need 30,000 before a request can be submitted at all — which pays about 114 dollars.",
        sourceIds: ["roblox-devex-program"],
      },
      {
        question: "Does this tell me how much Robux I can buy for a dollar amount?",
        answer:
          "No. This page answers the creator question: how much you need to earn to receive a given payout. Buying Robux is priced separately by Roblox and this site does not invent a universal purchase rate.",
      },
      {
        question: "Does the answer change if part of my balance is legacy?",
        answer:
          "Yes. Legacy balances convert at 0.0035, so reaching the same dollar target takes more Robux. Use the split mode on the calculator to model a mixed balance.",
        sourceIds: ["roblox-devex-program"],
      },
    ],
    internalLinks: [
      { route: "/", anchor: "the main DevEx calculator", relationship: "parent" },
      { route: "/robux-to-usd/", anchor: "convert in the other direction", relationship: "sibling" },
      { route: "/devex-requirements/", anchor: "the minimum and the requirements", relationship: "prerequisite" },
      { route: "/devex-rates/", anchor: "the rates used in this calculation", relationship: "prerequisite" },
      { route: "/how-to-cash-out-robux/", anchor: "what happens once you reach your target", relationship: "next-step" },
    ],
    schemaTypes: ["WebApplication", "WebPage", "BreadcrumbList"],
    parent: "/",
    inPrimaryNav: true,
    rateSensitive: true,
    ogImageAlt: "USD to Robux: how many Earned Robux a target DevEx payout requires.",
  },

  // -------------------------------------------------------------------------
  // DevEx rates
  // -------------------------------------------------------------------------
  {
    route: "/devex-rates/",
    status: "published",
    indexation: "index",
    pageType: "pillar-guide",
    title: "Roblox DevEx Rates: Current, Legacy and U.S. 18+",
    metaDescription:
      "The three DevEx rates Roblox documents, what each pays per 1,000 and 30,000 Robux, and when each applies.",
    h1: "Roblox DevEx rates",
    navLabel: "Rates",
    primaryIntent: "devex-rate",
    primaryKeyword: "devex rates",
    secondaryKeywords: [
      "devex rate",
      "roblox devex rate",
      "devex exchange rate",
      "robux conversion rate",
      "roblox devex rates",
      "devex prices",
      "robux exchange rate",
      "dev ex rates",
    ],
    entities: ["Developer Exchange Program", "Robux", "Earned Robux", "USD", "Roblox"],
    sourceIds: ["roblox-devex-program"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "Roblox documents three DevEx rates. The standard rate is 0.0038 USD per eligible Earned Robux, or 114 dollars for 30,000. Balances earned before 5 September 2025 at 10:00 PT convert at the older 0.0035 rate. Certain Earned Robux from verified United States players aged 18 or over convert at 0.0054. Roblox, not the creator, decides which applies.",
    sections: [
      { id: "current-rates", heading: "The three documented rates" },
      { id: "examples", heading: "What each rate pays" },
      { id: "which-applies", heading: "Which rate applies to your balance" },
      { id: "difference", heading: "Compare the rates for your amount" },
      { id: "changes", heading: "Rates can change" },
      { id: "faqs", heading: "Questions about DevEx rates" },
    ],
    faqs: [
      {
        question: "What is the DevEx rate per 1,000 Robux?",
        answer:
          "3.80 US dollars per 1,000 eligible Earned Robux at the standard rate. The legacy rate paid 3.50 and the conditional U.S. 18+ rate pays 5.40.",
        sourceIds: ["roblox-devex-program"],
      },
      {
        question: "When did the DevEx rate change to 0.0038?",
        answer:
          "On 5 September 2025 at 10:00 PT. Balances earned before that moment are cashed out at the previous 0.0035 rate first, under Roblox's own accounting.",
        sourceIds: ["roblox-devex-program"],
      },
      {
        question: "Who qualifies for the 0.0054 rate?",
        answer:
          "Roblox applies it to certain Earned Robux from purchases of developer products, passes, subscriptions and private servers made by United States players who have verified that they are at least 18 years old. It is not a rate a creator can select.",
        sourceIds: ["roblox-devex-program"],
      },
      {
        question: "Will the DevEx rate change again?",
        answer:
          "Roblox has changed it before and could change it again. This page records only what current official documentation states; it makes no forecast. The date it was last checked against the source is shown above.",
        sourceIds: ["roblox-devex-program"],
      },
    ],
    internalLinks: [
      { route: "/", anchor: "calculate a payout at these rates", relationship: "parent" },
      { route: "/devex-rate-history/", anchor: "how the rate changed over time", relationship: "child" },
      { route: "/roblox-stats/", anchor: "what Roblox pays creators in total", relationship: "sibling" },
      { route: "/earned-robux/", anchor: "which Robux the rate applies to", relationship: "prerequisite" },
      { route: "/devex-requirements/", anchor: "the requirements alongside the rate", relationship: "sibling" },
      { route: "/sources/", anchor: "the sources behind these figures", relationship: "next-step" },
    ],
    schemaTypes: ["WebPage", "BreadcrumbList"],
    parent: "/",
    inPrimaryNav: true,
    rateSensitive: true,
    ogImageAlt: "Roblox DevEx rates: standard, legacy and conditional U.S. 18+ compared.",
  },

  // -------------------------------------------------------------------------
  // Live platform activity
  // -------------------------------------------------------------------------
  {
    route: "/platform/",
    status: "published",
    indexation: "index",
    // Not a "tool": there is nothing to calculate here. It reports figures,
    // which is what the guide type covers.
    pageType: "pillar-guide",
    title: "Roblox Platform Activity: Live Player Counts",
    metaDescription:
      "Live player counts for the experiences Roblox is ranking, read from its own public endpoints, plus a growing record of what this site has observed.",
    h1: "Roblox platform activity",
    navLabel: "Platform",
    primaryIntent: "roblox-live-player-counts",
    primaryKeyword: "roblox player count",
    secondaryKeywords: [
      "roblox live players",
      "how many people are playing roblox",
      "roblox concurrent users",
      "top roblox games right now",
      "roblox ccu",
    ],
    entities: ["Roblox Corporation", "concurrent users", "Roblox experiences"],
    sourceIds: ["roblox-explore-api"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "Player counts on this page are read from Roblox's own public endpoints when the page is served, and the ranking is Roblox's rather than this site's. Alongside them is a record of what this site has observed since it began watching, charted over whatever period has actually been collected.",
    sections: [
      { id: "live", heading: "What is being played right now" },
      { id: "history", heading: "Observed over time" },
      { id: "how", heading: "How this page gets its numbers" },
      { id: "faqs", heading: "Questions about these figures" },
    ],
    faqs: [
      {
        question: "How many people are playing Roblox right now?",
        answer:
          "The table totals the players in the experiences Roblox currently ranks, at the moment the page was served. It is not a platform-wide figure: Roblox does not publish a live total, and this site will not estimate one.",
        sourceIds: ["roblox-explore-api"],
      },
      {
        question: "Why does the chart cover such a short period?",
        answer:
          "Because that is how long this site has been recording. The window widens on its own as observations accumulate, up to fourteen days. Showing a fourteen-day axis before fourteen days of data exist would be drawing something that was never measured.",
      },
      {
        question: "Do these player counts affect my DevEx payout?",
        answer:
          "No. A payout depends on your eligible Earned Robux and the documented rate, not on how busy the platform is.",
        sourceIds: ["roblox-devex-program"],
      },
    ],
    internalLinks: [
      { route: "/roblox-stats/", anchor: "what Roblox pays creators", relationship: "sibling" },
      { route: "/platform/stock/", anchor: "Roblox's reported results", relationship: "child" },
      { route: "/", anchor: "estimate your own DevEx payout", relationship: "next-step" },
    ],
    schemaTypes: ["WebPage", "BreadcrumbList"],
    parent: "/",
    inPrimaryNav: true,
    rateSensitive: false,
    ogImageAlt: "Live Roblox player counts and observed activity over time.",
  },

  {
    route: "/platform/stock/",
    status: "published",
    indexation: "index",
    pageType: "pillar-guide",
    title: "Roblox Stock (RBLX): Reported Results, No Embedded Widget",
    metaDescription:
      "Roblox's reported quarterly results \u2014 revenue, bookings growth, creator payouts \u2014 with a plain explanation of why no third-party price widget is embedded here.",
    h1: "Roblox stock and reported results",
    navLabel: "Stock",
    primaryIntent: "roblox-stock-results",
    primaryKeyword: "roblox stock",
    secondaryKeywords: [
      "rblx stock",
      "roblox share price",
      "roblox quarterly results",
      "roblox revenue",
      "is roblox profitable",
    ],
    entities: ["Roblox Corporation", "RBLX", "bookings", "developer exchange fees"],
    sourceIds: ["roblox-q2-2026-earnings"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "Roblox reported revenue of 1,469 million US dollars for the quarter ended 30 June 2026, against a consolidated net loss of 185 million, and paid creators 363 million through the Developer Exchange. There is no live share price here: this site embeds no third-party market widget, and it will not print a figure it cannot fetch and attribute.",
    sections: [
      { id: "quote", heading: "RBLX share price" },
      { id: "results", heading: "What the price responds to" },
      { id: "why", heading: "Why there is no embedded chart" },
      { id: "faqs", heading: "Questions" },
    ],
    faqs: [
      {
        question: "Why is there no live RBLX price?",
        answer:
          "Because showing one usually means embedding a market vendor's script, which would run in your browser on a site that loads no third-party scripts. The page is wired to fetch a price server-side once a provider is configured.",
      },
      {
        question: "Is Roblox profitable?",
        answer:
          "It reported a consolidated net loss of 185 million US dollars for the quarter ended 30 June 2026, narrower than the 280 million loss a year earlier, with adjusted EBITDA of 152 million. Those are the company's own figures.",
        sourceIds: ["roblox-q2-2026-earnings"],
      },
      {
        question: "Does the share price affect the DevEx rate?",
        answer:
          "There is no documented link. Roblox sets the DevEx rate and publishes it; nothing in its documentation ties that rate to the share price. Nothing here is investment advice.",
        sourceIds: ["roblox-devex-program"],
      },
    ],
    internalLinks: [
      { route: "/platform/", anchor: "live platform activity", relationship: "parent" },
      { route: "/roblox-stats/", anchor: "creator payout statistics", relationship: "sibling" },
      { route: "/sources/", anchor: "every source used here", relationship: "next-step" },
    ],
    schemaTypes: ["WebPage", "BreadcrumbList"],
    parent: "/platform/",
    inPrimaryNav: false,
    rateSensitive: false,
    ogImageAlt: "Roblox reported quarterly results, from its SEC filings.",
  },

  // -------------------------------------------------------------------------
  // Platform statistics
  // -------------------------------------------------------------------------
  {
    route: "/roblox-stats/",
    status: "published",
    indexation: "index",
    pageType: "pillar-guide",
    title: "Roblox Creator Payout Statistics: DevEx Fees by Quarter",
    metaDescription:
      "What Roblox actually pays creators through DevEx, charted from its SEC filings: 1.50 billion USD in 2025, quarter by quarter, with every figure sourced.",
    h1: "Roblox creator payout statistics",
    navLabel: "Stats",
    primaryIntent: "roblox-devex-statistics",
    primaryKeyword: "roblox devex statistics",
    secondaryKeywords: [
      "how much does roblox pay developers",
      "roblox developer exchange payouts",
      "roblox developer earnings total",
      "devex fees roblox",
      "roblox creator economy stats",
    ],
    entities: [
      "Developer Exchange Program",
      "Roblox Corporation",
      "developer exchange fees",
      "Robux",
    ],
    sourceIds: ["roblox-q2-2026-earnings", "roblox-q4-2025-earnings", "roblox-devex-program"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "Roblox paid creators 1.503 billion USD through the Developer Exchange in 2025, up from 922.8 million in 2024, and 363 million in the second quarter of 2026 alone. Every figure on this page is read from a Roblox filing with the SEC and linked to it. These are quarterly reported numbers, not live measurements.",
    sections: [
      { id: "payouts", heading: "What Roblox pays creators" },
      { id: "quarterly", heading: "DevEx payouts by quarter" },
      { id: "rate-history", heading: "What one Robux has been worth" },
      { id: "business", heading: "Roblox as a business" },
      { id: "what-it-means", heading: "What this means for your own payout" },
      { id: "no-live-data", heading: "Why there is no live data here" },
      { id: "faqs", heading: "Questions about these figures" },
    ],
    faqs: [
      {
        question: "How much does Roblox pay developers in total?",
        answer:
          "1,503,106 thousand US dollars in 2025, reported as developer exchange fees on its income statement, against 922,821 thousand in 2024. Both figures come from Roblox's filing with the SEC.",
        sourceIds: ["roblox-q4-2025-earnings"],
      },
      {
        question: "Is this data live?",
        answer:
          "No, and no page can honestly claim it is. Roblox publishes these figures once a quarter, so quarterly is the finest resolution that exists. This site runs no data collection and estimates nothing.",
        sourceIds: ["roblox-q2-2026-earnings"],
      },
      {
        question: "Where is the Roblox share price?",
        answer:
          "Not here. A live quote needs a paid market-data feed and a third-party script, and this site publishes no figure it cannot trace to a document. The reported results it reacts to are on this page instead. Nothing here is investment advice.",
        sourceIds: ["roblox-q2-2026-earnings"],
      },
      {
        question: "Does a bigger payout total mean a better DevEx rate?",
        answer:
          "No. The total reflects how much creators cashed out, not what each Robux was worth. The rate per Robux is documented separately and has changed once in the period shown.",
        sourceIds: ["roblox-devex-program"],
      },
    ],
    internalLinks: [
      { route: "/devex-rate-history/", anchor: "the dated record of rate changes", relationship: "sibling" },
      { route: "/devex-rates/", anchor: "the rates behind these payouts", relationship: "prerequisite" },
      { route: "/", anchor: "estimate your own DevEx payout", relationship: "next-step" },
      { route: "/sources/", anchor: "every source used on this site", relationship: "next-step" },
    ],
    schemaTypes: ["WebPage", "BreadcrumbList"],
    parent: "/",
    inPrimaryNav: true,
    rateSensitive: true,
    ogImageAlt:
      "Roblox developer exchange payouts by quarter, charted from SEC filings.",
  },

  // -------------------------------------------------------------------------
  // Requirements
  // -------------------------------------------------------------------------
  {
    route: "/devex-requirements/",
    status: "published",
    indexation: "index",
    pageType: "pillar-guide",
    title: "DevEx Requirements: Minimum Robux and Eligibility",
    metaDescription:
      "What Roblox requires for DevEx: 30,000 Earned Robux, a verified email, a portal account, a W-9 or W-8, and an account in good standing.",
    h1: "DevEx requirements",
    navLabel: "Requirements",
    primaryIntent: "devex-eligibility",
    primaryKeyword: "devex requirements",
    secondaryKeywords: [
      "devex minimum",
      "minimum robux for devex",
      "devex eligibility",
      "how much robux to devex",
      "devex requirements roblox",
    ],
    entities: ["Developer Exchange Program", "Earned Robux", "Roblox", "identity verification", "tax information"],
    sourceIds: ["roblox-devex-program", "roblox-devex-help"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "Roblox documents five requirements for DevEx: at least 30,000 Earned Robux, a minimum age of 13, a Roblox-verified email address, a valid DevEx portal account, and an IRS form W-9 or W-8 on file. You must also comply with the Roblox Terms of Use and Community Standards. Meeting all five is a condition of applying, not a guarantee of approval.",
    sections: [
      { id: "requirements", heading: "What Roblox requires" },
      { id: "minimum", heading: "The 30,000 Earned Robux minimum" },
      { id: "not-approval", heading: "Meeting the threshold is not approval" },
      { id: "checklist", heading: "Preparation checklist" },
      { id: "misunderstandings", heading: "Common misunderstandings" },
      { id: "faqs", heading: "Questions about eligibility" },
    ],
    faqs: [
      {
        question: "What is the minimum Robux needed for DevEx?",
        answer:
          "30,000 Earned Robux. Older figures such as 10,000 or 100,000 circulate on third-party sites but do not match current official documentation.",
        sourceIds: ["roblox-devex-program"],
      },
      {
        question: "How old do you have to be for DevEx?",
        answer:
          "Roblox documents a minimum age of 13 to participate. Separately, the higher 0.0054 rate depends on the age verification of the players who spent the Robux, not on the creator's age.",
        sourceIds: ["roblox-devex-program"],
      },
      {
        question: "Do I need to submit tax forms?",
        answer:
          "Yes. Roblox requires an IRS form W-9 for United States taxpayers or a W-8 for non-United States taxpayers to be on file before a DevEx request can proceed.",
        sourceIds: ["roblox-devex-program"],
      },
      {
        question: "Does reaching 30,000 Earned Robux mean I will be paid?",
        answer:
          "No. The threshold lets you submit a request. Roblox reviews each request against its own criteria and decides which Robux qualify as Earned Robux. No calculator, including this one, can determine eligibility.",
        sourceIds: ["roblox-devex-program"],
      },
    ],
    internalLinks: [
      { route: "/", anchor: "check whether your balance meets the minimum", relationship: "parent" },
      { route: "/earned-robux/", anchor: "which Robux count toward the minimum", relationship: "prerequisite" },
      { route: "/how-to-cash-out-robux/", anchor: "the cash-out process itself", relationship: "next-step" },
      { route: "/devex-rates/", anchor: "what your balance would pay", relationship: "sibling" },
    ],
    schemaTypes: ["WebPage", "BreadcrumbList"],
    parent: "/",
    inPrimaryNav: true,
    rateSensitive: true,
    ogImageAlt: "DevEx requirements: minimum Earned Robux, verified email, portal account and tax forms.",
  },

  // -------------------------------------------------------------------------
  // Earned Robux
  // -------------------------------------------------------------------------
  {
    route: "/earned-robux/",
    status: "published",
    indexation: "index",
    pageType: "pillar-guide",
    title: "Earned Robux: What Qualifies for DevEx",
    metaDescription:
      "Earned Robux is not your whole balance. What counts, what does not, and why the distinction decides whether a payout is possible.",
    h1: "Earned Robux",
    navLabel: "Earned Robux",
    primaryIntent: "earned-robux-definition",
    primaryKeyword: "earned robux",
    secondaryKeywords: [
      "what is earned robux",
      "earned robux vs robux",
      "qualifying robux devex",
      "pending robux",
    ],
    entities: ["Earned Robux", "Robux", "Developer Exchange Program", "Roblox"],
    sourceIds: ["roblox-devex-program", "roblox-monetization-overview"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "Earned Robux is the portion of your balance that came from creator activity — players spending Robux in your experience or on your items — as opposed to Robux you bought, received as a gift, or acquired another way. Only Earned Robux can go through DevEx, and Roblox decides which portion of a balance qualifies.",
    sections: [
      { id: "definition", heading: "What Earned Robux means" },
      { id: "qualifying", heading: "What generally counts" },
      { id: "not-qualifying", heading: "What generally does not" },
      { id: "pending", heading: "Pending and available balances" },
      { id: "groups", heading: "Group funds" },
      { id: "faqs", heading: "Questions about Earned Robux" },
    ],
    faqs: [
      {
        question: "Is my whole Robux balance Earned Robux?",
        answer:
          "Almost certainly not. A balance can mix Robux you earned as a creator with Robux you bought or received. Only the earned portion is eligible for DevEx, and Roblox makes that determination.",
        sourceIds: ["roblox-devex-program"],
      },
      {
        question: "Do Robux I bought count toward the 30,000 minimum?",
        answer:
          "Purchased Robux are not Earned Robux, so they do not make a balance eligible for DevEx. The minimum refers specifically to Earned Robux.",
        sourceIds: ["roblox-devex-program"],
      },
      {
        question: "How do creators earn Robux in the first place?",
        answer:
          "Roblox pays creators 70% of the Robux spent on in-experience purchases such as developer products and passes, retaining 30%. That 70% is what accumulates as Earned Robux.",
        sourceIds: ["roblox-monetization-overview"],
      },
      {
        question: "Can group funds be cashed out?",
        answer:
          "Group funds are held by the group rather than by an individual account, and payouts have to reach a personal account before DevEx applies. Check the current official documentation for how your specific case is treated.",
        sourceIds: ["roblox-devex-program"],
      },
    ],
    internalLinks: [
      { route: "/", anchor: "calculate a payout on eligible Robux", relationship: "parent" },
      { route: "/devex-requirements/", anchor: "the eligibility requirements", relationship: "sibling" },
      { route: "/robux-tax-calculator/", anchor: "how much of a sale you keep", relationship: "tool" },
      { route: "/how-to-cash-out-robux/", anchor: "converting an eligible balance", relationship: "next-step" },
    ],
    schemaTypes: ["WebPage", "BreadcrumbList"],
    parent: "/",
    inPrimaryNav: false,
    rateSensitive: false,
    ogImageAlt: "Earned Robux explained: which part of a Robux balance qualifies for DevEx.",
  },

  // -------------------------------------------------------------------------
  // Cash-out guide
  // -------------------------------------------------------------------------
  {
    route: "/how-to-cash-out-robux/",
    status: "published",
    indexation: "index",
    pageType: "pillar-guide",
    title: "How to Cash Out Robux Through DevEx",
    metaDescription:
      "The official steps for converting eligible Earned Robux into real money, what to prepare first, and which services to avoid.",
    h1: "How to cash out Robux",
    navLabel: "Cashing out",
    primaryIntent: "cash-out-process",
    primaryKeyword: "how to cash out robux",
    secondaryKeywords: [
      "cash out robux",
      "sell robux to usd",
      "turn robux into money",
      "how to convert robux to usd",
      "withdraw robux",
    ],
    entities: ["Developer Exchange Program", "Earned Robux", "Roblox", "DevEx portal", "identity verification"],
    sourceIds: ["roblox-devex-program", "roblox-devex-help"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "Cashing out Robux means submitting a DevEx request through the official Roblox DevEx portal once you hold at least 30,000 Earned Robux, have a verified email, and have a W-9 or W-8 on file. Roblox reviews each request and decides the outcome. There is no legitimate route outside the official programme.",
    sections: [
      { id: "process", heading: "The process Roblox documents" },
      { id: "checklist", heading: "Prepare before you apply" },
      { id: "timing", heading: "How long it takes" },
      { id: "safety", heading: "Avoid unofficial services" },
      { id: "group", heading: "When a group earned it" },
      { id: "after", heading: "After the payout" },
      { id: "faqs", heading: "Questions about cashing out" },
    ],
    faqs: [
      {
        question: "Where do I submit a DevEx request?",
        answer:
          "Through the official DevEx portal linked from the Roblox Creator Hub. A valid DevEx portal account is one of the documented requirements.",
        sourceIds: ["roblox-devex-program"],
      },
      {
        question: "How long does a DevEx payout take?",
        answer:
          "Roblox does not publish a guaranteed processing time, so this site does not state one. Any specific number you see quoted elsewhere is someone's anecdote rather than an official commitment.",
        sourceIds: ["roblox-devex-help"],
      },
      {
        question: "Is there a faster way to sell Robux?",
        answer:
          "No legitimate one. Services offering to buy Robux or convert a balance outside DevEx generally violate the Roblox Terms of Use and put your account at risk. Never share your Roblox credentials with any third party, including this site.",
      },
      {
        question: "Do I pay tax on a DevEx payout?",
        answer:
          "A DevEx payout is income, and how it is taxed depends on where you live. This site gives no tax advice and provides an optional estimate field only so you can model your own figure.",
      },
    ],
    internalLinks: [
      { route: "/devex-requirements/", anchor: "the requirements you need to meet first", relationship: "prerequisite" },
      { route: "/", anchor: "estimate what your balance would pay", relationship: "parent" },
      { route: "/devex-fees-and-taxes/", anchor: "what comes off after the conversion", relationship: "next-step" },
      { route: "/earned-robux/", anchor: "check which Robux qualify", relationship: "prerequisite" },
    ],
    schemaTypes: ["WebPage", "BreadcrumbList"],
    parent: "/",
    inPrimaryNav: false,
    rateSensitive: false,
    ogImageAlt: "How to cash out Robux: the official DevEx request process step by step.",
  },

  // -------------------------------------------------------------------------
  // Rate history
  // -------------------------------------------------------------------------
  {
    route: "/devex-rate-history/",
    status: "published",
    indexation: "index",
    pageType: "pillar-guide",
    title: "DevEx Rate History: The 2025 Change from 0.0035",
    metaDescription:
      "A dated record of verified DevEx rates, including the September 2025 rise from 0.0035 to 0.0038 and how legacy balances are treated.",
    h1: "DevEx rate history",
    navLabel: "Rate history",
    primaryIntent: "devex-rate-history",
    primaryKeyword: "devex rate history",
    secondaryKeywords: [
      "old devex rate",
      "devex rate 2023",
      "legacy devex rate",
      "devex rate change",
      "previous robux exchange rate",
    ],
    entities: ["Developer Exchange Program", "legacy rate", "standard rate", "Robux"],
    sourceIds: ["roblox-devex-program"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "The documented change is from 0.0035 to 0.0038 USD per Earned Robux, effective 5 September 2025 at 10:00 PT. For 30,000 Earned Robux that moved the payout from 105 to 114 dollars. Balances earned before the change are cashed out at the older rate first, so a single balance can span both.",
    sections: [
      { id: "timeline", heading: "Verified timeline" },
      { id: "comparison", heading: "What the change was worth" },
      { id: "legacy-balances", heading: "How legacy balances are handled" },
      { id: "no-forecast", heading: "Why there is no forecast here" },
      { id: "faqs", heading: "Questions about past rates" },
    ],
    faqs: [
      {
        question: "What was the DevEx rate before September 2025?",
        answer:
          "0.0035 USD per Earned Robux, which Roblox stated as 105 dollars for 30,000 Earned Robux.",
        sourceIds: ["roblox-devex-program"],
      },
      {
        question: "Does my old balance convert at the old rate?",
        answer:
          "Robux earned before 5 September 2025 at 10:00 PT are cashed out at 0.0035 first, according to Roblox's transition rules. The split is Roblox's accounting, not something a creator selects.",
        sourceIds: ["roblox-devex-program"],
      },
      {
        question: "Will the rate go up again?",
        answer:
          "Nobody outside Roblox knows, and this page will not guess. It records only changes that official documentation confirms, each with its effective date.",
      },
    ],
    internalLinks: [
      { route: "/devex-rates/", anchor: "the rates in effect now", relationship: "parent" },
      { route: "/", anchor: "compare rates on your own balance", relationship: "tool" },
      { route: "/changelog/", anchor: "when this site last updated its data", relationship: "next-step" },
    ],
    schemaTypes: ["WebPage", "BreadcrumbList"],
    parent: "/devex-rates/",
    inPrimaryNav: false,
    rateSensitive: true,
    ogImageAlt: "DevEx rate history: the September 2025 change from 0.0035 to 0.0038.",
  },

  // -------------------------------------------------------------------------
  // Fees and taxes
  // -------------------------------------------------------------------------
  {
    route: "/devex-fees-and-taxes/",
    status: "published",
    indexation: "index",
    pageType: "pillar-guide",
    title: "DevEx Fees and Taxes: What Comes Off a Payout",
    metaDescription:
      "Provider fees, currency spreads and income tax all sit between the DevEx rate and your bank account. Model each with your own figures.",
    h1: "DevEx fees and taxes",
    navLabel: "Fees and taxes",
    primaryIntent: "fees-payment",
    primaryKeyword: "devex fees",
    secondaryKeywords: [
      "devex tax",
      "robux payout fees",
      "devex payment fees",
      "do you pay tax on devex",
    ],
    entities: ["Developer Exchange Program", "USD", "exchange rate", "tax information"],
    sourceIds: ["roblox-devex-program", "ecb-exchange-rates"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "Three separate things reduce a DevEx payout and none of them is the DevEx rate: your payment provider's fees, the currency conversion spread if you are paid outside the United States, and income tax in your own country. This page lets you model each one with your own numbers. It is not tax advice.",
    sections: [
      { id: "three-layers", heading: "Three separate deductions" },
      { id: "fees", heading: "Payment-provider fees" },
      { id: "currency", heading: "Currency conversion" },
      { id: "tax", heading: "Income tax" },
      { id: "estimator", heading: "Model your own figures" },
      { id: "faqs", heading: "Questions about fees and tax" },
    ],
    faqs: [
      {
        question: "Does Roblox take a fee on top of the DevEx rate?",
        answer:
          "The DevEx rate is what Roblox pays per eligible Earned Robux. The 30% platform commission was already applied earlier, when the Robux were earned — it is not applied a second time at cash-out.",
        sourceIds: ["roblox-monetization-overview"],
      },
      {
        question: "What tax rate applies to a DevEx payout?",
        answer:
          "That depends entirely on your country and circumstances, and this site does not state a figure for you. The estimator here uses whatever percentage you enter so you can model your own situation.",
      },
      {
        question: "Why is my bank's conversion different from this site's?",
        answer:
          "Local-currency figures here use European Central Bank reference rates, which are published once each working day and are not tradable quotes. Banks and payment providers apply their own rate plus a margin.",
        sourceIds: ["ecb-exchange-rates"],
      },
    ],
    internalLinks: [
      { route: "/", anchor: "the calculator with optional fee and tax controls", relationship: "parent" },
      { route: "/how-to-cash-out-robux/", anchor: "the cash-out process", relationship: "prerequisite" },
      { route: "/robux-tax-calculator/", anchor: "the separate Roblox marketplace fee", relationship: "sibling" },
      { route: "/methodology/", anchor: "how these estimates are produced", relationship: "next-step" },
    ],
    schemaTypes: ["WebPage", "BreadcrumbList"],
    parent: "/",
    inPrimaryNav: false,
    rateSensitive: false,
    ogImageAlt: "DevEx fees and taxes: provider fees, currency spread and income tax explained.",
  },

  // -------------------------------------------------------------------------
  // Robux tax calculator — distinct product
  // -------------------------------------------------------------------------
  {
    route: "/robux-tax-calculator/",
    status: "published",
    indexation: "index",
    pageType: "tool",
    title: "Roblox Tax Calculator: Marketplace Fee on a Sale",
    metaDescription:
      "What you keep after the Roblox platform commission, or what to charge to clear a target. Covers in-experience and Marketplace sales.",
    h1: "Roblox tax calculator",
    navLabel: "Roblox tax",
    primaryIntent: "marketplace-tax",
    primaryKeyword: "roblox tax",
    secondaryKeywords: [
      "robux tax calculator",
      "roblox tax calculator",
      "tax roblox",
      "roblox marketplace fee",
      "30 percent roblox tax",
    ],
    entities: ["Roblox", "Robux", "Marketplace fee"],
    sourceIds: ["roblox-marketplace-fees", "roblox-monetization-overview"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "The \"Roblox tax\" is the platform commission, and it depends on what you sold. On in-experience purchases such as developer products and passes you keep 70% and Roblox takes 30%. On Marketplace avatar items the creator share starts at 30% and rises with price, reaching 70% at six times the price floor. This is separate from DevEx.",
    sections: [
      { id: "calculator", heading: "Marketplace fee calculator" },
      { id: "schemes", heading: "Which commission applies" },
      { id: "progressive", heading: "The progressive Marketplace share" },
      { id: "scope", heading: "Scope and exclusions" },
      { id: "not-devex", heading: "This is not the DevEx rate" },
      { id: "faqs", heading: "Questions about the Roblox fee" },
    ],
    faqs: [
      {
        question: "How much is the Roblox tax?",
        answer:
          "On in-experience purchases the creator keeps 70% and Roblox retains 30%. On Marketplace avatar item sales the base creator share is 30%, rising through a documented tier table to 70% for items priced at six times the price floor or above.",
        sourceIds: ["roblox-marketplace-fees", "roblox-monetization-overview"],
      },
      {
        question: "Is the Roblox tax applied again when I use DevEx?",
        answer:
          "No. The commission applies once, when the Robux are earned. DevEx then converts the Earned Robux you kept. Applying both to the same figure would understate your payout.",
        sourceIds: ["roblox-monetization-overview"],
      },
      {
        question: "What is the price floor?",
        answer:
          "The minimum price for an item category, which the progressive tiers are measured against. Because floors differ by category, this calculator asks for the multiple rather than assuming one universal floor.",
        sourceIds: ["roblox-marketplace-fees"],
      },
    ],
    internalLinks: [
      { route: "/calculators/", anchor: "the other creator calculators", relationship: "parent" },
      { route: "/earned-robux/", anchor: "what happens to the Robux you keep", relationship: "next-step" },
      { route: "/", anchor: "convert your Earned Robux to USD", relationship: "tool" },
      { route: "/devex-fees-and-taxes/", anchor: "deductions after a DevEx payout", relationship: "sibling" },
    ],
    schemaTypes: ["WebApplication", "WebPage", "BreadcrumbList"],
    parent: "/calculators/",
    inPrimaryNav: false,
    rateSensitive: true,
    ogImageAlt: "Roblox tax calculator: marketplace commission on in-experience and Marketplace sales.",
  },

  // -------------------------------------------------------------------------
  // Directories
  // -------------------------------------------------------------------------
  {
    route: "/calculators/",
    status: "published",
    indexation: "index",
    pageType: "directory",
    title: "Creator Finance Calculators for Roblox",
    metaDescription:
      "Four working calculators covering DevEx payouts, Robux conversions, payout targets and marketplace fees, and which to reach for.",
    h1: "Creator finance calculators",
    navLabel: "Calculators",
    primaryIntent: "calculator-comparison",
    primaryKeyword: "roblox calculator",
    secondaryKeywords: ["robux calculator", "roblox creator calculators", "devex tools"],
    entities: ["Roblox", "Robux", "Developer Exchange Program"],
    sourceIds: ["roblox-devex-program"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "Four calculators, each answering one question. The DevEx calculator converts Earned Robux to dollars. Robux to USD separates creator payout from purchase price. The payout target calculator works backwards from a dollar goal. The Roblox tax calculator handles the platform commission on a sale.",
    sections: [{ id: "tools", heading: "Available calculators" }],
    faqs: [],
    internalLinks: [
      { route: "/", anchor: "DevEx calculator", relationship: "child" },
      { route: "/robux-to-usd/", anchor: "Robux to USD converter", relationship: "child" },
      { route: "/usd-to-robux/", anchor: "payout target calculator", relationship: "child" },
      { route: "/robux-tax-calculator/", anchor: "Roblox tax calculator", relationship: "child" },
      { route: "/guides/", anchor: "the explanatory guides", relationship: "sibling" },
    ],
    schemaTypes: ["CollectionPage", "ItemList", "BreadcrumbList"],
    parent: "/",
    inPrimaryNav: true,
    rateSensitive: false,
    ogImageAlt: "Directory of Roblox creator finance calculators.",
  },
  {
    route: "/guides/",
    status: "published",
    indexation: "index",
    pageType: "directory",
    title: "DevEx Guides: Rates, Eligibility and Cashing Out",
    metaDescription:
      "Six guides in a reading order, from what Earned Robux means through to what comes off a payout.",
    h1: "DevEx guides",
    navLabel: "Guides",
    primaryIntent: "informational-definition",
    primaryKeyword: "devex guide",
    secondaryKeywords: ["roblox devex explained", "how devex works"],
    entities: ["Developer Exchange Program", "Earned Robux", "Robux"],
    sourceIds: ["roblox-devex-program"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "Six guides, in the order they make sense to read. Start with what Earned Robux means, then the rates and requirements, then the cash-out process, and finish with what comes off the payout. Each one states its sources and the date it was last checked.",
    sections: [{ id: "reading-order", heading: "Suggested reading order" }],
    faqs: [],
    internalLinks: [
      { route: "/earned-robux/", anchor: "Earned Robux", relationship: "child" },
      { route: "/devex-rates/", anchor: "DevEx rates", relationship: "child" },
      { route: "/devex-requirements/", anchor: "DevEx requirements", relationship: "child" },
      { route: "/how-to-cash-out-robux/", anchor: "cashing out Robux", relationship: "child" },
      { route: "/devex-rate-history/", anchor: "rate history", relationship: "child" },
      { route: "/devex-fees-and-taxes/", anchor: "fees and taxes", relationship: "child" },
      { route: "/calculators/", anchor: "the calculators these guides support", relationship: "sibling" },
      { route: "/", anchor: "the DevEx calculator itself", relationship: "parent" },
    ],
    schemaTypes: ["CollectionPage", "ItemList", "BreadcrumbList"],
    parent: "/",
    inPrimaryNav: true,
    rateSensitive: false,
    ogImageAlt: "Directory of DevEx guides in suggested reading order.",
  },
  {
    route: "/conversions/",
    status: "published",
    indexation: "index",
    pageType: "conversion-hub",
    title: "Robux to USD Conversions for Common Amounts",
    metaDescription:
      "Common Earned Robux amounts valued at the current, legacy and U.S. 18+ rates, plus an input for any amount you like.",
    h1: "Robux to USD conversions",
    navLabel: "Conversions",
    primaryIntent: "numeric-amount-conversion",
    primaryKeyword: "robux to usd conversions",
    secondaryKeywords: [
      "robux conversion table",
      "how much is robux worth",
      "robux to usd chart",
    ],
    entities: ["Robux", "USD", "Earned Robux", "Developer Exchange Program"],
    sourceIds: ["roblox-devex-program"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "Every amount below is converted at the current DevEx rate of 0.0038 USD per eligible Earned Robux, with the legacy and conditional rates shown alongside for comparison. Amounts under 30,000 are included for reference but cannot be cashed out, because that is the documented minimum.",
    sections: [
      { id: "converter", heading: "Convert any amount" },
      { id: "table", heading: "Common amounts" },
      { id: "detailed", heading: "Amounts with a full breakdown" },
      { id: "rounding", heading: "How these figures are rounded" },
    ],
    faqs: [],
    internalLinks: [
      { route: "/robux-to-usd/", anchor: "the Robux to USD converter", relationship: "parent" },
      { route: "/", anchor: "the full DevEx calculator", relationship: "tool" },
      { route: "/devex-rates/", anchor: "the rates used in this table", relationship: "prerequisite" },
    ],
    schemaTypes: ["CollectionPage", "ItemList", "BreadcrumbList"],
    parent: "/robux-to-usd/",
    inPrimaryNav: false,
    rateSensitive: true,
    ogImageAlt: "Conversion table of common Robux amounts to US dollars.",
  },

  // -------------------------------------------------------------------------
  // Trust pages
  // -------------------------------------------------------------------------
  {
    route: "/about/",
    status: "published",
    indexation: "index",
    pageType: "trust",
    title: "About DevEx Calculator",
    metaDescription:
      "Who runs this site, what it is for, what it deliberately does not do, and why it is not affiliated with Roblox Corporation.",
    h1: "About DevEx Calculator",
    navLabel: "About",
    primaryIntent: "informational-definition",
    primaryKeyword: "about devexcalculator",
    secondaryKeywords: [],
    entities: ["Developer Exchange Program"],
    sourceIds: [],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "DevExCalculator.org is an independent calculator and reference for Roblox creators working out what a DevEx payout is worth. It is not affiliated with, endorsed by or operated by Roblox Corporation, and it cannot determine whether any request will be approved.",
    sections: [
      { id: "purpose", heading: "What this site is for" },
      { id: "principles", heading: "How it is built" },
      { id: "limits", heading: "What it will not do" },
      { id: "affiliation", heading: "Affiliation" },
    ],
    faqs: [],
    internalLinks: [
      { route: "/methodology/", anchor: "the calculation methodology", relationship: "next-step" },
      { route: "/sources/", anchor: "the sources behind every figure", relationship: "next-step" },
      { route: "/editorial-policy/", anchor: "the editorial policy", relationship: "sibling" },
      { route: "/accessibility/", anchor: "the accessibility statement", relationship: "sibling" },
      { route: "/", anchor: "the calculator itself", relationship: "parent" },
    ],
    schemaTypes: ["AboutPage", "BreadcrumbList"],
    parent: "/",
    inPrimaryNav: false,
    rateSensitive: false,
    ogImageAlt: "About DevEx Calculator, an independent Roblox creator payout reference.",
  },
  {
    route: "/methodology/",
    status: "published",
    indexation: "index",
    pageType: "trust",
    title: "Calculation Methodology",
    metaDescription:
      "How every figure here is produced: the formulas, the exact arithmetic, the rounding policy, and what an estimate cannot tell you.",
    h1: "Calculation methodology",
    navLabel: "Methodology",
    primaryIntent: "informational-definition",
    primaryKeyword: "devex calculator methodology",
    secondaryKeywords: ["how devex is calculated", "devex formula"],
    entities: ["Developer Exchange Program", "Robux", "USD"],
    sourceIds: ["roblox-devex-program", "ecb-exchange-rates"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "Every payout figure is Robux multiplied by an exact decimal rate held as a fraction rather than a floating-point number, rounded once at the moment it is displayed. Required-Robux figures always round up. Local-currency values are European Central Bank reference rates with the observation date shown.",
    sections: [
      { id: "formulas", heading: "The formulas" },
      { id: "arithmetic", heading: "Why exact arithmetic matters" },
      { id: "rounding", heading: "Rounding policy" },
      { id: "currency", heading: "Local-currency estimates" },
      { id: "limits", heading: "What this cannot tell you" },
    ],
    faqs: [],
    internalLinks: [
      { route: "/api/", anchor: "the same registry as JSON", relationship: "next-step" },
      { route: "/sources/", anchor: "the source registry", relationship: "sibling" },
      { route: "/", anchor: "the calculator these formulas drive", relationship: "parent" },
      { route: "/corrections/", anchor: "how to report an error", relationship: "next-step" },
      { route: "/devex-rates/", anchor: "the rates used", relationship: "prerequisite" },
    ],
    schemaTypes: ["WebPage", "BreadcrumbList"],
    parent: "/",
    inPrimaryNav: false,
    rateSensitive: true,
    ogImageAlt: "Calculation methodology: formulas, exact arithmetic and rounding policy.",
  },
  {
    route: "/sources/",
    status: "published",
    indexation: "index",
    pageType: "trust",
    title: "Sources and Verification Dates",
    metaDescription:
      "Every official source behind the rates, minimums and fee percentages on this site, what each one supports, and the date it was last checked.",
    h1: "Sources",
    navLabel: "Sources",
    primaryIntent: "informational-definition",
    primaryKeyword: "devex rate source",
    secondaryKeywords: ["official devex rate", "roblox devex documentation"],
    entities: ["Roblox", "Developer Exchange Program", "European Central Bank"],
    // The page renders the whole registry, but declares the primary sources so
    // the rate-sensitive citation check has something concrete to verify.
    sourceIds: ["roblox-devex-program", "ecb-exchange-rates"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "Every time-sensitive claim on this site is tied to one of the sources listed below, each with the facts it supports and the date it was last checked. Where a source says nothing on a question, this site says nothing either rather than filling the gap.",
    sections: [
      { id: "registry", heading: "Source registry" },
      { id: "cadence", heading: "Review cadence" },
    ],
    faqs: [],
    internalLinks: [
      { route: "/api/", anchor: "read these sources as JSON", relationship: "sibling" },
      { route: "/methodology/", anchor: "how the figures are calculated", relationship: "sibling" },
      { route: "/devex-rates/", anchor: "the rates these sources support", relationship: "next-step" },
      { route: "/corrections/", anchor: "report an out-of-date figure", relationship: "next-step" },
      { route: "/", anchor: "the calculator these sources feed", relationship: "parent" },
    ],
    schemaTypes: ["WebPage", "BreadcrumbList"],
    parent: "/",
    inPrimaryNav: false,
    rateSensitive: true,
    ogImageAlt: "Source registry with verification dates for every published figure.",
  },
  {
    route: "/editorial-policy/",
    status: "published",
    indexation: "index",
    pageType: "trust",
    title: "Editorial Policy",
    metaDescription:
      "The rules this site writes under: what counts as a source, how claims are labelled, what is never published, and how time-sensitive content is reviewed.",
    h1: "Editorial policy",
    navLabel: "Editorial policy",
    primaryIntent: "informational-definition",
    primaryKeyword: "editorial policy",
    secondaryKeywords: [],
    entities: [],
    sourceIds: [],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "Every time-sensitive claim is tied to an official source and dated. Nothing is published as fact that has not been verified, inferences are labelled as inferences, and no figure is kept online because it performs well in search once it stops being accurate.",
    sections: [
      { id: "sourcing", heading: "Sourcing standard" },
      { id: "labels", heading: "How claims are labelled" },
      { id: "never", heading: "What this site never publishes" },
      { id: "review", heading: "Review cadence" },
    ],
    faqs: [],
    internalLinks: [
      { route: "/corrections/", anchor: "the corrections policy", relationship: "sibling" },
      { route: "/sources/", anchor: "the source registry", relationship: "sibling" },
      { route: "/about/", anchor: "who runs this site", relationship: "parent" },
    ],
    schemaTypes: ["WebPage", "BreadcrumbList"],
    parent: "/about/",
    inPrimaryNav: false,
    rateSensitive: false,
    ogImageAlt: "Editorial policy governing sourcing and publication on this site.",
  },
  {
    route: "/corrections/",
    status: "published",
    indexation: "index",
    pageType: "trust",
    title: "Corrections Policy",
    metaDescription:
      "How to report an error on this site, what happens when a rate or requirement turns out to be wrong, and where corrections are recorded.",
    h1: "Corrections policy",
    navLabel: "Corrections",
    primaryIntent: "informational-definition",
    primaryKeyword: "corrections policy",
    secondaryKeywords: [],
    entities: [],
    sourceIds: [],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "If a figure here is wrong, it gets fixed rather than quietly left. A correction to a rate, minimum or fee follows a fixed sequence: verify against the official source, update the data, update the tests, update the affected pages, record it in the changelog, and redeploy.",
    sections: [
      { id: "report", heading: "Reporting an error" },
      { id: "process", heading: "What happens next" },
      { id: "record", heading: "Where corrections are recorded" },
    ],
    faqs: [],
    internalLinks: [
      { route: "/changelog/", anchor: "the public changelog", relationship: "next-step" },
      { route: "/editorial-policy/", anchor: "the editorial policy", relationship: "sibling" },
      { route: "/contact/", anchor: "get in touch", relationship: "next-step" },
      { route: "/about/", anchor: "what this site is for", relationship: "parent" },
    ],
    schemaTypes: ["WebPage", "BreadcrumbList"],
    parent: "/about/",
    inPrimaryNav: false,
    rateSensitive: false,
    ogImageAlt: "Corrections policy: how errors are reported and fixed.",
  },
  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------
  {
    route: "/api/",
    status: "published",
    indexation: "index",
    pageType: "trust",
    title: "Rates API: The DevEx Registry as JSON",
    metaDescription:
      "A free, versioned JSON endpoint for the current DevEx rates, the minimum and the marketplace fee, each with the source it was verified against.",
    h1: "Rates API",
    navLabel: "API",
    primaryIntent: "informational-definition",
    primaryKeyword: "devex rates api",
    secondaryKeywords: ["roblox devex api", "robux rate json", "devex rate endpoint"],
    entities: ["Developer Exchange Program", "standard rate", "legacy rate", "USD"],
    sourceIds: ["roblox-devex-program"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "The same rate registry this site calculates from is published as JSON at /api/rates, with the source and verification date attached to every figure. It needs no key, sets no cookie and may be called from a browser on any origin. If you are building your own calculator, read it rather than copying a number that will go out of date.",
    sections: [
      { id: "rates", heading: "GET /api/rates" },
      { id: "fx", heading: "GET /api/fx/latest" },
      { id: "using", heading: "Using it" },
      { id: "terms", heading: "What is promised, and what is not" },
    ],
    faqs: [],
    internalLinks: [
      { route: "/methodology/", anchor: "how these figures are produced", relationship: "next-step" },
      { route: "/sources/", anchor: "where each figure was verified", relationship: "sibling" },
      { route: "/changelog/", anchor: "when the data last changed", relationship: "sibling" },
      { route: "/about/", anchor: "what this site is for", relationship: "parent" },
    ],
    schemaTypes: ["WebPage", "BreadcrumbList"],
    parent: "/about/",
    inPrimaryNav: false,
    rateSensitive: true,
    ogImageAlt: "Rates API: the DevEx rate registry published as JSON with its sources.",
  },
  {
    route: "/changelog/",
    status: "published",
    indexation: "index",
    pageType: "trust",
    title: "Changelog",
    metaDescription:
      "A dated record of every change to the rates, requirements and calculations published on this site, including what was verified and against which source.",
    h1: "Changelog",
    navLabel: "Changelog",
    primaryIntent: "informational-definition",
    primaryKeyword: "devex calculator changelog",
    secondaryKeywords: [],
    entities: ["Developer Exchange Program"],
    sourceIds: ["roblox-devex-program"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "Every change to a published rate, minimum or fee percentage is recorded here with its date and the source that justified it. Rate data is never updated automatically from a scraped page; each change is verified by hand first.",
    sections: [{ id: "entries", heading: "Change history" }],
    faqs: [],
    internalLinks: [
      { route: "/devex-rate-history/", anchor: "the DevEx rate history itself", relationship: "sibling" },
      { route: "/corrections/", anchor: "the corrections policy", relationship: "sibling" },
      { route: "/sources/", anchor: "the source registry", relationship: "next-step" },
      { route: "/about/", anchor: "how this site is maintained", relationship: "parent" },
    ],
    schemaTypes: ["WebPage", "BreadcrumbList"],
    parent: "/about/",
    inPrimaryNav: false,
    rateSensitive: true,
    ogImageAlt: "Changelog of rate and content updates with dates and sources.",
  },
  {
    route: "/contact/",
    status: "published",
    indexation: "index",
    pageType: "trust",
    title: "Contact",
    metaDescription:
      "How to reach DevExCalculator.org about a factual correction, an accessibility problem, or a question about the calculations.",
    h1: "Contact",
    navLabel: "Contact",
    primaryIntent: "informational-definition",
    primaryKeyword: "contact devexcalculator",
    secondaryKeywords: [],
    entities: [],
    sourceIds: [],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "Corrections to a rate or requirement are the most useful thing you can send, especially with a link to the official page that contradicts what is published here. This site cannot help with your Roblox account, your DevEx request, or a payout that has not arrived — only Roblox can.",
    sections: [
      { id: "form", heading: "Get in touch" },
      { id: "cannot-help", heading: "What this site cannot help with" },
    ],
    faqs: [],
    internalLinks: [
      { route: "/corrections/", anchor: "the corrections policy", relationship: "prerequisite" },
      { route: "/privacy/", anchor: "how your message is handled", relationship: "next-step" },
      { route: "/about/", anchor: "about this site", relationship: "parent" },
    ],
    schemaTypes: ["ContactPage", "BreadcrumbList"],
    parent: "/about/",
    inPrimaryNav: false,
    rateSensitive: false,
    ogImageAlt: "Contact page for corrections and accessibility reports.",
  },

  // -------------------------------------------------------------------------
  // Legal
  // -------------------------------------------------------------------------
  {
    route: "/privacy/",
    status: "published",
    indexation: "index",
    pageType: "legal",
    title: "Privacy Policy",
    metaDescription:
      "What this site stores, what it does not, where your calculator inputs go, and which third parties are involved — describing only what is actually configured.",
    h1: "Privacy policy",
    navLabel: "Privacy",
    primaryIntent: "informational-definition",
    primaryKeyword: "privacy policy",
    secondaryKeywords: [],
    entities: [],
    sourceIds: [],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "Calculations run in your browser and are never sent to a server. Anything you save — recent calculations, preferred currency, theme — stays in your own browser's local storage and can be cleared from the calculator at any time. This page describes only what is actually switched on.",
    sections: [
      { id: "calculations", heading: "Your calculations" },
      { id: "local-storage", heading: "Local storage" },
      { id: "analytics", heading: "Analytics" },
      { id: "contact", heading: "Contact submissions" },
      { id: "infrastructure", heading: "Hosting and server logs" },
      { id: "external", heading: "External links" },
      { id: "rights", heading: "Your choices" },
    ],
    faqs: [],
    internalLinks: [
      { route: "/terms/", anchor: "the terms of use", relationship: "sibling" },
      { route: "/disclaimer/", anchor: "the disclaimer", relationship: "sibling" },
      { route: "/contact/", anchor: "contact", relationship: "next-step" },
      { route: "/", anchor: "the calculator this policy covers", relationship: "parent" },
    ],
    schemaTypes: ["WebPage", "BreadcrumbList"],
    parent: "/",
    inPrimaryNav: false,
    rateSensitive: false,
    ogImageAlt: "Privacy policy describing local storage and configured integrations.",
  },
  {
    route: "/terms/",
    status: "published",
    indexation: "index",
    pageType: "legal",
    title: "Terms of Use",
    metaDescription:
      "The terms covering use of DevExCalculator.org, including the estimate-only nature of every figure and the absence of any affiliation with Roblox Corporation.",
    h1: "Terms of use",
    navLabel: "Terms",
    primaryIntent: "informational-definition",
    primaryKeyword: "terms of use",
    secondaryKeywords: [],
    entities: [],
    sourceIds: [],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "You may use this site freely to estimate DevEx payouts. Every figure is an estimate and none of it is financial, legal or tax advice. This site is independent of Roblox Corporation and cannot influence, predict or guarantee the outcome of a DevEx request.",
    sections: [
      { id: "use", heading: "Using this site" },
      { id: "estimates", heading: "Estimates, not advice" },
      { id: "affiliation", heading: "No affiliation with Roblox" },
      { id: "liability", heading: "Limitation of liability" },
      { id: "changes", heading: "Changes to these terms" },
    ],
    faqs: [],
    internalLinks: [
      { route: "/privacy/", anchor: "the privacy policy", relationship: "sibling" },
      { route: "/disclaimer/", anchor: "the disclaimer", relationship: "sibling" },
      { route: "/", anchor: "the calculator these terms cover", relationship: "parent" },
    ],
    schemaTypes: ["WebPage", "BreadcrumbList"],
    parent: "/",
    inPrimaryNav: false,
    rateSensitive: false,
    ogImageAlt: "Terms of use for DevExCalculator.org.",
  },
  {
    route: "/disclaimer/",
    status: "published",
    indexation: "index",
    pageType: "legal",
    title: "Disclaimer",
    metaDescription:
      "Why every figure here is an estimate, what this site cannot determine about your DevEx request, and its independence from Roblox Corporation.",
    h1: "Disclaimer",
    navLabel: "Disclaimer",
    primaryIntent: "informational-definition",
    primaryKeyword: "devex calculator disclaimer",
    secondaryKeywords: [],
    entities: ["Roblox", "Developer Exchange Program"],
    sourceIds: ["roblox-devex-program"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "This site estimates. It cannot tell you whether your Robux qualify as Earned Robux, whether a DevEx request will be approved, when a payout will arrive, or what you will receive after your own bank and tax authority are done. Roblox decides all of that.",
    sections: [
      { id: "estimates", heading: "Everything here is an estimate" },
      { id: "cannot-determine", heading: "What this site cannot determine" },
      { id: "trademarks", heading: "Trademarks" },
      { id: "accuracy", heading: "Accuracy and currency of information" },
    ],
    faqs: [],
    internalLinks: [
      { route: "/methodology/", anchor: "how the estimates are produced", relationship: "next-step" },
      { route: "/terms/", anchor: "the terms of use", relationship: "sibling" },
      { route: "/sources/", anchor: "the sources used", relationship: "next-step" },
      { route: "/", anchor: "the estimates this disclaimer applies to", relationship: "parent" },
    ],
    schemaTypes: ["WebPage", "BreadcrumbList"],
    parent: "/",
    inPrimaryNav: false,
    rateSensitive: false,
    ogImageAlt: "Disclaimer: estimates only, no affiliation with Roblox Corporation.",
  },
  {
    route: "/accessibility/",
    status: "published",
    indexation: "index",
    pageType: "legal",
    title: "Accessibility Statement",
    metaDescription:
      "The accessibility standard this site targets, what has been tested, known limitations, and how to report a barrier you run into.",
    h1: "Accessibility statement",
    navLabel: "Accessibility",
    primaryIntent: "informational-definition",
    primaryKeyword: "accessibility statement",
    secondaryKeywords: [],
    entities: [],
    sourceIds: [],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer:
      "This site targets WCAG 2.2 level AA. The calculator is fully keyboard operable, results are announced to screen readers, nothing scrolls sideways at 320 pixels, and the layout holds at 200% text zoom. If something blocks you, reporting it is genuinely useful.",
    sections: [
      { id: "standard", heading: "The standard targeted" },
      { id: "tested", heading: "What has been tested" },
      { id: "features", heading: "Accessibility features" },
      { id: "limitations", heading: "Known limitations" },
      { id: "feedback", heading: "Reporting a problem" },
    ],
    faqs: [],
    internalLinks: [
      { route: "/contact/", anchor: "report an accessibility problem", relationship: "next-step" },
      { route: "/", anchor: "the calculator itself", relationship: "parent" },
    ],
    schemaTypes: ["WebPage", "BreadcrumbList"],
    parent: "/",
    inPrimaryNav: false,
    rateSensitive: false,
    ogImageAlt: "Accessibility statement targeting WCAG 2.2 level AA.",
  },
];

/** Builds the record for one approved amount page. */
function amountRouteRecord(definition: (typeof APPROVED_AMOUNTS)[number]): RouteRecord {
  const values = computeAmountValues(definition.amount);
  const display = formatRobux(definition.amount);

  return {
    route: amountPageRoute(definition.amount),
    status: "published",
    indexation: "index",
    pageType: "conversion-amount",
    title: `${display} Robux to USD: DevEx Payout Estimate`,
    metaDescription: `${display} eligible Earned Robux is about ${values.standardUsd} at the current DevEx rate. Compared against the legacy and U.S. 18+ rates.`,
    h1: `${display} Robux to USD`,
    navLabel: `${display} Robux`,
    primaryIntent: "numeric-amount-conversion",
    primaryKeyword: `${display} robux to usd`,
    secondaryKeywords: [
      `${definition.amount} robux to usd`,
      `how much is ${display} robux`,
      `${display} robux in usd`,
    ],
    entities: ["Robux", "Earned Robux", "USD", "Developer Exchange Program"],
    sourceIds: ["roblox-devex-program"],
    lastReviewedAt: REVIEWED,
    dateModified: REVIEWED,
    quickAnswer: `${display} eligible Earned Robux converts to ${values.standardUsd} at the current DevEx rate of 0.0038 USD per Robux. Under the older 0.0035 rate the same amount would pay ${values.legacyUsd}, a difference of ${values.standardVsLegacyUsd}. ${definition.context}`,
    sections: [
      { id: "value", heading: `What ${display} Robux is worth` },
      { id: "rate-comparison", heading: "Across all three rates" },
      { id: "context", heading: "Why this amount matters" },
      { id: "reverse", heading: "Reaching this amount" },
      { id: "nearby", heading: "Nearby amounts" },
    ],
    faqs: [
      {
        question: `How much is ${display} Robux in USD?`,
        answer: `${values.standardUsd} for eligible Earned Robux at the current DevEx rate, before any payment-provider fees or income tax. This applies to Earned Robux only, not to a purchased balance.`,
        sourceIds: ["roblox-devex-program"],
      },
      {
        question: values.meetsMinimum
          ? `Does ${display} Robux meet the DevEx minimum?`
          : `Can ${display} Robux be cashed out?`,
        answer: values.meetsMinimum
          ? `${display} Earned Robux is ${values.multipleOfMinimum} times the documented 30,000 minimum, so it clears the threshold. Clearing the threshold is not the same as being approved — Roblox reviews every request.`
          : `No. Roblox requires a minimum of 30,000 Earned Robux before a DevEx request can be submitted, and ${display} is below that.`,
        sourceIds: ["roblox-devex-program"],
      },
    ],
    // Anchors carry the amount so that eight generated pages do not all point
    // at the same three destinations with identical text, which reads as a
    // sitewide exact-match link block rather than as contextual linking.
    internalLinks: [
      {
        route: "/conversions/",
        anchor: `the amounts either side of ${display}`,
        relationship: "parent",
      },
      {
        route: "/robux-to-usd/",
        anchor: `convert something other than ${display} Robux`,
        relationship: "tool",
      },
      {
        route: "/devex-rates/",
        anchor: `the rate behind the ${values.standardUsd} figure`,
        relationship: "prerequisite",
      },
      ...definition.relatedAmounts.map((amount) => ({
        route: amountPageRoute(amount),
        anchor: `${formatRobux(amount)} Robux to USD`,
        relationship: "sibling" as const,
      })),
    ],
    schemaTypes: ["WebPage", "BreadcrumbList"],
    parent: "/conversions/",
    inPrimaryNav: false,
    rateSensitive: true,
    ogImageAlt: `${display} Robux converted to an estimated US dollar DevEx payout.`,
  };
}

/** Every route on the site, static pages plus approved amount pages. */
export const routeRegistry: readonly RouteRecord[] = [
  ...staticRoutes,
  ...APPROVED_AMOUNTS.map(amountRouteRecord),
];

const byRoute = new Map(routeRegistry.map((record) => [record.route, record]));

export function getRoute(route: string): RouteRecord | null {
  return byRoute.get(route) ?? null;
}

export function requireRoute(route: string): RouteRecord {
  const record = byRoute.get(route);
  if (!record) {
    throw new Error(
      `Route "${route}" is not in the content manifest. Add it to src/lib/content/route-registry.ts.`,
    );
  }
  return record;
}

/** Routes eligible for the sitemap: published and indexable. */
export const indexableRoutes: readonly RouteRecord[] = routeRegistry.filter(
  (record) => record.status === "published" && record.indexation === "index",
);

export const primaryNavRoutes: readonly RouteRecord[] = routeRegistry.filter(
  (record) => record.inPrimaryNav && record.status === "published",
);

/** Ancestor chain for breadcrumbs, from the homepage down to (not including) `route`. */
export function breadcrumbTrail(route: string): RouteRecord[] {
  const trail: RouteRecord[] = [];
  let current = getRoute(route);
  const guard = new Set<string>();

  while (current?.parent) {
    if (guard.has(current.route)) break;
    guard.add(current.route);
    const parent = getRoute(current.parent);
    if (!parent) break;
    trail.unshift(parent);
    current = parent;
  }

  return trail;
}

/** Routes that declare `route` as their parent. */
export function childRoutes(route: string): RouteRecord[] {
  return routeRegistry.filter((record) => record.parent === route);
}
