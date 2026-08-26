import { getTranslator, type Translate } from "@/i18n/get-dictionary";
import { localizedPath } from "@/i18n/locale-path";
import { rich } from "@/i18n/rich";
import Link from "next/link";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Callout, Container, InlineLink, Section } from "@/components/ui";
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
import { EligibilityGate } from "@/components/diagrams";
import { formatRobux } from "@/lib/calculations/format";
import { minimumEarnedRobux } from "@/lib/calculations/rate-registry";

const ROUTE = "/earned-robux/";


const QUALIFYING = (t: Translate): readonly string[] => [
  t("rates.earnedRobux.qualifying.developerProducts"),
  t("rates.earnedRobux.qualifying.passes"),
  t("rates.earnedRobux.qualifying.privateServers"),
  t("rates.earnedRobux.qualifying.avatarItems"),
  t("rates.earnedRobux.qualifying.experienceSubscriptions"),
];

const NOT_QUALIFYING = (t: Translate): readonly string[] => [
  t("rates.earnedRobux.notQualifying.purchased"),
  t("rates.earnedRobux.notQualifying.giftCards"),
  t("rates.earnedRobux.notQualifying.membership"),
  t("rates.earnedRobux.notQualifying.trade"),
  t("rates.earnedRobux.notQualifying.transferred"),
];

export async function EarnedRobuxView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["rates"]);
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("rates.earnedRobux.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="definition" jumpLabel={t("rates.earnedRobux.jumpLabel")}>
            {record.quickAnswer}
          </QuickAnswer>

          <TableOfContents locale={locale} sections={record.sections} />

          <Section id="definition" heading={t("rates.earnedRobux.definitionHeading")}>
            <DefinitionBlock term={t("common.units.earnedRobux")}>{t("rates.earnedRobux.body.definition.p1")}</DefinitionBlock>

            {/*
              Categories rather than the QUALIFYING and NOT_QUALIFYING tables
              themselves. Those are printed in full two sections below, and
              repeating them here would make the page say the same ten things
              twice — the diagram exists to show that there is a sorting step at
              all, which the two separate lists never quite do.
            */}
            <EligibilityGate
              className="mt-6"
              caption={t("rates.earnedRobux.sortingCaption")}
              accepted={{
                heading: t("rates.earnedRobux.becomesEarned"),
                items: [
                  t("rates.earnedRobux.gate.accepted.passesAndProducts"),
                  t("rates.earnedRobux.gate.accepted.subscriptions"),
                  t("rates.earnedRobux.gate.accepted.avatarItems"),
                ],
              }}
              rejected={{
                heading: t("rates.earnedRobux.staysButNeverQualifies"),
                items: [
                  t("rates.earnedRobux.gate.rejected.purchased"),
                  t("rates.earnedRobux.gate.rejected.giftCards"),
                  t("rates.earnedRobux.gate.rejected.membership"),
                  t("rates.earnedRobux.gate.rejected.trade"),
                ],
              }}
              outcome={
                <>
                  {rich(t("rates.earnedRobux.eligibleOutcome"), {
                    eligible: (
                      <strong className="font-semibold">
                        {t("rates.earnedRobux.eligibleTerm")}
                      </strong>
                    ),
                  })}
                    {t("rates.earnedRobux.body.definition.p2", {
                      minimumEarnedRobux: formatRobux(t.locale, minimumEarnedRobux),
                    })}
                  </>
              }
            />

            <Callout tone="info" title={t("rates.earnedRobux.balanceDiffersTitle")} className="mt-4">
              {t("rates.earnedRobux.body.definition.p4")}
            <Link href={localizedPath(locale, "/devex-requirements/")}>{t("rates.earnedRobux.seeRequirementsLink")}{" "}</Link>.
                    </Callout>
                  </Section>
        
                  <Section
                    id="qualifying"
                    heading={t("rates.earnedRobux.countsHeading")}
                    description={t("rates.earnedRobux.countsDescription")}
                  >
                    <ul className="flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
                      {QUALIFYING(t).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <p className="mt-4 text-sm text-(--color-text-muted)">
              {t("rates.earnedRobux.body.qualifying.p1")}
            <InlineLink href={localizedPath(locale, "/robux-tax-calculator/")}>{t("rates.earnedRobux.body.qualifying.p2")}</InlineLink>
                      .
                    </p>
                  </Section>
        
                  <Section
                    id="not-qualifying"
                    heading={t("rates.earnedRobux.doesNotCountHeading")}
                    description={t("rates.earnedRobux.doesNotCountDescription")}
                  >
                    <ul className="flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
                      {NOT_QUALIFYING(t).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <p className="mt-4 text-sm text-(--color-text-muted)">
              {t("rates.earnedRobux.prose.retailUnrelated")}
            <InlineLink href={localizedPath(locale, "/robux-to-usd/")}>{t("rates.earnedRobux.body.notQualifying.p1")}</InlineLink>
                      .
                    </p>
                  </Section>
        
                  <Section
                    id="pending"
                    heading={t("rates.earnedRobux.pendingHeading")}
                    description={t("rates.earnedRobux.pendingDescription")}
                  >
                    <p className="text-(--color-text-muted)">{t("rates.earnedRobux.body.pending.p1")}</p>
                  </Section>
        
                  <Section
                    id="groups"
                    heading={t("rates.earnedRobux.groupFundsHeading")}
                    description={t("rates.earnedRobux.groupFundsDescription")}
                  >
                    <p className="text-(--color-text-muted)">{" "}{t("rates.earnedRobux.prose.groupFunds")}{" "}</p>
                  </Section>
        
                  <FAQAccordion locale={locale} faqs={record.faqs} heading={t("rates.earnedRobux.faqsHeading")} />
        
                  <RelatedLinks locale={locale}
                    record={record}
                    relationships={["sibling", "tool", "next-step"]}
                    id="related"
                  />
        
                  <EstimateDisclaimer locale={locale} />
                  <SourceNote locale={locale} sourceIds={record.sourceIds} />
                </div>
              </Container>
            </>
  );
}
