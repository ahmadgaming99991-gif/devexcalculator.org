import { loadWords } from "@/i18n/server-words";
import { localizedPath } from "@/i18n/locale-path";
import { getTranslator } from "@/i18n/get-dictionary";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ButtonLink, Callout, Container, Foreign, InlineLink, Section, SourceLink } from "@/components/ui";
import { GroupSplit } from "@/features/devex/group-split";
import { GROUP_SPLIT_WORDS } from "@/features/devex/group-split.words";
import {
  EstimateDisclaimer,
  FAQAccordion,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
  SourceNote,
  TableOfContents,
} from "@/components/content";
import { ValueFlow } from "@/components/diagrams";
import { minimumEarnedRobux } from "@/lib/calculations/rate-registry";
import { formatRobux } from "@/lib/calculations/format";

const ROUTE = "/how-to-cash-out-robux/";


export async function CashOutView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["guides", "routes"]);
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("guides.cashOut.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="process" jumpLabel={t("guides.cashOut.jumpLabel")}>
            {record.quickAnswer}
          </QuickAnswer>

          <TableOfContents locale={locale} sections={record.sections} />

          <Section
            id="process"
            heading={t("guides.cashOut.processHeading")}
            description={t("guides.cashOut.processDescription")}
          >
            <ValueFlow
              t={t}
              className="mb-6"
              caption={t("guides.cashOut.processDiagramCaption")}
              stages={[
                {
                  label: t("guides.cashOut.steps.reachMinimum"),
                  detail: t("guides.cashOut.steps.reachMinimumDetail", {
                    minimum: formatRobux(t.locale, minimumEarnedRobux),
                  }),
                  tone: "primary",
                },
                {
                  label: t("guides.cashOut.steps.meetRequirements"),
                  detail: t("guides.cashOut.steps.meetRequirementsDetail"),
                  tone: "primary",
                },
                {
                  label: t("guides.cashOut.steps.submitPortal"),
                  detail: t("guides.cashOut.steps.submitPortalDetail"),
                  tone: "primary",
                },
                {
                  label: t("guides.cashOut.steps.robloxReviews"),
                  detail: t("guides.cashOut.steps.robloxReviewsDetail"),
                  by: t("guides.cashOut.steps.robloxReviewsBy"),
                  tone: "warning",
                  decision: true,
                },
                {
                  label: t("guides.cashOut.steps.paymentIssued"),
                  detail: t("guides.cashOut.steps.paymentIssuedDetail"),
                  tone: "success",
                },
              ]}
            />

            <ol className="flex list-decimal flex-col gap-4 pl-5 text-(--color-text-muted)">
              <li>
                <strong className="text-(--color-text)">
                  {t("guides.cashOut.body.process.p1", {
                    minimumEarnedRobux: formatRobux(t.locale, minimumEarnedRobux),
                  })}
                </strong>
                  {t("guides.cashOut.body.process.p2")}
                <InlineLink href={localizedPath(locale, "/earned-robux/")}>{t("guides.cashOut.body.process.p3")}</InlineLink>
                            .
                          </li>
                          <li>
                            <strong className="text-(--color-text)">{t("guides.cashOut.list.meetRequirements")}</strong>
                  {t("guides.cashOut.body.process.p4")}
                <InlineLink href={localizedPath(locale, "/devex-requirements/")}>{t("guides.cashOut.list.fullListLink")}</InlineLink>.
                          </li>
                          <li>
                            <strong className="text-(--color-text)">{t("guides.cashOut.list.submitPortal")}</strong>
                  {t("guides.cashOut.body.process.p5")}
                <SourceLink t={t} href="https://create.roblox.com/docs/production/monetization/developer-exchange">
                              <Foreign>Roblox Creator Hub DevEx documentation</Foreign>
                            </SourceLink>
                            {". "}
                            {t("guides.cashOut.body.where.nowhereElse")}
                          </li>
                          <li>
                            <strong className="text-(--color-text)">{t("guides.cashOut.list.robloxReviews")}</strong>
                  {t("guides.cashOut.body.process.p6")}
                </li>
              <li>
                <strong className="text-(--color-text)">{t("guides.cashOut.list.paymentIssued")}</strong>
                  {t("guides.cashOut.body.process.p7")}
                <InlineLink href={localizedPath(locale, "/devex-fees-and-taxes/")}>{t("guides.cashOut.body.process.p8")}</InlineLink>
                            .
                          </li>
                        </ol>
            
                        <div className="mt-6">
                          <ButtonLink href={localizedPath(locale, "/")}>{t("routes.howToCashOutRobux.links.home")}</ButtonLink>
                        </div>
                      </Section>
            
                      <Section
                        id="checklist"
                        heading={t("guides.cashOut.prepareHeading")}
                        description={t("guides.cashOut.prepareDescription")}
                      >
                        <ul className="flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
                          <li>{t("guides.cashOut.prepare.emailVerified")}</li>
                          <li>{t("guides.cashOut.prepare.portalSignIn")}</li>
                          <li>{t("guides.cashOut.prepare.taxForm")}</li>
                          <li>{t("guides.cashOut.prepare.nameMatches")}</li>
                          <li>{t("guides.cashOut.prepare.paymentMethod")}</li>
                          <li>{t("guides.cashOut.body.checklist.p1")}</li>
                        </ul>
                      </Section>
            
                      <Section
                        id="timing"
                        heading={t("guides.cashOut.howLongHeading")}
                        description={t("guides.cashOut.howLongDescription")}
                      >
                        <p className="text-(--color-text-muted)">{" "}{t("guides.cashOut.prose.noGuaranteedTime")}{" "}</p>
                      </Section>
            
                      <Section
                        id="safety"
                        heading={t("guides.cashOut.avoidHeading")}
                        description={t("guides.cashOut.avoidDescription")}
                      >
                        <Callout tone="danger" title={t("guides.cashOut.neverShareTitle")}>{t("guides.cashOut.body.safety.p1")}</Callout>
            
                        <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
                          <li>{t("guides.cashOut.body.safety.p2")}</li>
                          <li>{" "}{t("guides.cashOut.avoid.phishing")}{" "}</li>
                          <li>{t("guides.cashOut.body.safety.p3")}</li>
                          <li>{" "}{t("guides.cashOut.avoid.generators")}{" "}</li>
                        </ul>
                      </Section>
            
                      <Section
                        id="group"
                        heading={t("guides.cashOut.groupHeading")}
                        description={t("guides.cashOut.groupDescription")}
                      >
                        <p className="text-(--color-text-muted)">{t("guides.cashOut.body.group.p1")}</p>
            
                        <div className="mt-6">
                          <GroupSplit words={await loadWords(locale, GROUP_SPLIT_WORDS)} />
                        </div>
                      </Section>
            
                      <Section
                        id="after"
                        heading={t("guides.cashOut.afterHeading")}
                        description={t("guides.cashOut.afterDescription")}
                      >
                        <p className="text-(--color-text-muted)">
                  {t("guides.cashOut.body.after.p1")}
                <InlineLink href={localizedPath(locale, "/devex-fees-and-taxes/")}>{t("guides.cashOut.body.after.p2")}</InlineLink>
                          {". "}
                          {t("guides.cashOut.body.after.p3")}
                        </p>
                      </Section>
            
                      <FAQAccordion locale={locale} faqs={record.faqs} heading={t("guides.cashOut.faqsHeading")} />
            
                      <RelatedLinks locale={locale}
                        record={record}
                        relationships={["prerequisite", "next-step", "parent"]}
                        id="related"
                      />
            
                      <EstimateDisclaimer locale={locale} />
                      <SourceNote locale={locale} sourceIds={record.sourceIds} />
                    </div>
                  </Container>
                </>
  );
}
