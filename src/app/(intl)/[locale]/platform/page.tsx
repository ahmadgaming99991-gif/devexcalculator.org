import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveRenderableLocale } from "@/i18n/visibility";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { PlatformView } from "@/views/platform";

const ROUTE = "/platform/";

/**
 * Prerendered per published locale, for the same reasons as the English route.
 *
 * Nothing live is baked into this document: the figures are fetched by the
 * browser from the platform data Worker after load. `searchParams` is absent
 * from the signature rather than merely unused, because a route that accepts it
 * is a route Next must treat as dynamic.
 */

type Params = { readonly params: Promise<{ readonly locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const locale = resolveRenderableLocale((await params).locale);
  if (!locale) notFound();
  return buildLocalizedMetadata(locale, ROUTE);
}

export default async function Page({ params }: Params) {
  const locale = resolveRenderableLocale((await params).locale);
  if (!locale) notFound();
  return <PlatformView locale={locale} />;
}
