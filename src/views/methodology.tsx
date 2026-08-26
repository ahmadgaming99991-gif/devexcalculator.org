import { getTranslator, type Translate } from "@/i18n/get-dictionary";
import { localizedPath } from "@/i18n/locale-path";
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
              <p>{" "}{t("trust.methodology.prose.floatingPoint")}{" "}</p>
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
                <strong className="text-(--color-text)">{t("trust.methodology.rounding.moneyHalfUp")}</strong>{" "}{t("trust.methodology.rounding.moneyHalfUpBody")}{" "}</li>
              <li>
                <strong className="text-(--color-text)">{t("trust.methodology.rounding.robuxUp")}</strong>
                  {t("trust.methodology.body.rounding.p1")}
                </li>
              <li>
                <strong className="text-(--color-text)">{t("trust.methodology.rounding.sharesDown")}</strong>
                  {t("trust.methodology.body.rounding.p2")}
                </li>
              <li>
                <strong className="text-(--color-text)">{t("trust.methodology.rounding.intermediateNever")}</strong>
                  {t("trust.methodology.body.rounding.p3")}
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
                {t("trust.methodology.body.currency.p3")}
              <InlineLink href={localizedPath(locale, "/devex-fees-and-taxes/")}>{t("trust.methodology.body.currency.p4")}</InlineLink>
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
                        <li>{" "}{t("trust.methodology.cannot.eligibility")}{" "}</li>
                        <li>{" "}{t("trust.methodology.cannot.split")}{" "}</li>
                        <li>{t("trust.methodology.cannot.approvalOrTiming")}</li>
                        <li>{t("trust.methodology.cannot.providerCharges")}</li>
                        <li>{t("trust.methodology.cannot.taxOwed")}</li>
                      </ul>
                    </Section>
          
                    <EstimateDisclaimer locale={locale} />
          
                    <RelatedLinks locale={locale}
                      record={record}
                      relationships={["sibling", "prerequisite", "next-step"]}
                      id="related"
                    />
          
                    <SourceNote locale={locale} sourceIds={record.sourceIds} />
                  </div>
                </Container>
              </>
  );
}
