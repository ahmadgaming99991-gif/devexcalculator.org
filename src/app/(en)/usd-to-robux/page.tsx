import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { UsdToRobuxView } from "@/views/usd-to-robux";

const ROUTE = "/usd-to-robux/";

export function generateMetadata(): Promise<Metadata> {
  return buildLocalizedMetadata(DEFAULT_LOCALE, ROUTE, { inheritImage: true });
}

export default function Page(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <UsdToRobuxView locale={DEFAULT_LOCALE} searchParams={props.searchParams} />;
}
