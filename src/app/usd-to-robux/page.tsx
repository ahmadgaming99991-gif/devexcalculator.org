import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Calculator } from "@/features/devex/calculator";
import { parseCalculatorState } from "@/features/devex/url-state";
import { Callout, Container, InlineLink, Section, Table, TableWrapper, Td, Th } from "@/components/ui";
import {
  EstimateDisclaimer,
  FAQAccordion,
  MethodologyNote,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
  SourceNote,
  TableOfContents,
} from "@/components/content";
import { Rational } from "@/lib/calculations/rational";
import { getRateValue, minimumEarnedRobux } from "@/lib/calculations/rate-registry";
import { standardRateId } from "@/lib/calculations/devex";
import { formatCurrency, formatRobux } from "@/lib/calculations/format";

const ROUTE = "/usd-to-robux/";

export const metadata: Metadata = buildMetadata(ROUTE);

/** Worked targets, computed through the engine so the table cannot drift. */
const TARGETS = [50, 100, 114, 250, 500, 1_000, 5_000, 10_000] as const;

export default async function UsdToRobuxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const record = requireRoute(ROUTE);
  const initialState = parseCalculatorState(await searchParams);
  const rate = getRateValue(standardRateId);

  const rows = TARGETS.map((target) => {
    const targetUsd = Rational.fromInt(target);
    const exact = targetUsd.div(rate);
    const required = exact.ceilToBigInt();
    const belowMinimum = required < BigInt(minimumEarnedRobux);
    return {
      target,
      targetUsd,
      exact,
      required,
      belowMinimum,
      effective: belowMinimum ? BigInt(minimumEarnedRobux) : required,
    };
  });

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs route={ROUTE} />
        <PageHeader
          record={record}
          intro="Set the payout you are aiming for and see exactly how many eligible Earned Robux it takes to get there."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer jumpTo="rounding" jumpLabel="Why the answer rounds up">
            {record.quickAnswer}
          </QuickAnswer>

          <Calculator initialState={initialState} pathname={ROUTE} lockedMode="target" />

          <TableOfContents sections={record.sections} />

          <Section
            id="rounding"
            heading="Why the answer rounds up"
            description="Rounding down would leave you a fraction of a cent short of your own target, every time."
          >
            <div className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4">
              <p className="numeric-display text-sm text-(--color-text)">
                required Earned Robux = ceiling( target USD ÷ rate per Robux )
              </p>
              <p className="mt-3 text-sm text-(--color-text-muted)">
                A 1,000 dollar target divided by 0.0038 gives 263,157.89. Robux
                come in whole units, so 263,157 would pay{" "}
                {formatCurrency(Rational.of(263_157n).mul(rate), "USD")} — just
                under the target. Rounding up to 263,158 pays{" "}
                {formatCurrency(Rational.of(263_158n).mul(rate), "USD")}, which
                clears it. That is why every figure on this page rounds up rather
                than to the nearest whole number.
              </p>
              <MethodologyNote className="mt-3" />
            </div>
          </Section>

          <Section
            id="minimum"
            heading="The minimum still applies"
            description="Arithmetic and eligibility are two different constraints, and the larger one wins."
          >
            <Callout tone="warning" title="A small target does not mean a small cash-out">
              Roblox requires {formatRobux(minimumEarnedRobux)} Earned Robux
              before a DevEx request can be submitted at all. If your target
              needs fewer than that, the minimum is what you actually have to
              reach — and it would pay{" "}
              {formatCurrency(Rational.fromInt(minimumEarnedRobux).mul(rate), "USD")}{" "}
              rather than your original target.{" "}
              <a href="/devex-requirements/">See the full requirements</a>.
            </Callout>
          </Section>

          <Section
            id="examples"
            heading="Common payout targets"
            description="Each row is computed with the same formula the calculator uses."
          >
            <TableWrapper label="Earned Robux required for common payout targets">
              <Table caption="Eligible Earned Robux needed to reach common USD payout targets at the standard DevEx rate">
                <thead>
                  <tr>
                    <Th>Target payout</Th>
                    <Th numeric>Exact division</Th>
                    <Th numeric>Earned Robux needed</Th>
                    <Th>Minimum applies?</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.target}>
                      <Th scope="row">{formatCurrency(row.targetUsd, "USD")}</Th>
                      <Td numeric className="text-(--color-text-muted)">
                        {row.exact.toFixed(2)}
                      </Td>
                      <Td numeric className="font-semibold">
                        {formatRobux(row.required)}
                      </Td>
                      <Td>
                        {row.belowMinimum ? (
                          <span className="text-(--color-warning)">
                            Yes — you would need {formatRobux(row.effective)}
                          </span>
                        ) : (
                          <span className="text-(--color-text-muted)">No</span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
          </Section>

          <Section
            id="buying-robux"
            heading="This is not about buying Robux"
            description="The reverse direction has a very different answer depending on who is asking."
          >
            <p className="text-(--color-text-muted)">
              This page answers the creator question: how much do I need to earn
              to receive a given amount of money. It does not tell you how many
              Robux a given amount of money will buy. Roblox prices Robux
              packages by region, platform and promotion, and there is no single
              rate that would be true for everyone — so this site does not
              publish one.{" "}
              <InlineLink href="/robux-to-usd/">
                The distinction is explained in full on the Robux to USD page
              </InlineLink>
              .
            </p>
          </Section>

          <FAQAccordion faqs={record.faqs} heading="Questions about payout targets" />

          <RelatedLinks
            record={record}
            relationships={["sibling", "prerequisite", "next-step"]}
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
