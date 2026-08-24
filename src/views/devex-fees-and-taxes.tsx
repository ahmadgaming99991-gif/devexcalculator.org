import { loadWords } from "@/i18n/client-words";
import { getTranslator } from "@/i18n/get-dictionary";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Calculator } from "@/features/devex/calculator";
import { CALCULATOR_WORDS } from "@/features/devex/calculator.words";
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
  const t = await getTranslator(locale, ["rates"]);
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

          <Callout tone="warning" title={t("rates.feesAndTaxes.notTaxAdviceTitle")}>{t("rates.feesAndTaxes.body.intro.p1")}</Callout>

          <TableOfContents locale={locale} sections={record.sections} />

          <Section
            id="three-layers"
            heading={t("rates.feesAndTaxes.threeDeductionsHeading")}
            description="They apply in sequence, and confusing them is how creators end up with a number that is badly wrong."
          >
            <ValueFlow
              className="mb-6"
              caption={t("rates.feesAndTaxes.sequenceCaption")}
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
              <DefinitionBlock term="3. Income tax">{t("rates.feesAndTaxes.body.threeLayers.p1")}</DefinitionBlock>
            </div>
          </Section>

          <Section
            id="fees"
            heading={t("rates.feesAndTaxes.providerFeesHeading")}
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
            heading={t("rates.feesAndTaxes.conversionHeading")}
            description="Why the figure on this site and the figure in your account differ."
          >
            <p className="text-(--color-text-muted)">
              Local-currency estimates here use European Central Bank reference
              rates, published once each working day. They are a reference, not a
              quote: no bank trades at them. Your provider will apply its own
              rate, usually with a margin built in, so treat a converted figure
              here as an indication of scale rather than a prediction of what
              lands in your account.{" "}
              <InlineLink href="/methodology/">{t("rates.feesAndTaxes.body.currency.p2")}</InlineLink>
              .
            </p>
          </Section>

          <Section
            id="tax"
            heading={t("rates.feesAndTaxes.incomeTaxHeading")}
            description="The part this site deliberately will not answer for you."
          >
            <p className="text-(--color-text-muted)">{t("rates.feesAndTaxes.body.tax.p1")}</p>
            <p className="mt-3 text-(--color-text-muted)">{t("rates.feesAndTaxes.body.tax.p2")}</p>
          </Section>

          <Section
            id="estimator"
            heading={t("rates.feesAndTaxes.modelHeading")}
            description="Open the fee and tax controls below the currency selector and enter your own percentages."
          >
            <Calculator words={await loadWords(locale, CALCULATOR_WORDS)} initialState={initialState} pathname={ROUTE} lockedMode="quick" showHistory={false} />
          </Section>

          <Section
            id="not-the-marketplace-fee"
            heading={t("rates.feesAndTaxes.notMarketplaceHeading")}
            description="The 30% platform commission is a different thing at a different point in time."
          >
            <ShareSplit
              className="mb-4"
              total="100 Robux spent by a player inside your experience"
              caption={t("rates.feesAndTaxes.marketplaceDiagramCaption")}
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
              <InlineLink href="/robux-tax-calculator/">{t("rates.feesAndTaxes.body.notTheMarketplaceFee.p2")}</InlineLink>
              .
            </p>
            <div className="mt-4">
              <ButtonLink href="/robux-tax-calculator/" variant="secondary">{t("rates.feesAndTaxes.body.notTheMarketplaceFee.p3")}</ButtonLink>
            </div>
          </Section>

          <FAQAccordion locale={locale} faqs={record.faqs} heading={t("rates.feesAndTaxes.faqsHeading")} />

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
