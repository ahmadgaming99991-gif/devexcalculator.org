import openNextWorker from "opennext-worker";
import { fetchForCollection } from "../src/lib/platform/roblox-api";
import {
  recordGameHistory,
  recordSnapshot,
  toSnapshot,
  type HistoryStore,
} from "../src/lib/platform/history";
import { recordHeartbeat, type RunReport } from "../src/lib/platform/heartbeat";

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

/**
 * Upgrades a plain HTTP request before anything else sees it.
 *
 * The zone's "Always Use HTTPS" setting is off and can only be changed from
 * the Cloudflare dashboard, but plain HTTP requests reach this Worker — the
 * logs are full of them — so the redirect can be done here instead. HSTS
 * already protects anyone who has visited before; this covers the first
 * visit, which is exactly the case HSTS cannot.
 *
 * 301 rather than 308: this is a permanent scheme upgrade for a GET, and 301
 * is what every crawler and client already understands for it.
 */
function upgradeToHttps(request: Request): Response | null {
  const url = new URL(request.url);
  if (url.protocol !== "http:") return null;

  url.protocol = "https:";
  return new Response(null, {
    status: 301,
    headers: {
      location: url.toString(),
      "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    },
  });
}

const handler = {
  fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
    const upgrade = upgradeToHttps(request);
    if (upgrade) return Promise.resolve(upgrade);
    return openNextWorker.fetch(request, env, ctx);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(collect(env));
  },
};

export default handler;

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
    console.warn(`Collection skipped: ${result.reason}`);
    return { outcome: "skipped", detail: result.reason };
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
