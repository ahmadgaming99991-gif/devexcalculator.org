import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { RobloxStatsView } from "@/views/roblox-stats";

const ROUTE = "/roblox-stats/";

export function generateMetadata(): Promise<Metadata> {
  return buildLocalizedMetadata(DEFAULT_LOCALE, ROUTE);
}

export default function Page() {
  return <RobloxStatsView locale={DEFAULT_LOCALE} />;
}
