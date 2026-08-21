import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Calculator } from "@/features/devex/calculator";
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

// This route has its own `opengraph-image`; the convention supplies the card.
export const metadata: Metadata = buildMetadata(ROUTE, { inheritImage: true });

export default async function RobuxToUsdPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const record = requireRoute(ROUTE);
  const initialState = parseCalculatorState(await searchParams);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs route={ROUTE} />
        <PageHeader
          record={record}
          intro="Two different questions hide behind the same search. This page answers both separately rather than blending them into one misleading number."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer jumpTo="two-answers" jumpLabel="Why there are two answers">
            {record.quickAnswer}
          </QuickAnswer>

          <Calculator initialState={initialState} pathname={ROUTE} lockedMode="quick" />

          <TableOfContents sections={record.sections} />

          <Section
            id="two-answers"
            heading="Why there are two answers"
            description="Asking what Robux are worth in dollars only has one answer once you say which direction the money is travelling."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-(--radius-control) border border-(--color-border) border-l-4 border-l-(--color-primary) bg-(--color-surface) p-4">
                <p className="font-semibold text-(--color-text)">
                  Money coming out — creator payout
                </p>
                <p className="mt-2 text-sm text-(--color-text-muted)">
                  You earned Robux from players spending in your experience, and
                  you want to convert them to cash. That goes through DevEx at a
                  documented rate, and it is what the calculator above
                  estimates. It applies only to eligible Earned Robux, and only
                  from 30,000 upward.
                </p>
              </div>
              <div className="rounded-(--radius-control) border border-(--color-border) border-l-4 border-l-(--color-secondary) bg-(--color-surface) p-4">
                <p className="font-semibold text-(--color-text)">
                  Money going in — purchase price
                </p>
                <p className="mt-2 text-sm text-(--color-text-muted)">
                  You want to know what a Robux package costs. Roblox sets that
                  price by package, region, platform and any promotion running at
                  the time. It is a retail price, not an exchange rate, and it
                  moves independently of what DevEx pays.
                </p>
              </div>
            </div>

            <Callout tone="warning" title="Why this site publishes no universal purchase rate" className="mt-4">
              There is no single number that is true for every package, country
              and platform, so quoting one would be inventing a figure. Check the
              current prices on{" "}
              <SourceLink href="https://www.roblox.com/upgrades/robux">
                the official Roblox Robux page
              </SourceLink>{" "}
              for what you would actually pay.
            </Callout>
          </Section>

          <Section
            id="comparison"
            heading="Creator payout compared with purchase price"
            description="The two numbers are different by design, and the gap is not a fee anyone is charging you."
          >
            <TableWrapper label="How creator payout and purchase price differ">
              <Table caption="Differences between a DevEx creator payout and a Robux retail purchase">
                <thead>
                  <tr>
                    <Th>&nbsp;</Th>
                    <Th>Creator payout (DevEx)</Th>
                    <Th>Buying Robux</Th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <Th scope="row">Direction</Th>
                    <Td>Roblox pays you</Td>
                    <Td>You pay Roblox</Td>
                  </tr>
                  <tr>
                    <Th scope="row">Rate</Th>
                    <Td>Documented and fixed at 0.0038 USD per eligible Earned Robux</Td>
                    <Td>Varies by package, region, platform and promotion</Td>
                  </tr>
                  <tr>
                    <Th scope="row">Which Robux</Th>
                    <Td>Eligible Earned Robux only</Td>
                    <Td>Any purchase, no eligibility involved</Td>
                  </tr>
                  <tr>
                    <Th scope="row">Minimum</Th>
                    <Td>30,000 Earned Robux</Td>
                    <Td>None beyond the smallest package</Td>
                  </tr>
                  <tr>
                    <Th scope="row">Approval</Th>
                    <Td>Roblox reviews each request</Td>
                    <Td>Instant</Td>
                  </tr>
                  <tr>
                    <Th scope="row">Reversible</Th>
                    <Td>One way — you cannot un-cash-out</Td>
                    <Td>One way — purchased Robux cannot be sold back</Td>
                  </tr>
                </tbody>
              </Table>
            </TableWrapper>

            <p className="mt-4 text-sm text-(--color-text-muted)">
              The gap between the two exists because Roblox operates a platform,
              handles payment processing, and has already taken its 30% share at
              the point the Robux were spent.{" "}
              <InlineLink href="/robux-tax-calculator/">
                That earlier 30% is the marketplace fee
              </InlineLink>
              , and it is not charged again at cash-out.
            </p>
          </Section>

          <Section
            id="formula"
            heading="The conversion formula"
            description="One multiplication, stated openly so you can check it."
          >
            <FormulaBlock />
          </Section>

          <Section
            id="amounts"
            heading="Common amounts"
            description="Calculated at all three documented rates. Amounts below the minimum are marked."
          >
            <AmountTable />
            <p className="mt-3 text-sm text-(--color-text-muted)">
              <InlineLink href="/conversions/">
                Browse the full conversion hub
              </InlineLink>{" "}
              for more amounts and detail.
            </p>
          </Section>

          <FAQAccordion faqs={record.faqs} heading="Questions about converting Robux" />

          <RelatedLinks
            record={record}
            relationships={["sibling", "next-step", "prerequisite"]}
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
