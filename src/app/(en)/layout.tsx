import type { Metadata, Viewport } from "next";
import "../globals.css";
import { SiteDocument } from "@/components/layout/site-document";
import { rootMetadata, rootViewport } from "@/lib/seo/root-metadata";
import { getTranslator } from "@/i18n/get-dictionary";
import { DEFAULT_LOCALE } from "@/i18n/config";

/**
 * The English document, at the unprefixed URLs.
 *
 * One of two root layouts. English keeps `/devex-rates/` and never gains an
 * `/en/` prefix: a second address for the same page competes with itself, and
 * the redirect that would paper over it sits inside every hreflang cluster.
 */

export const viewport: Viewport = rootViewport;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator(DEFAULT_LOCALE, ["routes", "seo"]);
  return rootMetadata(t("routes.home.title"), t("seo.site.description"));
}

export default async function EnglishRootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  const t = await getTranslator(DEFAULT_LOCALE, ["common"]);
  return (
    <SiteDocument locale={DEFAULT_LOCALE} skipToContent={t("common.shell.skipToContent")}>
      {children}
    </SiteDocument>
  );
}
