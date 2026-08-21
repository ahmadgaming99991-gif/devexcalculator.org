import { getRateValue, minimumEarnedRobux } from "@/lib/calculations/rate-registry";
import { standardRateId } from "@/lib/calculations/devex";
import { formatRobux } from "@/lib/calculations/format";
import { Rational } from "@/lib/calculations/rational";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og/template";

/** The reverse question: how much has to be earned to reach a target. */
export const runtime = "nodejs";
export const dynamic = "force-static";

export const alt =
  "How many eligible Earned Robux are needed to reach a given US dollar payout.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function UsdToRobuxOgImage() {
  const rate = getRateValue(standardRateId);
  // Rounded up, exactly as the page does: a fraction of a Robux cannot be earned.
  const needed = Rational.fromInt(1_000).div(rate).ceilToBigInt();

  return renderOgImage({
    headline: ["$1,000 payout", `= ${formatRobux(needed)} Robux`],
    detail: "Rounded up, because a partial Robux cannot be earned or exchanged",
    footnote: `${formatRobux(minimumEarnedRobux)} Robux minimum still applies`,
  });
}
