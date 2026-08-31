/**
 * The platform data plane: a deliberately tiny Worker.
 *
 * No Next.js, no React, no OpenNext, no route registry, no dictionaries. The
 * whole point is that a dashboard data request does not instantiate the 2.73 MB
 * application bundle — measured evidence says the application collector spends
 * most of its 6.4–23.7 ms on something other than its own data work, and a
 * bundle of that size is the obvious candidate.
 *
 * Two responsibilities and nothing else:
 *   1. `scheduled` — collect from Roblox and store compact KV values.
 *   2. `fetch`     — serve those values as small JSON.
 */

import { collect } from "./collector";
import {
  handleCurrent,
  handleExperience,
  handleHighlights,
  handleOptions,
  handleTotals,
} from "./routes";
import type { Env } from "./storage";

const handler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");

    if (request.method === "OPTIONS") return handleOptions(origin);
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { allow: "GET, HEAD, OPTIONS" } });
    }

    /*
     * The isolated CPU proof, and why it cannot exist in production.
     *
     * Measuring a scheduled invocation means invoking exactly the function a
     * Cron Trigger would call — not a copy of it, which would measure the copy.
     * So this calls `collect` directly, and is reachable only when
     * `PROOF_SECRET` is set, which happens on the workers.dev proof deployment
     * and nowhere else. An unset secret makes the branch unreachable rather
     * than merely unauthorised, and a wrong secret is answered 404 so the route
     * does not advertise its own existence.
     */
    if (url.pathname === "/__proof/collect") {
      const secret = env.PROOF_SECRET;
      if (!secret || request.headers.get("x-proof") !== secret) {
        return new Response("Not found", { status: 404 });
      }
      const report = await collect(env);
      return new Response(JSON.stringify(report), {
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      });
    }

    if (url.pathname === "/v1/platform/current") return handleCurrent(env, url, origin);
    if (url.pathname === "/v1/platform/history/totals") return handleTotals(env, url, origin);
    if (url.pathname === "/v1/platform/history/highlights") return handleHighlights(env, origin);

    const experience = url.pathname.match(/^\/v1\/platform\/history\/experience\/(\d+)$/);
    if (experience) return handleExperience(env, experience[1]!, url, origin);

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      });
    }

    void ctx;
    return new Response(JSON.stringify({ ok: false, error: "not-found" }), {
      status: 404,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Swallowed and logged for the same reason the v1 collector swallows: a
    // throwing cron is retried, and retrying into an upstream outage turns one
    // bad quarter hour into a burst of requests.
    ctx.waitUntil(
      collect(env)
        .then((report) => {
          console.warn(`Collection ${report.outcome}: ${report.experiences} experiences, ${report.enriched} enriched, ${report.kvWrites} writes.`);
        })
        .catch((error: unknown) => {
          console.error("Collection failed:", error);
        }),
    );
  },
};

export default handler;
