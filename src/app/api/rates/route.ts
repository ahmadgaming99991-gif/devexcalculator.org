import { NextResponse } from "next/server";
import { rateRegistry, sources } from "@/lib/calculations/rate-registry";
import { corsPreflight, publicApiCors } from "@/lib/api/public-headers";

/**
 * Public rate registry.
 *
 * Publishing the same data the pages render, with its sources and verification
 * dates attached, means anyone can check the site's figures against the
 * official documentation without scraping HTML. It is also what the
 * post-deploy verification script reads to confirm production is serving the
 * rates it was built with.
 */
export const dynamic = "force-static";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      ok: true,
      data: {
        registryVersion: rateRegistry.registryVersion,
        lastVerifiedAt: rateRegistry.lastVerifiedAt,
        minimum: rateRegistry.minimum,
        rates: rateRegistry.rates,
        marketplace: rateRegistry.marketplace,
        sources: sources.sources.map((source) => ({
          id: source.id,
          publisher: source.publisher,
          title: source.title,
          url: source.url,
          lastCheckedAt: source.lastCheckedAt,
        })),
      },
      meta: {
        disclaimer:
          "These are the rates Roblox currently documents, recorded on the verification date shown. Roblox decides which rate applies to which balance and whether a DevEx request is approved.",
      },
    },
    {
      headers: {
        "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
        // Not indexed as a page; it is data, and /api/ is the page about it.
        "x-robots-tag": "noindex",
        ...publicApiCors,
      },
    },
  );
}

/** Answers the preflight a browser sends before a cross-origin read. */
export function OPTIONS(): Response {
  return corsPreflight();
}
