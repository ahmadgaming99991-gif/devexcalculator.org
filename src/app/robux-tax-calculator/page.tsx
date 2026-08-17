import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { MarketplaceCalculator } from "@/features/marketplace/calculator";
import { Callout, Container, InlineLink, Section, Table, TableWrapper, Td, Th } from "@/components/ui";
import {
  EstimateDisclaimer,
  FAQAccordion,
  LimitationsNote,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
  SourceNote,
  TableOfContents,
} from "@/components/content";
import { getMarketplaceScheme } from "@/lib/calculations/rate-registry";

const ROUTE = "/robux-tax-calculator/";

export const metadata: Metadata = buildMetadata(ROUTE);

export default function RobuxTaxCalculatorPage() {
  const record = requireRoute(ROUTE);
  const progressive = getMarketplaceScheme("marketplace-avatar-item");

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs route={ROUTE} />
        <PageHeader
          record={record}
          intro="Work out what you keep after the Roblox platform commission, or what to charge to clear a target amount."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer jumpTo="schemes" jumpLabel="See which commission applies">
            {record.quickAnswer}
          </QuickAnswer>

          <MarketplaceCalculator />

          <TableOfContents sections={record.sections} />

          <Section
            id="schemes"
            heading="Which commission applies"
            description="Roblox uses different splits depending on what was sold and where it was bought."
          >
            <TableWrapper label="Roblox commission by sale type">
              <Table caption="How Robux from a sale are divided, by sale type">
                <thead>
                  <tr>
                    <Th>Sale type</Th>
                    <Th numeric>Creator</Th>
                    <Th numeric>Experience owner</Th>
                    <Th numeric>Roblox</Th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <Th scope="row">
                      In-experience purchase
                      <span className="mt-1 block text-xs font-normal text-[--color-text-muted]">
                        Developer products, passes, private servers
                      </span>
                    </Th>
                    <Td numeric className="font-semibold">
                      70%
                    </Td>
                    <Td numeric>—</Td>
                    <Td numeric>30%</Td>
                  </tr>
                  <tr>
                    <Th scope="row">
                      Marketplace avatar item
                      <span className="mt-1 block text-xs font-normal text-[--color-text-muted]">
                        Progressive by price — see below
                      </span>
                    </Th>
                    <Td numeric className="font-semibold">
                      30–70%
                    </Td>
                    <Td numeric>—</Td>
                    <Td numeric>30–70%</Td>
                  </tr>
                  <tr>
                    <Th scope="row">
                      Avatar item bought inside an experience
                      <span className="mt-1 block text-xs font-normal text-[--color-text-muted]">
                        Item creator and experience owner are paid separately
                      </span>
                    </Th>
                    <Td numeric className="font-semibold">
                      30%
                    </Td>
                    <Td numeric>40%</Td>
                    <Td numeric>30%</Td>
                  </tr>
                </tbody>
              </Table>
            </TableWrapper>
            <p className="mt-3 text-sm text-[--color-text-muted]">
              If you sell your own item inside your own experience you receive
              both the creator share and the experience owner share, which comes
              to 70%.
            </p>
          </Section>

          <Section
            id="progressive"
            heading="The progressive Marketplace share"
            description="For avatar items sold through the Marketplace, the creator share rises with the item's price relative to its category price floor."
          >
            <TableWrapper label="Progressive Marketplace revenue share tiers">
              <Table caption="Creator revenue share by price as a multiple of the price floor">
                <thead>
                  <tr>
                    <Th>Price ÷ price floor</Th>
                    <Th numeric>Creator share</Th>
                    <Th numeric>Roblox share</Th>
                  </tr>
                </thead>
                <tbody>
                  {(progressive.progressiveTiers ?? []).map((tier) => (
                    <tr key={tier.priceFloorMultiple}>
                      <Th scope="row">
                        {tier.priceFloorMultiple}×
                        {tier.priceFloorMultiple === "6" ? " and above" : ""}
                      </Th>
                      <Td numeric className="font-semibold">
                        {tier.creatorSharePercent}%
                      </Td>
                      <Td numeric>{100 - Number(tier.creatorSharePercent)}%</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>

            <Callout tone="info" title="Why the calculator asks for a multiple" className="mt-4">
              Price floors differ by item category and Roblox has adjusted them
              over time, so hardcoding one universal floor would produce wrong
              answers for most items. Entering the multiple keeps the result
              correct whatever your category&rsquo;s floor happens to be.
            </Callout>
          </Section>

          <Section
            id="scope"
            heading="Scope and exclusions"
            description="What this calculator does and does not cover."
          >
            <LimitationsNote
              items={[
                "Regional pricing adjustments, which change what a player pays without changing your share percentage.",
                "Limited or resale items, where the resale fee structure differs from a first sale.",
                "Group revenue splits agreed between collaborators, which happen after Roblox's commission.",
                "Any promotional or programme-specific rate Roblox may apply to a particular category.",
                "The DevEx conversion, which is a separate step handled by the main calculator.",
              ]}
            />
          </Section>

          <Section
            id="not-devex"
            heading="This is not the DevEx rate"
            description="The two calculations happen at different times and must not be chained."
          >
            <p className="text-[--color-text-muted]">
              The commission on this page applies at the moment a player spends
              Robux. What you keep becomes Earned Robux. DevEx then converts those
              Earned Robux to cash at its own rate, on a balance that has already
              had the commission taken. Subtracting 30% from a DevEx payout
              applies the same fee twice and understates what a creator receives.
            </p>
            <p className="mt-3 text-[--color-text-muted]">
              <InlineLink href="/">
                Convert your Earned Robux to a payout estimate
              </InlineLink>{" "}
              ·{" "}
              <InlineLink href="/devex-fees-and-taxes/">
                What actually comes off a DevEx payout
              </InlineLink>
            </p>
          </Section>

          <FAQAccordion faqs={record.faqs} heading="Questions about the Roblox fee" />

          <RelatedLinks
            record={record}
            relationships={["tool", "sibling", "next-step"]}
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
