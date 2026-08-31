import openNextWorker from "opennext-worker";
import { fetchForCollection } from "../src/lib/platform/roblox-api";
import {
  recordGameHistory,
  recordSnapshot,
  toSnapshot,
  type HistoryStore,
} from "../src/lib/platform/history";
import { recordHeartbeat, type RunReport } from "../src/lib/platform/heartbeat";
import { checkRateSource } from "../src/lib/rates/source-check";
import { edgeCachePolicy, staticCachePolicy } from "../src/lib/cache/edge-policy";
import {
  CACHE_STATUS_HEADER,
  isCacheablePlatformRequest,
  isStorablePlatformResponse,
  platformCacheControl,
  edgeCache,
  RENDERED_AT_HEADER,
} from "../src/lib/cache/platform-cache";
import { upgradeToHttps, type UpgradeEnv } from "../src/lib/http/https-upgrade";

/**
 * The deployed Worker.
 *
 * OpenNext generates a Worker that serves the Next.js application, and it
 * handles `fetch` only. A Cron Trigger invokes `scheduled`, so this wraps the
 * generated handler rather than replacing it: `fetch` is delegated untouched,
 * and the scheduled handler is the only addition.
 *
 * The collector runs here rather than in a route handler because a request
 * cannot be relied on to arrive on a schedule, and because a public endpoint
 * that writes to storage is an endpoint someone else can drive.
 */

export * from "opennext-worker";

interface Env {
  /** KV namespace holding observation history. Absent in local dev. */
  PLATFORM_HISTORY?: HistoryStore;
}

const handler = {
  async fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
    const upgrade = upgradeToHttps(request, env as UpgradeEnv);
    if (upgrade) return upgrade;

    /*
     * `/platform/` is answered from a two-minute edge copy, checked here —
     * before `openNextWorker.fetch`, so a hit never enters the Next.js
     * pipeline and never runs the React render or the KV reads that cost it
     * ~125 ms of CPU. See src/lib/cache/platform-cache.ts for why the bound is
     * two minutes and why it is not a stale figure.
     *
     * This is as early as code can sit. A Worker on a custom domain is invoked
     * for every request, so the isolate start is still paid on a hit; what is
     * skipped is everything after it.
     */
    const cache = edgeCache();
    const platformCacheable = cache !== null && isCacheablePlatformRequest(request);
    if (platformCacheable && cache) {
      const hit = await cache.match(request);
      if (hit) {
        const headers = new Headers(hit.headers);
        headers.set(CACHE_STATUS_HEADER, "HIT");
        return new Response(hit.body, { status: hit.status, statusText: hit.statusText, headers });
      }
    }

    const response = await openNextWorker.fetch(request, env, ctx);

    if (platformCacheable && cache) {
      if (!isStorablePlatformResponse(response)) {
        const headers = new Headers(response.headers);
        headers.set(CACHE_STATUS_HEADER, "BYPASS");
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      }

      /*
       * The stored copy carries the policy and the render time; the copy
       * returned to this reader carries them too, plus MISS. `cache.put` is
       * handed a clone and deferred, so storing never delays the response and
       * a failed write costs a future hit rather than this request.
       */
      const headers = new Headers(response.headers);
      headers.set("cache-control", platformCacheControl());
      headers.set(RENDERED_AT_HEADER, new Date().toISOString());
      headers.delete("expires");
      headers.delete("pragma");

      const rendered = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });

      ctx.waitUntil(cache.put(request, rendered.clone()));

      const served = new Headers(rendered.headers);
      served.set(CACHE_STATUS_HEADER, "MISS");
      return new Response(rendered.body, {
        status: rendered.status,
        statusText: rendered.statusText,
        headers: served,
      });
    }

    /*
     * Next marks every dynamically rendered page `no-store`, which is right by
     * default and wrong for the handful of pages here that render from the URL
     * and the rate registry alone. `edgeCachePolicy` owns that judgement and
     * returns null for everything else, so this is a narrow relaxation rather
     * than a caching layer.
     *
     * `staticCachePolicy` is the opposite correction on the opposite input: a
     * prerendered page leaves Next with a year at the edge, which is wrong for
     * every page that quotes a rate or a verification date. Only one of the two
     * can match a given response — one requires `no-store`, the other requires
     * Next's static default — so the order here is readability, not precedence.
     * See src/lib/cache/edge-policy.ts.
     */
    const policy = edgeCachePolicy(request, response) ?? staticCachePolicy(request, response);
    if (!policy) return response;

    // Headers on a returned Response are immutable, so this is a copy.
    const headers = new Headers(response.headers);
    headers.set("cache-control", policy);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(collect(env));
    ctx.waitUntil(checkSource(env));
  },
};

export default handler;

/**
 * Re-reading Roblox's own document, so the site can say when it last looked.
 *
 * Started as its own `waitUntil` rather than tacked onto `collect`, because
 * they watch different things on different clocks: the collector runs every
 * fifteen minutes because player counts move that fast, and this runs four
 * times a day because a rate does not. `checkRateSource` owns that interval
 * and returns null on the runs in between, so nearly every cron tick reaches
 * one KV read and stops.
 *
 * Failures are swallowed for the same reason the collector's are — a throwing
 * cron is retried, and retrying into an upstream outage turns one bad quarter
 * hour into a burst of requests. The difference is that this one cannot
 * disappear quietly: an unreachable source is itself written down, so a check
 * that has stopped working is visible as a date that stopped moving rather
 * than as silence.
 */
async function checkSource(env: Env): Promise<void> {
  const store = env.PLATFORM_HISTORY;
  if (!store) return;

  try {
    const observation = await checkRateSource(store);
    if (!observation) return;
    console.warn(
      `Rate source ${observation.status}: ` +
        (observation.status === "read"
          ? `${observation.rates.join(", ")} (Roblox updated ${observation.sourceUpdatedAt ?? "unknown"}).`
          : (observation.detail ?? "no detail.")),
    );
  } catch (error) {
    console.error("Rate source check failed:", error);
  }
}

/**
 * One collection run, plus the record that it happened.
 *
 * A failure is still logged and swallowed. A cron that throws is retried and
 * can amplify an upstream outage into a burst of requests, and a missing
 * snapshot is a gap in a chart rather than a broken site — the series is drawn
 * from whatever was actually recorded.
 *
 * What is new is that the swallowing now leaves a trace. Every run writes a
 * heartbeat whatever its outcome, so a collector that has quietly stopped can
 * be told apart from a platform that is quietly idle. `/api/health/` reads it
 * and fails its status code once the newest observation is old enough to
 * matter; without this, that endpoint had nothing to fail on.
 */
async function collect(env: Env): Promise<void> {
  const store = env.PLATFORM_HISTORY;
  if (!store) {
    console.warn("PLATFORM_HISTORY is not bound; skipping collection.");
    return;
  }

  const report = await runCollection(store);

  /*
   * Written last and guarded separately. The heartbeat is a report about the
   * run, so a failure to write it must not be able to change what the run did
   * — and it must not be able to take down a run that otherwise succeeded.
   */
  try {
    const heartbeat = await recordHeartbeat(store, report);
    console.warn(
      `Heartbeat: ${heartbeat.outcome}` +
        (heartbeat.consecutiveFailures > 0
          ? `, ${heartbeat.consecutiveFailures} consecutive run(s) without a recorded observation.`
          : "."),
    );
  } catch (error) {
    console.error("Heartbeat failed to write:", error);
  }
}

/**
 * Fetches and stores one observation, and says what became of it.
 *
 * Returns a report rather than throwing so that every path — upstream refusing,
 * a write failing, a clean run — produces something the heartbeat can record.
 * An early `return` here used to mean no evidence the run ever happened.
 */
async function runCollection(store: HistoryStore): Promise<RunReport> {
  const result = await fetchForCollection();
  if (!result.ok) {
    /*
     * The heartbeat is read by whoever is on call, not by a visitor, so this
     * stays English and describes the code rather than translating it.
     */
    const detail =
      result.reason.kind === "timeout"
        ? `upstream timed out after ${result.reason.seconds}s`
        : result.reason.kind === "http"
          ? `upstream returned HTTP ${result.reason.status}`
          : result.reason.kind === "unusable"
            ? "upstream response had no usable experience list"
            : `upstream unreachable: ${result.reason.detail}`;
    console.warn(`Collection skipped: ${detail}`);
    return { outcome: "skipped", detail };
  }

  let report: RunReport;

  try {
    const snapshot = toSnapshot(
      result.observedAt,
      result.data.sortName,
      result.data.collected,
    );
    const { retained } = await recordSnapshot(store, snapshot);
    // Written through `console.warn` rather than `log` only because the
    // project's lint rules allow warn and error; this is a routine success.
    console.warn(
      `Recorded ${snapshot.experiences.length} experiences, ` +
        `${snapshot.totalPlaying} players, ${retained} snapshots retained.`,
    );
    report = {
      outcome: "recorded",
      // The upstream observation instant, not the Worker's clock: the age
      // reported by the health check is the age of the data, not of the run.
      observedAt: result.observedAt,
      experiences: result.data.platform.experiences,
      players: result.data.platform.players,
    };
  } catch (error) {
    console.error("Collection failed to write:", error);
    report = {
      outcome: "failed",
      detail: error instanceof Error ? error.message : "Snapshot write failed.",
    };
  }

  /*
   * Per-experience history is written separately, and its failure is reported
   * rather than allowed to look like a failure of the run. The totals series
   * is the record the page has always drawn; this is an addition to it, and an
   * addition must not be able to take the original down with it.
   */
  try {
    const tracked = await recordGameHistory(
      store,
      result.observedAt,
      result.data.everyExperience,
    );
    console.warn(
      `Recorded per-experience counts for ${tracked} experiences ` +
        `(${result.data.platform.players} players across ` +
        `${result.data.platform.experiences} in ${result.data.platform.rankings} rankings).`,
    );
  } catch (error) {
    console.error("Per-experience history failed to write:", error);
  }

  return report;
}
