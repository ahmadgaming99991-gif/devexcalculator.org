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
  return publicLocales().flatMap((meta) =>
    indexableRoutes.map((record) => ({
      url: absoluteUrl(localizedPath(meta.locale, record.route)),
      lastModified: new Date(record.dateModified),
    })),
  );
}
