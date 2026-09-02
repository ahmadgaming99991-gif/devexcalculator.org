import { PLATFORM_API_BASE } from "@/lib/platform/data-api";
import type { HealthState } from "@/lib/api/health-status";

/**
 * Whether the platform data plane is still recording, asked of the data plane.
 *
 * `/api/health/` used to answer this from the v1 collector's heartbeat in the
 * site Worker's KV. That collector was retired on 2026-09-02 — the site
 * Worker's `crons` is `[]` and the store is kept only for rollback — so its
 * heartbeat stopped, the endpoint went `critical`, and it served **HTTP 503
 * continuously while every figure on the site was correct and the v2 data
 * plane was recording every fifteen minutes**. A health check that is
 * permanently red is one nobody reads on the day it means something, which is
 * the same failure as the hardcoded `{"ok": true}` it originally replaced,
 * arrived at from the other direction.
 *
 * So the question is now put to the Worker that actually collects. Reading a
 * second service inside a health check is a real cost — it can be slow, and it
 * can fail for reasons that have nothing to do with this site — and both are
 * accounted for below: the request is bounded by a timeout, and a data plane
 * that cannot be reached is reported as `critical` rather than hidden, because
 * "the collector might be dead and I cannot tell" is a thing an operator needs
 * to act on.
 *
 * Server-to-server and never cached. A cached health answer is a health answer
 * about the past.
 */

/** Under an hour is normal: the collector records every fifteen minutes. */
const FRESH_BELOW_MINUTES = 60;

/** Six hours is roughly twenty-four missed collections. */
const CRITICAL_AT_MINUTES = 360;

/** Long enough for a cold Worker, short enough not to hang a health check. */
const TIMEOUT_MS = 5_000;

/** What `/api/health/` reports about the collector, whatever answered. */
export interface DataPlaneHealth {
  readonly state: HealthState;
  /** When the most recent observation was taken, or null when there is none. */
  readonly lastRecordedAt: string | null;
  /** When the collector last ran, which can be later than the observation. */
  readonly lastRunAt: string | null;
  readonly ageMinutes: number | null;
  readonly consecutiveFailures: number;
  /** A sentence for a person, never a binding name, a token or a URL. */
  readonly detail: string | null;
}

/** The fields of the data Worker's `/health` this reads. Nothing else is trusted. */
interface DataPlanePayload {
  hasObservations?: unknown;
  observedAt?: unknown;
  collector?: {
    lastRunAt?: unknown;
    consecutiveFailures?: unknown;
    detail?: unknown;
  };
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/**
 * Reads the age from the observation timestamp rather than from the age the
 * data plane reports.
 *
 * The two normally agree. When they do not, the one that matters is the one
 * measured against this Worker's clock, because that is the clock the operator
 * reading this response is living in — and a data plane whose own clock has
 * drifted is exactly the case where a self-reported age would hide the fault.
 */
function ageMinutesOf(observedAt: string, now: Date): number | null {
  const observed = Date.parse(observedAt);
  if (Number.isNaN(observed)) return null;
  return (now.getTime() - observed) / 60_000;
}

/**
 * The data plane's answer, turned into a state.
 *
 * Exported and pure so the thresholds can be tested without a network: this is
 * the part that decides whether the site reports itself down.
 */
export function assessDataPlane(body: unknown, now: Date = new Date()): DataPlaneHealth {
  if (typeof body !== "object" || body === null) {
    return unusable("The platform data plane returned a response that was not an object.");
  }

  // The Worker wraps its payload; anything else is a response we cannot read.
  const envelope = body as { ok?: unknown; data?: unknown };
  if (typeof envelope.data !== "object" || envelope.data === null) {
    return unusable("The platform data plane returned no health data.");
  }

  const data = envelope.data as DataPlanePayload;
  const collector = typeof data.collector === "object" && data.collector !== null ? data.collector : {};

  const consecutiveFailures = isFiniteNumber(collector.consecutiveFailures)
    ? collector.consecutiveFailures
    : 0;
  const lastRunAt = typeof collector.lastRunAt === "string" ? collector.lastRunAt : null;
  const detail = typeof collector.detail === "string" ? collector.detail : null;

  if (data.hasObservations !== true || typeof data.observedAt !== "string") {
    return {
      state: "critical",
      lastRecordedAt: null,
      lastRunAt,
      ageMinutes: null,
      consecutiveFailures,
      detail: detail ?? "The platform data plane holds no observations.",
    };
  }

  const ageMinutes = ageMinutesOf(data.observedAt, now);
  if (ageMinutes === null) {
    return {
      state: "critical",
      lastRecordedAt: null,
      lastRunAt,
      ageMinutes: null,
      consecutiveFailures,
      detail: "The platform data plane reported an observation time that could not be read.",
    };
  }

  /*
   * A timestamp in the future is not fresh, it is wrong. Clamping to zero
   * would report the healthiest possible state for a clock that has clearly
   * drifted, which is the one reading that must not be flattering.
   */
  const state: HealthState =
    ageMinutes >= CRITICAL_AT_MINUTES
      ? "critical"
      : ageMinutes >= FRESH_BELOW_MINUTES
        ? "stale"
        : "fresh";

  return {
    state,
    lastRecordedAt: data.observedAt,
    lastRunAt,
    ageMinutes: Math.round(ageMinutes * 10) / 10,
    consecutiveFailures,
    detail,
  };
}

function unusable(detail: string): DataPlaneHealth {
  return {
    state: "critical",
    lastRecordedAt: null,
    lastRunAt: null,
    ageMinutes: null,
    consecutiveFailures: 0,
    detail,
  };
}

/**
 * Asks the data plane, and reports a failure to reach it as `critical`.
 *
 * `fetchImpl` is injectable so the failure paths can be tested; production
 * passes nothing and gets the platform's own `fetch`.
 */
export async function readDataPlaneHealth(
  fetchImpl: typeof fetch = fetch,
  now: Date = new Date(),
): Promise<DataPlaneHealth> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetchImpl(`${PLATFORM_API_BASE}/health`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      // A health check must describe now, so nothing about this is cacheable.
      cache: "no-store",
    });

    if (!response.ok) {
      // The status only. The URL is this site's own service and the response
      // body is not ours to echo into an operator-facing document.
      return unusable(`The platform data plane answered HTTP ${response.status}.`);
    }

    return assessDataPlane(await response.json(), now);
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? `The platform data plane did not answer within ${TIMEOUT_MS / 1_000} seconds.`
        : "The platform data plane could not be reached.";
    return unusable(reason);
  } finally {
    clearTimeout(timer);
  }
}
