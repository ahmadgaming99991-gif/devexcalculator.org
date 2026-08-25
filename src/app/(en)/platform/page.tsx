import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { PlatformView } from "@/views/platform";

const ROUTE = "/platform/";

/**
 * Rendered per request, never prerendered.
 *
 * This page reports live figures. Baked at build time it would report a
 * state from whenever the build ran, which is the one thing a page about
 * live data must not do.
 *
 * Declared here rather than beside the component: Next reads route-segment
 * config from the route file only, so the export that used to sit in
 * `src/views/` did nothing at all once the body moved there.
 */
export const revalidate = 0;

export function generateMetadata(): Promise<Metadata> {
  return buildLocalizedMetadata(DEFAULT_LOCALE, ROUTE);
}

export default function Page(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PlatformView locale={DEFAULT_LOCALE} searchParams={props.searchParams} />;
}
