import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { RobuxToUsdView } from "@/views/robux-to-usd";

const ROUTE = "/robux-to-usd/";

export function generateMetadata(): Promise<Metadata> {
  return buildLocalizedMetadata(DEFAULT_LOCALE, ROUTE, { inheritImage: true });
}

export default function Page(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <RobuxToUsdView locale={DEFAULT_LOCALE} searchParams={props.searchParams} />;
}
