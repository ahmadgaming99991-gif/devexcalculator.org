import type { ReactNode } from "react";
import { requiresAnalyticsConsent } from "@/config/site";
import { LocaleProvider } from "@/components/layout/locale-context";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { themeInitScript } from "@/components/layout/theme-toggle";
import { Analytics } from "@/components/seo/analytics";
import { AnalyticsConsent } from "@/components/seo/analytics-consent";
import { getLocaleMeta } from "@/i18n/config";
import { getTranslator } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/types";

/**
 * The document every page is served inside, in whichever language.
 *
 * There are two root layouts — English at the unprefixed URLs, everything else
 * under `/{locale}/` — because `<html lang>` has to be right and a layout can
 * only know its locale if a segment tells it. Next allows exactly this: no
 * `app/layout.tsx`, and one root layout per top-level route group.
 *
 * Two root layouts is also two `<html>` documents, and the failure mode of
 * that arrangement is drift — a skip link fixed in one, a script added to the
 * other, and six months later the two languages are different sites. So
 * neither layout writes a document. They pass a locale to this, and this is
 * the only place the shell exists.
 */

export interface SiteDocumentProps {
  readonly locale: Locale;
  /** "Skip to main content", in this page's language. */
  readonly skipToContent: string;
  readonly children: ReactNode;
}

/**
 * Everything inside <body>: the skip link, the header, the main region and
 * the footer.
 *
 * Split out from the document because the root `not-found.tsx` needs the
 * chrome without the shell. Next renders that file inside an `<html>` of its
 * own, and a component that supplies a second one produces two `<html>`
 * elements in one response — which is what it did, with the browser
 * discarding the inner document and everything in it.
 */
export async function SiteChrome({ locale, skipToContent, children }: SiteDocumentProps) {
  const t = await getTranslator(locale, ["common"]);

  /*
   * The locale reaches the handful of Client Components that are not handed
   * their words by a server parent — in practice the 404, which Next renders
   * with no params at all. Provided from here so it is the same fact that set
   * `<html lang>`, rather than something read back out of the URL.
   */
  return (
    <LocaleProvider locale={locale}>
        <a
          href="#main"
          className="skip-link absolute left-3 top-3 z-50 rounded-(--radius-control) bg-(--color-primary) px-4 py-2.5 font-semibold text-white"
        >
          {skipToContent}
        </a>

        <SiteHeader locale={locale} />

        <main id="main" className="flex-1 pb-12 pt-6 sm:pt-8">
          {children}
        </main>

        <SiteFooter locale={locale} />

        <Analytics />
        {requiresAnalyticsConsent ? (
          <AnalyticsConsent
            words={{
              heading: t("common.consent.heading"),
              explanation: t("common.consent.explanation"),
              accept: t("common.consent.accept"),
              decline: t("common.consent.decline"),
            }}
          />
        ) : null}
    </LocaleProvider>
  );
}

/**
 * The document every page is served inside.
 *
 * Only the two root layouts render this. Anything that is already inside one
 * — the localized 404, for instance — takes `SiteChrome` instead.
 */
export async function SiteDocument({ locale, skipToContent, children }: SiteDocumentProps) {
  const { htmlLang, direction } = getLocaleMeta(locale);

  return (
    <html lang={htmlLang} dir={direction} suppressHydrationWarning>
      {/*
        eslint-disable-next-line @next/next/no-head-element --
        `next/head` is the Pages Router API and does nothing here. A root
        layout in the App Router writes `<head>` itself; the rule only skips it
        when the file sits at `app/layout.tsx`, and this shell is shared by two
        of those rather than being either one.
      */}
      <head>
        {/*
          Applies the stored theme before first paint. Anything later — an
          effect, a deferred script — paints the wrong theme and then corrects
          it, which readers see as a flash.
        */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <SiteChrome locale={locale} skipToContent={skipToContent}>
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
