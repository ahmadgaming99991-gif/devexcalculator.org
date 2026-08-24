import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { ChangelogView } from "@/views/changelog";

const ROUTE = "/changelog/";

export function generateMetadata(): Promise<Metadata> {
  return buildLocalizedMetadata(DEFAULT_LOCALE, ROUTE);
}

export default function Page() {
  return <ChangelogView locale={DEFAULT_LOCALE} />;
}
