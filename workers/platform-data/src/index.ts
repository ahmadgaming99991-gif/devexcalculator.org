/**
 * The platform data plane: a deliberately tiny Worker.
 *
 * No Next.js, no React, no OpenNext, no route registry, no dictionaries, no
 * dependencies. That is the whole point: the application Worker is 2.73 MB
 * gzipped and its `/platform/` render measured a median of 134 ms of CPU, which
 * is incompatible with the Workers Free 10 ms limit. This Worker is under
 * 11 KB gzipped and nothing it does exceeds 6 ms.
 *
 * Two responsibilities and nothing else:
 *   1. `scheduled` - run exactly one collection unit, chosen by the clock.
 *   2. `fetch`     - serve the stored values as small, cacheable JSON.
 *
 * There are no test endpoints, no debug routes, no secrets and no write path
 * reachable over HTTP. Everything this Worker stores is written by a Cron
 * Trigger; everything it serves over HTTP is a read.
 */

import {
  handleExperience,
  handleHealth,
  handleHighlights,
  handleMethodNotAllowed,
  handleNotFound,
  handleOptions,
  handleRankings,
  handleTotals,
} from "./api";
import { dispatch } from "./dispatch";
import { log } from "./log";
import type { Env } from "./store";

const EXPERIENCE_PATH = /^\/v1\/platform\/experience\/(\d{1,20})$/;

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("origin");

    if (request.method === "OPTIONS") return handleOptions(origin);
    if (request.method !== "GET" && request.method !== "HEAD") return handleMethodNotAllowed();

    const url = new URL(request.url);

    switch (url.pathname) {
      case "/v1/platform/rankings":
        return handleRankings(env, url, origin);
      case "/v1/platform/totals":
        return handleTotals(env, url, origin);
      case "/v1/platform/highlights":
        return handleHighlights(env, origin);
      case "/health":
        return handleHealth(env, origin);
      default:
        break;
    }

    const experience = EXPERIENCE_PATH.exec(url.pathname);
    if (experience) return handleExperience(env, experience[1]!, url, origin);

    return handleNotFound(origin);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    /*
     * Awaited through `waitUntil` and never rethrown.
     *
     * A scheduled handler that rejects is retried by Cloudflare. Retrying a
     * deterministic fault is load with no chance of succeeding, and retrying an
     * upstream outage turns one bad quarter hour into a burst against a service
     * that is already struggling. `dispatch` catches its own unit errors; this
     * is the outer guard for anything it cannot.
     */
    ctx.waitUntil(
      dispatch(env, new Date(event.scheduledTime)).catch((error: unknown) => {
        log.error({
          event: "scheduled.threw",
          outcome: "failed",
          detail: error instanceof Error ? error.message : String(error),
        });
      }),
    );
  },
};

export default worker;
