import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "@/config/site";
import { requireRoute } from "@/lib/content/route-registry";
import { englishCardSlug, englishCards } from "@/lib/og/english-cards";
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
   * Retained so the call sites that pass it keep compiling; it no longer
   * changes anything.
   *
   * It used to mean "let Next's `opengraph-image.tsx` convention answer for
   * this route". Those files are gone: their URLs had no file extension, so
   * `trailingSlash: true` answered every one of them with a 308, and the
   * `ImageResponse` runtime behind them took 0.76 MB of a Worker that is 3 MB
   * in total. The cards are committed PNGs now and `ogImageFor` picks the
   * right one from the route itself, which is a thing this function already
   * knows. See `src/lib/og/english-cards.ts`.
   */
  readonly inheritImage?: boolean;
}

/**
 * The card a route advertises, and the words describing it.
 *
 * A route with a card of its own gets it; everything else gets the site card.
 * The per-route alt text lives with the card rather than in the route
 * registry, which is why the registry's `ogImageAlt` is only consulted for the
 * fallback.
 */
function ogImageFor(record: RouteRecord): { readonly url: string; readonly alt: string } {
  const own = englishCards().get(record.route);
  return {
    url: absoluteUrl(`/og/${englishCardSlug(own ? record.route : "/")}.png`),
    alt: own?.alt ?? record.ogImageAlt,
  };
}

export function metadataFromRecord(
  record: RouteRecord,
  _options?: MetadataOptions,
): Metadata {
  const canonical = absoluteUrl(record.route);
  const image = ogImageFor(record);
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
      images: [{ url: image.url, width: 1200, height: 630, alt: image.alt }],
    },
    twitter: {
      card: "summary_large_image",
      title: record.title,
      description: record.metaDescription,
      images: [image.url],
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
