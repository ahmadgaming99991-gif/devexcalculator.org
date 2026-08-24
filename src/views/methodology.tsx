import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Container, InlineLink, Section } from "@/components/ui";
import {
  EstimateDisclaimer,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
  SourceNote,
  TableOfContents,
} from "@/components/content";

const ROUTE = "/methodology/";


const FORMULAS: readonly { label: string; formula: string; note: string }[] = [
  {
    label: "Payout from a balance",
    formula: "gross USD = eligible Earned Robux × rate per Robux",
    note: "One multiplication. The rate comes from the validated registry, never from a hardcoded literal in a component.",
  },
  {
    label: "Mixed balance",
    formula: "gross USD = (standard × 0.0038) + (legacy × 0.0035) + (U.S. 18+ × 0.0054)",
    note: "Each bucket is a separate input, so no Robux can be counted under two rates.",
  },
  {
    label: "Blended rate",
    formula: "blended rate = gross USD ÷ total Earned Robux",
    note: "The weighted average across whatever buckets you entered.",
  },
  {
    label: "Optional fees",
    formula: "net before tax = gross − (gross × fee%) − flat fee",
    note: "Applied only when you enter your own figures. Clamped so it can never go below zero.",
  },
  {
    label: "Optional tax estimate",
    formula: "net after estimate = net before tax − (net before tax × your tax%)",
    note: "Tax is applied after fees, using whatever percentage you supply. This site states no tax rate.",
  },
  {
    label: "Reverse target",
    formula: "required Earned Robux = ceiling(target USD ÷ rate per Robux)",
    note: "Always rounds up. Rounding down would leave the payout fractionally short of the target.",
  },
  {
    label: "Local currency",
    formula: "local value = USD value × (EUR→target ÷ EUR→USD)",
    note: "The ECB publishes euro-based rates, so USD cross rates are derived. The division direction is pinned by tests.",
  },
  {
    label: "Marketplace fee",
    formula: "you keep = floor(sale price × creator share%)",
    note: "Rounds down, so a figure shown is never more than you would actually receive.",
  },
];

export async function MethodologyView({ locale }: { readonly locale: Locale }) {
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro="Every formula this site uses, how the arithmetic is done, and where precision is deliberately dropped."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="formulas" jumpLabel="See the formulas">
            {record.quickAnswer}
          </QuickAnswer>

          <TableOfContents locale={locale} sections={record.sections} />

          <Section
            id="formulas"
            heading="The formulas"
            description="These are the complete set. Nothing on the site calculates a money figure any other way."
          >
            <div className="flex flex-col gap-3">
              {FORMULAS.map((entry) => (
                <div
                  key={entry.label}
                  className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4"
                >
                  <p className="text-sm font-semibold text-(--color-text)">{entry.label}</p>
                  <p className="numeric-display mt-2 text-sm text-(--color-text)">
                    {entry.formula}
                  </p>
                  <p className="mt-2 text-sm text-(--color-text-muted)">{entry.note}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section
            id="arithmetic"
            heading="Why exact arithmetic matters"
            description="This is not pedantry — it is the difference between a figure you can rely on and one that is nearly right."
          >
            <div className="flex flex-col gap-3 text-(--color-text-muted)">
              <p>
                A rate like 0.0038 cannot be represented exactly in binary
                floating point, which is how JavaScript stores ordinary numbers.
                Multiply 17,000 by 0.0054 in a browser console and you get
                91.80000000000001 rather than 91.80. At small amounts that hides
                behind rounding; across a large balance, or a chain of fee and tax
                calculations, the drift compounds.
              </p>
              <p>
                Every money value on this site is held as an exact fraction — a
                pair of arbitrary-precision integers — from the moment a rate is
                read until the moment a figure is printed. Addition,
                multiplication and division are exact throughout. Nothing is
                rounded partway, so a total always equals the sum of the parts
                shown above it.
              </p>
              <p>
                The same approach handles very large balances. Robux counts are
                stored as arbitrary-precision integers rather than as
                double-precision numbers, so a ten-figure balance stays exact
                rather than losing its last digits.
              </p>
            </div>
          </Section>

          <Section
            id="rounding"
            heading="Rounding policy"
            description="Precision is dropped exactly once, and the direction is chosen deliberately in each case."
          >
            <ul className="flex flex-col gap-3 text-(--color-text-muted)">
              <li>
                <strong className="text-(--color-text)">Money rounds half-up</strong> to the
                currency&rsquo;s own minor units — two decimal places for dollars, none
                for yen or won.
              </li>
              <li>
                <strong className="text-(--color-text)">Required Robux round up.</strong>{" "}
                Rounding to nearest would sometimes return a figure that falls
                short of the target you asked for.
              </li>
              <li>
                <strong className="text-(--color-text)">Marketplace shares round down.</strong>{" "}
                Better to under-promise what you keep than to show a figure a
                Robux above what arrives.
              </li>
              <li>
                <strong className="text-(--color-text)">Intermediate values are never rounded.</strong>{" "}
                Rounding a subtotal and then using it would let a displayed total
                disagree with its own breakdown.
              </li>
            </ul>
          </Section>

          <Section
            id="currency"
            heading="Local-currency estimates"
            description="Secondary to the USD figure, and labelled as what they are."
          >
            <div className="flex flex-col gap-3 text-(--color-text-muted)">
              <p>
                The DevEx rate is denominated in US dollars, so every calculation
                is performed in USD and converted afterwards. Conversion uses
                European Central Bank euro reference rates, published once each
                working day at around 16:00 CET.
              </p>
              <p>
                Because those rates are euro-based, a USD cross rate is derived:
                the euro rate for the target currency divided by the euro rate for
                the dollar. Every converted figure displays the provider and the
                date the rates were observed.
              </p>
              <p>
                These are reference rates. No bank trades at them. Your payment
                provider will apply its own rate with a margin, so treat a
                converted figure as an indication of scale rather than a
                prediction.{" "}
                <InlineLink href="/devex-fees-and-taxes/">
                  More on currency conversion and fees
                </InlineLink>
                .
              </p>
              <p>
                If the provider is unreachable, a stored snapshot is shown and
                explicitly labelled stale. A stale rate is never presented as
                current, and the USD calculation never depends on the provider
                being available.
              </p>
            </div>
          </Section>

          <Section
            id="limits"
            heading="What this cannot tell you"
            description="The honest boundary of what arithmetic can establish."
          >
            <ul className="flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
              <li>
                Which of your Robux Roblox counts as Earned Robux. That is
                Roblox&rsquo;s internal accounting and is not visible from outside.
              </li>
              <li>
                How your balance divides between the standard, legacy and
                conditional rates. The split calculator models whatever division
                you supply; it cannot discover the real one.
              </li>
              <li>Whether a request will be approved, or when it will be paid.</li>
              <li>What your bank or payment provider will charge.</li>
              <li>What you owe in tax.</li>
            </ul>
          </Section>

          <EstimateDisclaimer locale={locale} />

          <RelatedLinks locale={locale}
            record={record}
            relationships={["sibling", "prerequisite", "next-step"]}
            heading="Related pages"
            id="related"
          />

          <SourceNote locale={locale} sourceIds={record.sourceIds} />
        </div>
      </Container>
    </>
  );
}
