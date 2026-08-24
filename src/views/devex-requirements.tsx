import { loadWords } from "@/i18n/client-words";
import { getTranslator } from "@/i18n/get-dictionary";
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


const MISUNDERSTANDINGS: readonly { claim: string; reality: string }[] = [
  {
    claim: "The minimum is 10,000 Robux.",
    reality:
      "It is 30,000 Earned Robux. The lower figure circulates on third-party sites that have not been updated, and it is not what current Roblox documentation says.",
  },
  {
    claim: "Any Robux balance counts toward the minimum.",
    reality:
      "Only Earned Robux count. A balance made up of purchased Robux does not qualify however large it is.",
  },
  {
    claim: "Reaching 30,000 means you will be paid.",
    reality:
      "It means you can submit a request. Roblox reviews each one and decides which Robux qualify as earned.",
  },
  {
    claim: "You need to be 18 to use DevEx.",
    reality:
      "Roblox documents a minimum age of 13. The separate 18+ condition concerns the age verification of the players who spent the Robux, and affects the rate rather than your eligibility.",
  },
];

export async function RequirementsView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["calculator", "rates"]);
  const record = await localizedRoute(locale, ROUTE);
  const minimumPayout = Rational.fromInt(minimumEarnedRobux).mul(getRateValue(standardRateId));

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro="What Roblox actually requires before a DevEx request can be submitted, taken from its own documentation rather than from repeated third-party summaries."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="requirements" jumpLabel="See each requirement in detail">
            {record.quickAnswer}
          </QuickAnswer>

          <TableOfContents locale={locale} sections={record.sections} />

          <Section id="requirements" heading={t("rates.requirements.requirementsHeading")}>
            <RequirementsList />
          </Section>

          <Section
            id="minimum"
            heading={`The ${formatRobux(minimumEarnedRobux)} Earned Robux minimum`}
            description="The number everybody looks up first, and the one most often quoted out of date."
          >
            <ThresholdScale
              className="mb-6"
              thresholdLabel={`${formatRobux(minimumEarnedRobux)} eligible Earned Robux`}
              below="Below the line, a DevEx request cannot be submitted at all. Being close to it counts for nothing, and the shortfall has to be earned — it cannot be bought."
              above="At or above the line, a request can be submitted. It is then reviewed, and meeting the threshold is not the same as being approved."
              caption={t("rates.requirements.minimumDiagramCaption")}
            />

            <div className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4">
              <p className="text-(--color-text-muted)">
                {formatRobux(minimumEarnedRobux)} Earned Robux is the threshold
                to submit a request. At the current standard rate that balance is
                worth about{" "}
                <strong className="text-(--color-text)">
                  {formatCurrency(minimumPayout, "USD")}
                </strong>{" "}
                before any payment-provider fees or tax.
              </p>
              <p className="mt-3 text-(--color-text-muted)">{t("rates.requirements.body.minimum.p3")}<em>Earned</em>. Robux you bought do not
                count toward it, and neither does gift card credit.{" "}
                <InlineLink href="/earned-robux/">
                  What counts as Earned Robux
                </InlineLink>
                .
              </p>
              <div className="mt-4">
                <ButtonLink href="/">{t("rates.requirements.checkBalanceLink")}</ButtonLink>
              </div>
            </div>
          </Section>

          <Section
            id="not-approval"
            heading={t("rates.requirements.notApprovalHeading")}
            description="This distinction is the single most important thing on this page."
          >
            <Callout tone="warning" title={t("rates.requirements.numberCannotApproveTitle")}>{t("rates.requirements.body.notApproval.p1")}</Callout>
          </Section>

          <Section
            id="checklist"
            heading={t("rates.requirements.checklistHeading")}
            description="Getting these in place before you apply avoids the obvious delays. Tick them off as you go — these steps are usually done days apart, and progress is kept in your own browser."
          >
            <noscript>
              {/*
                The list without scripting. Identical wording to the interactive
                version, because the content is the point and the ticking is a
                convenience on top of it.
              */}
              <ol className="flex list-decimal flex-col gap-3 pl-5 text-(--color-text-muted)">
                <li>
                  Confirm your balance is genuinely Earned Robux and has reached{" "}
                  {formatRobux(minimumEarnedRobux)}.
                </li>
                <li>{t("rates.requirements.checklist.verifyEmail")}</li>
                <li>{t("rates.requirements.checklist.portalAccount")}</li>
                <li>{t("rates.requirements.body.checklist.p2")}</li>
                <li>{t("rates.requirements.body.checklist.p3")}</li>
                <li>
                  Decide where the money is going, and check what your bank or
                  payment provider will charge to receive it.{" "}
                  <InlineLink href="/devex-fees-and-taxes/">{t("calculator.preparation.feesLink")}</InlineLink>
                  .
                </li>
              </ol>
            </noscript>

            <PreparationChecklist words={await loadWords(locale, PREPARATION_WORDS)} />
          </Section>

          <Section
            id="misunderstandings"
            heading={t("rates.requirements.misunderstandingsHeading")}
            description="Each of these is something creators repeat to each other, alongside what the documentation actually says."
          >
            <div className="flex flex-col gap-3">
              {MISUNDERSTANDINGS.map((item) => (
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
