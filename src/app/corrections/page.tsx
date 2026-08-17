import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ButtonLink, Callout, Container, InlineLink, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";

const ROUTE = "/corrections/";

export const metadata: Metadata = buildMetadata(ROUTE);

export default function CorrectionsPage() {
  const record = requireRoute(ROUTE);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs route={ROUTE} />
        <PageHeader
          record={record}
          intro="Rates change and documentation moves. If something here is out of date, telling us is genuinely the most useful thing you can do."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer>{record.quickAnswer}</QuickAnswer>

          <Section id="report" heading="Reporting an error">
            <p className="text-[--color-text-muted]">
              The most useful report includes the page you were on, the figure you
              think is wrong, and — if you have it — a link to the official Roblox
              page that says otherwise. That last part turns a report into
              something that can be acted on immediately rather than investigated
              from scratch.
            </p>
            <div className="mt-4">
              <ButtonLink href="/contact/">Report a correction</ButtonLink>
            </div>

            <Callout tone="info" title="What this site cannot help with" className="mt-6">
              Anything about your own account, your balance, or a DevEx request
              you have submitted. This site has no access to any of that and no
              relationship with Roblox — only Roblox support can look into it.
            </Callout>
          </Section>

          <Section
            id="process"
            heading="What happens next"
            description="A correction to a rate, minimum or fee follows a fixed sequence. It is deliberately not a quick edit."
          >
            <ol className="flex list-decimal flex-col gap-3 pl-5 text-[--color-text-muted]">
              <li>
                <strong className="text-[--color-text]">Verify against the official source.</strong>{" "}
                The claim is checked directly against Roblox&rsquo;s own documentation,
                not against another site that repeated it.
              </li>
              <li>
                <strong className="text-[--color-text]">Update the rate registry.</strong>{" "}
                Rates live in one validated data file. Changing them there changes
                every page, table and calculator at once — there is no second copy
                to forget.
              </li>
              <li>
                <strong className="text-[--color-text]">Update the tests.</strong> The
                unit tests assert specific expected values. A rate change means
                those expectations change too, which is what stops a figure being
                updated in one place and not another.
              </li>
              <li>
                <strong className="text-[--color-text]">Review the affected pages.</strong>{" "}
                Any prose that states the old figure in words is rewritten, not
                just the tables.
              </li>
              <li>
                <strong className="text-[--color-text]">Record it in the changelog.</strong>{" "}
                With the date, what changed, and the source that justified it.
              </li>
              <li>
                <strong className="text-[--color-text]">Update the verification date.</strong>{" "}
                The badge shown on every rate-sensitive page reflects the new
                check.
              </li>
              <li>
                <strong className="text-[--color-text]">Deploy.</strong> The full test
                suite has to pass first.
              </li>
            </ol>
          </Section>

          <Section id="record" heading="Where corrections are recorded">
            <p className="text-[--color-text-muted]">
              Publicly, in the{" "}
              <InlineLink href="/changelog/">changelog</InlineLink>. A correction
              is not silently applied — if a figure on this site was wrong, the
              record of it being wrong stays visible. That matters more for a
              site people plan finances around than a tidy history does.
            </p>
            <p className="mt-3 text-[--color-text-muted]">
              Rate changes made by Roblox are also reflected in the{" "}
              <InlineLink href="/devex-rate-history/">rate history</InlineLink>,
              which is a separate record: the changelog tracks what this site did,
              the rate history tracks what Roblox did.
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
