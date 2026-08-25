import { localizedPath } from "@/i18n/locale-path";
import { rich } from "@/i18n/rich";
import { contextDescription, contextFigureLabel } from "@/i18n/data-text";
import { getTranslator, type Translate } from "@/i18n/get-dictionary";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import {
  Badge,
  Callout,
  Card,
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
import {
  getQuote,
  REQUIRED_ENVIRONMENT,
  STOCK_SYMBOL,
  type QuoteState,
  type QuoteStore,
} from "@/lib/platform/market-data";

const ROUTE = "/platform/stock/";

export async function StockView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["platform"]);
  const record = await localizedRoute(locale, ROUTE);
  const quote = await readQuote();

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
            <QuoteBlock t={t} state={quote} />
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

function QuoteBlock({ state,
  t,
}: { state: QuoteState;
  readonly t: Translate;
}) {
  if (state.status === "ok" || state.status === "last-known") {
    const { quote } = state;
    const lastKnown = state.status === "last-known";
    return (
      <Card>
        <p className="text-sm text-(--color-text-muted)">{quote.symbol}</p>
        <p className="tabular mt-1 text-4xl font-bold text-(--color-text)">
          {quote.currency === "USD" ? "$" : ""}
          {quote.price}
        </p>
        <p className="mt-2 text-sm text-(--color-text-muted)">
          {quote.currency} · as of{" "}
          <time dateTime={quote.asOf}>{quote.asOf.slice(0, 16).replace("T", " ")} UTC</time>
            {t("platform.stock.body.related.p3", {
              providerName: quote.providerName,
            })}
          </p>
        {lastKnown ? (
          /*
           * Shown, not hidden. The figure above is real and carries the time it
           * was taken, so it is not a stale price passed off as current — but a
           * reader is entitled to know that a newer one was asked for and
           * refused, rather than being left to infer it from the timestamp.
           */
          <p className="mt-3 text-sm text-(--color-text-muted)">
            <Badge tone="warning">{t("platform.stock.notLatestBadge")}</Badge>
              {t("platform.stock.notLatestBody", {
                reason: state.reason,
              })}
            </p>
        ) : null}
      </Card>
    );
  }

  if (state.status === "unavailable") {
    return (
      <Callout tone="warning" title={t("platform.stock.providerSilentTitle")}>
        {t("platform.stock.providerSilentBody", {
          reason: state.reason,
        })}
      </Callout>
    );
  }

  return (
    <Callout tone="info" title={t("platform.stock.noPriceConfiguredTitle")}>
      <p>{t("platform.stock.noPriceConfiguredBody")}</p>
      <p className="mt-2">
        {rich(t("platform.stock.prose.onlyConfiguration"), {
          missing: state.missing.map((name, index) => (
            <span key={name}>
              {index > 0 ? t("platform.stock.andSeparator") : ""}
              <code className="rounded bg-(--color-surface-subtle) px-1">{name}</code>
            </span>
          )),
        })}
      </p>
    </Callout>
  );
}

/**
 * Reads the provider configuration from the Worker environment where there is
 * one, falling back to the process environment so a local run behaves the same.
 */
async function readQuote(): Promise<QuoteState> {
  let env: Record<string, string | undefined> = process.env;
  let store: QuoteStore | undefined;

  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true });
    const cloudflareEnv = context.env as Record<string, unknown>;
    env = { ...process.env, ...(cloudflareEnv as Record<string, string | undefined>) };
    // The same namespace the platform history uses. A quote is one small key
    // beside it rather than a second namespace to provision and forget.
    const binding = cloudflareEnv.PLATFORM_HISTORY;
    if (binding) store = binding as QuoteStore;
  } catch {
    // No Cloudflare context: a local run. process.env is the whole story, and
    // without a store there is no fallback — which the page states.
  }

  return getQuote(env, store);
}

export { REQUIRED_ENVIRONMENT };
