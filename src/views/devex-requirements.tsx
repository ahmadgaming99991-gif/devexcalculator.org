import { rich } from "@/i18n/rich";
import { loadWords } from "@/i18n/server-words";
import { getTranslator, type Translate } from "@/i18n/get-dictionary";
import { localizedPath } from "@/i18n/locale-path";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ButtonLink, Callout, Container, InlineLink, Section } from "@/components/ui";
import {
  EstimateDisclaimer,
  FAQAccordion,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
  SourceNote,
  TableOfContents,
} from "@/components/content";
import { ThresholdScale } from "@/components/diagrams";
import { RequirementsList } from "@/components/content/tables";
import { minimumEarnedRobux, getRateValue } from "@/lib/calculations/rate-registry";
import { standardRateId } from "@/lib/calculations/devex";
import { Rational } from "@/lib/calculations/rational";
import { formatCurrency, formatRobux } from "@/lib/calculations/format";
import { PreparationChecklist } from "@/features/devex/preparation-checklist";
import { PREPARATION_WORDS } from "@/features/devex/preparation-checklist.words";

const ROUTE = "/devex-requirements/";


const MISUNDERSTANDINGS = (t: Translate): readonly { claim: string; reality: string }[] => [
  {
    claim: t("rates.requirements.misunderstandings.minimum10k.claim"),
    reality: t("rates.requirements.misunderstandings.minimum10k.reality"),
  },
  {
    claim: t("rates.requirements.misunderstandings.anyBalance.claim"),
    reality: t("rates.requirements.misunderstandings.anyBalance.reality"),
  },
  {
    claim: t("rates.requirements.misunderstandings.reaching30k.claim"),
    reality: t("rates.requirements.misunderstandings.reaching30k.reality"),
  },
  {
    claim: t("rates.requirements.misunderstandings.age18.claim"),
    reality: t("rates.requirements.misunderstandings.age18.reality"),
  },
];

export async function RequirementsView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["calculator", "rates"]);
  const record = await localizedRoute(locale, ROUTE);
  const minimumPayout = Rational.fromInt(minimumEarnedRobux).mul(getRateValue(standardRateId));

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("rates.requirements.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="requirements" jumpLabel={t("rates.requirements.jumpLabel")}>
            {record.quickAnswer}
          </QuickAnswer>

          <TableOfContents locale={locale} sections={record.sections} />

          <Section id="requirements" heading={t("rates.requirements.requirementsHeading")}>
            <RequirementsList t={t} />
          </Section>

          <Section
            id="minimum"
            heading={t("rates.requirements.minimumHeading", {
              robux: formatRobux(t.locale, minimumEarnedRobux),
            })}
            description={t("rates.requirements.minimumDescription")}
          >
            <ThresholdScale
              className="mb-6"
              thresholdLabel={t("rates.requirements.thresholdLabel", {
                robux: formatRobux(t.locale, minimumEarnedRobux),
              })}
              below={t("rates.requirements.threshold.below")}
              above={t("rates.requirements.threshold.above")}
              caption={t("rates.requirements.minimumDiagramCaption")}
            />

            <div className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4">
              <p className="text-(--color-text-muted)">
                {t("rates.requirements.body.minimum.p1", {
                  minimumEarnedRobux: formatRobux(t.locale, minimumEarnedRobux),
                })}
              <strong className="text-(--color-text)">
                            {formatCurrency(t.locale, minimumPayout, "USD")}
                          </strong>{" "}
                          before any payment-provider fees or tax.
                        </p>
                        <p className="mt-3 text-(--color-text-muted)">
                          {rich(t("rates.requirements.prose.earnedOnly"), {
                            earned: <em>{t("common.units.earnedWord")}</em>,
                            earnedRobuxLink: (
                              <InlineLink href={localizedPath(locale, "/earned-robux/")}>
                                {t("common.callouts.earnedRobuxOnlyLink")}
                              </InlineLink>
                            ),
                          })}
                        </p>
                        <div className="mt-4">
                          <ButtonLink href="/">{t("rates.requirements.checkBalanceLink")}</ButtonLink>
                        </div>
                      </div>
                    </Section>
          
                    <Section
                      id="not-approval"
                      heading={t("rates.requirements.notApprovalHeading")}
                      description={t("rates.requirements.notApprovalDescription")}
                    >
                      <Callout tone="warning" title={t("rates.requirements.numberCannotApproveTitle")}>{t("rates.requirements.body.notApproval.p1")}</Callout>
                    </Section>
          
                    <Section
                      id="checklist"
                      heading={t("rates.requirements.checklistHeading")}
                      description={t("rates.requirements.checklistDescription")}
                    >
                      <noscript>
                        {/*
                          The list without scripting. Identical wording to the interactive
                          version, because the content is the point and the ticking is a
                          convenience on top of it.
                        */}
                        <ol className="flex list-decimal flex-col gap-3 pl-5 text-(--color-text-muted)">
                          <li>
                {t("rates.requirements.body.checklist.p1", {
                  minimumEarnedRobux: formatRobux(t.locale, minimumEarnedRobux),
                })}
              </li>
                <li>{t("rates.requirements.checklist.verifyEmail")}</li>
                <li>{t("rates.requirements.checklist.portalAccount")}</li>
                <li>{t("rates.requirements.body.checklist.p2")}</li>
                <li>{t("rates.requirements.body.checklist.p3")}</li>
                <li>
                  {t("rates.requirements.body.checklist.p4")}
                <InlineLink href="/devex-fees-and-taxes/">{t("calculator.preparation.feesLink")}</InlineLink>
                              .
                            </li>
                          </ol>
                        </noscript>
            
                        <PreparationChecklist
                          words={await loadWords(locale, PREPARATION_WORDS)}
                          earnedRobuxHref={localizedPath(locale, "/earned-robux/")}
                          feesHref={localizedPath(locale, "/devex-fees-and-taxes/")}
                        />
                      </Section>
            
                      <Section
                        id="misunderstandings"
                        heading={t("rates.requirements.misunderstandingsHeading")}
                        description={t("rates.requirements.misunderstandingsDescription")}
                      >
                        <div className="flex flex-col gap-3">
                          {MISUNDERSTANDINGS(t).map((item) => (
                            <div
                              key={item.claim}
                              className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4"
                            >
                              <p className="text-sm font-semibold text-(--color-warning)">
                                &ldquo;{item.claim}&rdquo;
                              </p>
                              <p className="mt-1.5 text-sm text-(--color-text-muted)">{item.reality}</p>
                            </div>
                          ))}
                        </div>
                      </Section>
            
                      <FAQAccordion locale={locale} faqs={record.faqs} heading={t("rates.requirements.faqsHeading")} />
            
                      <RelatedLinks locale={locale}
                        record={record}
                        relationships={["prerequisite", "sibling", "next-step"]}
                        id="related"
                      />
            
                      <EstimateDisclaimer locale={locale} />
                      <SourceNote locale={locale} sourceIds={record.sourceIds} />
                    </div>
                  </Container>
                </>
  );
}
