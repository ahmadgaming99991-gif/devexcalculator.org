import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Calculator } from "@/features/devex/calculator";
import { parseCalculatorState } from "@/features/devex/url-state";
import { Container, InlineLink, Section } from "@/components/ui";
import {
  EarnedRobuxNote,
  EstimateDisclaimer,
  FAQAccordion,
  LimitationsNote,
  MethodologyNote,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
  SourceNote,
} from "@/components/content";
import {
  AmountTable,
  FormulaBlock,
  RateTable,
  RequirementsList,
} from "@/components/content/tables";

const ROUTE = "/";

export const metadata: Metadata = buildMetadata(ROUTE);

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const record = requireRoute(ROUTE);
  // Parsed and validated on the server so a shared link renders its state into
  // the initial HTML instead of flashing defaults and then correcting itself.
  const initialState = parseCalculatorState(await searchParams);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <PageHeader
          record={record}
          intro="Convert eligible Earned Robux into an estimated US dollar payout using the rates Roblox currently documents, with the source and verification date shown alongside every figure."
        />

        <div className="flex flex-col gap-10">
          <Calculator initialState={initialState} pathname={ROUTE} />

          <QuickAnswer jumpTo="how-it-works" jumpLabel="See how the calculation works">
            {record.quickAnswer}
          </QuickAnswer>

          <EarnedRobuxNote />

          <Section
            id="how-it-works"
            heading="How the calculation works"
            description="Nothing here is hidden. The formula is one multiplication, and you can check it."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <FormulaBlock />
              <div className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4">
                <p className="text-sm font-semibold text-(--color-text)">
                  Why the arithmetic is done exactly
                </p>
                <p className="mt-2 text-sm text-(--color-text-muted)">
                  A rate like 0.0038 cannot be represented exactly in binary
                  floating point, so a naive calculation drifts: 17,000 Robux at
                  the U.S. 18+ rate comes out as 91.80000000000001 rather than
                  91.80. Every figure on this site is computed as an exact
                  fraction and rounded once, at the moment it is displayed.
                </p>
                <MethodologyNote className="mt-3" />
              </div>
            </div>
          </Section>

          <Section
            id="current-rates"
            heading="Current DevEx rates"
            description="Three rates are documented. Roblox decides which applies to which part of a balance."
          >
            <RateTable />
            <p className="mt-3 text-sm text-(--color-text-muted)">
              <InlineLink href="/devex-rates/">
                Full detail on each rate, with effective dates and worked examples
              </InlineLink>
              , or{" "}
              <InlineLink href="/devex-rate-history/">
                see how the rate changed in September 2025
              </InlineLink>
              .
            </p>
          </Section>

          <Section
            id="earned-robux"
            heading="Not every Robux is an Earned Robux"
            description="This is the single most common misunderstanding about DevEx, and it decides whether a payout is possible at all."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4">
                <p className="font-semibold text-(--color-success)">Generally qualifies</p>
                <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-(--color-text-muted)">
                  <li>Robux from players buying developer products in your experience</li>
                  <li>Robux from pass and private server purchases</li>
                  <li>Your share of avatar items you created and sold</li>
                </ul>
              </div>
              <div className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4">
                <p className="font-semibold text-(--color-warning)">Generally does not</p>
                <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-(--color-text-muted)">
                  <li>Robux you bought yourself, at any price</li>
                  <li>Gift card credit and promotional grants</li>
                  <li>Robux received through trades or from other players</li>
                </ul>
              </div>
            </div>
            <p className="mt-3 text-sm text-(--color-text-muted)">
              Roblox makes the final determination for any specific balance.{" "}
              <InlineLink href="/earned-robux/">
                Read the full explanation of Earned Robux
              </InlineLink>
              .
            </p>
          </Section>

          <Section
            id="popular-amounts"
            heading="Common amounts"
            description="Every figure below is calculated at the three documented rates. Amounts under the minimum are shown for reference and marked as such."
          >
            <AmountTable />
            <p className="mt-3 text-sm text-(--color-text-muted)">
              <InlineLink href="/conversions/">
                See the full conversion hub, or convert any amount you like
              </InlineLink>
              .
            </p>
          </Section>

          <Section
            id="requirements"
            heading="What Roblox requires"
            description="Meeting all of these lets you submit a request. It does not guarantee one will be approved."
          >
            <RequirementsList />
            <p className="mt-3 text-sm text-(--color-text-muted)">
              <InlineLink href="/devex-requirements/">
                Full requirements, with the official source for each
              </InlineLink>{" "}
              ·{" "}
              <InlineLink href="/how-to-cash-out-robux/">
                How the cash-out process works
              </InlineLink>
            </p>
          </Section>

          <RelatedLinks
            record={record}
            relationships={["tool"]}
            heading="Related calculators"
            id="related-tools"
          />

          <RelatedLinks
            record={record}
            relationships={["child", "next-step"]}
            heading="Related guides"
            id="related-guides"
          />

          <FAQAccordion faqs={record.faqs} />

          <LimitationsNote
            items={[
              "Whether your Robux count as Earned Robux — Roblox decides that, not this calculator.",
              "Whether a DevEx request will be approved, and how long it will take.",
              "Payment-provider fees and currency spreads, unless you enter your own figures.",
              "Tax owed in your country. Nothing here is tax advice.",
              "The retail price of buying Robux, which is a separate transaction with its own pricing.",
            ]}
          />

          <EstimateDisclaimer />

          <SourceNote sourceIds={record.sourceIds} />

          <p className="text-sm text-(--color-text-muted)">
            Something out of date?{" "}
            <Link href="/corrections/" className="text-(--color-primary) underline">
              Tell us and it gets fixed
            </Link>
            .
          </p>
        </div>
      </Container>
    </>
  );
}
