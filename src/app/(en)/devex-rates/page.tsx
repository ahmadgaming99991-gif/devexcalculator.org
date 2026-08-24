import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { DevexRatesView } from "@/views/devex-rates";

const ROUTE = "/devex-rates/";

export function generateMetadata(): Promise<Metadata> {
  return buildLocalizedMetadata(DEFAULT_LOCALE, ROUTE, { inheritImage: true });
}

export default function Page() {
  return <DevexRatesView locale={DEFAULT_LOCALE} />;
}
