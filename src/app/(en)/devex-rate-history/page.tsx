import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { RateHistoryView } from "@/views/devex-rate-history";

const ROUTE = "/devex-rate-history/";

export function generateMetadata(): Promise<Metadata> {
  return buildLocalizedMetadata(DEFAULT_LOCALE, ROUTE);
}

export default function Page() {
  return <RateHistoryView locale={DEFAULT_LOCALE} />;
}
