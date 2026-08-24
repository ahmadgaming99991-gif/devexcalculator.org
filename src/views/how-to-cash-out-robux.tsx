import { loadWords } from "@/i18n/client-words";
import { getTranslator } from "@/i18n/get-dictionary";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ButtonLink, Callout, Container, InlineLink, Section, SourceLink } from "@/components/ui";
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
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro="The official process, what to have ready before you start, and how to recognise the services that are not worth the risk."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="process" jumpLabel="See the process">
            {record.quickAnswer}
          </QuickAnswer>

          <TableOfContents locale={locale} sections={record.sections} />

          <Section
            id="process"
            heading={t("guides.cashOut.processHeading")}
            description="At a high level, and only as far as official documentation supports."
          >
            <ValueFlow
              className="mb-6"
              caption={t("guides.cashOut.processDiagramCaption")}
              stages={[
                {
                  label: "Reach the minimum",
                  detail: `At least ${formatRobux(minimumEarnedRobux)}, and only Earned Robux count toward it.`,
                  tone: "primary",
                },
                {
                  label: "Meet the account requirements",
                  detail:
                    "Verified email, minimum age of 13, a DevEx portal account, a tax form on file, good standing.",
                  tone: "primary",
                },
                {
                  label: "Submit through the portal",
                  detail: "The official DevEx portal, and nowhere else.",
                  tone: "primary",
                },
                {
                  label: "Roblox reviews it",
                  detail:
                    "It decides which Robux qualify and whether to approve. This can end here, and no third party changes that.",
                  by: "Roblox alone",
                  tone: "warning",
                  decision: true,
                },
                {
                  label: "Payment is issued",
                  detail:
                    "Your provider and bank apply their own handling and fees from there.",
                  tone: "success",
                },
              ]}
            />

            <ol className="flex list-decimal flex-col gap-4 pl-5 text-(--color-text-muted)">
              <li>
                <strong className="text-(--color-text)">
                  Accumulate at least {formatRobux(minimumEarnedRobux)} Earned Robux.
                </strong>{" "}
                Only Earned Robux count.{" "}
                <InlineLink href="/earned-robux/">{t("guides.cashOut.body.process.p3")}</InlineLink>
                .
              </li>
              <li>
                <strong className="text-(--color-text)">{t("guides.cashOut.list.meetRequirements")}</strong>{" "}
                Verified email, minimum age of 13, a valid DevEx portal account,
                a W-9 or W-8 on file, and an account in good standing.{" "}
                <InlineLink href="/devex-requirements/">{t("guides.cashOut.list.fullListLink")}</InlineLink>.
              </li>
              <li>
                <strong className="text-(--color-text)">{t("guides.cashOut.list.submitPortal")}</strong>{" "}
                Requests go through the official portal linked from the{" "}
                <SourceLink t={t} href="https://create.roblox.com/docs/production/monetization/developer-exchange">
                  Roblox Creator Hub DevEx documentation
                </SourceLink>
                . Nowhere else.
              </li>
              <li>
                <strong className="text-(--color-text)">{t("guides.cashOut.list.robloxReviews")}</strong>{" "}
                It decides which Robux qualify and whether the request is
                approved. No third party influences this, and this site cannot
                predict the outcome.
              </li>
              <li>
                <strong className="text-(--color-text)">{t("guides.cashOut.list.paymentIssued")}</strong> Your
                payment provider and your bank apply their own handling from
                there.{" "}
                <InlineLink href="/devex-fees-and-taxes/">{t("guides.cashOut.body.process.p8")}</InlineLink>
                .
              </li>
            </ol>

            <div className="mt-6">
              <ButtonLink href="/">{t("routes.howToCashOutRobux.links.home")}</ButtonLink>
            </div>
          </Section>

          <Section
            id="checklist"
            heading={t("guides.cashOut.prepareHeading")}
            description="None of this is difficult, but chasing it after submitting is what causes delays."
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
            description="Honestly: nobody outside Roblox can tell you."
          >
            <p className="text-(--color-text-muted)">
              Roblox does not publish a guaranteed processing time, so this page
              does not state one. Specific numbers of days quoted elsewhere are
              other creators&rsquo; experiences, not commitments — and one person&rsquo;s
              timeline says nothing reliable about yours. If a request seems
              stuck, Roblox support is the only party who can actually look at it.
            </p>
          </Section>

          <Section
            id="safety"
            heading={t("guides.cashOut.avoidHeading")}
            description="This part matters more than the rest of the page."
          >
            <Callout tone="danger" title={t("guides.cashOut.neverShareTitle")}>{t("guides.cashOut.body.safety.p1")}</Callout>

            <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
              <li>{t("guides.cashOut.body.safety.p2")}</li>
              <li>
                A site asking you to sign in with your Roblox account to
                &ldquo;check eligibility&rdquo; is phishing.
              </li>
              <li>{t("guides.cashOut.body.safety.p3")}</li>
              <li>
                Robux &ldquo;generators&rdquo; do not exist. Every one of them is
                a scam or a survey farm.
              </li>
            </ul>
          </Section>

          <Section
            id="group"
            heading={t("guides.cashOut.groupHeading")}
            description="A DevEx request is submitted by one account and paid to that account. Roblox does not divide a payout between collaborators, so a revenue share is an arrangement between the people in the group — and the minimum applies to each of them separately."
          >
            <p className="text-(--color-text-muted)">{t("guides.cashOut.body.group.p1")}</p>

            <div className="mt-6">
              <GroupSplit words={await loadWords(locale, GROUP_SPLIT_WORDS)} />
            </div>
          </Section>

          <Section
            id="after"
            heading={t("guides.cashOut.afterHeading")}
            description="The DevEx rate is not the last number involved."
          >
            <p className="text-(--color-text-muted)">
              A payout is income, and how it is taxed depends entirely on where
              you live. Your payment provider may charge a fee, and if you are
              paid in a currency other than US dollars there will be a conversion
              spread on top.{" "}
              <InlineLink href="/devex-fees-and-taxes/">{t("guides.cashOut.body.after.p2")}</InlineLink>
              . This site gives no tax advice.
            </p>
          </Section>

          <FAQAccordion locale={locale} faqs={record.faqs} heading={t("guides.cashOut.faqsHeading")} />

          <RelatedLinks locale={locale}
            record={record}
            relationships={["prerequisite", "next-step", "parent"]}
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
