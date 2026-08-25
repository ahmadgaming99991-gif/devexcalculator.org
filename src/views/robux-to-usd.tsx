import { loadWords } from "@/i18n/client-words";
import { getTranslator } from "@/i18n/get-dictionary";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Calculator } from "@/features/devex/calculator";
import { CALCULATOR_WORDS } from "@/features/devex/calculator.words";
import { parseCalculatorState } from "@/features/devex/url-state";
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

const ROUTE = "/robux-to-usd/";


export async function RobuxToUsdView({
  locale,
  searchParams,
}: {
  readonly locale: Locale;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslator(locale, ["rates"]);
  const record = await localizedRoute(locale, ROUTE);
  const initialState = parseCalculatorState(await searchParams);

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
          <QuickAnswer locale={locale} jumpTo="two-answers" jumpLabel="Why there are two answers">
            {record.quickAnswer}
          </QuickAnswer>

          <Calculator words={await loadWords(locale, CALCULATOR_WORDS)} initialState={initialState} pathname={ROUTE} lockedMode="quick" />

          <TableOfContents locale={locale} sections={record.sections} />

          <Section
            id="two-answers"
            heading="Why there are two answers"
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
              There is no single number that is true for every package, country
              and platform, so quoting one would be inventing a figure. Check the
              current prices on{" "}
              <SourceLink t={t} href="https://www.roblox.com/upgrades/robux">{t("rates.robuxToUsd.body.twoAnswers.p6")}</SourceLink>{" "}
              for what you would actually pay.
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
                    <Th>Buying Robux</Th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <Th scope="row">Direction</Th>
                    <Td>{t("rates.robuxToUsd.comparison.directionPayout")}</Td>
                    <Td>You pay Roblox</Td>
                  </tr>
                  <tr>
                    <Th scope="row">Rate</Th>
                    <Td>{t("rates.robuxToUsd.comparison.ratePayout")}</Td>
                    <Td>{t("rates.robuxToUsd.comparison.ratePurchase")}</Td>
                  </tr>
                  <tr>
                    <Th scope="row">Which Robux</Th>
                    <Td>{t("rates.robuxToUsd.comparison.whichRobuxPayout")}</Td>
                    <Td>{t("rates.robuxToUsd.comparison.whichRobuxPurchase")}</Td>
                  </tr>
                  <tr>
                    <Th scope="row">Minimum</Th>
                    <Td>30,000 Earned Robux</Td>
                    <Td>{t("rates.robuxToUsd.comparison.minimumPurchase")}</Td>
                  </tr>
                  <tr>
                    <Th scope="row">Approval</Th>
                    <Td>{t("rates.robuxToUsd.comparison.speedPayout")}</Td>
                    <Td>Instant</Td>
                  </tr>
                  <tr>
                    <Th scope="row">Reversible</Th>
                    <Td>{t("rates.robuxToUsd.comparison.reversiblePayout")}</Td>
                    <Td>{t("rates.robuxToUsd.comparison.reversiblePurchase")}</Td>
                  </tr>
                </tbody>
              </Table>
            </TableWrapper>

            <p className="mt-4 text-sm text-(--color-text-muted)">
              The gap between the two exists because Roblox operates a platform,
              handles payment processing, and has already taken its 30% share at
              the point the Robux were spent.{" "}
              <InlineLink href="/robux-tax-calculator/">{t("rates.robuxToUsd.body.comparison.p2")}</InlineLink>
              , and it is not charged again at cash-out.
            </p>
          </Section>

          <Section
            id="formula"
            heading={t("rates.robuxToUsd.formulaHeading")}
            description={t("rates.robuxToUsd.formulaDescription")}
          >
            <FormulaBlock />
          </Section>

          <Section
            id="amounts"
            heading={t("rates.robuxToUsd.commonAmountsHeading")}
            description={t("rates.robuxToUsd.commonAmountsDescription")}
          >
            <AmountTable t={t} />
            <p className="mt-3 text-sm text-(--color-text-muted)">
              <InlineLink href="/conversions/">{t("rates.robuxToUsd.body.amounts.p1")}</InlineLink>{" "}
              for more amounts and detail.
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
