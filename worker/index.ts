import openNextWorker from "opennext-worker";
import { fetchTopExperiences } from "../src/lib/platform/roblox-api";
import { recordSnapshot, toSnapshot, type HistoryStore } from "../src/lib/platform/history";

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
  fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response> {
    return openNextWorker.fetch(request, env, ctx);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(collect(env));
  },
};

export default handler;

/**
 * One collection run.
 *
 * A failure is logged and swallowed. A cron that throws is retried and can
 * amplify an upstream outage into a burst of requests, and a missing snapshot
 * is a gap in a chart rather than a broken site — the series is drawn from
 * whatever was actually recorded.
 */
async function collect(env: Env): Promise<void> {
  const store = env.PLATFORM_HISTORY;
  if (!store) {
    console.warn("PLATFORM_HISTORY is not bound; skipping collection.");
    return;
  }

  const result = await fetchTopExperiences();
  if (!result.ok) {
    console.warn(`Collection skipped: ${result.reason}`);
    return;
  }

  try {
    const snapshot = toSnapshot(
      result.observedAt,
      result.data.sortName,
      result.data.experiences,
    );
    const { retained } = await recordSnapshot(store, snapshot);
    // Written through `console.warn` rather than `log` only because the
    // project's lint rules allow warn and error; this is a routine success.
    console.warn(
      `Recorded ${snapshot.experiences.length} experiences, ` +
        `${snapshot.totalPlaying} players, ${retained} snapshots retained.`,
    );
  } catch (error) {
    console.error("Collection failed to write:", error);
  }
}
