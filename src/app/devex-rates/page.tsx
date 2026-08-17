import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Container, InlineLink, Section, Table, TableWrapper, Td, Th } from "@/components/ui";
import {
  DefinitionBlock,
  EstimateDisclaimer,
  FAQAccordion,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
  SourceNote,
  TableOfContents,
} from "@/components/content";
import { RateTable } from "@/components/content/tables";
import { allRates, getRateValue } from "@/lib/calculations/rate-registry";
import { standardRateId } from "@/lib/calculations/devex";
import { Rational } from "@/lib/calculations/rational";
import { formatCurrency, formatDate, formatRobux } from "@/lib/calculations/format";

const ROUTE = "/devex-rates/";

export const metadata: Metadata = buildMetadata(ROUTE);

const EXAMPLE_AMOUNTS = [1_000, 30_000, 100_000, 1_000_000] as const;

export default function DevexRatesPage() {
  const record = requireRoute(ROUTE);
  const standard = getRateValue(standardRateId);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs route={ROUTE} />
        <PageHeader
          record={record}
          intro="What Roblox pays per eligible Earned Robux, when each rate applies, and what the September 2025 change was actually worth."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer jumpTo="current-rates" jumpLabel="See the full rate table">
            {record.quickAnswer}
          </QuickAnswer>

          <TableOfContents sections={record.sections} />

          <Section
            id="current-rates"
            heading="The three documented rates"
            description="All three come from the same official Roblox documentation, checked on the date shown above."
          >
            <RateTable />
          </Section>

          <Section
            id="examples"
            heading="What each rate pays"
            description="The same amounts valued under each rate, so the difference is concrete rather than abstract."
          >
            <TableWrapper label="Worked examples for each DevEx rate">
              <Table caption="Payout for common Earned Robux amounts under each documented DevEx rate">
                <thead>
                  <tr>
                    <Th>Earned Robux</Th>
                    {allRates.map((rate) => (
                      <Th key={rate.id} numeric>
                        {rate.shortLabel}
                      </Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {EXAMPLE_AMOUNTS.map((amount) => (
                    <tr key={amount}>
                      <Th scope="row">{formatRobux(amount)}</Th>
                      {allRates.map((rate) => (
                        <Td key={rate.id} numeric className={rate.status === "active" ? "font-semibold" : ""}>
                          {formatCurrency(
                            Rational.fromInt(amount).mul(Rational.fromDecimalString(rate.usdPerRobux)),
                            "USD",
                          )}
                        </Td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
            <p className="mt-3 text-sm text-[--color-text-muted]">
              <InlineLink href="/">Use the calculator for any other amount</InlineLink>, or{" "}
              <InlineLink href="/conversions/">browse more amounts in the conversion hub</InlineLink>.
            </p>
          </Section>

          <Section
            id="which-applies"
            heading="Which rate applies to your balance"
            description="This is the part most explanations get wrong: it is not a choice."
          >
            <div className="flex flex-col gap-3">
              {allRates.map((rate) => (
                <DefinitionBlock key={rate.id} term={rate.label}>
                  {rate.eligibilitySummary}
                  {rate.conditionNote ? (
                    <span className="mt-2 block font-medium text-[--color-text]">
                      {rate.conditionNote}
                    </span>
                  ) : null}
                </DefinitionBlock>
              ))}
            </div>
            <p className="mt-4 text-sm text-[--color-text-muted]">
              A single balance can span more than one rate — Robux earned before
              and after the September 2025 transition are treated separately, and
              Roblox cashes the older portion out first.{" "}
              <InlineLink href="/">
                The split calculator models a mixed balance
              </InlineLink>
              .
            </p>
          </Section>

          <Section
            id="difference"
            heading="Compare the rates for your amount"
            description="Enter any amount on the calculator to see all three side by side."
          >
            <div className="rounded-[--radius-control] border border-[--color-border] bg-[--color-surface] p-4">
              <p className="text-sm text-[--color-text-muted]">
                The gap between the current and legacy rates is{" "}
                {formatCurrency(
                  Rational.fromInt(100_000).mul(standard).sub(
                    Rational.fromInt(100_000).mul(getRateValue("legacy-pre-2025-09-05")),
                  ),
                  "USD",
                )}{" "}
                per 100,000 Earned Robux — about 8.6% more under the current rate.
                The conditional U.S. 18+ rate pays roughly 42% more than the
                standard rate on the portion of a balance that qualifies for it.
              </p>
              <p className="mt-3">
                <InlineLink href="/">Open the calculator and compare your own amount</InlineLink>
              </p>
            </div>
          </Section>

          <Section
            id="changes"
            heading="Rates can change"
            description="They have before, and this page records only what is currently documented."
          >
            <p className="text-[--color-text-muted]">
              Roblox moved the standard rate from 0.0035 to 0.0038 on{" "}
              {formatDate("2025-09-05T10:00:00-07:00")}. There is no way to know
              from outside Roblox whether or when it will change again, so this
              page makes no forecast. What it does record is the date every
              figure here was last checked against the official documentation,
              shown at the top of the page and in the{" "}
              <InlineLink href="/sources/">source registry</InlineLink>.
            </p>
            <p className="mt-3 text-[--color-text-muted]">
              <InlineLink href="/devex-rate-history/">
                See the dated history of rate changes
              </InlineLink>{" "}
              ·{" "}
              <InlineLink href="/changelog/">
                See when this site last updated its data
              </InlineLink>
            </p>
          </Section>

          <FAQAccordion faqs={record.faqs} heading="Questions about DevEx rates" />

          <RelatedLinks
            record={record}
            relationships={["child", "sibling", "prerequisite", "next-step"]}
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
