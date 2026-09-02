import { localizedPath } from "@/i18n/locale-path";
import { rich } from "@/i18n/rich";
import { loadWords } from "@/i18n/server-words";
import { getTranslator } from "@/i18n/get-dictionary";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Calculator } from "@/features/devex/calculator";
import { CALCULATOR_WORDS } from "@/features/devex/calculator.words";
import { defaultState } from "@/features/devex/url-state";
import { Callout, Container, InlineLink, Section, SourceLink, Table, TableWrapper, Td, Th } from "@/components/ui";
import {
  EstimateDisclaimer,
  FAQAccordion,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
  SourceNote,
  TableOfContents,
} from "@/components/content";
import { AmountTable, FormulaBlock } from "@/components/content/tables";
import { formatRobux } from "@/lib/calculations/format";
import { minimumEarnedRobux } from "@/lib/calculations/rate-registry";

const ROUTE = "/robux-to-usd/";


export async function RobuxToUsdView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["rates"]);
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("rates.robuxToUsd.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="two-answers" jumpLabel={t("rates.robuxToUsd.jumpLabel")}>
            {record.quickAnswer}
          </QuickAnswer>

          <Calculator locale={locale} words={await loadWords(locale, CALCULATOR_WORDS)} initialState={defaultState} pathname={localizedPath(locale, ROUTE)} lockedMode="quick" />

          <TableOfContents locale={locale} sections={record.sections} />

          <Section
            id="two-answers"
            heading={t("rates.robuxToUsd.twoAnswersHeading")}
            description={t("rates.robuxToUsd.twoAnswersDescription")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-(--radius-control) border border-(--color-border) border-l-4 border-l-(--color-primary) bg-(--color-surface) p-4">
                <p className="font-semibold text-(--color-text)">{t("rates.robuxToUsd.body.twoAnswers.p1")}</p>
                <p className="mt-2 text-sm text-(--color-text-muted)">{t("rates.robuxToUsd.body.twoAnswers.p2")}</p>
              </div>
              <div className="rounded-(--radius-control) border border-(--color-border) border-l-4 border-l-(--color-secondary) bg-(--color-surface) p-4">
                <p className="font-semibold text-(--color-text)">{t("rates.robuxToUsd.body.twoAnswers.p3")}</p>
                <p className="mt-2 text-sm text-(--color-text-muted)">{t("rates.robuxToUsd.body.twoAnswers.p4")}</p>
              </div>
            </div>

            <Callout tone="warning" title={t("rates.robuxToUsd.noUniversalRateTitle")} className="mt-4">
              {t("rates.robuxToUsd.body.twoAnswers.p5")}
            <SourceLink t={t} href="https://www.roblox.com/upgrades/robux">{t("rates.robuxToUsd.body.twoAnswers.p6")}</SourceLink>
              {t("rates.robuxToUsd.body.twoAnswers.p7")}
            </Callout>
          </Section>

          <Section
            id="comparison"
            heading={t("rates.robuxToUsd.payoutVsPriceHeading")}
            description={t("rates.robuxToUsd.payoutVsPriceDescription")}
          >
            <TableWrapper label={t("rates.robuxToUsd.differencesLabel")}>
              <Table caption={t("rates.robuxToUsd.differencesCaption")}>
                <thead>
                  <tr>
                    <Th>&nbsp;</Th>
                    <Th>{t("rates.robuxToUsd.comparison.creatorPayout")}</Th>
                    <Th>{t("rates.robuxToUsd.comparison.columnBuying")}</Th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <Th scope="row">{t("rates.robuxToUsd.comparison.rowDirection")}</Th>
                    <Td>{t("rates.robuxToUsd.comparison.directionPayout")}</Td>
                    <Td>{t("rates.robuxToUsd.comparison.directionPurchase")}</Td>
                  </tr>
                  <tr>
                    <Th scope="row">{t("rates.robuxToUsd.comparison.rowRate")}</Th>
                    <Td>{t("rates.robuxToUsd.comparison.ratePayout")}</Td>
                    <Td>{t("rates.robuxToUsd.comparison.ratePurchase")}</Td>
                  </tr>
                  <tr>
                    <Th scope="row">{t("rates.robuxToUsd.comparison.rowWhichRobux")}</Th>
                    <Td>{t("rates.robuxToUsd.comparison.whichRobuxPayout")}</Td>
                    <Td>{t("rates.robuxToUsd.comparison.whichRobuxPurchase")}</Td>
                  </tr>
                  <tr>
                    <Th scope="row">{t("rates.robuxToUsd.comparison.rowMinimum")}</Th>
                    <Td>
                      {t("rates.robuxToUsd.comparison.minimumPayout", {
                        robux: formatRobux(t.locale, minimumEarnedRobux),
                      })}
                    </Td>
                    <Td>{t("rates.robuxToUsd.comparison.minimumPurchase")}</Td>
                  </tr>
                  <tr>
                    <Th scope="row">{t("rates.robuxToUsd.comparison.rowApproval")}</Th>
                    <Td>{t("rates.robuxToUsd.comparison.speedPayout")}</Td>
                    <Td>{t("rates.robuxToUsd.comparison.speedPurchase")}</Td>
                  </tr>
                  <tr>
                    <Th scope="row">{t("rates.robuxToUsd.comparison.rowReversible")}</Th>
                    <Td>{t("rates.robuxToUsd.comparison.reversiblePayout")}</Td>
                    <Td>{t("rates.robuxToUsd.comparison.reversiblePurchase")}</Td>
                  </tr>
                </tbody>
              </Table>
            </TableWrapper>

            <p className="mt-4 text-sm text-(--color-text-muted)">
              {rich(t("rates.robuxToUsd.prose.commissionOnce"), {
                marketplaceCalculator: (
                  <InlineLink href={localizedPath(locale, "/robux-tax-calculator/")}>
                    {t("rates.robuxToUsd.body.comparison.p2")}
                  </InlineLink>
                ),
              })}
            </p>
                  </Section>
        
                  <Section
                    id="formula"
                    heading={t("rates.robuxToUsd.formulaHeading")}
                    description={t("rates.robuxToUsd.formulaDescription")}
                  >
                    <FormulaBlock t={t} />
                  </Section>
        
                  <Section
                    id="amounts"
                    heading={t("rates.robuxToUsd.commonAmountsHeading")}
                    description={t("rates.robuxToUsd.commonAmountsDescription")}
                  >
                    <AmountTable locale={locale} t={t} />
                    <p className="mt-3 text-sm text-(--color-text-muted)">
                      <InlineLink href={localizedPath(locale, "/conversions/")}>{t("rates.robuxToUsd.body.amounts.p1")}</InlineLink>
              {t("rates.robuxToUsd.body.amounts.p2")}
            </p>
          </Section>

          <FAQAccordion locale={locale} faqs={record.faqs} heading={t("rates.robuxToUsd.faqsHeading")} />

          <RelatedLinks locale={locale}
            record={record}
            relationships={["sibling", "next-step", "prerequisite"]}
            id="related"
          />

          <EstimateDisclaimer locale={locale} />
          <SourceNote locale={locale} sourceIds={record.sourceIds} />
        </div>
      </Container>
    </>
  );
}
