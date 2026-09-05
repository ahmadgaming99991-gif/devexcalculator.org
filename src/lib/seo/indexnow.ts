import { indexableRoutes } from "@/lib/content/route-registry";
import { localizedPath } from "@/i18n/locale-path";
import { publicLocales } from "@/i18n/visibility";

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
  /*
   * One entry per published language per route, for the same reason the
   * sitemap carries them: a language nobody is told about is a language nobody
   * crawls. `publicLocales()` is English alone while the six are in review, so
   * this submits exactly what it submitted before until somebody publishes.
   */
  const published = publicLocales().flatMap((meta) =>
    indexableRoutes.map((record) => ({
      route: localizedPath(meta.locale, record.route),
      day: record.dateModified.slice(0, 10),
    })),
  );

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

/**
 * True when a selection is large enough that it needs saying out loud.
 *
 * The count passed in is URLs, and `selectRoutes` emits one per published
 * language per route, so the share has to be measured against that same
 * universe. Dividing by the route count alone made the gate seven times
 * stricter than the 25% it documents: the release that added the payout-target
 * pages selected 42 URLs out of 294 - a seventh of the site - and was refused
 * as "42 of 42 routes (100%)", which is two different units compared as one.
 */
export function isBulkSubmission(count: number): boolean {
  return count / (indexableRoutes.length * publicLocales().length) > BULK_SHARE_THRESHOLD;
}
