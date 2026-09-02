import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { HomeView } from "@/views/home";

const ROUTE = "/";

export function generateMetadata(): Promise<Metadata> {
  return buildLocalizedMetadata(DEFAULT_LOCALE, ROUTE);
}

/*
 * No `searchParams`, so this route prerenders.
 *
 * Reading the query string here made the whole document a request-time render.
 * On Workers Free that render is bounded by 10 ms of CPU, and with seven
 * published locales it stopped fitting: production returned `error 1102` on
 * this URL whenever the edge cache did not cover the request. The calculator
 * reads its own shared link in the browser instead — see `initialSearch` in
 * src/features/devex/calculator.tsx.
 */
export default function Page() {
  return <HomeView locale={DEFAULT_LOCALE} />;
}
