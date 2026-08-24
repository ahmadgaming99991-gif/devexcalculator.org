import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { ConversionsView } from "@/views/conversions";

const ROUTE = "/conversions/";

export function generateMetadata(): Promise<Metadata> {
  return buildLocalizedMetadata(DEFAULT_LOCALE, ROUTE);
}

export default function Page(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <ConversionsView locale={DEFAULT_LOCALE} searchParams={props.searchParams} />;
}
