import { allRates, getRateValue, minimumEarnedRobux } from "@/lib/calculations/rate-registry";
import { formatRate, formatRobux } from "@/lib/calculations/format";
import { standardRateId } from "@/lib/calculations/devex";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og/template";

/**
 * The rates page's own card.
 *
 * The rate is the single figure this page exists to publish, and it was the
 * one thing a link preview did not carry.
 *
 * A static segment, so this prerenders to a file at a fixed URL. The same
 * thing in a dynamic segment does not: Next serves that from a nested route
 * whose URL collides with this site's canonical trailing slash. See the note
 * in `conversions/[slug]/page.tsx`.
 */
export const runtime = "nodejs";
export const dynamic = "force-static";

export const alt =
  "The DevEx rates Roblox currently documents, with the minimum Earned Robux balance.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function RatesOgImage() {
  const rate = getRateValue(standardRateId);
  const documented = allRates.length;

  return renderOgImage({
    headline: ["The DevEx rates", "Roblox documents"],
    detail: `Standard rate $${formatRate(rate)} per Robux · ${documented} rates documented`,
    footnote: `${formatRobux(minimumEarnedRobux)} Robux minimum · verified against Roblox`,
  });
}
