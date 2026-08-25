import { getRateValue, minimumEarnedRobux } from "@/lib/calculations/rate-registry";
import { standardRateId } from "@/lib/calculations/devex";
import { DISPLAY_LOCALE, formatCurrency, formatRate, formatRobux } from "@/lib/calculations/format";
import { Rational } from "@/lib/calculations/rational";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og/template";

/** Money coming out. The direction is the whole point of this page. */
export const runtime = "nodejs";
export const dynamic = "force-static";

export const alt =
  "What eligible Earned Robux convert to in US dollars at the documented DevEx rate.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function RobuxToUsdOgImage() {
  const rate = getRateValue(standardRateId);
  const example = Rational.fromInt(100_000).mul(rate);

  return renderOgImage({
    headline: ["100,000 Robux", `≈ ${formatCurrency(DISPLAY_LOCALE, example, "USD")}`],
    detail: `At $${formatRate(DISPLAY_LOCALE, rate)} per Earned Robux · a payout, not a purchase price`,
    footnote: `${formatRobux(DISPLAY_LOCALE, minimumEarnedRobux)} Robux minimum · estimates only`,
  });
}
