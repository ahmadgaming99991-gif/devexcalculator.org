import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Container, InlineLink, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";
import { rateRegistry } from "@/lib/calculations/rate-registry";

const ROUTE = "/editorial-policy/";

export const metadata: Metadata = buildMetadata(ROUTE);

const LABELS: readonly { label: string; meaning: string }[] = [
  {
    label: "Verified through official source",
    meaning:
      "Read directly from Roblox, Cloudflare, Google or ECB documentation, with the URL and date recorded in the source registry.",
  },
  {
    label: "Derived from supplied CSV",
    meaning:
      "Computed from the keyword exports this site was built against. Third-party estimates, not measured traffic.",
  },
  {
    label: "Observed on public competitor page",
    meaning: "Seen on a publicly accessible page. Recorded as an observation, never republished as fact.",
  },
  {
    label: "Reasonable inference",
    meaning:
      "A conclusion drawn from evidence rather than stated by a source. Labelled as inference wherever it appears.",
  },
  {
    label: "New implementation decision",
    meaning: "A choice made by this site, with the reasoning recorded rather than presented as an external requirement.",
  },
];

export default function EditorialPolicyPage() {
  const record = requireRoute(ROUTE);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs route={ROUTE} />
        <PageHeader
          record={record}
          intro="The rules this site writes under, stated so you can hold it to them."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer>{record.quickAnswer}</QuickAnswer>

          <Section id="sourcing" heading="Sourcing standard">
            <ul className="flex flex-col gap-3 text-[--color-text-muted]">
              <li>
                Every time-sensitive claim — a rate, a minimum, a fee percentage,
                an eligibility rule — is tied to an official source and carries
                the date it was last checked.
              </li>
              <li>
                Where an official source is silent, this site is silent too.
                Processing times are the clearest example: Roblox publishes no
                guaranteed timeline, so none is stated here, even though a number
                would be more satisfying to read.
              </li>
              <li>
                Competitor pages are research, not sources. Nothing is repeated
                because another site says it.
              </li>
              <li>
                Numerical examples are recomputed from the rate registry rather
                than copied from anywhere.
              </li>
            </ul>
          </Section>

          <Section
            id="labels"
            heading="How claims are labelled"
            description="Every research conclusion in this project's documentation carries one of these labels. An inference is never quietly promoted to a fact."
          >
            <dl className="flex flex-col gap-3">
              {LABELS.map((entry) => (
                <div
                  key={entry.label}
                  className="rounded-[--radius-control] border border-[--color-border] bg-[--color-surface] p-4"
                >
                  <dt className="text-sm font-semibold text-[--color-text]">{entry.label}</dt>
                  <dd className="mt-1 text-sm text-[--color-text-muted]">{entry.meaning}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section id="never" heading="What this site never publishes">
            <ul className="flex list-disc flex-col gap-2 pl-5 text-[--color-text-muted]">
              <li>Invented testimonials, ratings, review counts or user numbers.</li>
              <li>An author biography or credential that does not correspond to a real person.</li>
              <li>A rate without a source and a verification date.</li>
              <li>An exchange rate presented as live when it came from a stored snapshot.</li>
              <li>A tax figure for your country.</li>
              <li>A claim that a DevEx request will be approved.</li>
              <li>
                A page created only because a keyword exists. A page has to answer
                something the rest of the site does not.
              </li>
              <li>
                Structured data describing something the page does not visibly
                contain.
              </li>
            </ul>
          </Section>

          <Section id="review" heading="Review cadence">
            <p className="text-[--color-text-muted]">
              Rate-sensitive content is reviewed every{" "}
              {rateRegistry.reviewCadenceDays} days, and escalates to a required
              manual review after {rateRegistry.criticalReviewAgeDays}. The build
              tracks the age of the rate registry and surfaces it on every
              rate-sensitive page, so a stale figure is visible to readers rather
              than only to whoever maintains the site.
            </p>
            <p className="mt-3 text-[--color-text-muted]">
              A figure is never left online because it performs well in search
              after it stops being accurate. If it is wrong, it changes, and the
              change is recorded.{" "}
              <InlineLink href="/corrections/">
                How corrections work
              </InlineLink>{" "}
              ·{" "}
              <InlineLink href="/changelog/">What has changed so far</InlineLink>
            </p>
          </Section>

          <RelatedLinks
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
