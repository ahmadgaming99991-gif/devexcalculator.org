import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge, Container, InlineLink, Section, Table, TableWrapper, Td, Th } from "@/components/ui";
import {
  EstimateDisclaimer,
  FAQAccordion,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
  SourceNote,
} from "@/components/content";
import { getRateValue } from "@/lib/calculations/rate-registry";
import { legacyRateId, standardRateId } from "@/lib/calculations/devex";
import { Rational } from "@/lib/calculations/rational";
import { formatCurrency, formatDate, formatRobux } from "@/lib/calculations/format";

const ROUTE = "/devex-rate-history/";

export const metadata: Metadata = buildMetadata(ROUTE);

const COMPARISON_AMOUNTS = [30_000, 100_000, 500_000, 1_000_000] as const;

export default function RateHistoryPage() {
  const record = requireRoute(ROUTE);
  const standard = getRateValue(standardRateId);
  const legacy = getRateValue(legacyRateId);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs route={ROUTE} />
        <PageHeader
          record={record}
          intro="A dated record of the rate changes this site has verified against official documentation — and nothing that has not been."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer jumpTo="timeline" jumpLabel="See the timeline">
            {record.quickAnswer}
          </QuickAnswer>

          <Section
            id="timeline"
            heading="Verified timeline"
            description="Each entry records what changed, when it took effect, and which source establishes it."
          >
            <ol className="flex flex-col gap-4">
              <li className="rounded-[--radius-control] border border-[--color-border] border-l-4 border-l-[--color-success] bg-[--color-surface] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="success">Current</Badge>
                  <span className="text-sm font-semibold text-[--color-text]">
                    {formatDate("2025-09-05T10:00:00-07:00")}, 10:00 PT
                  </span>
                </div>
                <p className="mt-2 font-semibold text-[--color-text]">
                  Standard rate increased to 0.0038 USD per Earned Robux
                </p>
                <p className="mt-1 text-sm text-[--color-text-muted]">
                  Roblox states this as 114 USD for 30,000 Earned Robux, up from
                  105. Balances earned before this moment continue to convert at
                  the previous rate and are cashed out first.
                </p>
              </li>

              <li className="rounded-[--radius-control] border border-[--color-border] border-l-4 border-l-[--color-border-strong] bg-[--color-surface] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">Legacy</Badge>
                  <span className="text-sm font-semibold text-[--color-text]">
                    Until {formatDate("2025-09-05T10:00:00-07:00")}
                  </span>
                </div>
                <p className="mt-2 font-semibold text-[--color-text]">
                  Standard rate of 0.0035 USD per Earned Robux
                </p>
                <p className="mt-1 text-sm text-[--color-text-muted]">
                  105 USD for 30,000 Earned Robux. Still applied to the portion of
                  any balance earned before the transition.
                </p>
              </li>

              <li className="rounded-[--radius-control] border border-[--color-border] border-l-4 border-l-[--color-accent] bg-[--color-surface] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="info">Conditional</Badge>
                  <span className="text-sm font-semibold text-[--color-text]">
                    Effective date not published
                  </span>
                </div>
                <p className="mt-2 font-semibold text-[--color-text]">
                  Higher 0.0054 rate for qualifying U.S. 18+ spending
                </p>
                <p className="mt-1 text-sm text-[--color-text-muted]">
                  Roblox documents this rate for certain Earned Robux from
                  purchases by United States players who have verified they are at
                  least 18. The documentation this site checked does not state an
                  effective date, so none is recorded here rather than one being
                  inferred.
                </p>
              </li>
            </ol>
          </Section>

          <Section
            id="comparison"
            heading="What the change was worth"
            description="The same balances valued before and after the September 2025 increase."
          >
            <TableWrapper label="Payout before and after the September 2025 rate change">
              <Table caption="Comparison of payouts at the legacy 0.0035 rate and the current 0.0038 rate">
                <thead>
                  <tr>
                    <Th>Earned Robux</Th>
                    <Th numeric>At 0.0035</Th>
                    <Th numeric>At 0.0038</Th>
                    <Th numeric>Difference</Th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_AMOUNTS.map((amount) => {
                    const robux = Rational.fromInt(amount);
                    const before = robux.mul(legacy);
                    const after = robux.mul(standard);
                    return (
                      <tr key={amount}>
                        <Th scope="row">{formatRobux(amount)}</Th>
                        <Td numeric className="text-[--color-text-muted]">
                          {formatCurrency(before, "USD")}
                        </Td>
                        <Td numeric className="font-semibold">
                          {formatCurrency(after, "USD")}
                        </Td>
                        <Td numeric className="text-[--color-success]">
                          +{formatCurrency(after.sub(before), "USD")}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrapper>
            <p className="mt-3 text-sm text-[--color-text-muted]">
              The increase is about 8.6% across the board, since it is a change to
              a single multiplier.
            </p>
          </Section>

          <Section
            id="legacy-balances"
            heading="How legacy balances are handled"
            description="One balance can span both rates, and you do not choose the split."
          >
            <p className="text-[--color-text-muted]">
              Roblox cashes out the pre-transition portion of a balance at 0.0035
              first, then the rest at 0.0038. The split is Roblox&rsquo;s own
              accounting of when each Robux was earned — it is not something a
              creator selects or can adjust.{" "}
              <InlineLink href="/">
                The split calculator lets you model a mixed balance
              </InlineLink>{" "}
              if you know roughly how yours divides, but treat the result as an
              estimate built on your own assumption about the split.
            </p>
          </Section>

          <Section
            id="no-forecast"
            heading="Why there is no forecast here"
            description="A page that guesses at future rates would be worse than no page."
          >
            <p className="text-[--color-text-muted]">
              Roblox has changed the rate before and may change it again. Nobody
              outside Roblox knows whether or when, and a prediction dressed up as
              analysis would be a guess with a confident tone. This page records
              only changes that official documentation confirms, each with its
              effective date. When a change happens it appears here and in the{" "}
              <InlineLink href="/changelog/">public changelog</InlineLink>, along
              with the date it was verified.
            </p>
          </Section>

          <FAQAccordion faqs={record.faqs} heading="Questions about past rates" />

          <RelatedLinks
            record={record}
            relationships={["parent", "tool", "next-step"]}
            heading="Related pages"
            id="related"
          />

          <EstimateDisclaimer />
          <SourceNote sourceIds={record.sourceIds} />
        </div>
      </Container>
    </>
  );
}
