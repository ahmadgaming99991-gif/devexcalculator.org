import { NextResponse } from "next/server";
import { fetchEcbRates, FxProviderError, getFallbackRates } from "@/features/fx/ecb-provider";
import { fxConfig } from "@/config/site";
import type { FxResponse } from "@/features/fx/types";
import { requestId } from "@/lib/security/request-id";
import { corsPreflight, publicApiCors } from "@/lib/api/public-headers";

/**
 * Public reference-rate endpoint.
 *
 * A GET with no authentication and no Turnstile: it exposes nothing private
 * and gating it would only break the currency selector. Rate limiting is not
 * applied here because the response is cacheable and identical for everyone.
 *
 * Failure is never fatal. If the provider is down the bundled snapshot is
 * returned, clearly marked stale, and if even that cannot be produced the
 * error body says plainly that the USD calculator still works.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<FxResponse>> {
  const id = requestId();

  try {
    const data = await fetchEcbRates();
    const body: FxResponse = { ok: true, data, meta: { cache: "MISS" } };
    return NextResponse.json(body, {
      headers: {
        // Shared caches may serve this for the provider's publication window
        // and revalidate in the background for a day afterwards.
        "cache-control": `public, max-age=300, s-maxage=${fxConfig.cacheTtlSeconds}, stale-while-revalidate=86400`,
        "x-request-id": id,
        ...publicApiCors,
      },
    });
  } catch (error) {
    const code = error instanceof FxProviderError ? error.code : "FX_UNAVAILABLE";
    // Log the internal detail with an id; never return it to the caller.
    console.warn(`[fx] ${id} provider failed: ${code}`);

    try {
      const fallback = getFallbackRates();
      const body: FxResponse = { ok: true, data: fallback, meta: { cache: "FALLBACK" } };
      return NextResponse.json(body, {
        headers: {
          // Short cache: the provider may recover at any moment.
          "cache-control": "public, max-age=60, s-maxage=300",
          "x-request-id": id,
          ...publicApiCors,
        },
      });
    } catch {
      const body: FxResponse = {
        ok: false,
        error: {
          code,
          message:
            "Local-currency estimates are temporarily unavailable. The USD calculator still works.",
        },
      };
      return NextResponse.json(body, {
        status: 503,
        /*
         * The failure needs the same headers as a success. Without them a
         * browser reports an opaque CORS error and the caller never sees the
         * message explaining that the USD calculator still works — the one
         * thing this response exists to say.
         */
        headers: { "cache-control": "no-store", "x-request-id": id, ...publicApiCors },
      });
    }
  }
}

/** Answers the preflight a browser sends before a cross-origin read. */
export function OPTIONS(): Response {
  return corsPreflight();
}
