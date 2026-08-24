import { localeSegment } from "@/i18n/locale-path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderableLocales, resolveRenderableLocale } from "@/i18n/visibility";
import { APPROVED_AMOUNTS, amountPageRoute, amountPageSlug, parseAmountSlug } from "@/lib/content/amount-pages";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { AmountView } from "@/views/conversion-amount";

type Params = { readonly params: Promise<{ readonly locale: string; readonly slug: string }> };

/** Every approved amount in every locale this build serves. */
export function generateStaticParams(): { locale: string; slug: string }[] {
  return renderableLocales()
    .filter((meta) => meta.prefix !== "")
    .flatMap((meta) =>
      APPROVED_AMOUNTS.map((definition) => ({
        locale: localeSegment(meta.locale),
        slug: amountPageSlug(definition.amount),
      })),
    );
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: segment, slug } = await params;
  const locale = resolveRenderableLocale(segment);
  if (!locale) notFound();
  const amount = parseAmountSlug(slug);
  if (amount === null) return {};
  return buildLocalizedMetadata(locale, amountPageRoute(amount));
}

export default async function Page({ params }: Params) {
  const { locale: segment, slug } = await params;
  const locale = resolveRenderableLocale(segment);
  if (!locale) notFound();
  return <AmountView locale={locale} slug={slug} />;
}
