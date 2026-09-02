import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { ConversionsView } from "@/views/conversions";

const ROUTE = "/conversions/";

export function generateMetadata(): Promise<Metadata> {
  return buildLocalizedMetadata(DEFAULT_LOCALE, ROUTE);
}

/* No `searchParams`, so this route prerenders. See src/app/(en)/page.tsx. */
export default function Page() {
  return <ConversionsView locale={DEFAULT_LOCALE} />;
}
