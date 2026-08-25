import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "@/config/site";
import { requireRoute } from "@/lib/content/route-registry";
import type { RouteRecord } from "@/types/content";

/**
 * Metadata construction.
 *
 * Every page's metadata is derived from its manifest record, so a title, a
 * description and a canonical cannot disagree with what the validators check.
 * The canonical is always absolute, always self-referencing, and always the
 * clean route — a calculator query state canonicalises to its owning page
 * rather than to itself.
 */

const TITLE_SUFFIX = ` | ${siteConfig.name}`;

/** Titles longer than this are usually truncated in search results. */
export const MAX_TITLE_LENGTH = 60;
export const MAX_DESCRIPTION_LENGTH = 160;

export function buildMetadata(route: string, options?: MetadataOptions): Metadata {
  return metadataFromRecord(requireRoute(route), options);
}

export interface MetadataOptions {
  /**
   * Leaves the Open Graph image to Next.js's file convention.
   *
   * Every route pointed at `/opengraph-image` because that URL was written in
   * here, which also meant a segment supplying its own `opengraph-image` file
   * was silently ignored — an explicit `images` in metadata wins over the
   * convention. A route with a card of its own sets this so the convention can
   * take over; everything else keeps the site card, and keeps the per-route
   * alt text out of the registry with it.
   */
  readonly inheritImage?: boolean;
}

export function metadataFromRecord(
  record: RouteRecord,
  options?: MetadataOptions,
): Metadata {
  const canonical = absoluteUrl(record.route);
  // Append the brand only when there is room, rather than truncating the task.
  const title =
    record.title.length + TITLE_SUFFIX.length <= MAX_TITLE_LENGTH
      ? `${record.title}${TITLE_SUFFIX}`
      : record.title;

  const indexable = record.indexation === "index" && record.status === "published";

  return {
    title,
    description: record.metaDescription,
    alternates: {
      canonical,
      /*
       * Advertised on every page, not only the changelog. A feed reader looks
       * for this on whatever URL it was handed, and the thing worth
       * subscribing to here — a rate changing — affects every page equally.
       */
      types: {
        "application/atom+xml": [
          { url: absoluteUrl("/feed.xml"), title: siteConfig.name },
        ],
        "application/feed+json": [
          { url: absoluteUrl("/feed.json"), title: siteConfig.name },
        ],
      },
    },
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : { index: false, follow: true },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      locale: siteConfig.ogLocale,
      url: canonical,
      title: record.title,
      description: record.metaDescription,
      ...(options?.inheritImage
        ? {}
        : {
            images: [
              {
                url: absoluteUrl("/opengraph-image"),
                width: 1200,
                height: 630,
                alt: record.ogImageAlt,
              },
            ],
          }),
    },
    twitter: {
      card: "summary_large_image",
      title: record.title,
      description: record.metaDescription,
      ...(options?.inheritImage ? {} : { images: [absoluteUrl("/opengraph-image")] }),
    },
    other: record.rateSensitive
      ? { "article:modified_time": record.dateModified }
      : {},
  };
}

/** Metadata for a route that must stay out of the index. */
export function noindexMetadata(title: string, description: string): Metadata {
  return {
    title: `${title}${TITLE_SUFFIX}`,
    description,
    robots: { index: false, follow: true },
  };
}
