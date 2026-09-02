import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveRenderableLocale } from "@/i18n/visibility";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { FeesAndTaxesView } from "@/views/devex-fees-and-taxes";

const ROUTE = "/devex-fees-and-taxes/";

type Params = { readonly params: Promise<{ readonly locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const locale = resolveRenderableLocale((await params).locale);
  if (!locale) notFound();
  return buildLocalizedMetadata(locale, ROUTE, { inheritImage: true });
}

/* No `searchParams`, so this route prerenders. See src/app/(en)/page.tsx. */
export default async function Page({ params }: Params) {
  const locale = resolveRenderableLocale((await params).locale);
  if (!locale) notFound();
  return <FeesAndTaxesView locale={locale} />;
}
