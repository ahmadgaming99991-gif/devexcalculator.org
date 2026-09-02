import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";
import { indexableRoutes } from "@/lib/content/route-registry";
import { localizedPath } from "@/i18n/locale-path";
import { publicLocales } from "@/i18n/visibility";

/**
 * XML sitemap.
 *
 * Contains only canonical, published, indexable URLs — the same set the
 * canonical tags and the internal-link graph point at, because all three are
 * derived from one manifest.
 *
 * `lastmod` comes from each page's `dateModified`, which is updated when the
 * content or the rate data actually changes. It is deliberately not the build
 * time: a sitemap that claims every page changed on every deploy teaches
 * crawlers to ignore the field.
 *
 * Priority and changeFrequency are omitted. Google states it ignores both, and
 * inventing values would be noise dressed as signal.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  /*
   * Every published language, not just English.
   *
   * `visibility.ts` describes the sitemap as one of the surfaces its two
   * questions govern. It was not: this file imported `indexableRoutes` and
   * emitted the bare English path, with no locale in it anywhere. Publishing a
   * language would have rendered it, made it indexable, given it a correct
   * canonical and a correct hreflang cluster — and left it out of the one file
   * that tells a crawler the pages exist.
   *
   * `publicLocales()` is English alone while the six are in review, so this
   * emits exactly the same 36 URLs it did before until somebody publishes.
   */
  const locales = publicLocales();

  /*
   * The same hreflang cluster the page's own `<head>` carries.
   *
   * Google accepts the annotations in either place and treats them as
   * equivalent, so this is redundancy rather than a new claim — and redundancy
   * is worth having for a seven-language site, because the sitemap is read
   * whole while a `<head>` is only read for pages that get crawled.
   *
   * It has to be *exactly* the same cluster, which is why it is built from the
   * same two lines as `buildLocalizedMetadata`: a set that disagrees with the
   * one in the document is worse than having only one of them. That includes
   * the self-reference — a cluster that omits the page it describes is
   * discarded whole — and `x-default` pointing at English, the original.
   *
   * Skipped entirely while English is the only public language, for the reason
   * the metadata gives: `en` and `x-default` would both be the page pointing
   * at itself.
   */
  const alternatesFor = (route: string): Record<string, string> | undefined => {
    if (locales.length <= 1) return undefined;
    const languages: Record<string, string> = {};
    for (const other of locales) {
      languages[other.hreflang] = absoluteUrl(localizedPath(other.locale, route));
    }
    languages["x-default"] = absoluteUrl(route);
    return languages;
  };

  return locales.flatMap((meta) =>
    indexableRoutes.map((record) => {
      const languages = alternatesFor(record.route);
      return {
        url: absoluteUrl(localizedPath(meta.locale, record.route)),
        lastModified: new Date(record.dateModified),
        ...(languages ? { alternates: { languages } } : {}),
      };
    }),
  );
}
