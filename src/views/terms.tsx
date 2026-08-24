import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Container, InlineLink, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";
import { formatDate } from "@/lib/calculations/format";
import { siteConfig } from "@/config/site";

const ROUTE = "/terms/";


export async function TermsView({ locale }: { readonly locale: Locale }) {
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro="The terms covering use of this site. Short, because there is not much to it — you use a calculator, and it gives you an estimate."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale}>{record.quickAnswer}</QuickAnswer>

          <p className="text-sm text-(--color-text-muted)">
            Last reviewed {formatDate(record.lastReviewedAt)}.
          </p>

          <Section id="use" heading="Using this site">
            <p className="text-(--color-text-muted)">
              You are welcome to use {siteConfig.host} freely to estimate DevEx
              payouts, for yourself or as part of your work as a creator. No
              account is needed and nothing is charged.
            </p>
            <p className="mt-3 text-(--color-text-muted)">
              What is asked in return: do not attempt to disrupt the site or the
              infrastructure it runs on, do not scrape it in a way that degrades
              it for others, and if you republish figures from it, cite the
              source and include the verification date. A rate quoted without its
              date becomes wrong without warning, and that misleads whoever reads
              it next.
            </p>
          </Section>

          <Section id="estimates" heading="Estimates, not advice">
            <p className="text-(--color-text-muted)">
              Every figure on this site is an estimate produced by applying
              publicly documented rates to numbers you entered. None of it is
              financial advice, tax advice, legal advice, or a professional
              opinion of any kind.
            </p>
            <p className="mt-3 text-(--color-text-muted)">
              Considerable care goes into accuracy — every rate is sourced, dated
              and covered by tests — but rates change, documentation moves, and
              errors are possible. Check anything you are relying on against the
              official Roblox documentation linked from the{" "}
              <InlineLink href="/sources/">source registry</InlineLink> before
              making a decision that matters.
            </p>
          </Section>

          <Section id="affiliation" heading="No affiliation with Roblox">
            <p className="text-(--color-text-muted)">
              This site is independent. It is not affiliated with, endorsed by,
              sponsored by or operated by Roblox Corporation. Roblox, Robux and
              Developer Exchange are trademarks of Roblox Corporation, referenced
              here descriptively to identify what these calculations concern.
            </p>
            <p className="mt-3 text-(--color-text-muted)">
              This site cannot influence, expedite, predict or guarantee the
              outcome of a DevEx request, and has no access to any Roblox account
              or balance.
            </p>
          </Section>

          <Section id="liability" heading="Limitation of liability">
            <p className="text-(--color-text-muted)">
              This site is provided as it is, without warranty of any kind. To the
              fullest extent the law allows, no liability is accepted for loss or
              damage arising from use of it — including decisions made on the
              basis of an estimate shown here, a figure that has since changed,
              or the site being unavailable.
            </p>
            <p className="mt-3 text-(--color-text-muted)">
              Nothing in these terms limits liability that cannot lawfully be
              limited.
            </p>
          </Section>

          <Section id="changes" heading="Changes to these terms">
            <p className="text-(--color-text-muted)">
              These terms may be updated. The review date at the top of this page
              reflects the most recent change, and material changes are recorded
              in the{" "}
              <InlineLink href="/changelog/">changelog</InlineLink> alongside
              everything else that changes here.
            </p>
          </Section>

          <RelatedLinks locale={locale}
            record={record}
            relationships={["sibling", "parent"]}
            heading="Related pages"
            id="related"
          />
        </div>
      </Container>
    </>
  );
}
