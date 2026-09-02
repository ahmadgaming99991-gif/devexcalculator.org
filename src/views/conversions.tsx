import { loadWords } from "@/i18n/server-words";
import { localizedPath } from "@/i18n/locale-path";
import { getTranslator } from "@/i18n/get-dictionary";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Calculator } from "@/features/devex/calculator";
import { CALCULATOR_WORDS } from "@/features/devex/calculator.words";
import { defaultState } from "@/features/devex/url-state";
import { Container, InlineLink, Section } from "@/components/ui";
import {
  EstimateDisclaimer,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
  SourceNote,
} from "@/components/content";
import { AmountTable } from "@/components/content/tables";
import { APPROVED_AMOUNTS, amountPageRoute, computeAmountValues } from "@/lib/content/amount-pages";

const ROUTE = "/conversions/";


export async function ConversionsView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["rates"]);
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("rates.conversions.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="table" jumpLabel={t("rates.conversions.jumpLabel")}>
            {record.quickAnswer}
          </QuickAnswer>

          <Section
            id="converter"
            heading={t("rates.conversions.convertAnyHeading")}
            description={t("rates.conversions.convertAnyDescription")}
          >
            <Calculator locale={locale} words={await loadWords(locale, CALCULATOR_WORDS)}
              initialState={defaultState}
              pathname={localizedPath(locale, ROUTE)}
              lockedMode="quick"
              showHistory={false}
            />
          </Section>

          <Section
            id="table"
            heading={t("rates.conversions.everyAmountHeading")}
            description={t("rates.conversions.everyAmountDescription")}
          >
            <AmountTable locale={locale} t={t} />
            <p className="mt-4 text-sm text-(--color-text-muted)">{" "}{t("rates.conversions.prose.notRoundNumbers")}{" "}</p>
          </Section>

          <Section
            id="detailed"
            heading={t("rates.conversions.fullBreakdownHeading")}
            description={t("rates.conversions.fullBreakdownDescription")}
          >
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {APPROVED_AMOUNTS.map((definition) => {
                const values = computeAmountValues(definition.amount);
                return (
                  <li key={definition.amount}>
                    <Link
                      href={localizedPath(locale, amountPageRoute(definition.amount))}
                      className="flex h-full flex-col rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4 hover:border-(--color-primary) hover:bg-(--color-surface-subtle)"
                    >
                      <span className="font-semibold text-(--color-text)">
                        {values.display} Robux
                      </span>
                      <span className="tabular mt-1 text-lg font-bold text-(--color-primary)">
                        {values.standardUsd}
                      </span>
                      <span className="mt-1 text-xs text-(--color-text-muted)">
                        {values.meetsMinimum
                          ? t("rates.conversions.multipleOfMinimum", {
                              multiple: values.multipleOfMinimum,
                            })
                          : t("rates.conversions.belowMinimum")}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-sm text-(--color-text-muted)">
              {t("rates.conversions.body.detailed.p1")}
            <InlineLink href={localizedPath(locale, "/editorial-policy/")}>{t("rates.conversions.body.detailed.p2")}</InlineLink>
                      .
                    </p>
                  </Section>
        
                  <Section
                    id="rounding"
                    heading={t("rates.conversions.roundingHeading")}
                    description={t("rates.conversions.roundingDescription")}
                  >
                    <p className="text-(--color-text-muted)">
              {t("rates.conversions.body.rounding.p1")}
            <InlineLink href={localizedPath(locale, "/methodology/")}>{t("rates.conversions.fullMethodologyLink")}</InlineLink>.
                    </p>
                  </Section>
        
                  <RelatedLinks locale={locale}
                    record={record}
                    relationships={["parent", "tool", "prerequisite"]}
                    id="related"
                  />
        
                  <EstimateDisclaimer locale={locale} />
                  <SourceNote locale={locale} sourceIds={record.sourceIds} />
                </div>
              </Container>
            </>
  );
}
