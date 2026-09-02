import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { publicLocales } from "@/i18n/visibility";

/**
 * The sitemap's hreflang cluster must be the document's, exactly.
 *
 * Google reads hreflang from either the `<head>` or the sitemap and treats
 * them as equivalent. Publishing both is redundancy worth having on a
 * seven-language site — the sitemap is read whole, a `<head>` only for pages
 * that get crawled — but only while the two agree. Two clusters that differ
 * are a contradiction a crawler has to resolve, and it resolves it by
 * distrusting both, which is strictly worse than having published one.
 *
 * So this compares them rather than checking either in isolation, and it
 * checks the two properties that invalidate a cluster outright: a cluster that
 * does not name the page it is on is discarded whole, and `x-default` has to
 * point at English, the original.
 */

/** The `<head>` cluster for one route, in one language. */
async function headCluster(route: string): Promise<Record<string, string>> {
  const metadata = await buildLocalizedMetadata("en", route);
  const languages = metadata.alternates?.languages ?? {};
  return Object.fromEntries(
    Object.entries(languages).map(([tag, value]) => [tag, String(value)]),
  );
}

const entries = sitemap();

describe("sitemap hreflang", () => {
  it("emits an entry per published language per indexable route", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it("agrees with the cluster the page's own head carries", async () => {
    // English entries, which are the ones whose route maps onto the head
    // cluster without a prefix to strip.
    const english = entries.filter(
      (entry) => !/devexcalculator\.org\/(pt-br|es|id|fr|de|tr)\//.test(entry.url),
    );
    expect(english.length).toBeGreaterThan(0);

    for (const entry of english.slice(0, 8)) {
      const route = new URL(entry.url).pathname;
      const head = await headCluster(route);
      const fromSitemap = entry.alternates?.languages ?? {};

      if (publicLocales().length <= 1) {
        // One language: the metadata omits the cluster, so this must too.
        expect(Object.keys(head), route).toEqual([]);
        expect(Object.keys(fromSitemap), route).toEqual([]);
        continue;
      }

      expect(fromSitemap, `sitemap cluster for ${route}`).toEqual(head);
    }
  });

  it("names the page it is on, or the cluster is discarded whole", () => {
    if (publicLocales().length <= 1) return;
    for (const entry of entries) {
      const languages = Object.values(entry.alternates?.languages ?? {}).map(String);
      expect(languages, `${entry.url} must appear in its own cluster`).toContain(entry.url);
    }
  });

  it("points x-default at English", () => {
    if (publicLocales().length <= 1) return;
    for (const entry of entries) {
      const languages = entry.alternates?.languages as Record<string, string> | undefined;
      if (!languages) continue;
      expect(languages["x-default"], entry.url).toBeDefined();
      expect(languages["x-default"], entry.url).not.toMatch(
        /devexcalculator\.org\/(pt-br|es|id|fr|de|tr)\//,
      );
    }
  });
});
