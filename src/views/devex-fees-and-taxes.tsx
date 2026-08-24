import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Calculator } from "@/features/devex/calculator";
import { parseCalculatorState } from "@/features/devex/url-state";
import { ButtonLink, Callout, Container, InlineLink, Section } from "@/components/ui";
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
import { ShareSplit, ValueFlow } from "@/components/diagrams";
import { getMarketplaceScheme } from "@/lib/calculations/rate-registry";

const ROUTE = "/devex-fees-and-taxes/";


export async function FeesAndTaxesView({
  locale,
  searchParams,
}: {
  readonly locale: Locale;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const record = await localizedRoute(locale, ROUTE);
  const initialState = parseCalculatorState(await searchParams);
  // Read rather than written into the diagram: the split is a published figure
  // and belongs in the registry with the rest of them.
  const inExperience = getMarketplaceScheme("in-experience");

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro="Three separate things sit between the DevEx conversion and the money reaching your account. None of them is the DevEx rate."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="three-layers" jumpLabel="See what each one is">
            {record.quickAnswer}
          </QuickAnswer>

          <Callout tone="warning" title="This page is not tax advice">
            Nothing here tells you what you owe. Tax depends on where you live,
            your circumstances and your total income, and this site has no way of
            knowing any of that. The estimator below uses whatever percentage you
            enter so you can model your own situation. For an actual answer,
            speak to a qualified adviser in your country.
          </Callout>

          <TableOfContents locale={locale} sections={record.sections} />

          <Section
            id="three-layers"
            heading="Three separate deductions"
            description="They apply in sequence, and confusing them is how creators end up with a number that is badly wrong."
          >
            <ValueFlow
              className="mb-6"
              caption="Each stage is a different party taking a different kind of cut, in this order. Roblox sets none of them, and this site publishes a figure for none of them."
              stages={[
                {
                  label: "DevEx payout",
                  detail:
                    "What the documented rate produces from your eligible Earned Robux. This is the figure the calculator estimates.",
                  by: "Roblox",
                  tone: "primary",
                },
                {
                  label: "Payment-provider fee",
                  detail:
                    "Often a percentage plus a fixed amount, charged for delivering the money.",
                  by: "your payment provider",
                  tone: "warning",
                },
                {
                  label: "Currency conversion",
                  detail:
                    "Applied only if you are paid in something other than US dollars, at their rate plus a margin.",
                  by: "whoever converts it",
                  tone: "warning",
                },
                {
                  label: "Income tax",
                  detail:
                    "A payout is income. What applies, and when, depends on your country and your circumstances.",
                  by: "your tax authority",
                  tone: "warning",
                },
                {
                  label: "What reaches you",
                  detail:
                    "Lower than the estimate above, by an amount only your own provider and tax position can tell you.",
                  tone: "success",
                },
              ]}
            />

            <div className="flex flex-col gap-3">
              <DefinitionBlock term="1. Payment-provider fees">
                Whatever service delivers the money may charge for doing so —
                often a percentage plus a fixed amount per payout. This is
                between you and that provider; Roblox does not set it and neither
                does this site.
              </DefinitionBlock>
              <DefinitionBlock term="2. Currency conversion">
                The DevEx rate is stated in US dollars. If you are paid in
                another currency, someone converts it, and they apply their own
                rate plus a margin. That margin is why your bank&rsquo;s figure will
                not match a reference rate.
              </DefinitionBlock>
              <DefinitionBlock term="3. Income tax">
                A DevEx payout is income. How much tax applies, and when, depends
                entirely on your country and your circumstances. Roblox requires a
                W-9 or W-8 precisely because this is taxable.
              </DefinitionBlock>
            </div>
          </Section>

          <Section
            id="fees"
            heading="Payment-provider fees"
            description="The one deduction you can find out in advance, and probably should."
          >
            <p className="text-(--color-text-muted)">
              Fee structures vary by provider, country and payout method, so this
              page does not publish a table of them — any figure would be out of
              date or wrong for most readers. Check what your own provider
              charges before you submit a request, then enter that figure in the
              calculator below to see it applied. On a small payout a fixed fee
              can be a noticeable share of the total; on a large one the
              percentage matters more.
            </p>
          </Section>

          <Section
            id="currency"
            heading="Currency conversion"
            description="Why the figure on this site and the figure in your account differ."
          >
            <p className="text-(--color-text-muted)">
              Local-currency estimates here use European Central Bank reference
              rates, published once each working day. They are a reference, not a
              quote: no bank trades at them. Your provider will apply its own
              rate, usually with a margin built in, so treat a converted figure
              here as an indication of scale rather than a prediction of what
              lands in your account.{" "}
              <InlineLink href="/methodology/">
                How the conversion is calculated
              </InlineLink>
              .
            </p>
          </Section>

          <Section
            id="tax"
            heading="Income tax"
            description="The part this site deliberately will not answer for you."
          >
            <p className="text-(--color-text-muted)">
              There is no universal percentage, and publishing one would be
              actively harmful — a creator in one country could plan around a
              figure that is wrong for them by a factor of two. What this site
              does instead is let you enter your own estimate and see it applied
              to the real payout figure, so the arithmetic is done for you even
              though the rate is yours.
            </p>
            <p className="mt-3 text-(--color-text-muted)">
              A practical note that is not advice: the tax is generally owed on
              the income, not on what is left after fees, and it is usually owed
              in the year the payout is received rather than the year the Robux
              were earned. Confirm both with someone qualified.
            </p>
          </Section>

          <Section
            id="estimator"
            heading="Model your own figures"
            description="Open the fee and tax controls below the currency selector and enter your own percentages."
          >
            <Calculator initialState={initialState} pathname={ROUTE} lockedMode="quick" showHistory={false} />
          </Section>

          <Section
            id="not-the-marketplace-fee"
            heading="Not to be confused with the marketplace fee"
            description="The 30% platform commission is a different thing at a different point in time."
          >
            <ShareSplit
              className="mb-4"
              total="100 Robux spent by a player inside your experience"
              caption="The split happens when the player spends, long before DevEx is involved. Percentages come from the rate registry, not from this drawing."
              parts={[
                {
                  label: "to you, as Earned Robux",
                  percent: inExperience.creatorSharePercent,
                  tone: "success",
                  note: "This is the balance DevEx later converts.",
                },
                {
                  label: "platform commission",
                  percent: inExperience.platformSharePercent,
                  tone: "neutral",
                  note: "Taken once, here — not again at cash-out.",
                },
              ]}
            />

            <p className="text-(--color-text-muted)">
              Roblox takes 30% when a player spends Robux in your experience —
              you receive 70%, and that 70% is what becomes Earned Robux. DevEx
              then converts those Earned Robux. The commission is not applied a
              second time at cash-out, and any calculator that subtracts 30%
              from a DevEx payout is double-counting it.{" "}
              <InlineLink href="/robux-tax-calculator/">
                Work out the marketplace fee separately
              </InlineLink>
              .
            </p>
            <div className="mt-4">
              <ButtonLink href="/robux-tax-calculator/" variant="secondary">
                Open the marketplace fee calculator
              </ButtonLink>
            </div>
          </Section>

          <FAQAccordion locale={locale} faqs={record.faqs} heading="Questions about fees and tax" />

          <RelatedLinks locale={locale}
            record={record}
            relationships={["prerequisite", "sibling", "next-step"]}
            heading="Related pages"
            id="related"
          />

          <EstimateDisclaimer locale={locale} />
          <SourceNote locale={locale} sourceIds={record.sourceIds} />
        </div>
      </Container>
    </>
  );
}
