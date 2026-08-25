import { getRateValue, minimumEarnedRobux } from "@/lib/calculations/rate-registry";
import { standardRateId } from "@/lib/calculations/devex";
import { DISPLAY_LOCALE, formatCurrency, formatRobux } from "@/lib/calculations/format";
import { Rational } from "@/lib/calculations/rational";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og/template";

/** The eligibility card. The minimum is the figure this page exists to state. */
export const runtime = "nodejs";
export const dynamic = "force-static";

export const alt =
  "What Roblox requires before a DevEx request can be submitted, starting with the minimum Earned Robux balance.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function RequirementsOgImage() {
  const worth = Rational.fromInt(minimumEarnedRobux).mul(getRateValue(standardRateId));

  return renderOgImage({
    headline: [`${formatRobux(DISPLAY_LOCALE, minimumEarnedRobux)} Earned Robux`, "before you can apply"],
    detail: `About ${formatCurrency(DISPLAY_LOCALE, worth, "USD")} at the standard rate · Earned Robux only`,
    // The line the whole site is built on, on the card as well as the page.
    footnote: "Meeting the minimum is not approval",
  });
}
