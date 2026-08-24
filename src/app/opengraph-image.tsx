import { getRateValue, minimumEarnedRobux } from "@/lib/calculations/rate-registry";
import { standardRateId } from "@/lib/calculations/devex";
import { formatRate, formatRobux } from "@/lib/calculations/format";
import { Rational } from "@/lib/calculations/rational";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og/template";

/**
 * The site's Open Graph image, and the fallback for any route without its own.
 *
 * Layout lives in `lib/og/template`; this file supplies only the words. The
 * figures come from the rate registry, so a rate change moves this card the
 * same way it moves every page.
 */
export const runtime = "nodejs";
export const dynamic = "force-static";

export const alt =
  "DevEx Calculator: convert eligible Earned Robux into an estimated US dollar payout.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpengraphImage() {
  const rate = getRateValue(standardRateId);
  const example = Rational.fromInt(100_000).mul(rate);

  return renderOgImage({
    headline: ["Convert Earned Robux", "into a US dollar payout"],
    detail: `100,000 Earned Robux ≈ $${example.toFixed(2)} at $${formatRate(rate)} per Robux`,
    footnote: `${formatRobux(minimumEarnedRobux)} Robux minimum · estimates only`,
  });
}
