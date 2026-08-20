import { COLLECTION_INTERVAL_MINUTES, type HistoryStore } from "./history";

/**
 * The collector's pulse.
 *
 * The scheduled collector swallows its own failures on purpose: a cron trigger
 * that throws is retried, and retrying into an upstream outage turns one bad
 * fifteen minutes into a burst of requests. That decision stands. What it left
 * behind is the problem this file exists to fix — with every failure logged and
 * forgotten, a collector that has stopped looks exactly like a quiet night, and
 * the chart on `/platform/` would sit unchanged for days without anyone being
 * able to tell which it was.
 *
 * So every run writes one small record here, whatever happened to it. Two
 * clocks are kept apart deliberately:
 *
 *   `at`              the last time the cron fired at all
 *   `lastRecordedAt`  the last observation that actually reached storage
 *
 * Both are needed, and the second is the one that matters. A collector whose
 * upstream is refusing every request still runs exactly on schedule, so `at`
 * alone would report a healthy pulse over a series that has not moved since
 * yesterday. `lastRecordedAt` is carried forward across failing runs rather
 * than cleared, because the question being asked is "how old is the newest
 * data", not "when did we last try".
 *
 * Written without an expiry. A key that expired would turn a dead collector
 * back into a missing one after a fortnight, and "no idea" is a worse answer
 * than "nothing has been recorded for nine hours".
 */

const HEARTBEAT_KEY = "heartbeat";

/** What one collection run did. */
export type CollectionOutcome =
  /** An observation was fetched and written. */
  | "recorded"
  /**
   * Upstream returned nothing usable and nothing was written. Expected
   * occasionally, and distinct from a fault: Roblox rate-limits, and a skipped
   * run is the collector declining to invent a data point.
   */
  | "skipped"
  /** Something threw while writing. A fault on this side, not upstream. */
  | "failed";

export interface Heartbeat {
  /** When the run finished, by the Worker's clock. */
  readonly at: string;
  readonly outcome: CollectionOutcome;
  /** Why, when the outcome was not `recorded`. Null otherwise. */
  readonly detail: string | null;
  /** Upstream instant of the newest observation in storage. */
  readonly lastRecordedAt: string | null;
  /** From the most recent successful run — not from the most recent run. */
  readonly experiences: number;
  readonly players: number;
  /** Runs since the last success. Zero immediately after one. */
  readonly consecutiveFailures: number;
}

function isHeartbeat(value: unknown): value is Heartbeat {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.at === "string" && typeof record.outcome === "string";
}

/** Reads the last recorded pulse, or null where none has been written. */
export async function readHeartbeat(store: HistoryStore): Promise<Heartbeat | null> {
  const raw = await store.get(HEARTBEAT_KEY, "json");
  return isHeartbeat(raw) ? raw : null;
}

/** What one run wants recorded about itself. */
export interface RunReport {
  readonly outcome: CollectionOutcome;
  readonly detail?: string;
  /** The upstream observation instant. Only meaningful when `recorded`. */
  readonly observedAt?: string;
  readonly experiences?: number;
  readonly players?: number;
}

/**
 * Writes the pulse for one run, merged with what came before.
 *
 * A read before every write, which is one extra KV read every fifteen minutes.
 * The alternative was to let a failing run overwrite the record of the last
 * successful one, which would have made the field an operator most needs
 * unreadable at exactly the moment the collector is in trouble.
 */
export async function recordHeartbeat(
  store: HistoryStore,
  report: RunReport,
  now: Date = new Date(),
): Promise<Heartbeat> {
  const previous = await readHeartbeat(store);
  const succeeded = report.outcome === "recorded";
  const timestamp = now.toISOString();

  const heartbeat: Heartbeat = {
    at: timestamp,
    outcome: report.outcome,
    detail: succeeded ? null : (report.detail ?? null),
    lastRecordedAt: succeeded
      ? (report.observedAt ?? timestamp)
      : (previous?.lastRecordedAt ?? null),
    experiences: succeeded ? (report.experiences ?? 0) : (previous?.experiences ?? 0),
    players: succeeded ? (report.players ?? 0) : (previous?.players ?? 0),
    consecutiveFailures: succeeded ? 0 : (previous?.consecutiveFailures ?? 0) + 1,
  };

  await store.put(HEARTBEAT_KEY, JSON.stringify(heartbeat));
  return heartbeat;
}

/**
 * A missed run is a hiccup. Four in a row is a pattern.
 *
 * Reported rather than alarming: the site is still correct at this point, it
 * just has a gap in it, and the platform page already draws gaps as gaps.
 */
export const COLLECTOR_STALE_MINUTES = COLLECTION_INTERVAL_MINUTES * 4;

/**
 * Six hours. Past this the shortest range the chart offers is mostly gap, so
 * the page is no longer showing what its axis claims it is showing.
 */
export const COLLECTOR_CRITICAL_MINUTES = COLLECTION_INTERVAL_MINUTES * 24;

/**
 * How long after a deploy the collector is given before its silence counts.
 *
 * Two collection intervals: one for the run that should happen, and one for
 * the run that covers having missed it.
 */
const DEPLOY_GRACE_MINUTES = COLLECTION_INTERVAL_MINUTES * 2;

/**
 * `unknown` is a real answer here, not a placeholder. Nothing is claimed about
 * a collector that cannot be observed — a local run with no KV binding, or a
 * deploy too recent for the cron to have been due yet.
 */
export type CollectorState = "fresh" | "stale" | "critical" | "unknown";

export interface CollectorHealth {
  readonly state: CollectorState;
  readonly lastRecordedAt: string | null;
  readonly lastRunAt: string | null;
  /** Age of the newest stored observation. Null when nothing is stored. */
  readonly ageMinutes: number | null;
  readonly consecutiveFailures: number;
  readonly detail: string | null;
}

function minutesBetween(from: number, to: number): number {
  // Clamped at zero. A snapshot stamped slightly in the future is clock skew
  // between Roblox and Cloudflare, not data from ahead of time.
  return Math.max(0, Math.round((to - from) / 60_000));
}

/**
 * Turns a pulse into a verdict.
 *
 * Pure, and takes its clock, so the thresholds can be tested at the boundary
 * rather than by waiting six hours for one.
 */
export function assessCollector(
  heartbeat: Heartbeat | null,
  options: { now?: Date; deployedAt?: string | null } = {},
): CollectorHealth {
  const now = (options.now ?? new Date()).getTime();

  if (!heartbeat) {
    /*
     * No pulse has ever been written. That is either a collector that has not
     * come due since this build shipped, or one that is not firing at all, and
     * the two are indistinguishable without a reference point. The build time
     * is that reference point; without one, nothing is claimed.
     */
    const deployed = options.deployedAt ? Date.parse(options.deployedAt) : Number.NaN;
    if (!Number.isFinite(deployed)) {
      return {
        state: "unknown",
        lastRecordedAt: null,
        lastRunAt: null,
        ageMinutes: null,
        consecutiveFailures: 0,
        detail:
          "No collection has ever been recorded, and there is no build time to measure that silence against.",
      };
    }

    const sinceDeploy = minutesBetween(deployed, now);
    const waiting = sinceDeploy < DEPLOY_GRACE_MINUTES;
    return {
      state: waiting ? "unknown" : "critical",
      lastRecordedAt: null,
      lastRunAt: null,
      ageMinutes: null,
      consecutiveFailures: 0,
      detail: waiting
        ? `Deployed ${sinceDeploy} minutes ago; the collector is not due yet.`
        : `The collector has not run once in the ${sinceDeploy} minutes since this build was deployed.`,
    };
  }

  const recorded = heartbeat.lastRecordedAt
    ? Date.parse(heartbeat.lastRecordedAt)
    : Number.NaN;

  if (!Number.isFinite(recorded)) {
    return {
      state: "critical",
      lastRecordedAt: null,
      lastRunAt: heartbeat.at,
      ageMinutes: null,
      consecutiveFailures: heartbeat.consecutiveFailures,
      detail:
        heartbeat.detail ?? "The collector has run but has never recorded an observation.",
    };
  }

  const ageMinutes = minutesBetween(recorded, now);
  const state: CollectorState =
    ageMinutes >= COLLECTOR_CRITICAL_MINUTES
      ? "critical"
      : ageMinutes >= COLLECTOR_STALE_MINUTES
        ? "stale"
        : "fresh";

  return {
    state,
    lastRecordedAt: heartbeat.lastRecordedAt,
    lastRunAt: heartbeat.at,
    ageMinutes,
    consecutiveFailures: heartbeat.consecutiveFailures,
    // The last failure reason is worth carrying while the collector is
    // struggling, and is noise once it has recovered.
    detail: state === "fresh" ? null : heartbeat.detail,
  };
}
