import { NextResponse } from "next/server";
import { jsonFeed } from "@/lib/content/feed";
import { publicApiCors } from "@/lib/api/public-headers";

/**
 * The same changes as JSON Feed.
 *
 * For anything that would otherwise parse XML to learn that a rate moved —
 * including the callers already reading `/api/rates`.
 */
export const dynamic = "force-static";

export function GET(): NextResponse {
  return NextResponse.json(jsonFeed(), {
    headers: {
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      ...publicApiCors,
    },
  });
}
