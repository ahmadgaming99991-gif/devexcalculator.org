import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/layout/locale-context";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { themeInitScript } from "@/components/layout/theme-toggle";
import { Analytics } from "@/components/seo/analytics";
import { SeoTooling } from "@/components/seo/seo-tooling";
import { earlyInputScript } from "@/features/devex/early-input";
import { getLocaleMeta } from "@/i18n/config";
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
        <SeoTooling />
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
      <body className="flex min-h-dvh flex-col">
        {/*
          Applies the stored theme before first paint, from the top of the
          body rather than from a `<head>` this file writes itself.

          It used to sit in an explicit `<head>` element here, and that element
          was the cause of `Minified React error #418` — a hydration mismatch —
          on **every route**, intermittently, in both Firefox and Chrome. In
          the App Router `<head>` belongs to Next: it streams the stylesheet
          links, the metadata, the preloads and the chunk scripts into it. A
          layout that also renders `<head>` hands React a head with one child
          and a DOM with forty, and React resolves that by discarding the
          server-rendered document and rebuilding it in the browser. The
          `suppressHydrationWarning` on `<html>` covers that element's own
          attributes, not a structural mismatch inside it.

          Found by bisecting a reproduction that loads six pages in one browser
          context — the error needs warm chunks and therefore fast hydration,
          which is why a cold first load rarely shows it and why it survived
          this long. Removing the element took a four-run probe from thirteen
          hits to zero.

          First child of `<body>`, so it still runs before any content is
          parsed: measured at 14 ms against a first contentful paint of 19 ms,
          with the dark theme already applied. Anything later — an effect, a
          deferred script — paints the wrong theme and then corrects it, which
          readers see as a flash.
        */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {/*
          And, beside it, the listener that keeps what someone types into the
          calculator before the page is interactive. Same reason it has to be
          here: by the time React can run, the field it would read has already
          been overwritten. See src/features/devex/early-input.ts.
        */}
        <script dangerouslySetInnerHTML={{ __html: earlyInputScript }} />
        <SiteChrome locale={locale} skipToContent={skipToContent}>
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}
