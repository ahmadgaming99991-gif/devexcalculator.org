import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveRenderableLocale } from "@/i18n/visibility";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { StockView } from "@/views/platform-stock";

const ROUTE = "/platform/stock/";

type Params = { readonly params: Promise<{ readonly locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const locale = resolveRenderableLocale((await params).locale);
  if (!locale) notFound();
  return buildLocalizedMetadata(locale, ROUTE);
}

export default async function Page({ params }: Params) {
  const locale = resolveRenderableLocale((await params).locale);
  if (!locale) notFound();
  return <StockView locale={locale} />;
}/**
 * Rendered per request, never prerendered.
 *
 * This page reports live figures. Baked at build time it would report a
 * state from whenever the build ran, which is the one thing a page about
 * live data must not do.
 *
 * Declared here rather than beside the component: Next reads route-segment
 * config from the route file only, so the export that used to sit in
 * `src/views/` did nothing at all once the body moved there.
 */
export const revalidate = 0;


