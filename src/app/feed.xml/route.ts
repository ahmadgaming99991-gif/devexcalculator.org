import { atomFeed } from "@/lib/content/feed";
import { publicApiCors } from "@/lib/api/public-headers";

/**
 * Atom feed of rate and data changes.
 *
 * Static: the entries are compiled into the build, so this changes when the
 * site is redeployed and not before — which is exactly when a change is
 * actually published.
 */
export const dynamic = "force-static";

export function GET(): Response {
  return new Response(atomFeed(), {
    headers: {
      "content-type": "application/atom+xml; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      ...publicApiCors,
    },
  });
}
