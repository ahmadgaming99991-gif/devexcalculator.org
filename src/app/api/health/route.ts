import { NextResponse } from "next/server";
import { rateRegistry, registryFreshness } from "@/lib/calculations/rate-registry";
import { siteConfig } from "@/config/site";

/**
 * Health endpoint.
 *
 * Reports only what an operator needs to see: that the Worker is serving, that
 * the rate registry loaded and validated, and how stale the rate data is. It
 * deliberately exposes no environment values, no binding names and no secrets.
 *
 * Kept out of the sitemap and marked noindex by robots.txt — it is
 * infrastructure, not content.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const freshness = registryFreshness();

  return NextResponse.json(
    {
      ok: true,
      service: siteConfig.name,
      // The registry having loaded at all means its build-time validation passed.
      rateRegistry: {
        version: rateRegistry.registryVersion,
        lastVerifiedAt: rateRegistry.lastVerifiedAt,
        ageDays: freshness.ageDays,
        freshness: freshness.state,
        activeRates: rateRegistry.rates.filter((r) => r.status === "active").length,
      },
      commit: siteConfig.version.commit,
      timestamp: new Date().toISOString(),
    },
    { headers: { "cache-control": "no-store", "x-robots-tag": "noindex" } },
  );
}
