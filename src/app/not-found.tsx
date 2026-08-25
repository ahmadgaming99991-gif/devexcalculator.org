import "./globals.css";
import type { Metadata } from "next";
import { SiteChrome } from "@/components/layout/site-document";
import { getTranslator } from "@/i18n/get-dictionary";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { NotFoundBody } from "@/views/not-found-body";

/**
 * The 404 the whole site actually uses.
 *
 * It has to live here, at the root of `app/`, and this is the fix for a real
 * bug: with two root layouts there is no `app/layout.tsx`, and a
 * `not-found.tsx` inside a route group is only reached by a `notFound()` call
 * from inside that group. An unmatched URL matches no group at all, so every
 * 404 on the site — English included — was being answered by Next's own
 * unstyled default. The branded page existed and nothing ever rendered it.
 *
 * **Why the locale is chosen in the browser.** Next renders `not-found.tsx`
 * with no params and no route match, so the server cannot be told which
 * language `/de/nope/` was asking for. The path is the only evidence, and the
 * only place the path is available is `usePathname`. So the server sends the
 * 404 copy for every language this build renders and a Client Component picks
 * the one the URL names.
 *
 * That is a cost — several languages of one small namespace — and it is paid
 * only here. This page is `noindex`, it is not in the sitemap, and nothing
 * links to it, so the bytes reach a reader only when they have already
 * followed a broken link. The bundle validator measures the shared chunks, so
 * if this ever leaks into the pages that are indexed, the build says so.
 *
 * The chrome around it stays in English. The header and footer are Server
 * Components that need a locale before the path is known, and a page that
 * renders its shell twice to correct itself is worse than one that admits the
 * navigation is English while the message is not.
 */

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default async function NotFound() {
  const t = await getTranslator(DEFAULT_LOCALE, ["common"]);

  return (
    <SiteChrome locale={DEFAULT_LOCALE} skipToContent={t("common.shell.skipToContent")}>
      <NotFoundBody />
    </SiteChrome>
  );
}
