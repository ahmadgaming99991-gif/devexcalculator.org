import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { MethodologyView } from "@/views/methodology";

const ROUTE = "/methodology/";

export function generateMetadata(): Promise<Metadata> {
  return buildLocalizedMetadata(DEFAULT_LOCALE, ROUTE);
}

export default function Page() {
  return <MethodologyView locale={DEFAULT_LOCALE} />;
}
