import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/types";
import { resolveConversionSlug } from "@/lib/content/amount-pages";
import { AmountView } from "@/views/conversion-amount";
import { UsdAmountView } from "@/views/conversion-usd";

/**
 * Picks the page a `/conversions/[slug]/` really is.
 *
 * Two page types share one dynamic segment: `30000-robux-to-usd` asks what a
 * balance is worth, `1000-usd-to-robux` asks what a payout needs. Each has its
 * own view because the honest copy for each is different, and this is the one
 * place that decides between them — so neither route file has to know that the
 * other direction exists, and neither can drift into serving a different set.
 *
 * An unapproved slug never reaches a view: it 404s here, which is the same
 * guarantee both views enforce for themselves.
 */
export async function ConversionSlugView({
  locale,
  slug,
}: {
  readonly locale: Locale;
  readonly slug: string;
}) {
  const resolved = resolveConversionSlug(slug);
  if (!resolved) notFound();

  return resolved.direction === "usd-to-robux" ? (
    <UsdAmountView locale={locale} slug={slug} />
  ) : (
    <AmountView locale={locale} slug={slug} />
  );
}
