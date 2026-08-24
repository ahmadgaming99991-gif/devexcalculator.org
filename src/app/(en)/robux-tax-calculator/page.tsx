import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { RobuxTaxView } from "@/views/robux-tax-calculator";

const ROUTE = "/robux-tax-calculator/";

export function generateMetadata(): Promise<Metadata> {
  return buildLocalizedMetadata(DEFAULT_LOCALE, ROUTE);
}

export default function Page() {
  return <RobuxTaxView locale={DEFAULT_LOCALE} />;
}
