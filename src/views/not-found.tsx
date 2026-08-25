"use client";

import Link from "next/link";
import { localizedPath } from "@/i18n/locale-path";
import { useLocale } from "@/components/layout/locale-context";
import { translatorFor, LOCALE_KEY, type LocaleWords } from "@/i18n/client-words";
import { DEFAULT_LOCALE } from "@/i18n/config";
import type { Locale } from "@/i18n/types";
import { Container, ButtonLink } from "@/components/ui";

/**
 * 404 body.
 *
 * Returns a real 404 status (Next.js does that for `not-found.tsx`), stays out
 * of the index, and never redirects to the homepage — a silent redirect hides
 * the broken link from both the reader and from crawl reporting.
 *
 * Every link goes to the same locale the reader was already in, so a wrong
 * address does not also change the language.
 *
 * **A Client Component, unusually for a view.** Next renders `not-found.tsx`
 * with no params, so it cannot be passed a locale the way every other view is.
 * The document around it does know one — it set `<html lang>` — and publishes
 * it through `LocaleProvider`, so the language is decided on the server and
 * the right words are in the HTML from the first byte. Reading the path in the
 * browser was the alternative: it renders English server-side and corrects
 * itself on hydration, which is a flash for everyone and the wrong page for
 * anyone with scripting off.
 *
 * The server sends the copy for every language this build renders because it
 * cannot know which one this request needed — see `src/app/not-found.tsx` for
 * why that cost is acceptable exactly here and nowhere else.
 */

export interface NotFoundCatalogue {
  readonly [locale: string]: LocaleWords;
}

export function LocalizedNotFound({ catalogue }: { readonly catalogue: NotFoundCatalogue }) {
  const documentLocale = useLocale();

  /*
   * The catalogue has the final say on whether that language is one this build
   * actually serves. Falling back to English beats throwing on a missing key:
   * a reader who has already followed a broken link should not then meet an
   * error page that is itself broken.
   */
  const locale: Locale = catalogue[documentLocale] ? documentLocale : DEFAULT_LOCALE;
  const words = catalogue[locale] ?? {};
  const t = translatorFor({ ...words, [LOCALE_KEY]: locale });
  const to = (route: string) => localizedPath(locale, route);

  const popular: readonly { route: string; key: string }[] = [
    { route: "/robux-to-usd/", key: "errors.notFound.popular.robuxToUsd" },
    { route: "/usd-to-robux/", key: "errors.notFound.popular.usdToRobux" },
    { route: "/devex-requirements/", key: "errors.notFound.popular.requirements" },
    { route: "/conversions/", key: "errors.notFound.popular.conversions" },
    { route: "/guides/", key: "errors.notFound.popular.guides" },
  ];

  return (
    <Container width="prose">
      <div className="py-8" lang={locale === DEFAULT_LOCALE ? undefined : locale}>
        <p className="text-sm font-semibold uppercase tracking-wide text-(--color-text-muted)">
          {t("errors.notFound.eyebrow")}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-(--color-text)">
          {t("errors.notFound.title")}
        </h1>
        <p className="mt-3 text-(--color-text-muted)">{t("errors.notFound.body")}</p>

        <div className="mt-6 flex flex-wrap gap-2">
          <ButtonLink href={to("/")}>{t("errors.notFound.goToCalculator")}</ButtonLink>
          <ButtonLink href={to("/devex-rates/")} variant="secondary">
            {t("errors.notFound.currentRates")}
          </ButtonLink>
        </div>

        <h2 className="mt-8 text-lg font-semibold text-(--color-text)">
          {t("errors.notFound.popularHeading")}
        </h2>
        <ul className="mt-3 flex flex-col gap-2 text-(--color-primary)">
          {popular.map((entry) => (
            <li key={entry.route}>
              <Link href={to(entry.route)} className="underline underline-offset-2">
                {t(entry.key)}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
