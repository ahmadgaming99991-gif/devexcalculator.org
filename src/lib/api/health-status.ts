/**
 * What the health endpoint's status code means.
 *
 * Separated from the route so the decision can be tested directly. This is the
 * part that matters: the endpoint previously answered 200 unconditionally, so
 * anything watching it could never fire, and a check that cannot fail is not a
 * check. Getting this wrong in either direction is expensive — a 503 that never
 * arrives leaves a stale rate serving indefinitely, and one that arrives too
 * readily gets the alert muted, which comes to the same thing.
 */

/**
 * Ordered by severity, worst last.
 *
 * `unknown` sits at the bottom rather than the top on purpose. It means "not
 * observable here" — a local run with no KV binding, a deploy too recent for
 * the collector to be due — and inventing a fault out of an absence of
 * evidence would fail every preview and every CI run.
 */
export const HEALTH_SEVERITY = ["unknown", "fresh", "stale", "critical"] as const;

export type HealthState = (typeof HEALTH_SEVERITY)[number];

/** The worst of the given states, or `unknown` when there are none. */
export function worstState(states: readonly HealthState[]): HealthState {
  return states.reduce<HealthState>(
    (current, state) =>
      HEALTH_SEVERITY.indexOf(state) > HEALTH_SEVERITY.indexOf(current) ? state : current,
    "unknown",
  );
}

/**
 * Only `critical` fails.
 *
 * `stale` is deliberately a 200. A rate registry due for review and a collector
 * with an hour's gap are both worth seeing in the body, and neither makes any
 * figure on the site wrong — the pages carry their own verification dates. The
 * status code is reserved for the state where someone needs to act now.
 */
export function isHealthy(state: HealthState): boolean {
  return state !== "critical";
}

/** 200 while healthy, 503 once something needs attention. */
export function healthStatusCode(state: HealthState): 200 | 503 {
  return isHealthy(state) ? 200 : 503;
}
