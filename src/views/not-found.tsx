import Link from "next/link";
import { getTranslator } from "@/i18n/get-dictionary";
import { localizedPath } from "@/i18n/locale-path";
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
 */
export async function NotFoundView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["errors"]);
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
      <div className="py-8">
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
