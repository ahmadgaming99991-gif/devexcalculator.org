import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "@/config/site";
import { requireRoute } from "@/lib/content/route-registry";
import { DEFAULT_LOCALE, getLocaleMeta } from "@/i18n/config";
import { getNamespace, interpolate } from "@/i18n/get-dictionary";
import { withFigures } from "@/i18n/figures";
import { localizedPath } from "@/i18n/locale-path";
import { routeKey } from "@/i18n/route-key";
import { isPubliclyVisible, publicLocales } from "@/i18n/visibility";
import type { Locale } from "@/i18n/types";
import { MAX_TITLE_LENGTH } from "@/lib/seo/metadata";

/**
 * One page's metadata, in one language.
 *
 * Four things have to agree here, and each of them is a way to lose a page:
 *
 *   **The canonical points at this language's own URL.** A Spanish page
 *   canonicalising to the English one asks a search engine to drop it, which
 *   it will.
 *
 *   **The hreflang cluster lists only public locales, and always names
 *   itself.** A cluster that omits the page it is on is ignored wholesale.
 *
 *   **`x-default` is English.** It is the one address for a reader whose
 *   language this site does not have, and English is the original.
 *
 *   **A locale awaiting native review is `noindex`, whatever else is true.**
 *   `ENABLE_REVIEW_LOCALES` decides whether these pages render; it has never
 *   decided whether they may be indexed, and conflating the two is how six
 *   machine-drafted languages end up in a search index. The switch is for
 *   looking at them, not for publishing them — so the directive is derived
 *   from the locale's `status`, not from the environment.
 */

const TITLE_SUFFIX = ` | ${siteConfig.name}`;

/**
 * The Open Graph card this page should name.
 *
 * English has the site card at the root and eight routes with one of their
 * own; those pass `inheritImage` and let Next's file convention answer.
 *
 * Every other language names a PNG under `public/og/`, built by
 * `scripts/og/build-localized-cards.ts`. Next's convention was tried twice and
 * neither arrangement works here: an `opengraph-image.tsx` at the `[locale]`
 * segment is not inherited by the routes nested under it, and one per segment
 * put 0.76 MB of `@vercel/og` into the Worker — over Cloudflare's 3 MB limit,
 * for images that are prerendered and never generated at request time.
 *
 * All localized pages share one card per language rather than one per route.
 * The English per-route cards each state that page's figure; reproducing that
 * across six languages is forty-eight images to keep in step with a rate that
 * moves, and the thing that was actually wrong was the language.
 */
function ogImageUrl(locale: Locale, inherit: boolean | undefined): string | null {
  if (locale !== DEFAULT_LOCALE) return absoluteUrl(`/og/${locale}.png`);
  return inherit ? null : absoluteUrl("/opengraph-image");
}

interface RouteStrings {
  readonly title: string;
  readonly metaDescription: string;
  readonly ogImageAlt: string;
}

export interface LocalizedMetadataOptions {
  /** The route has its own `opengraph-image`; let the convention supply it. */
  readonly inheritImage?: boolean;
}

export async function buildLocalizedMetadata(
  locale: Locale,
  route: string,
  options?: LocalizedMetadataOptions,
): Promise<Metadata> {
  const record = requireRoute(route);
  const routes = await getNamespace<Record<string, RouteStrings>>(locale, "routes");
  const raw = routes[routeKey(route)];
  if (!raw) {
    // Every indexable route is extracted into the dictionary, so this is a
    // route added without re-running the extractor rather than a reader error.
    throw new Error(`No "routes" entry for ${route} in locale "${locale}".`);
  }

  const meta = getLocaleMeta(locale);
  const canonical = absoluteUrl(localizedPath(locale, route));

  /*
   * Same reason as `localizedRoute`: these strings come from the namespace
   * rather than from `t`, and a title carrying a raw `{rateStandard}` is the
   * one place nobody looks at while developing.
   */
  const fill = (value: string): string => interpolate(value, withFigures(meta.bcp47));
  const strings = {
    title: fill(raw.title),
    metaDescription: fill(raw.metaDescription),
    ogImageAlt: fill(raw.ogImageAlt),
  };

  // Append the brand only when there is room, rather than truncating the task.
  const title =
    strings.title.length + TITLE_SUFFIX.length <= MAX_TITLE_LENGTH
      ? `${strings.title}${TITLE_SUFFIX}`
      : strings.title;

  /*
   * `record.indexation` is about the route; `isPubliclyVisible` is about the
   * language. A page needs both, and the language is the stricter of the two.
   */
  const indexable =
    record.indexation === "index" &&
    record.status === "published" &&
    isPubliclyVisible(locale);

  const ogImage = ogImageUrl(locale, options?.inheritImage);

  const languages: Record<string, string> = {};
  for (const other of publicLocales()) {
    languages[other.hreflang] = absoluteUrl(localizedPath(other.locale, route));
  }
  languages["x-default"] = absoluteUrl(route);

  return {
    title,
    description: strings.metaDescription,
    alternates: {
      canonical,
      /*
       * A cluster of one is not a cluster. While English is the only public
       * language, `en` and `x-default` would both be this page pointing at
       * itself — noise that says nothing, and that starts saying something
       * wrong the moment a route is missing from one side.
       */
      ...(publicLocales().length > 1 ? { languages } : {}),
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
      locale: meta.ogLocale,
      url: canonical,
      title: strings.title,
      description: strings.metaDescription,
      ...(ogImage === null
        ? {}
        : {
            images: [
              {
                url: ogImage,
                width: 1200,
                height: 630,
                alt: strings.ogImageAlt,
              },
            ],
          }),
    },
    twitter: {
      card: "summary_large_image",
      title: strings.title,
      description: strings.metaDescription,
      ...(ogImage === null ? {} : { images: [ogImage] }),
    },
    other: record.rateSensitive ? { "article:modified_time": record.dateModified } : {},
  };
}
