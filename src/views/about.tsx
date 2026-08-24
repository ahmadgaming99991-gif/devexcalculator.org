import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Callout, Container, InlineLink, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";

const ROUTE = "/about/";


export async function AboutView({ locale }: { readonly locale: Locale }) {
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro="What this site is for, how it is built, and the things it deliberately refuses to do."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale}>{record.quickAnswer}</QuickAnswer>

          <Section id="purpose" heading="What this site is for">
            <div className="flex flex-col gap-3 text-(--color-text-muted)">
              <p>
                A creator with a Robux balance wants to know one thing: what is
                this actually worth. The answer is arithmetic, but getting it
                right needs current rates, an understanding of which Robux
                qualify, and honesty about what the number does and does not
                mean.
              </p>
              <p>
                Most calculators handle the arithmetic and stop there. Several
                that rank well are still quoting a rate that changed in September
                2025, or a minimum that has not been correct for years. A creator
                planning around those numbers plans around fiction.
              </p>
              <p>
                This site exists to be the version that is correct, says where
                each figure came from, and admits what it cannot tell you.
              </p>
            </div>
          </Section>

          <Section id="principles" heading="How it is built">
            <ul className="flex flex-col gap-3 text-(--color-text-muted)">
              <li>
                <strong className="text-(--color-text)">Every rate has a source and a date.</strong>{" "}
                Not &ldquo;current as of recently&rdquo; — a link to the official Roblox
                documentation and the date it was last checked, shown on the page.
              </li>
              <li>
                <strong className="text-(--color-text)">The arithmetic is exact.</strong>{" "}
                Money is calculated as exact fractions rather than floating-point
                numbers, and rounded once, at the moment it is displayed.{" "}
                <InlineLink href="/methodology/">The methodology explains why</InlineLink>.
              </li>
              <li>
                <strong className="text-(--color-text)">The page works without JavaScript.</strong>{" "}
                Rates, formulas, examples and explanations are all server
                rendered. Only live recalculation needs scripts.
              </li>
              <li>
                <strong className="text-(--color-text)">Nothing is collected.</strong>{" "}
                Calculations run in your browser and are never sent anywhere.{" "}
                <InlineLink href="/privacy/">The privacy policy is specific about this</InlineLink>.
              </li>
              <li>
                <strong className="text-(--color-text)">Corrections are published.</strong>{" "}
                When a figure here turns out to be wrong, the fix is recorded with
                a date in the{" "}
                <InlineLink href="/changelog/">changelog</InlineLink> rather than
                quietly edited.
              </li>
            </ul>
          </Section>

          <Section id="limits" heading="What it will not do">
            <ul className="flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
              <li>
                Tell you whether your DevEx request will be approved. Roblox
                decides that, and no third party can predict it.
              </li>
              <li>
                Publish a universal Robux purchase price. There isn&rsquo;t one — it
                varies by package, region and platform.
              </li>
              <li>
                Give tax advice, or state a tax rate for your country.
              </li>
              <li>
                Ask for your Roblox credentials, for any reason. No legitimate
                tool needs them.
              </li>
              <li>
                Publish a page for every number just because people search for
                it. Amount pages exist only where there is something specific to
                say.
              </li>
              <li>
                Invent review counts, user numbers, testimonials or an author
                biography to look more established than it is.
              </li>
            </ul>
          </Section>

          <Section id="affiliation" heading="Affiliation">
            <Callout tone="warning" title="Independent, and not connected to Roblox">
              DevExCalculator.org is not affiliated with, endorsed by, sponsored
              by or operated by Roblox Corporation. Roblox, Robux and Developer
              Exchange are trademarks of Roblox Corporation, used here only to
              describe what these calculations are about. For anything about your
              account, your balance or your DevEx request, Roblox is the only
              party who can help.
            </Callout>
          </Section>

          <RelatedLinks locale={locale}
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
