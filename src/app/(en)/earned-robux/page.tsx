import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { EarnedRobuxView } from "@/views/earned-robux";

const ROUTE = "/earned-robux/";

export function generateMetadata(): Promise<Metadata> {
  return buildLocalizedMetadata(DEFAULT_LOCALE, ROUTE, { inheritImage: true });
}

export default function Page() {
  return <EarnedRobuxView locale={DEFAULT_LOCALE} />;
}
