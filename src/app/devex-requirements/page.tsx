import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireRoute } from "@/lib/content/route-registry";
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
import { RequirementsList } from "@/components/content/tables";
import { minimumEarnedRobux, getRateValue } from "@/lib/calculations/rate-registry";
import { standardRateId } from "@/lib/calculations/devex";
import { Rational } from "@/lib/calculations/rational";
import { formatCurrency, formatRobux } from "@/lib/calculations/format";
import { PreparationChecklist } from "@/features/devex/preparation-checklist";

const ROUTE = "/devex-requirements/";

export const metadata: Metadata = buildMetadata(ROUTE);

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

export default function DevexRequirementsPage() {
  const record = requireRoute(ROUTE);
  const minimumPayout = Rational.fromInt(minimumEarnedRobux).mul(getRateValue(standardRateId));

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs route={ROUTE} />
        <PageHeader
          record={record}
          intro="What Roblox actually requires before a DevEx request can be submitted, taken from its own documentation rather than from repeated third-party summaries."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer jumpTo="requirements" jumpLabel="See each requirement in detail">
            {record.quickAnswer}
          </QuickAnswer>

          <TableOfContents sections={record.sections} />

          <Section id="requirements" heading="What Roblox requires">
            <RequirementsList />
          </Section>

          <Section
            id="minimum"
            heading={`The ${formatRobux(minimumEarnedRobux)} Earned Robux minimum`}
            description="The number everybody looks up first, and the one most often quoted out of date."
          >
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
              <p className="mt-3 text-(--color-text-muted)">
                The word that matters is <em>Earned</em>. Robux you bought do not
                count toward it, and neither does gift card credit.{" "}
                <InlineLink href="/earned-robux/">
                  What counts as Earned Robux
                </InlineLink>
                .
              </p>
              <div className="mt-4">
                <ButtonLink href="/">Check your balance against the minimum</ButtonLink>
              </div>
            </div>
          </Section>

          <Section
            id="not-approval"
            heading="Meeting the threshold is not approval"
            description="This distinction is the single most important thing on this page."
          >
            <Callout tone="warning" title="A number cannot approve you">
              No calculator, including this one, can tell you whether a DevEx
              request will be approved. Roblox decides which of your Robux count
              as Earned Robux and whether your account and request meet its
              criteria. Anyone telling you otherwise — including any site
              promising a guaranteed payout — is not in a position to know.
            </Callout>
          </Section>

          <Section
            id="checklist"
            heading="Preparation checklist"
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
                <li>Verify the email address on your Roblox account.</li>
                <li>Create and confirm access to your DevEx portal account.</li>
                <li>
                  Complete the correct tax form — W-9 if you are a United States
                  taxpayer, W-8 otherwise.
                </li>
                <li>
                  Check your account is in good standing against the Terms of Use
                  and Community Standards.
                </li>
                <li>
                  Decide where the money is going, and check what your bank or
                  payment provider will charge to receive it.{" "}
                  <InlineLink href="/devex-fees-and-taxes/">
                    Fees and taxes explained
                  </InlineLink>
                  .
                </li>
              </ol>
            </noscript>

            <PreparationChecklist />
          </Section>

          <Section
            id="misunderstandings"
            heading="Common misunderstandings"
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

          <FAQAccordion faqs={record.faqs} heading="Questions about eligibility" />

          <RelatedLinks
            record={record}
            relationships={["prerequisite", "sibling", "next-step"]}
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
