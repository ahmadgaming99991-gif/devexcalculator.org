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


/** A quote is per-request when configured; unconfigured costs nothing. */
export const revalidate = 0;

export async function StockView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["platform"]);
  const record = await localizedRoute(locale, ROUTE);
  const quote = await readQuote();

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro="Roblox's reported results, and an honest account of why there is no live share price here yet."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="quote" jumpLabel="See what is shown">
            {record.quickAnswer}
          </QuickAnswer>

          <Section id="quote" heading={`${STOCK_SYMBOL} share price`}>
            <QuoteBlock t={t} state={quote} />
          </Section>

          <Section
            id="results"
            heading={t("platform.stock.respondsToHeading")}
            description={companyContext.description}
          >
            <TableWrapper label={t("platform.stock.reportedResultsLabel")}>
              <Table caption={t("platform.stock.reportedResultsCaption")}>
                <thead>
                  <tr>
                    <Th>Measure</Th>
                    <Th>{companyContext.period}</Th>
                    <Th>{companyContext.comparedWith}</Th>
                  </tr>
                </thead>
                <tbody>
                  {companyContext.figures.map((figure) => (
                    <tr key={figure.id}>
                      <Td>{figure.label}</Td>
                      <Td className="tabular">{figure.current}</Td>
                      <Td className="tabular">{figure.previous}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>

            <p className="mt-4 text-(--color-text-muted)">
              Quoted from{" "}
              <SourceLink t={t} href={getSource(companyContext.sourceId).url}>
                {getSource(companyContext.sourceId).title}
              </SourceLink>
              , not recomputed here. A fuller breakdown, including what Roblox pays
              creators each quarter, is on{" "}
              <InlineLink href="/roblox-stats/">{t("platform.stock.payoutStatisticsLink")}</InlineLink>.
            </p>
          </Section>

          <Section id="why" heading={t("platform.stock.noChartHeading")}>
            <p className="text-(--color-text-muted)">
              Sites that show a live Roblox chart are almost always embedding one from a
              market data vendor, which means that vendor&rsquo;s script runs in your
              browser and can see your visit. This site loads no third-party scripts on
              any page, and adding one here would quietly undo that for everyone.
            </p>
            <p className="mt-3 text-(--color-text-muted)">{t("platform.stock.whenConnected")}</p>
            <Callout tone="warning" title={t("platform.stock.notAdviceTitle")}>
              Nothing on this page is a recommendation to buy or sell anything. A
              company&rsquo;s results say nothing about what any individual creator will
              be paid, and the DevEx rate is set by Roblox independently of its share
              price.
            </Callout>
          </Section>

          <Section id="faqs" heading={t("platform.stock.questionsHeading")}>
            <FAQAccordion locale={locale} faqs={record.faqs} />
          </Section>

          <EstimateDisclaimer locale={locale} />
          <RelatedLinks locale={locale}
            record={record}
            relationships={["parent", "sibling", "next-step"]}
            heading="Related pages"
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
          <time dateTime={quote.asOf}>{quote.asOf.slice(0, 16).replace("T", " ")} UTC</time>{" "}
          · via {quote.providerName}, fetched server-side
        </p>
        {lastKnown ? (
          /*
           * Shown, not hidden. The figure above is real and carries the time it
           * was taken, so it is not a stale price passed off as current — but a
           * reader is entitled to know that a newer one was asked for and
           * refused, rather than being left to infer it from the timestamp.
           */
          <p className="mt-3 text-sm text-(--color-text-muted)">
            <Badge tone="warning">{t("platform.stock.notLatestBadge")}</Badge>{" "}
            This is the most recent quote this site received. {state.reason} The
            price above is unchanged from when it was taken; nothing has been
            adjusted to look current.
          </p>
        ) : null}
      </Card>
    );
  }

  if (state.status === "unavailable") {
    return (
      <Callout tone="warning" title={t("platform.stock.providerSilentTitle")}>
        {state.reason} No figure is shown in its place. A stale price presented as
        current would be worse than none.
      </Callout>
    );
  }

  return (
    <Callout tone="info" title={t("platform.stock.noPriceConfiguredTitle")}>
      <p>{t("platform.stock.noPriceConfiguredBody")}</p>
      <p className="mt-2">
        The page is already wired for a provider. What is missing is only
        configuration:{" "}
        {state.missing.map((name, index) => (
          <span key={name}>
            {index > 0 ? " and " : ""}
            <code className="rounded bg-(--color-surface-subtle) px-1">{name}</code>
          </span>
        ))}
        . The reported results below are what a share price responds to, and they are
        published either way.
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
