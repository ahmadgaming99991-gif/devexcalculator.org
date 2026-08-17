import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/config/site";
import { indexableRoutes } from "@/lib/content/route-registry";

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
  return indexableRoutes.map((record) => ({
    url: absoluteUrl(record.route),
    lastModified: new Date(record.dateModified),
  }));
}
