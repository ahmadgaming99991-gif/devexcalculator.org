import { NextResponse } from "next/server";
import { rateRegistry, registryFreshness } from "@/lib/calculations/rate-registry";
import { siteConfig } from "@/config/site";
import { buildInfo } from "@/lib/build-info";
import { readDataPlaneHealth } from "@/lib/platform/data-plane-health";
import {
  healthStatusCode,
  isHealthy,
  worstState,
  type HealthState,
} from "@/lib/api/health-status";

/**
 * Health endpoint.
 *
 * Reports only what an operator needs to see: that the Worker is serving, that
 * the rate registry loaded and validated, how stale the rate data is, and
 * whether the collector behind `/platform/` is still recording. It deliberately
 * exposes no environment values, no binding names and no secrets.
 *
 * The collector half is read from the platform data Worker rather than from
 * this Worker's storage — see `lib/platform/data-plane-health.ts` for why, and
 * for the thresholds. The rate-registry half is unchanged and local.
 *
 * The status code is the point. This used to answer `{"ok": true}` with a 200
 * unconditionally — including with a rate registry three months past review,
 * which is the single failure this site cannot afford. Anything watching it
 * would therefore never have fired, so the check existed without checking
 * anything. Now the worst of the individual states decides both `ok` and the
 * code: a 503 when something needs attention now, a 200 otherwise, which is
 * what an uptime monitor can act on without parsing a body.
 *
 * `stale` deliberately does not fail. A rate due for review and a collector
 * with an hour's gap are both worth seeing and neither makes the site wrong,
 * and a check that cries wolf gets muted — at which point it is no better than
 * the hardcoded `true` it replaced.
 *
 * Kept out of the sitemap and marked noindex by robots.txt — it is
 * infrastructure, not content.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const freshness = registryFreshness();

  /*
   * `registryFreshness` names its middle state for the editorial process that
   * follows it; here it sits alongside a collector, and both mean the same
   * thing to whoever is reading this — old, not broken.
   */
  const registryState: HealthState =
    freshness.state === "review-due" ? "stale" : freshness.state;

  /*
   * Asked of the data plane that actually collects.
   *
   * This read the v1 collector's heartbeat out of the site Worker's own KV
   * until 2026-09-03. That collector was retired on 2026-09-02 and its store
   * kept only for rollback, so the heartbeat froze and this endpoint served
   * 503 continuously while the v2 data plane recorded every fifteen minutes
   * and every figure on the site was correct. A permanently red health check
   * is not a stricter check; it is an ignored one.
   */
  const collector = await readDataPlaneHealth();

  const status = worstState([registryState, collector.state]);
  const ok = isHealthy(status);

  return NextResponse.json(
    {
      ok,
      status,
      service: siteConfig.name,
      // The registry having loaded at all means its build-time validation passed.
      rateRegistry: {
        version: rateRegistry.registryVersion,
        lastVerifiedAt: rateRegistry.lastVerifiedAt,
        ageDays: freshness.ageDays,
        freshness: freshness.state,
        activeRates: rateRegistry.rates.filter((r) => r.status === "active").length,
      },
      collector,
      build: {
        commit: buildInfo.commit,
        builtAt: buildInfo.builtAt,
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: healthStatusCode(status),
      headers: { "cache-control": "no-store", "x-robots-tag": "noindex" },
    },
  );
}
