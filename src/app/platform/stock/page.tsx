import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import {
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
} from "@/lib/platform/market-data";

const ROUTE = "/platform/stock/";

export const metadata: Metadata = buildMetadata(ROUTE);

/** A quote is per-request when configured; unconfigured costs nothing. */
export const revalidate = 0;

export default async function StockPage() {
  const record = requireRoute(ROUTE);
  const quote = await readQuote();

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs route={ROUTE} />
        <PageHeader
          record={record}
          intro="Roblox's reported results, and an honest account of why there is no live share price here yet."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer jumpTo="quote" jumpLabel="See what is shown">
            {record.quickAnswer}
          </QuickAnswer>

          <Section id="quote" heading={`${STOCK_SYMBOL} share price`}>
            <QuoteBlock state={quote} />
          </Section>

          <Section
            id="results"
            heading="What the price responds to"
            description={companyContext.description}
          >
            <TableWrapper label="Roblox reported results">
              <Table caption="Roblox's reported results for the most recent quarter, against the same quarter a year earlier.">
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
              <SourceLink href={getSource(companyContext.sourceId).url}>
                {getSource(companyContext.sourceId).title}
              </SourceLink>
              , not recomputed here. A fuller breakdown, including what Roblox pays
              creators each quarter, is on{" "}
              <InlineLink href="/roblox-stats/">the payout statistics page</InlineLink>.
            </p>
          </Section>

          <Section id="why" heading="Why there is no embedded chart">
            <p className="text-(--color-text-muted)">
              Sites that show a live Roblox chart are almost always embedding one from a
              market data vendor, which means that vendor&rsquo;s script runs in your
              browser and can see your visit. This site loads no third-party scripts on
              any page, and adding one here would quietly undo that for everyone.
            </p>
            <p className="mt-3 text-(--color-text-muted)">
              When a provider is connected it will be read server-side and rendered as
              plain HTML, so the price arrives the same way every other figure on this
              site does: fetched by the server, attributed, and dated.
            </p>
            <Callout tone="warning" title="Not investment advice">
              Nothing on this page is a recommendation to buy or sell anything. A
              company&rsquo;s results say nothing about what any individual creator will
              be paid, and the DevEx rate is set by Roblox independently of its share
              price.
            </Callout>
          </Section>

          <Section id="faqs" heading="Questions">
            <FAQAccordion faqs={record.faqs} />
          </Section>

          <EstimateDisclaimer />
          <RelatedLinks
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

function QuoteBlock({ state }: { state: QuoteState }) {
  if (state.status === "ok") {
    const { quote } = state;
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
      </Card>
    );
  }

  if (state.status === "unavailable") {
    return (
      <Callout tone="warning" title="The price provider did not answer">
        {state.reason} No figure is shown in its place. A stale price presented as
        current would be worse than none.
      </Callout>
    );
  }

  return (
    <Callout tone="info" title="No live price is configured">
      <p>
        This site will not print a share price it cannot fetch and attribute, and it
        will not embed a third-party widget to borrow one.
      </p>
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
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true });
    env = { ...process.env, ...(context.env as Record<string, string | undefined>) };
  } catch {
    // No Cloudflare context: a local run. process.env is the whole story.
  }
  return getQuote(env);
}

export { REQUIRED_ENVIRONMENT };
