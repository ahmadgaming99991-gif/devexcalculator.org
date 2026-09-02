import { localeRegistry, getLocaleMeta } from "./config";
import { parseLocaleSegment } from "./locale-path";
import type { Locale, LocaleMeta, QualityReview } from "./types";

/**
 * What the public is allowed to see, and the one switch that changes it.
 *
 * Six languages are complete and machine-drafted. None has been read by a
 * native speaker, and this site publishes figures about people's income — a
 * mistranslated "eligible balance" or "minimum requirement" can tell somebody
 * they may cash out when they may not. So they exist, they render, they are
 * tested, and production does not serve them.
 *
 * The mechanism is deliberately one boolean and one status field rather than a
 * list of exclusions per surface. Six surfaces choose which locales to emit,
 * and each has to ask here to do it — asserted one file at a time in
 * `tests/unit/i18n/visibility-surfaces.test.ts`, because this sentence used to
 * say eight surfaces asked and three of them did not:
 *
 *   route generation · language selector · hreflang · sitemap · IndexNow ·
 *   `llms.txt`
 *
 * Navigation and internal links are not on that list, and the distinction is
 * the correction: they are handed the locale of the page being rendered, and
 * that page exists only because route generation asked. Listing them beside
 * the six implied a check they cannot have.
 *
 * `ENABLE_REVIEW_LOCALES` is unset in production and read once here. Nothing
 * else in the codebase reads it, so "is this locale visible?" has exactly one
 * answer everywhere.
 */

/**
 * Whether unreviewed locales render at all.
 *
 * Read from the environment rather than from a build flag so a preview
 * deployment can turn it on without a different build. Anything other than
 * the exact string `true` is false: a typo must fail closed, because failing
 * open publishes six unreviewed languages.
 */
export function reviewLocalesEnabled(): boolean {
  return process.env.ENABLE_REVIEW_LOCALES === "true";
}

/**
 * Whether a locale may appear on public, crawlable surfaces.
 *
 * `published` only. A `review` locale never reaches an hreflang cluster, a
 * sitemap, an IndexNow submission or the language selector, whatever
 * `ENABLE_REVIEW_LOCALES` says — that switch controls whether the pages
 * *render*, not whether search engines are told about them. Conflating the
 * two is how an unreviewed translation ends up indexed.
 */
export function isPubliclyVisible(locale: Locale): boolean {
  return getLocaleMeta(locale).status === "published";
}

/**
 * Whether a locale's routes should be generated in this build.
 *
 * Published always; review only behind the switch. This is the one place that
 * decides whether `/pt-br/devex-rates/` is a page or a 404.
 */
export function isRenderable(locale: Locale): boolean {
  const { status } = getLocaleMeta(locale);
  if (status === "published") return true;
  return status === "review" && reviewLocalesEnabled();
}

/** Locales that may appear in hreflang, sitemaps, IndexNow and the selector. */
export function publicLocales(): readonly LocaleMeta[] {
  return localeRegistry.filter((meta) => isPubliclyVisible(meta.locale));
}

/** Locales whose routes exist in this build. A superset of `publicLocales`. */
export function renderableLocales(): readonly LocaleMeta[] {
  return localeRegistry.filter((meta) => isRenderable(meta.locale));
}

/** Locales rendering but not yet public. Each shows the machine-drafted badge. */
export function reviewLocales(): readonly LocaleMeta[] {
  return localeRegistry.filter((meta) => meta.status === "review");
}

/**
 * Resolves a URL segment to a locale that this build actually serves.
 *
 * Returns null for an unknown segment, for a `planned` locale, and for a
 * `review` locale when the switch is off — all of which the router turns into
 * a real 404 rather than a page in the wrong language.
 */
export function resolveRenderableLocale(segment: string): Locale | null {
  const locale = parseLocaleSegment(segment);
  if (!locale) return null;
  return isRenderable(locale) ? locale : null;
}

/**
 * Whether a locale may be marked `published`, and what is missing if not.
 *
 * Called by the release script and by a test, so the gate cannot be bypassed
 * by editing one field. Publishing is the moment a machine-drafted
 * translation becomes a claim this site is making, so the bar is a named
 * person and a date, not a status string.
 */
export interface PublishReadiness {
  readonly ready: boolean;
  readonly blockers: readonly string[];
}

export function publishReadiness(locale: Locale): PublishReadiness {
  const meta = getLocaleMeta(locale);
  const blockers: string[] = [];

  /*
   * Two ways through, and they answer different questions.
   *
   * The first is provenance: somebody read the translation. `native-reviewed`
   * is the bar worth wanting, `self-reviewed` was accepted on 2026-08-31 for a
   * locale no native speaker was available for (D-046), and `source` is the
   * language the content was written in.
   *
   * The second is an explicit decision to publish anyway — D-047. Five locales
   * passed the full QA gate with zero blocking findings and were published by
   * the owner on 2026-09-02 with `qualityReview` left at `machine-drafted`,
   * because it is true. The alternative on offer was to move them to
   * `self-reviewed` so this function would open, which would have recorded a
   * human reading that did not happen — the exact fabrication the field
   * exists to prevent. Recording the decision is honest; renaming the machine's
   * work is not.
   *
   * What is *not* relaxed: a locale with neither a review nor an approval
   * still cannot be published, `native-reviewed` still demands a named person
   * and a date, and an approval has to name who decided, when, and on what
   * basis. Nothing here lets a locale claim a review it did not get.
   */
  const REVIEWED: readonly QualityReview[] = ["native-reviewed", "self-reviewed", "source"];
  const reviewed = REVIEWED.includes(meta.qualityReview);
  const approval = meta.publicationApproval;

  if (!reviewed && !approval) {
    blockers.push(
      `qualityReview is "${meta.qualityReview}" and no publicationApproval is recorded`,
    );
  }

  if (approval) {
    if (approval.approvedBy !== "owner") {
      blockers.push(`publicationApproval.approvedBy is "${approval.approvedBy}", which is not a decision this registry recognises`);
    }
    if (!approval.approvedAt || Number.isNaN(Date.parse(approval.approvedAt))) {
      blockers.push("publicationApproval has no valid approvedAt date");
    }
    if (!approval.basis || approval.basis.trim().length < 20) {
      blockers.push("publicationApproval records no basis for the decision");
    }
  }
  if (meta.qualityReview === "native-reviewed") {
    if (!meta.reviewerName) blockers.push("reviewerName is missing");
    if (!meta.reviewedAt) blockers.push("reviewedAt is missing");
  }

  return { ready: blockers.length === 0, blockers };
}

/**
 * Fails the build on a registry that claims something it cannot support.
 *
 * Imported for its side effect by `config`'s consumers, so a bad edit stops a
 * build rather than shipping. The claims it refuses:
 *
 *   - `native-reviewed` with no reviewer name or no review date
 *   - a reviewer or review date recorded without the review status
 *   - `published` with neither a review nor a recorded decision to publish
 *   - a publication approval that names a reviewer, which would be an
 *     approval impersonating a review
 */
export function assertRegistry(): void {
  for (const meta of localeRegistry) {
    const where = `locale "${meta.locale}"`;

    if (meta.qualityReview === "native-reviewed") {
      if (!meta.reviewerName) {
        throw new Error(`${where} claims a native review but names no reviewer.`);
      }
      if (!meta.reviewedAt || Number.isNaN(Date.parse(meta.reviewedAt))) {
        throw new Error(`${where} claims a native review with no valid date.`);
      }
    } else if (meta.reviewerName || meta.reviewedAt) {
      throw new Error(
        `${where} records a reviewer or a review date without claiming a review.`,
      );
    }

    /*
     * An approval is a decision, not a reading, and it may not borrow the
     * vocabulary of one. `reviewerName` belongs to `native-reviewed` alone;
     * an approval that filled it in would read, in every report that prints
     * these fields, exactly like a locale somebody had checked.
     */
    if (meta.publicationApproval && meta.reviewerName) {
      throw new Error(
        `${where} records a publication approval and a reviewer name; an approval is not a review.`,
      );
    }

    if (meta.status === "published") {
      const { ready, blockers } = publishReadiness(meta.locale);
      if (!ready) {
        throw new Error(`${where} is published but is not ready: ${blockers.join("; ")}`);
      }
    }
  }
}

assertRegistry();
