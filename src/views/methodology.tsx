import { getTranslator, type Translate } from "@/i18n/get-dictionary";
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


const FORMULAS = (t: Translate): readonly { label: string; formula: string; note: string }[] => [
  {
    label: t("trust.methodology.formulas.payoutTerm"),
    formula: t("trust.methodology.formulas.payoutFormula"),
    note: t("trust.methodology.formulas.payoutDetail"),
  },
  {
    label: t("trust.methodology.formulas.mixedTerm"),
    formula: t("trust.methodology.formulas.mixedFormula"),
    note: t("trust.methodology.formulas.mixedDetail"),
  },
  {
    label: t("trust.methodology.formulas.blendedTerm"),
    formula: t("trust.methodology.formulas.blendedFormula"),
    note: t("trust.methodology.formulas.blendedDetail"),
  },
  {
    label: t("trust.methodology.formulas.feesTerm"),
    formula: t("trust.methodology.formulas.feesFormula"),
    note: t("trust.methodology.formulas.feesDetail"),
  },
  {
    label: t("trust.methodology.formulas.taxTerm"),
    formula: t("trust.methodology.formulas.taxFormula"),
    note: t("trust.methodology.formulas.taxDetail"),
  },
  {
    label: t("trust.methodology.formulas.reverseTerm"),
    formula: t("trust.methodology.formulas.reverseFormula"),
    note: t("trust.methodology.formulas.reverseDetail"),
  },
  {
    label: t("trust.methodology.formulas.currencyTerm"),
    formula: t("trust.methodology.formulas.currencyFormula"),
    note: t("trust.methodology.formulas.currencyDetail"),
  },
  {
    label: t("trust.methodology.formulas.marketplaceTerm"),
    formula: t("trust.methodology.formulas.marketplaceFormula"),
    note: t("trust.methodology.formulas.marketplaceDetail"),
  },
];

export async function MethodologyView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["trust"]);
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("trust.methodology.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="formulas" jumpLabel={t("trust.methodology.jumpLabel")}>
            {record.quickAnswer}
          </QuickAnswer>

          <TableOfContents locale={locale} sections={record.sections} />

          <Section
            id="formulas"
            heading={t("trust.methodology.formulasHeading")}
            description={t("trust.methodology.formulasDescription")}
          >
            <div className="flex flex-col gap-3">
              {FORMULAS(t).map((entry) => (
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
            heading={t("trust.methodology.exactHeading")}
            description={t("trust.methodology.exactDescription")}
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
              <p>{t("trust.methodology.body.arithmetic.p1")}</p>
              <p>{t("trust.methodology.body.arithmetic.p2")}</p>
            </div>
          </Section>

          <Section
            id="rounding"
            heading={t("trust.methodology.roundingHeading")}
            description={t("trust.methodology.roundingDescription")}
          >
            <ul className="flex flex-col gap-3 text-(--color-text-muted)">
              <li>
                <strong className="text-(--color-text)">{t("trust.methodology.rounding.moneyHalfUp")}</strong> to the
                currency&rsquo;s own minor units — two decimal places for dollars, none
                for yen or won.
              </li>
              <li>
                <strong className="text-(--color-text)">{t("trust.methodology.rounding.robuxUp")}</strong>{" "}
                Rounding to nearest would sometimes return a figure that falls
                short of the target you asked for.
              </li>
              <li>
                <strong className="text-(--color-text)">{t("trust.methodology.rounding.sharesDown")}</strong>{" "}
                Better to under-promise what you keep than to show a figure a
                Robux above what arrives.
              </li>
              <li>
                <strong className="text-(--color-text)">{t("trust.methodology.rounding.intermediateNever")}</strong>{" "}
                Rounding a subtotal and then using it would let a displayed total
                disagree with its own breakdown.
              </li>
            </ul>
          </Section>

          <Section
            id="currency"
            heading={t("trust.methodology.currencyHeading")}
            description={t("trust.methodology.currencyDescription")}
          >
            <div className="flex flex-col gap-3 text-(--color-text-muted)">
              <p>{t("trust.methodology.body.currency.p1")}</p>
              <p>{t("trust.methodology.body.currency.p2")}</p>
              <p>
                These are reference rates. No bank trades at them. Your payment
                provider will apply its own rate with a margin, so treat a
                converted figure as an indication of scale rather than a
                prediction.{" "}
                <InlineLink href="/devex-fees-and-taxes/">{t("trust.methodology.body.currency.p4")}</InlineLink>
                .
              </p>
              <p>{t("trust.methodology.body.currency.p5")}</p>
            </div>
          </Section>

          <Section
            id="limits"
            heading={t("trust.methodology.cannotHeading")}
            description={t("trust.methodology.cannotDescription")}
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
              <li>{t("trust.methodology.cannot.approvalOrTiming")}</li>
              <li>{t("trust.methodology.cannot.providerCharges")}</li>
              <li>{t("trust.methodology.cannot.taxOwed")}</li>
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
