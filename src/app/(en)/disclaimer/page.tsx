import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { DisclaimerView } from "@/views/disclaimer";

const ROUTE = "/disclaimer/";

export function generateMetadata(): Promise<Metadata> {
  return buildLocalizedMetadata(DEFAULT_LOCALE, ROUTE);
}

export default function Page() {
  return <DisclaimerView locale={DEFAULT_LOCALE} />;
}
