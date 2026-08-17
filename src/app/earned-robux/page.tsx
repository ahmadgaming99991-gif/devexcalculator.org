import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireRoute } from "@/lib/content/route-registry";
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

const ROUTE = "/earned-robux/";

export const metadata: Metadata = buildMetadata(ROUTE);

const QUALIFYING: readonly string[] = [
  "Robux from players buying developer products inside an experience you own",
  "Robux from pass purchases in your experience",
  "Your share of private server subscriptions",
  "Your creator share of avatar items you made and sold",
  "Your share of experience subscriptions where these are available to you",
];

const NOT_QUALIFYING: readonly string[] = [
  "Robux you bought yourself, in any package or at any price",
  "Robux from a gift card or promotional code",
  "Robux included with a Roblox membership as a monthly grant",
  "Robux received from another player in a trade",
  "Robux transferred into your account from outside creator earnings",
];

export default function EarnedRobuxPage() {
  const record = requireRoute(ROUTE);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs route={ROUTE} />
        <PageHeader
          record={record}
          intro="The distinction that decides whether a DevEx payout is possible at all — and the one most often missed until a request is refused."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer jumpTo="definition" jumpLabel="Read the full definition">
            {record.quickAnswer}
          </QuickAnswer>

          <TableOfContents sections={record.sections} />

          <Section id="definition" heading="What Earned Robux means">
            <DefinitionBlock term="Earned Robux">
              The portion of your Robux balance that came from creator activity —
              other people spending Robux on something you made — rather than
              from Robux you acquired any other way. DevEx converts Earned Robux
              only. Your account shows a single Robux number, but Roblox tracks
              where each part of it came from, and that internal accounting is
              what determines eligibility.
            </DefinitionBlock>

            <Callout tone="info" title="Why your balance and your Earned Robux differ" className="mt-4">
              If you have ever bought Robux, received them from a membership, or
              redeemed a gift card, part of your balance is not earned. That part
              cannot be cashed out, and it does not count toward the 30,000
              minimum either.{" "}
              <a href="/devex-requirements/">See the full requirements</a>.
            </Callout>
          </Section>

          <Section
            id="qualifying"
            heading="What generally counts"
            description="These are the routes by which Robux normally become Earned Robux. Roblox makes the final determination for any specific balance."
          >
            <ul className="flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
              {QUALIFYING.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-(--color-text-muted)">
              In each case Roblox has already taken its platform commission
              before the Robux reach you — creators receive 70% of what a player
              spends on an in-experience purchase.{" "}
              <InlineLink href="/robux-tax-calculator/">
                Work out what you keep on a sale
              </InlineLink>
              .
            </p>
          </Section>

          <Section
            id="not-qualifying"
            heading="What generally does not"
            description="Robux acquired these ways sit in the same balance but are treated differently."
          >
            <ul className="flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
              {NOT_QUALIFYING.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-(--color-text-muted)">
              This is also why the retail price of Robux and the DevEx rate are
              unrelated numbers. Buying Robux is a purchase; DevEx is Roblox
              paying a creator.{" "}
              <InlineLink href="/robux-to-usd/">
                The two are compared side by side here
              </InlineLink>
              .
            </p>
          </Section>

          <Section
            id="pending"
            heading="Pending and available balances"
            description="Newly earned Robux are not immediately available, which surprises creators watching a balance climb."
          >
            <p className="text-(--color-text-muted)">
              Robux from a recent purchase typically spend a period as pending
              before becoming available, which protects against reversed
              transactions. Pending Robux are not yet part of the balance you can
              act on. Roblox documents the current holding behaviour in the
              Creator Hub, and because that behaviour has changed over time this
              page does not state a specific number of days — check the official
              documentation for the figure that applies now.
            </p>
          </Section>

          <Section
            id="groups"
            heading="Group funds"
            description="Robux held by a group are not the same as Robux held by you."
          >
            <p className="text-(--color-text-muted)">
              Earnings from an experience owned by a group accumulate in the
              group&rsquo;s funds rather than in any individual account. DevEx operates
              on a personal account, so group funds have to reach a personal
              balance through a payout before they are relevant to a DevEx
              request. If you are splitting revenue with collaborators, agree how
              that works before the money arrives rather than after — and check
              the current official documentation for how group payouts are
              treated, since this is an area Roblox has changed before.
            </p>
          </Section>

          <FAQAccordion faqs={record.faqs} heading="Questions about Earned Robux" />

          <RelatedLinks
            record={record}
            relationships={["sibling", "tool", "next-step"]}
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
