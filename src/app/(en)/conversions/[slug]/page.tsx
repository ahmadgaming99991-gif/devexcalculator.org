import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { allConversionSlugs, resolveConversionSlug } from "@/lib/content/amount-pages";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { ConversionSlugView } from "@/views/conversion-slug";

/**
 * Standalone conversion pages, in English.
 *
 * Two directions share this segment — `30000-robux-to-usd` and
 * `1000-usd-to-robux` — and `ConversionSlugView` decides which is which. Only
 * approved slugs are prerendered, and every other slug calls `notFound()`
 * inside that view, so the route cannot become an unbounded crawl space of one
 * page per number.
 *
 * `dynamicParams = false` would express the same intent declaratively, but the
 * Cloudflare adapter cannot resolve a fallback for it and every prerendered
 * path 404s with `NoFallbackError` under the Workers runtime. The explicit
 * `notFound()` is what actually enforces the guarantee, and it behaves
 * identically from outside: approved slugs return a prerendered 200,
 * everything else returns a genuine 404.
 */

export function generateStaticParams(): { slug: string }[] {
  return allConversionSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const resolved = resolveConversionSlug((await params).slug);
  if (!resolved) return {};
  /*
   * Deliberately the site card, not one per amount.
   *
   * A per-amount `opengraph-image` was written, deployed and removed. A
   * metadata image in a dynamic segment is not prerendered — it stays a route
   * the Worker answers, even with `generateStaticParams`. That is survivable
   * on its own; what is not is that this site sets `trailingSlash: true`, so
   * the URL Next emits was 308'd from `.../opengraph-image/card?hash` to
   * `.../card/?hash=`, which no longer matched the route. Verified in
   * production: 404, serving HTML to a crawler expecting a PNG.
   */
  return buildLocalizedMetadata(DEFAULT_LOCALE, resolved.route);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  return <ConversionSlugView locale={DEFAULT_LOCALE} slug={(await params).slug} />;
}
