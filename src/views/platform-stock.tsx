import { localizedPath } from "@/i18n/locale-path";
import { rich } from "@/i18n/rich";
import { contextDescription, contextFigureLabel } from "@/i18n/data-text";
import { getTranslator } from "@/i18n/get-dictionary";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import {
  Callout,
  Container,
  InlineLink,
  Section,
  SourceLink,
  Table,
  TableWrapper,
  Td,
  Th,
} from "@/components/ui";
import {
  EstimateDisclaimer,
  FAQAccordion,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
} from "@/components/content";
import { companyContext } from "@/lib/platform/metrics";
import { getSource } from "@/lib/calculations/rate-registry";
import { REQUIRED_ENVIRONMENT, STOCK_SYMBOL } from "@/lib/platform/market-data";
import { StockQuote } from "@/components/platform/stock-quote";
import { STOCK_QUOTE_WORDS } from "@/components/platform/stock-quote.words";
import { loadWords } from "@/i18n/server-words";



const ROUTE = "/platform/stock/";

export async function StockView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["platform"]);
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("platform.stock.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="quote" jumpLabel={t("platform.stock.jumpLabel")}>
            {record.quickAnswer}
          </QuickAnswer>

          <Section id="quote" heading={t("platform.stock.quoteHeading", { symbol: STOCK_SYMBOL })}>
            <StockQuote words={await loadWords(locale, STOCK_QUOTE_WORDS)} />
            <noscript>
              <Callout tone="info" title={t("platform.stock.noScriptTitle")}>
                {t("platform.stock.noScriptBody")}
              </Callout>
            </noscript>
          </Section>

          <Section
            id="results"
            heading={t("platform.stock.respondsToHeading")}
            description={contextDescription(t)}
          >
            <TableWrapper label={t("platform.stock.reportedResultsLabel")}>
              <Table caption={t("platform.stock.reportedResultsCaption")}>
                <thead>
                  <tr>
                    <Th>{t("common.columns.measure")}</Th>
                    <Th>{companyContext.period}</Th>
                    <Th>{companyContext.comparedWith}</Th>
                  </tr>
                </thead>
                <tbody>
                  {companyContext.figures.map((figure) => (
                    <tr key={figure.id}>
                      <Td>{contextFigureLabel(t, figure)}</Td>
                      <Td className="tabular">{figure.current}</Td>
                      <Td className="tabular">{figure.previous}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>

            <p className="mt-4 text-(--color-text-muted)">
              {rich(t("platform.stock.prose.notRecomputed"), {
                source: (
                  <SourceLink t={t} href={getSource(companyContext.sourceId).url}>
                    {getSource(companyContext.sourceId).title}
                  </SourceLink>
                ),
                payoutStatistics: (
                  <InlineLink href={localizedPath(locale, "/roblox-stats/")}>
                    {t("platform.stock.payoutStatisticsLink")}
                  </InlineLink>
                ),
              })}
            </p>
                  </Section>
        
                  <Section id="why" heading={t("platform.stock.noChartHeading")}>
                    <p className="text-(--color-text-muted)">{" "}{t("platform.stock.noChartBody")}{" "}</p>
                    <p className="mt-3 text-(--color-text-muted)">{t("platform.stock.whenConnected")}</p>
                    <Callout tone="warning" title={t("platform.stock.notAdviceTitle")}>{" "}{t("platform.stock.notAdviceBody")}{" "}</Callout>
                  </Section>
        
                  <Section id="faqs" heading={t("platform.stock.questionsHeading")}>
                    <FAQAccordion locale={locale} faqs={record.faqs} />
                  </Section>
        
                  <EstimateDisclaimer locale={locale} />
                  <RelatedLinks locale={locale}
                    record={record}
                    relationships={["parent", "sibling", "next-step"]}
                    id="related"
                  />
                </div>
              </Container>
            </>
  );
}

export { REQUIRED_ENVIRONMENT };
