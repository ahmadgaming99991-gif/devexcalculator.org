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
import { floor } from "./v3/floor";
import { foldedCycle } from "./v3/folded";
import * as v3 from "./v3/routes";
import { stageA } from "./v3/stage-a";
import { stageALean } from "./v3/stage-a-lean";
import { stageB } from "./v3/stage-b";
import { highlightsUnit, historyUnit } from "./v3/units";

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
    if (url.pathname.startsWith("/__proof/")) {
      const secret = env.PROOF_SECRET;
      if (!secret || request.headers.get("x-proof") !== secret) {
        return new Response("Not found", { status: 404 });
      }

      const json = (report: unknown) =>
        new Response(JSON.stringify(report), {
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        });

      // The single-stage v2 collector, kept so the two designs stay comparable.
      if (url.pathname === "/__proof/collect") return json(await collect(env));

      // Stage A, in its two modes. `a2` forces the hourly branch rather than
      // waiting an hour for it, which is the only way twenty sequential runs
      // can measure a path that occurs once in four.
      if (url.pathname === "/__proof/a") return json(await stageA(env));
      if (url.pathname === "/__proof/a2") return json(await stageA(env, { forceHourly: true }));

      if (url.pathname === "/__proof/b") {
        const batch = Number(url.searchParams.get("batch") ?? "50");
        const shard = url.searchParams.get("shard");
        return json(
          await stageB(env, {
            batch: Number.isFinite(batch) && batch > 0 ? Math.min(batch, 100) : 50,
            votes: url.searchParams.get("votes") === "1",
            ...(shard === null ? {} : { shard: Number(shard) % 4 }),
          }),
        );
      }

      // One unit of work per invocation: the answer to Stage A2's 23 ms.
      const unit = url.pathname.match(/^\/__proof\/h([0-3])$/);
      if (unit) return json(await historyUnit(env, Number(unit[1])));
      if (url.pathname === "/__proof/hl") return json(await highlightsUnit(env));

      // Stage A with the fourteen-day totals value out of its path.
      if (url.pathname === "/__proof/lean") {
        return json(await stageALean(env, url.searchParams.get("mode") === "fold" ? "fold" : "bucket"));
      }

      // The cost of one Roblox sorts read, before any of this project's work.
      if (url.pathname === "/__proof/floor") {
        return json(await floor(url.searchParams.get("mode") ?? "full"));
      }

      // The control arm: Stage A's work against a folded snapshot.
      if (url.pathname === "/__proof/fold") return json(await foldedCycle(env));

      return new Response("Not found", { status: 404 });
    }

    // The split-shape read endpoints, served alongside the v2 ones so both
    // designs can be measured against the same stored data in the same isolate.
    if (url.pathname === "/v3/live") return v3.handleLive(env, url);
    if (url.pathname === "/v3/details") return v3.handleDetails(env);
    if (url.pathname === "/v3/merged") return v3.handleMerged(env, url);
    if (url.pathname === "/v3/merged-sharded") return v3.handleMergedSharded(env, url);
    if (url.pathname === "/v3/totals") return v3.handleTotals(env, url);
    if (url.pathname === "/v3/totals-days") return v3.handleTotalsDays(env, url);
    if (url.pathname === "/v3/highlights") return v3.handleHighlights(env);
    const v3experience = url.pathname.match(/^\/v3\/experience\/(\d+)$/);
    if (v3experience) return v3.handleExperience(env, v3experience[1]!, url);

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
