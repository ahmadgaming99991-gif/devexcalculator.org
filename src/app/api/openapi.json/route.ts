import { NextResponse } from "next/server";
import { corsPreflight, publicApiCors } from "@/lib/api/public-headers";
import { openApiDocument } from "@/lib/api/contract";

/**
 * The machine-readable description of this API.
 *
 * Generated from `src/lib/api/contract.ts`, which is also what the
 * documentation page reads and what a test compares against the route handlers
 * that actually exist. The failure mode this avoids is the usual one: an
 * OpenAPI file maintained by hand that slowly stops describing the service,
 * until it is worse than having none.
 *
 * Static — the description changes when the code does, which is at build time.
 */
export const dynamic = "force-static";

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(openApiDocument(), {
    headers: {
      // The registered media type for OpenAPI 3.1.
      "content-type": "application/openapi+json; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      "x-robots-tag": "noindex",
      ...publicApiCors,
    },
  });
}

export function OPTIONS(): Response {
  return corsPreflight();
}
