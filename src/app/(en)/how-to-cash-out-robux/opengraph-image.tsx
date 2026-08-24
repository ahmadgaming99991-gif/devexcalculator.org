import { minimumEarnedRobux } from "@/lib/calculations/rate-registry";
import { formatRobux } from "@/lib/calculations/format";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from "@/lib/og/template";

/** The process card. The last step is the one nobody controls. */
export const runtime = "nodejs";
export const dynamic = "force-static";

export const alt =
  "The steps Roblox documents for exchanging Earned Robux, ending with a review it alone decides.";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function CashOutOgImage() {
  return renderOgImage({
    headline: ["How to cash out", "Earned Robux"],
    detail: `Reach ${formatRobux(minimumEarnedRobux)}, meet the requirements, submit through the portal`,
    footnote: "Roblox reviews every request",
  });
}
