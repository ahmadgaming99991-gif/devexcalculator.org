import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge, Callout, Container, InlineLink, Section, SourceLink } from "@/components/ui";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";
import { formatDate } from "@/lib/calculations/format";
import { rateRegistry } from "@/lib/calculations/rate-registry";
import { changelogEntries, type ChangeEntry } from "@/lib/content/changelog";

const ROUTE = "/changelog/";


/**
 * The public changelog.
 *
 * Records what this site did, dated. Deliberately starts at launch rather than
 * inventing a back-history — an empty-looking changelog on a new site is
 * honest, and a fabricated one would undermine everything else on the page.
 */

const KIND_LABELS: Record<ChangeEntry["kind"], { label: string; tone: "warning" | "info" | "neutral" }> = {
  rate: { label: "Rate data", tone: "warning" },
  content: { label: "Content", tone: "info" },
  site: { label: "Site", tone: "neutral" },
};

export async function ChangelogView({ locale }: { readonly locale: Locale }) {
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro="What changed on this site, when, and which source justified it."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="entries" jumpLabel="See the entries">
            {record.quickAnswer}
          </QuickAnswer>

          <Section
            id="entries"
            heading="Change history"
            description={`Rate registry version ${rateRegistry.registryVersion}, last verified ${formatDate(rateRegistry.lastVerifiedAt)}.`}
          >
            {/*
              A rate change is the one event on this site worth being told
              about rather than checking for, and until now the only way to
              learn of one was to come back and read this page.
            */}
            <Callout tone="info" title="Subscribe instead of checking back">
              Every entry here is published as a feed:{" "}
              <SourceLink href="/feed.xml">Atom</SourceLink> for a feed reader,
              or <SourceLink href="/feed.json">JSON Feed</SourceLink> for
              anything that would rather not parse XML. Both carry the same
              entries and the same source links. If you depend on these figures,{" "}
              <InlineLink href="/api/">the rates API</InlineLink> publishes the
              current values with their verification date attached.
            </Callout>

            <ol className="mt-6 flex flex-col gap-4">
              {changelogEntries.map((entry, index) => {
                const kind = KIND_LABELS[entry.kind];
                return (
                  <li
                    key={`${entry.date}-${index}`}
                    className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={kind.tone}>{kind.label}</Badge>
                      <time
                        dateTime={entry.date}
                        className="text-sm font-medium text-(--color-text-muted)"
                      >
                        {formatDate(entry.date)}
                      </time>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-(--color-text)">
                      {entry.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-(--color-text-muted)">{entry.detail}</p>
                    {entry.sourceUrl && entry.sourceLabel ? (
                      <p className="mt-2 text-sm">
                        <SourceLink href={entry.sourceUrl}>{entry.sourceLabel}</SourceLink>
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </Section>

          <Section
            id="scope"
            heading="What gets recorded here"
            description="This changelog tracks what this site did. What Roblox did is tracked separately."
          >
            <p className="text-(--color-text-muted)">
              Any change to a published rate, minimum or fee percentage appears
              here with its date and source. So does any correction to a figure
              that turned out to be wrong — those are not quietly edited away.
              Routine content edits and typo fixes are not listed, because a
              changelog that records everything records nothing useful.
            </p>
            <p className="mt-3 text-(--color-text-muted)">
              For the history of the DevEx rate itself, including the September
              2025 change,{" "}
              <InlineLink href="/devex-rate-history/">
                see the rate history page
              </InlineLink>
              . For how corrections are handled,{" "}
              <InlineLink href="/corrections/">see the corrections policy</InlineLink>.
            </p>
          </Section>

          <RelatedLinks locale={locale}
            record={record}
            relationships={["sibling", "next-step", "parent"]}
            heading="Related pages"
            id="related"
          />
        </div>
      </Container>
    </>
  );
}
