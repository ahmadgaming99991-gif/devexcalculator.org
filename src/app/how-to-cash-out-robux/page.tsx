import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ButtonLink, Callout, Container, InlineLink, Section, SourceLink } from "@/components/ui";
import {
  EstimateDisclaimer,
  FAQAccordion,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
  SourceNote,
  TableOfContents,
} from "@/components/content";
import { minimumEarnedRobux } from "@/lib/calculations/rate-registry";
import { formatRobux } from "@/lib/calculations/format";

const ROUTE = "/how-to-cash-out-robux/";

export const metadata: Metadata = buildMetadata(ROUTE);

export default function HowToCashOutPage() {
  const record = requireRoute(ROUTE);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs route={ROUTE} />
        <PageHeader
          record={record}
          intro="The official process, what to have ready before you start, and how to recognise the services that are not worth the risk."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer jumpTo="process" jumpLabel="See the process">
            {record.quickAnswer}
          </QuickAnswer>

          <TableOfContents sections={record.sections} />

          <Section
            id="process"
            heading="The process Roblox documents"
            description="At a high level, and only as far as official documentation supports."
          >
            <ol className="flex list-decimal flex-col gap-4 pl-5 text-[--color-text-muted]">
              <li>
                <strong className="text-[--color-text]">
                  Accumulate at least {formatRobux(minimumEarnedRobux)} Earned Robux.
                </strong>{" "}
                Only Earned Robux count.{" "}
                <InlineLink href="/earned-robux/">
                  Check which of your Robux qualify
                </InlineLink>
                .
              </li>
              <li>
                <strong className="text-[--color-text]">Meet the account requirements.</strong>{" "}
                Verified email, minimum age of 13, a valid DevEx portal account,
                a W-9 or W-8 on file, and an account in good standing.{" "}
                <InlineLink href="/devex-requirements/">Full list</InlineLink>.
              </li>
              <li>
                <strong className="text-[--color-text]">Submit through the DevEx portal.</strong>{" "}
                Requests go through the official portal linked from the{" "}
                <SourceLink href="https://create.roblox.com/docs/production/monetization/developer-exchange">
                  Roblox Creator Hub DevEx documentation
                </SourceLink>
                . Nowhere else.
              </li>
              <li>
                <strong className="text-[--color-text]">Roblox reviews the request.</strong>{" "}
                It decides which Robux qualify and whether the request is
                approved. No third party influences this, and this site cannot
                predict the outcome.
              </li>
              <li>
                <strong className="text-[--color-text]">Payment is issued.</strong> Your
                payment provider and your bank apply their own handling from
                there.{" "}
                <InlineLink href="/devex-fees-and-taxes/">
                  What comes off the payout
                </InlineLink>
                .
              </li>
            </ol>

            <div className="mt-6">
              <ButtonLink href="/">Estimate what your balance would pay</ButtonLink>
            </div>
          </Section>

          <Section
            id="checklist"
            heading="Prepare before you apply"
            description="None of this is difficult, but chasing it after submitting is what causes delays."
          >
            <ul className="flex list-disc flex-col gap-2 pl-5 text-[--color-text-muted]">
              <li>Your Roblox email address is verified.</li>
              <li>You can sign in to the DevEx portal.</li>
              <li>The correct tax form is completed and on file.</li>
              <li>Your legal name and details match the ones on your tax form.</li>
              <li>You know which payment method you will use and what it charges.</li>
              <li>
                You have set aside an estimate for tax, if it applies where you
                live.
              </li>
            </ul>
          </Section>

          <Section
            id="timing"
            heading="How long it takes"
            description="Honestly: nobody outside Roblox can tell you."
          >
            <p className="text-[--color-text-muted]">
              Roblox does not publish a guaranteed processing time, so this page
              does not state one. Specific numbers of days quoted elsewhere are
              other creators&rsquo; experiences, not commitments — and one person&rsquo;s
              timeline says nothing reliable about yours. If a request seems
              stuck, Roblox support is the only party who can actually look at it.
            </p>
          </Section>

          <Section
            id="safety"
            heading="Avoid unofficial services"
            description="This part matters more than the rest of the page."
          >
            <Callout tone="danger" title="Never share your Roblox credentials">
              No legitimate service needs your Roblox password, and this site
              never asks for it. Services offering to buy your Robux, convert a
              balance outside DevEx, or speed up a payout generally violate the
              Roblox Terms of Use. The realistic outcomes are losing the Robux,
              losing the account, or both.
            </Callout>

            <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-[--color-text-muted]">
              <li>
                DevEx is the only official route from Earned Robux to money.
                There is no faster alternative.
              </li>
              <li>
                A site asking you to sign in with your Roblox account to
                &ldquo;check eligibility&rdquo; is phishing.
              </li>
              <li>
                Anyone guaranteeing approval is guaranteeing something they do
                not control.
              </li>
              <li>
                Robux &ldquo;generators&rdquo; do not exist. Every one of them is
                a scam or a survey farm.
              </li>
            </ul>
          </Section>

          <Section
            id="after"
            heading="After the payout"
            description="The DevEx rate is not the last number involved."
          >
            <p className="text-[--color-text-muted]">
              A payout is income, and how it is taxed depends entirely on where
              you live. Your payment provider may charge a fee, and if you are
              paid in a currency other than US dollars there will be a conversion
              spread on top.{" "}
              <InlineLink href="/devex-fees-and-taxes/">
                Model those deductions with your own figures
              </InlineLink>
              . This site gives no tax advice.
            </p>
          </Section>

          <FAQAccordion faqs={record.faqs} heading="Questions about cashing out" />

          <RelatedLinks
            record={record}
            relationships={["prerequisite", "next-step", "parent"]}
            heading="Related pages"
            id="related"
          />

          <EstimateDisclaimer />
          <SourceNote sourceIds={record.sourceIds} />
        </div>
      </Container>
    </>
  );
}
