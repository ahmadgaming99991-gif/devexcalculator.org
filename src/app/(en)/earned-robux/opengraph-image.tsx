import { getMarketplaceScheme, minimumEarnedRobux } from "@/lib/calculations/rate-registry";
import { DISPLAY_LOCALE, formatRobux } from "@/lib/calculations/format";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og/template";

/** What can be exchanged and what cannot — the distinction the page is about. */
export const runtime = "nodejs";
export const dynamic = "force-static";

export const alt =
  "Which Robux count as Earned Robux, and which sit in the same balance but can never be exchanged.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function EarnedRobuxOgImage() {
  const scheme = getMarketplaceScheme("in-experience");

  return renderOgImage({
    headline: ["Not every Robux", "can be cashed out"],
    detail: `Bought, gifted and membership Robux never qualify · your ${scheme.creatorSharePercent}% share does`,
    footnote: `${formatRobux(DISPLAY_LOCALE, minimumEarnedRobux)} minimum counts Earned Robux only`,
  });
}
