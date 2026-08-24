import { getMarketplaceScheme } from "@/lib/calculations/rate-registry";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og/template";

/**
 * The deductions card.
 *
 * Carries no percentage for the three deductions on purpose: this site
 * publishes no figure for a provider fee, a conversion margin or a tax rate,
 * and a card is not the place to start inventing one. The only percentage here
 * is the published marketplace split, read from the registry.
 */
export const runtime = "nodejs";
export const dynamic = "force-static";

export const alt =
  "The deductions that apply to a DevEx payout, and how they differ from the marketplace commission.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function FeesOgImage() {
  const scheme = getMarketplaceScheme("in-experience");

  return renderOgImage({
    headline: ["What comes off", "a DevEx payout"],
    detail: "Provider fees, then conversion, then income tax — none of them Roblox's",
    footnote: `Separate from the ${scheme.platformSharePercent}% marketplace commission`,
  });
}
