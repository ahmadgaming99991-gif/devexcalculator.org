import { indexableRoutes } from "@/lib/content/route-registry";

/**
 * Choosing what to tell IndexNow about.
 *
 * Separated from the script so it can be tested without running a submission,
 * and so the rule that matters is stated in one place: **every URL comes from
 * the route registry.** A hand-maintained list is how an API endpoint, a
 * noindex page or a query-string state ends up submitted as canonical content,
 * and there is no code path here that accepts one.
 */

export interface IndexNowSelection {
  /** Submit everything indexable. Requires the caller to ask explicitly. */
  readonly all?: boolean;
  /** Submit routes modified on or after this `YYYY-MM-DD` date. */
  readonly since?: string | null;
}

/**
 * Above this share of the site, a submission stops being "what changed" and
 * starts being "everything" — the behaviour these endpoints exist to damp.
 */
export const BULK_SHARE_THRESHOLD = 0.25;

export function selectRoutes(selection: IndexNowSelection = {}): readonly string[] {
  const published = indexableRoutes.map((record) => ({
    route: record.route,
    day: record.dateModified.slice(0, 10),
  }));

  if (selection.all) return published.map((entry) => entry.route);

  const since = selection.since ?? null;
  if (since !== null) {
    // ISO dates compare correctly as strings, which avoids introducing a
    // timezone question that has no bearing on a content date.
    return published.filter((entry) => entry.day >= since).map((entry) => entry.route);
  }

  // Default: whatever carries the newest content date — the routes this
  // release actually touched.
  const newest = published.reduce((latest, entry) => (entry.day > latest ? entry.day : latest), "");
  return published.filter((entry) => entry.day === newest).map((entry) => entry.route);
}

/** True when a selection is large enough that it needs saying out loud. */
export function isBulkSubmission(count: number): boolean {
  return count / indexableRoutes.length > BULK_SHARE_THRESHOLD;
}
