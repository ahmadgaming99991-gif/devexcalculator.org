import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Callout, Container, InlineLink, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";
import { formatDate } from "@/lib/calculations/format";
import { rateRegistry } from "@/lib/calculations/rate-registry";

const ROUTE = "/disclaimer/";

export const metadata: Metadata = buildMetadata(ROUTE);

export default function DisclaimerPage() {
  const record = requireRoute(ROUTE);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs route={ROUTE} />
        <PageHeader
          record={record}
          intro="The honest boundary of what this site can tell you — worth reading once before you plan around a number here."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer>{record.quickAnswer}</QuickAnswer>

          <Section id="estimates" heading="Everything here is an estimate">
            <p className="text-[--color-text-muted]">
              The calculator multiplies the Robux figure you enter by a rate taken
              from Roblox&rsquo;s published documentation. That arithmetic is exact and
              covered by tests. What it produces is still an estimate, because the
              inputs are assumptions: that the Robux you entered are eligible
              Earned Robux, and that the rate you selected is the one Roblox will
              apply to them.
            </p>
            <p className="mt-3 text-[--color-text-muted]">
              Both assumptions are yours to make. Neither can be verified from
              outside Roblox.
            </p>
          </Section>

          <Section id="cannot-determine" heading="What this site cannot determine">
            <ul className="flex list-disc flex-col gap-2 pl-5 text-[--color-text-muted]">
              <li>
                Whether your Robux count as Earned Robux. Roblox tracks where each
                Robux came from; that record is not visible here.
              </li>
              <li>
                How your balance splits between the standard, legacy and
                conditional rates.
              </li>
              <li>Whether a DevEx request will be approved.</li>
              <li>How long a request will take, or when payment will arrive.</li>
              <li>What your payment provider will charge you.</li>
              <li>What you will owe in tax, or when.</li>
              <li>What the DevEx rate will be in future.</li>
            </ul>

            <Callout tone="warning" title="No calculator can answer these" className="mt-4">
              This is not a limitation of this particular site. Any tool claiming
              to tell you whether you are eligible, or guaranteeing a payout, is
              claiming knowledge it does not have. Roblox is the only party who
              can answer these questions.
            </Callout>
          </Section>

          <Section id="trademarks" heading="Trademarks">
            <p className="text-[--color-text-muted]">
              Roblox, Robux and Developer Exchange are trademarks of Roblox
              Corporation. They appear on this site only to describe what these
              calculations concern, which is ordinary descriptive use. This site
              is not affiliated with, endorsed by, sponsored by or operated by
              Roblox Corporation, and the branding, artwork and wording here are
              its own.
            </p>
          </Section>

          <Section id="accuracy" heading="Accuracy and currency of information">
            <p className="text-[--color-text-muted]">
              Rate data on this site was last verified against official
              documentation on {formatDate(rateRegistry.lastVerifiedAt)}, and that
              date is displayed on every rate-sensitive page rather than hidden
              here. Rates change: the standard rate moved in September 2025, and
              it could move again.
            </p>
            <p className="mt-3 text-[--color-text-muted]">
              If a figure here has fallen behind, the{" "}
              <InlineLink href="/sources/">source registry</InlineLink> links
              directly to the official page it came from, so you can check the
              current value yourself in a few seconds. Reporting it through the{" "}
              <InlineLink href="/corrections/">corrections process</InlineLink>{" "}
              gets it fixed for everyone else too.
            </p>
          </Section>

          <RelatedLinks
            record={record}
            relationships={["next-step", "sibling", "parent"]}
            heading="Related pages"
            id="related"
          />
        </div>
      </Container>
    </>
  );
}
