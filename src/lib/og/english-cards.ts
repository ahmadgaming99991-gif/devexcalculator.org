import { standardRateId } from "@/lib/calculations/devex";
import { DISPLAY_LOCALE, formatCurrency, formatRate, formatRobux } from "@/lib/calculations/format";
import {
  allRates,
  getMarketplaceScheme,
  getRateValue,
  minimumEarnedRobux,
} from "@/lib/calculations/rate-registry";
import { Rational } from "@/lib/calculations/rational";
import type { OgCard } from "@/lib/og/template";

/**
 * The English Open Graph cards, as data.
 *
 * These used to be eight `opengraph-image.tsx` files under `app/(en)/`, each
 * generating its PNG through Next's metadata convention. Two things were
 * wrong with that, and both are fixed by moving the words here and rendering
 * them to committed files instead.
 *
 * **Every card's URL was a redirect.** `trailingSlash: true` exempts only
 * "static file URLs, such as files with extensions" — the framework's own
 * words — and a metadata route has no extension, so `/opengraph-image`
 * answered 308 to `/opengraph-image/`. The nested ones were worse: the query
 * Next appends came back mangled, `?d962…` redirected to `?d962…=`. Every
 * social preview on all 252 pages paid an extra round trip, and a crawler that
 * does not follow redirects for images got nothing at all. `/og/en.png` has an
 * extension, so it is fetched directly — which is exactly why the six
 * localized cards beside it never had this problem.
 *
 * **They cost the Worker its remaining headroom.** `ImageResponse` pulls in
 * `@vercel/og`, roughly 0.76 MB compressed, for images that are prerendered
 * and never generated per request. The bundle was at 92% of Cloudflare's 3 MB
 * limit with that in it.
 *
 * Rendered by `scripts/og/build-localized-cards.ts`, alongside the localized
 * ones and under the same fingerprint check, so a rate change fails the build
 * until the cards are redrawn rather than leaving a preview quoting a figure
 * the site no longer publishes.
 */

export interface EnglishCard {
  readonly card: OgCard;
  /** The `og:image:alt` for the page this card belongs to. */
  readonly alt: string;
}

/** The site card, used by every route without one of its own. */
export const SITE_CARD_SLUG = "en";

/**
 * Route path to card. Built on each call rather than frozen at module load, so
 * a card always reflects the registry at the moment it is drawn or checked.
 */
export function englishCards(): ReadonlyMap<string, EnglishCard> {
  const rate = getRateValue(standardRateId);
  const inExperience = getMarketplaceScheme("in-experience");
  const hundredThousand = Rational.fromInt(100_000).mul(rate);
  const minimumWorth = Rational.fromInt(minimumEarnedRobux).mul(getRateValue(standardRateId));
  // Rounded up, exactly as the page does: a fraction of a Robux cannot be earned.
  const forOneThousand = Rational.fromInt(1_000).div(rate).ceilToBigInt();

  return new Map<string, EnglishCard>([
    [
      "/",
      {
        alt: "DevEx Calculator: convert eligible Earned Robux into an estimated US dollar payout.",
        card: {
          headline: ["Convert Earned Robux", "into a US dollar payout"],
          detail: `100,000 Earned Robux ≈ $${hundredThousand.toFixed(2)} at $${formatRate(DISPLAY_LOCALE, rate)} per Robux`,
          footnote: `${formatRobux(DISPLAY_LOCALE, minimumEarnedRobux)} Robux minimum · estimates only`,
        },
      },
    ],
    [
      "/devex-rates/",
      {
        alt: "The DevEx rates Roblox currently documents, with the minimum Earned Robux balance.",
        card: {
          headline: ["The DevEx rates", "Roblox documents"],
          detail: `Standard rate $${formatRate(DISPLAY_LOCALE, rate)} per Robux · ${allRates.length} rates documented`,
          footnote: `${formatRobux(DISPLAY_LOCALE, minimumEarnedRobux)} Robux minimum · verified against Roblox`,
        },
      },
    ],
    [
      "/devex-requirements/",
      {
        alt: "What Roblox requires before a DevEx request can be submitted, starting with the minimum Earned Robux balance.",
        card: {
          headline: [
            `${formatRobux(DISPLAY_LOCALE, minimumEarnedRobux)} Earned Robux`,
            "before you can apply",
          ],
          detail: `About ${formatCurrency(DISPLAY_LOCALE, minimumWorth, "USD")} at the standard rate · Earned Robux only`,
          // The line the whole site is built on, on the card as well as the page.
          footnote: "Meeting the minimum is not approval",
        },
      },
    ],
    [
      "/devex-fees-and-taxes/",
      {
        alt: "The deductions that apply to a DevEx payout, and how they differ from the marketplace commission.",
        card: {
          headline: ["What comes off", "a DevEx payout"],
          detail: "Provider fees, then conversion, then income tax — none of them Roblox's",
          footnote: `Separate from the ${inExperience.platformSharePercent}% marketplace commission`,
        },
      },
    ],
    [
      "/earned-robux/",
      {
        alt: "Which Robux count as Earned Robux, and which sit in the same balance but can never be exchanged.",
        card: {
          headline: ["Not every Robux", "can be cashed out"],
          detail: `Bought, gifted and membership Robux never qualify · your ${inExperience.creatorSharePercent}% share does`,
          footnote: `${formatRobux(DISPLAY_LOCALE, minimumEarnedRobux)} minimum counts Earned Robux only`,
        },
      },
    ],
    [
      "/how-to-cash-out-robux/",
      {
        alt: "The steps Roblox documents for exchanging Earned Robux, ending with a review it alone decides.",
        card: {
          headline: ["How to cash out", "Earned Robux"],
          detail: `Reach ${formatRobux(DISPLAY_LOCALE, minimumEarnedRobux)}, meet the requirements, submit through the portal`,
          footnote: "Roblox reviews every request",
        },
      },
    ],
    [
      "/robux-to-usd/",
      {
        alt: "What eligible Earned Robux convert to in US dollars at the documented DevEx rate.",
        card: {
          headline: ["100,000 Robux", `≈ ${formatCurrency(DISPLAY_LOCALE, hundredThousand, "USD")}`],
          detail: `At $${formatRate(DISPLAY_LOCALE, rate)} per Earned Robux · a payout, not a purchase price`,
          footnote: `${formatRobux(DISPLAY_LOCALE, minimumEarnedRobux)} Robux minimum · estimates only`,
        },
      },
    ],
    [
      "/usd-to-robux/",
      {
        alt: "How many eligible Earned Robux are needed to reach a given US dollar payout.",
        card: {
          headline: ["$1,000 payout", `= ${formatRobux(DISPLAY_LOCALE, forOneThousand)} Robux`],
          detail: "Rounded up, because a partial Robux cannot be earned or exchanged",
          footnote: `${formatRobux(DISPLAY_LOCALE, minimumEarnedRobux)} Robux minimum still applies`,
        },
      },
    ],
  ]);
}

/**
 * The file name a route's card is written to and served from.
 *
 * `/` is the site card and keeps the bare locale name, matching the six
 * localized cards beside it. Everything else is the route with its slashes
 * flattened, so the file is recognisable in a directory listing.
 */
export function englishCardSlug(route: string): string {
  const trimmed = route.replace(/^\/|\/$/g, "");
  return trimmed === "" ? SITE_CARD_SLUG : `${SITE_CARD_SLUG}-${trimmed.replace(/\//g, "-")}`;
}
