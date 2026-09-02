import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { StockView } from "@/views/platform-stock";

const ROUTE = "/platform/stock/";

/*
 * Prerendered, like every other document on this site.
 *
 * This used to export `revalidate = 0`, because the page read a share price
 * while rendering and a price baked at build time is the one thing a page
 * about live data must not show. That reasoning was right about the figure and
 * wrong about the page: the figure is one number, and the other 99% is a fixed
 * explanation of where it comes from and what it does not mean.
 *
 * Measured on the deployed Worker, the render cost 884 ms of CPU on a cold
 * request. The price now arrives after load, from `/api/stock/`, and carries
 * the timestamp the provider gave it — see
 * src/components/platform/stock-quote.tsx.
 */

export function generateMetadata(): Promise<Metadata> {
  return buildLocalizedMetadata(DEFAULT_LOCALE, ROUTE);
}

export default function Page() {
  return <StockView locale={DEFAULT_LOCALE} />;
}
