import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { CorrectionsView } from "@/views/corrections";

const ROUTE = "/corrections/";

export function generateMetadata(): Promise<Metadata> {
  return buildLocalizedMetadata(DEFAULT_LOCALE, ROUTE);
}

export default function Page() {
  return <CorrectionsView locale={DEFAULT_LOCALE} />;
}
