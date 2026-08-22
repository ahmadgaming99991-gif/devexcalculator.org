import { llmsTxt } from "@/lib/content/llms";
import { publicApiCors } from "@/lib/api/public-headers";

/**
 * llms.txt.
 *
 * Generated from the route registry and the API contract, so it cannot drift
 * from the site the way the hand-maintained file in `public/` did — by the
 * time it was replaced it knew nothing about the platform pages, the payout
 * statistics, the planner, the data exports or the API description.
 *
 * Static: the content changes when routes do, which is at build time.
 */
export const dynamic = "force-static";

export function GET(): Response {
  return new Response(llmsTxt(), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      ...publicApiCors,
    },
  });
}
