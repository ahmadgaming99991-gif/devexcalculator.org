import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { FeesAndTaxesView } from "@/views/devex-fees-and-taxes";

const ROUTE = "/devex-fees-and-taxes/";

export function generateMetadata(): Promise<Metadata> {
  return buildLocalizedMetadata(DEFAULT_LOCALE, ROUTE, { inheritImage: true });
}

/* No `searchParams`, so this route prerenders. See src/app/(en)/page.tsx. */
export default function Page() {
  return <FeesAndTaxesView locale={DEFAULT_LOCALE} />;
}
