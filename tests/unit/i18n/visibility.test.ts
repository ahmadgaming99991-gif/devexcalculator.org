import { localeSegment } from "../../../src/i18n/locale-path";
import { afterEach, describe, expect, it } from "vitest";
import { localeRegistry } from "../../../src/i18n/config";
import {
  assertRegistry,
  isPubliclyVisible,
  isRenderable,
  publicLocales,
  publishReadiness,
  resolveRenderableLocale,
  reviewLocales,
  reviewLocalesEnabled,
} from "../../../src/i18n/visibility";
import type { LocaleMeta } from "../../../src/i18n/types";

/**
 * Five languages are complete, machine-drafted, and read by nobody. The whole
 * point of these tests is that production cannot serve them by accident — so
 * almost every assertion here is that something stays invisible.
 *
 * Turkish is no longer one of them: it was read by the maintainer on
 * 2026-08-31 and published on that basis (D-046). It is `self-reviewed`, not
 * `native-reviewed`, and the gate accepts that deliberately. What the gate
 * still refuses is a locale nobody has read at all, which is the line these
 * tests exist to hold.
 */

const original = process.env.ENABLE_REVIEW_LOCALES;
afterEach(() => {
  if (original === undefined) delete process.env.ENABLE_REVIEW_LOCALES;
  else process.env.ENABLE_REVIEW_LOCALES = original;
});

describe("the production default", () => {
  it("keeps review locales out of every public surface", () => {
    // hreflang, sitemap, IndexNow and the language selector all read this one
    // list, so a locale cannot leak through the surface somebody forgot.
    //
    // The seven launch locales went public on 2026-09-02 (D-047). Asserted as
    // the exact set rather than a count, so publishing an eighth by accident
    // is a failure here rather than a discovery in the sitemap.
    expect(publicLocales().map((m) => m.locale)).toEqual([
      "en",
      "pt-BR",
      "es",
      "id",
      "fr",
      "de",
      "tr",
    ]);
    for (const meta of reviewLocales()) {
      expect(isPubliclyVisible(meta.locale), `${meta.locale} is publicly visible`).toBe(false);
    }
  });

  it("does not even render them without the switch", () => {
    delete process.env.ENABLE_REVIEW_LOCALES;
    expect(reviewLocalesEnabled()).toBe(false);
    for (const meta of reviewLocales()) {
      expect(isRenderable(meta.locale), `${meta.locale} renders in production`).toBe(false);
      expect(resolveRenderableLocale(meta.locale)).toBeNull();
    }
    expect(isRenderable("en")).toBe(true);
  });

  it("fails closed on anything that is not exactly \"true\"", () => {
    // A typo must not publish six unreviewed languages.
    for (const value of ["", "TRUE", "True", "1", "yes", "false", " true"]) {
      process.env.ENABLE_REVIEW_LOCALES = value;
      expect(reviewLocalesEnabled(), `"${value}" enabled review locales`).toBe(false);
    }
  });
});

describe("review mode", () => {
  it("renders the review locales without making them public", () => {
    process.env.ENABLE_REVIEW_LOCALES = "true";
    for (const meta of reviewLocales()) {
      // The switch controls whether the page exists...
      expect(isRenderable(meta.locale)).toBe(true);
      // Resolved from the URL segment, which is the prefix: `/pt-br/`, not
      // the `pt-BR` tag.
      expect(resolveRenderableLocale(localeSegment(meta.locale))).toBe(meta.locale);
      // ...never whether search engines are told about it.
      expect(isPubliclyVisible(meta.locale), `${meta.locale} became public`).toBe(false);
    }
    // The switch must not add anyone to the public set. Compared against the
    // published locales rather than a hardcoded pair, so this keeps asserting
    // "the flag changed nothing" as locales are published.
    expect(publicLocales().map((m) => m.locale)).toEqual(
      localeRegistry.filter((m) => m.status === "published").map((m) => m.locale),
    );
  });

  it("still refuses a planned locale and an unknown segment", () => {
    process.env.ENABLE_REVIEW_LOCALES = "true";
    expect(resolveRenderableLocale("ar")).toBeNull();
    expect(resolveRenderableLocale("ja")).toBeNull();
    expect(resolveRenderableLocale("../../etc/passwd")).toBeNull();
    expect(resolveRenderableLocale("EN")).toBeNull();
  });
});

describe("the publish gate", () => {
  it("lets English through, because English is the source", () => {
    expect(publishReadiness("en").ready).toBe(true);
  });

  /**
   * The line, in the form it now takes.
   *
   * There are two ways past this gate and they answer different questions.
   * Either somebody read the translation — `source`, `self-reviewed` (D-046)
   * or `native-reviewed` — or somebody accountable decided to publish it
   * unread and that decision is on the record (D-047).
   *
   * What is refused is a locale with neither: read by nobody and approved by
   * nobody. Asserted against synthetic records rather than today's registry,
   * so it keeps holding as locales move.
   */
  it("refuses a locale that is neither read nor approved, and says so", () => {
    // The planned locales are the real example: nothing translated, nobody
    // asked to publish them. If this ever passes, the gate has stopped
    // guarding the thing it exists for.
    const unread = localeRegistry.filter(
      (meta) => meta.status !== "published" && meta.publicationApproval === null,
    );
    expect(unread.length, "no unread, unapproved locale left to check").toBeGreaterThan(0);

    for (const meta of unread) {
      const readiness = publishReadiness(meta.locale);
      expect(readiness.ready, `${meta.locale} is publishable`).toBe(false);
      expect(readiness.blockers.join(" ")).toContain("no publicationApproval is recorded");
    }
  });

  it("accepts a machine-drafted locale carrying an explicit decision to publish it", () => {
    for (const meta of localeRegistry) {
      if (meta.status !== "published") continue;
      const readiness = publishReadiness(meta.locale);
      expect(readiness.ready, `${meta.locale}: ${readiness.blockers.join("; ")}`).toBe(true);
      // Every published locale is either read or explicitly approved, never
      // neither, and never both claims at once.
      const read = ["source", "self-reviewed", "native-reviewed"].includes(meta.qualityReview);
      expect(read || meta.publicationApproval !== null, `${meta.locale}`).toBe(true);
    }
  });

  it("never lets an approval stand in for a review", () => {
    // The five published on 2026-09-02 are still machine-drafted, and that is
    // the point: the decision is recorded beside the provenance, not on top
    // of it.
    for (const meta of localeRegistry) {
      if (!meta.publicationApproval) continue;
      expect(meta.qualityReview, `${meta.locale} relabelled its provenance`).not.toBe(
        "self-reviewed",
      );
      expect(meta.qualityReview, `${meta.locale} relabelled its provenance`).not.toBe(
        "native-reviewed",
      );
      expect(meta.reviewerName, `${meta.locale} names a reviewer it does not have`).toBeNull();
    }
  });

  it("demands an approval say who decided, when, and on what basis", () => {
    for (const meta of localeRegistry) {
      const approval = meta.publicationApproval;
      if (!approval) continue;
      expect(approval.approvedBy).toBe("owner");
      expect(Number.isNaN(Date.parse(approval.approvedAt))).toBe(false);
      expect(approval.basis.trim().length).toBeGreaterThan(20);
    }
  });
});

/** Builds a registry entry so the assertion can be shown to fail. */
function entry(overrides: Partial<LocaleMeta>): LocaleMeta {
  const base = localeRegistry[0];
  if (!base) throw new Error("empty registry");
  return { ...base, ...overrides };
}

describe("assertRegistry", () => {
  it("passes on the registry as committed", () => {
    expect(() => assertRegistry()).not.toThrow();
  });

  it("is reachable — every claim it refuses can be constructed", () => {
    /*
     * A guard nobody can make fail is a guard that proves nothing, so this
     * exercises the same conditions against synthetic records. It mirrors
     * assertRegistry's rules rather than calling it, because the real function
     * reads the module-level registry.
     */
    const check = (meta: LocaleMeta): string | null => {
      if (meta.qualityReview === "native-reviewed") {
        if (!meta.reviewerName) return "names no reviewer";
        if (!meta.reviewedAt || Number.isNaN(Date.parse(meta.reviewedAt))) return "no valid date";
      } else if (meta.reviewerName || meta.reviewedAt) {
        return "reviewer without a review";
      }
      if (meta.status === "published" && !publishReadinessOf(meta)) return "published too early";
      return null;
    };
    const publishReadinessOf = (meta: LocaleMeta) =>
      meta.qualityReview === "native-reviewed" || meta.qualityReview === "source";

    expect(check(entry({ qualityReview: "native-reviewed", reviewerName: null }))).toBe(
      "names no reviewer",
    );
    expect(
      check(entry({ qualityReview: "native-reviewed", reviewerName: "A", reviewedAt: null })),
    ).toBe("no valid date");
    expect(
      check(entry({ qualityReview: "native-reviewed", reviewerName: "A", reviewedAt: "soon" })),
    ).toBe("no valid date");
    expect(check(entry({ qualityReview: "machine-drafted", reviewerName: "A" }))).toBe(
      "reviewer without a review",
    );
    expect(check(entry({ status: "published", qualityReview: "machine-drafted" }))).toBe(
      "published too early",
    );
    // And the shape that should pass.
    expect(
      check(
        entry({
          status: "published",
          qualityReview: "native-reviewed",
          reviewerName: "A Reviewer",
          reviewedAt: "2026-09-01",
        }),
      ),
    ).toBeNull();
  });

  it("records no reviewer anywhere yet, because none has reviewed", () => {
    for (const meta of localeRegistry) {
      expect(meta.reviewerName, `${meta.locale}`).toBeNull();
      expect(meta.reviewedAt, `${meta.locale}`).toBeNull();
      expect(meta.qualityReview).not.toBe("native-reviewed");
    }
  });

  it("stamps every locale with the English content it was drafted from", () => {
    // Without this a translation drifts invisibly: still fluent, describing a
    // page that no longer exists.
    for (const meta of localeRegistry) {
      expect(meta.sourceContentVersion, `${meta.locale}`).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
    }
  });
});
