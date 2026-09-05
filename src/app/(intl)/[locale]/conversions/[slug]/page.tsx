import { localeSegment } from "@/i18n/locale-path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderableLocales, resolveRenderableLocale } from "@/i18n/visibility";
import { allConversionSlugs, resolveConversionSlug } from "@/lib/content/amount-pages";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { ConversionSlugView } from "@/views/conversion-slug";

type Params = { readonly params: Promise<{ readonly locale: string; readonly slug: string }> };

/** Every approved slug, both directions, in every locale this build serves. */
export function generateStaticParams(): { locale: string; slug: string }[] {
  return renderableLocales()
    .filter((meta) => meta.prefix !== "")
    .flatMap((meta) =>
      allConversionSlugs().map((slug) => ({
        locale: localeSegment(meta.locale),
        slug,
      })),
    );
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: segment, slug } = await params;
  const locale = resolveRenderableLocale(segment);
  if (!locale) notFound();
  const resolved = resolveConversionSlug(slug);
  if (!resolved) return {};
  return buildLocalizedMetadata(locale, resolved.route);
}

export default async function Page({ params }: Params) {
  const { locale: segment, slug } = await params;
  const locale = resolveRenderableLocale(segment);
  if (!locale) notFound();
  return <ConversionSlugView locale={locale} slug={slug} />;
}
