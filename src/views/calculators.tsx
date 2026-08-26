import { getTranslator, type Translate } from "@/i18n/get-dictionary";
import { localizedPath } from "@/i18n/locale-path";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import Link from "next/link";
import { getRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Container, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, SourceNote } from "@/components/content";

const ROUTE = "/calculators/";


/**
 * Directory of working tools.
 *
 * Only complete, shipped calculators appear here. There is no "coming soon"
 * entry: listing a tool that does not exist would make the directory a
 * placeholder rather than a directory.
 */
const TOOLS = (t: Translate): readonly { route: string; answers: string; useWhen: string }[] => [
  {
    route: "/",
    answers: t("guides.calculators.tools.devex.answers"),
    useWhen: t("guides.calculators.tools.devex.useWhen"),
  },
  {
    route: "/robux-to-usd/",
    answers: t("guides.calculators.tools.robuxToUsd.answers"),
    useWhen: t("guides.calculators.tools.robuxToUsd.useWhen"),
  },
  {
    route: "/usd-to-robux/",
    answers: t("guides.calculators.tools.usdToRobux.answers"),
    useWhen: t("guides.calculators.tools.usdToRobux.useWhen"),
  },
  {
    route: "/robux-tax-calculator/",
    answers: t("guides.calculators.tools.robuxTax.answers"),
    useWhen: t("guides.calculators.tools.robuxTax.useWhen"),
  },
];

export async function CalculatorsView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["guides", "routes"]);
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("guides.calculators.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale}>{record.quickAnswer}</QuickAnswer>

          <Section id="tools" heading={t("guides.calculators.availableHeading")}>
            <ul className="grid gap-4 sm:grid-cols-2">
              {TOOLS(t).map((tool) => {
                const target = getRoute(tool.route);
                if (!target) return null;
                return (
                  <li key={tool.route}>
                    <Link
                      href={localizedPath(locale, tool.route)}
                      className="flex h-full flex-col rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-5 hover:border-(--color-primary) hover:bg-(--color-surface-subtle)"
                    >
                      <span className="text-lg font-semibold text-(--color-text)">
                        {target.navLabel}
                      </span>
                      <span className="mt-2 text-sm font-medium text-(--color-primary)">
                        {tool.answers}
                      </span>
                      <span className="mt-2 text-sm text-(--color-text-muted)">
                        {tool.useWhen}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section
            id="conversions"
            heading={t("guides.calculators.lookingUpHeading")}
            description={t("guides.calculators.lookingUpDescription")}
          >
            <Link
              href={localizedPath(locale, "/conversions/")}
              className="inline-flex rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-5 hover:border-(--color-primary)"
            >
              <span>
                <span className="block text-lg font-semibold text-(--color-text)">{t("routes.conversions.h1")}</span>
                <span className="mt-1 block text-sm text-(--color-text-muted)">{t("guides.calculators.body.conversions.p1")}</span>
              </span>
            </Link>
          </Section>

          <Section
            id="guides"
            heading={t("guides.calculators.understandHeading")}
            description={t("guides.calculators.understandDescription")}
          >
            <Link
              href={localizedPath(locale, "/guides/")}
              className="inline-flex rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-5 hover:border-(--color-primary)"
            >
              <span>
                <span className="block text-lg font-semibold text-(--color-text)">
                  DevEx guides
                </span>
                <span className="mt-1 block text-sm text-(--color-text-muted)">{t("guides.calculators.body.guides.p1")}</span>
              </span>
            </Link>
          </Section>

          <SourceNote locale={locale} sourceIds={record.sourceIds} />
        </div>
      </Container>
    </>
  );
}
