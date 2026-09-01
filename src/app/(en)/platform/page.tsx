import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { PlatformView } from "@/views/platform";

const ROUTE = "/platform/";

/**
 * Prerendered, and deliberately so.
 *
 * This page used to carry `revalidate = 0` and read `searchParams`, on the
 * reasoning that a page about live figures must not be baked at build time.
 * The reasoning was right and the conclusion was wrong: nothing live is baked
 * into this document at all. Every figure is fetched by the browser from the
 * platform data Worker after load, so the document itself is the same file for
 * every reader and every query string, and it can be a static one.
 *
 * What that buys is the whole point. A per-request render of this page measured
 * a median of 134 ms of CPU against the 10 ms the Workers Free plan allows,
 * which is what produced `error code: 1102` under load. A prerendered document
 * costs no Worker invocation at all.
 *
 * `searchParams` is absent from the signature rather than merely unused: a
 * route that accepts it is a route Next must treat as dynamic.
 */

export function generateMetadata(): Promise<Metadata> {
  return buildLocalizedMetadata(DEFAULT_LOCALE, ROUTE);
}

export default function Page() {
  return <PlatformView locale={DEFAULT_LOCALE} />;
}
