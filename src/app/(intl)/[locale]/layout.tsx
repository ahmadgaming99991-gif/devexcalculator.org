import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../../globals.css";
import { SiteDocument } from "@/components/layout/site-document";
import { rootMetadata, rootViewport } from "@/lib/seo/root-metadata";
import { getTranslator } from "@/i18n/get-dictionary";
import { renderableLocales, resolveRenderableLocale } from "@/i18n/visibility";

/**
 * Every language except English, under its own prefix.
 *
 * The second of two root layouts. English is the other one and has no prefix;
 * `/en/…` is not an address this site serves.
 *
 * **The segment is validated before anything else touches it.** It arrives
 * from the URL, and the next thing that happens to a locale is that it selects
 * a dictionary — so an unchecked segment is a path-traversal primitive.
 * `resolveRenderableLocale` answers null for a segment that is not a locale,
 * for a `planned` locale, and for a `review` locale when the switch is off,
 * and all three become a real 404 rather than a page in the wrong language.
 */

export const viewport: Viewport = rootViewport;

/**
 * Only the locales this build actually serves.
 *
 * `dynamicParams = false` is what makes this a gate rather than a hint: a
 * segment outside this list is a 404 from the router, before the layout runs.
 * Without it, `/pt-br/` would still be reachable in a production build where
 * the review locales are off — rendered on demand, unlisted, and indexable.
 */
export const dynamicParams = false;

export function generateStaticParams(): { locale: string }[] {
  return renderableLocales()
    .filter((meta) => meta.prefix !== "")
    .map((meta) => ({ locale: meta.locale }));
}

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ readonly locale: string }>;
}): Promise<Metadata> {
  const locale = resolveRenderableLocale((await params).locale);
  if (!locale) notFound();
  const t = await getTranslator(locale, ["routes", "seo"]);
  return rootMetadata(t("routes.home.title"), t("seo.site.description"));
}

export default async function LocalizedRootLayout({
  children,
  params,
}: {
  readonly children: React.ReactNode;
  readonly params: Promise<{ readonly locale: string }>;
}) {
  const locale = resolveRenderableLocale((await params).locale);
  if (!locale) notFound();

  const t = await getTranslator(locale, ["common"]);
  return (
    <SiteDocument locale={locale} skipToContent={t("common.shell.skipToContent")}>
      {children}
    </SiteDocument>
  );
}
