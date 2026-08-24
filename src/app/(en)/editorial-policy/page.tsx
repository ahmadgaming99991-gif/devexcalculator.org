import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { EditorialPolicyView } from "@/views/editorial-policy";

const ROUTE = "/editorial-policy/";

export function generateMetadata(): Promise<Metadata> {
  return buildLocalizedMetadata(DEFAULT_LOCALE, ROUTE);
}

export default function Page() {
  return <EditorialPolicyView locale={DEFAULT_LOCALE} />;
}
