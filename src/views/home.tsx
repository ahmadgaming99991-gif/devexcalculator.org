import { loadWords } from "@/i18n/server-words";
import { localizedPath } from "@/i18n/locale-path";
import { getTranslator } from "@/i18n/get-dictionary";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { Calculator } from "@/features/devex/calculator";
import { CALCULATOR_WORDS } from "@/features/devex/calculator.words";
import { defaultState } from "@/features/devex/url-state";
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


export async function HomeView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["calculator", "rates", "routes"]);
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="wide">
        <PageHeader locale={locale}
          record={record}
          intro={t("calculator.home.intro")}
        />

        <div className="flex flex-col gap-10">
          <Calculator locale={locale} words={await loadWords(locale, CALCULATOR_WORDS)} initialState={defaultState} pathname={ROUTE} />

          <QuickAnswer locale={locale} jumpTo="how-it-works" jumpLabel={t("calculator.home.jumpLabel")}>
            {record.quickAnswer}
          </QuickAnswer>

          <EarnedRobuxNote locale={locale} />

          <Section
            id="how-it-works"
            heading={t("routes.home.sections.how-it-works")}
            description={t("calculator.home.formulaOpen")}
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <FormulaBlock t={t} />
              <div className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4">
                <p className="text-sm font-semibold text-(--color-text)">{t("calculator.home.body.howItWorks.p1")}</p>
                <p className="mt-2 text-sm text-(--color-text-muted)">{t("calculator.home.body.howItWorks.p2")}</p>
                <MethodologyNote locale={locale} className="mt-3" />
              </div>
            </div>
          </Section>

          <Section
            id="current-rates"
            heading={t("routes.home.sections.current-rates")}
            description={t("calculator.home.threeRates")}
          >
            <RateTable t={t} />
            <p className="mt-3 text-sm text-(--color-text-muted)">
              <InlineLink href={localizedPath(locale, "/devex-rates/")}>{t("calculator.home.body.currentRates.p1")}</InlineLink>
              , or{" "}
              <InlineLink href={localizedPath(locale, "/devex-rate-history/")}>{t("calculator.home.body.currentRates.p2")}</InlineLink>
              .
            </p>
          </Section>

          <Section
            id="earned-robux"
            heading={t("routes.home.sections.earned-robux")}
            description={t("calculator.home.earnedRobuxMatters")}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4">
                <p className="font-semibold text-(--color-success)">{t("calculator.home.generallyQualifies")}{" "}</p>
                <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-(--color-text-muted)">
                  <li>{t("calculator.home.qualifies.developerProducts")}</li>
                  <li>{t("calculator.home.qualifies.passesAndServers")}{" "}</li>
                  <li>{t("calculator.home.qualifies.avatarItems")}</li>
                </ul>
              </div>
              <div className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4">
                <p className="font-semibold text-(--color-warning)">{t("calculator.home.generallyDoesNot")}</p>
                <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-(--color-text-muted)">
                  <li>{t("calculator.home.doesNot.purchased")}</li>
                  <li>{t("calculator.home.doesNot.giftCards")}{" "}</li>
                  <li>{t("calculator.home.doesNot.trades")}{" "}</li>
                </ul>
              </div>
            </div>
            <p className="mt-3 text-sm text-(--color-text-muted)">
              {t("calculator.home.body.earnedRobux.p1")}
            <InlineLink href={localizedPath(locale, "/earned-robux/")}>{t("calculator.home.body.earnedRobux.p2")}</InlineLink>
                      .
                    </p>
                  </Section>
        
                  <Section
                    id="popular-amounts"
                    heading={t("calculator.home.commonAmountsHeading")}
                    description={t("calculator.home.commonAmountsDescription")}
                  >
                    <AmountTable locale={locale} t={t} />
                    <p className="mt-3 text-sm text-(--color-text-muted)">
                      <InlineLink href={localizedPath(locale, "/conversions/")}>{t("calculator.home.body.popularAmounts.p1")}</InlineLink>
                      .
                    </p>
                  </Section>
        
                  <Section
                    id="requirements"
                    heading={t("rates.requirements.requirementsHeading")}
                    description={t("calculator.home.meetingAllNote")}
                  >
                    <RequirementsList t={t} />
                    <p className="mt-3 text-sm text-(--color-text-muted)">
                      <InlineLink href={localizedPath(locale, "/devex-requirements/")}>{t("calculator.home.body.requirements.p1")}</InlineLink>{" "}
                      ·{" "}
                      <InlineLink href={localizedPath(locale, "/how-to-cash-out-robux/")}>{t("routes.home.links.howToCashOutRobux")}</InlineLink>
                    </p>
                  </Section>
        
                  <RelatedLinks locale={locale}
                    record={record}
                    relationships={["tool"]}
                    heading={t("calculator.home.relatedCalculators")}
                    id="related-tools"
                  />
        
                  <RelatedLinks locale={locale}
                    record={record}
                    relationships={["child", "next-step"]}
                    heading={t("calculator.home.relatedGuides")}
                    id="related-guides"
                  />
        
                  <FAQAccordion locale={locale} faqs={record.faqs} />
        
                  <LimitationsNote locale={locale}
                    items={[
                      t("calculator.home.cannot.eligibility"),
                      t("calculator.home.cannot.approval"),
                      t("calculator.home.cannot.providerFees"),
                      t("calculator.home.cannot.tax"),
                      t("calculator.home.cannot.retailPrice"),
                    ]}
                  />
        
                  <EstimateDisclaimer locale={locale} />
        
                  <SourceNote locale={locale} sourceIds={record.sourceIds} />
        
                  <p className="text-sm text-(--color-text-muted)">
              {t("calculator.home.body.relatedGuides.p1")}
            <Link href={localizedPath(locale, "/corrections/")} className="text-(--color-primary) underline">{t("calculator.home.body.relatedGuides.p2")}</Link>
                    .
                  </p>
                </div>
              </Container>
            </>
  );
}
