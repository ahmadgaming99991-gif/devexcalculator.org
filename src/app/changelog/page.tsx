import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge, Container, InlineLink, Section, SourceLink } from "@/components/ui";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";
import { formatDate } from "@/lib/calculations/format";
import { rateRegistry } from "@/lib/calculations/rate-registry";

const ROUTE = "/changelog/";

export const metadata: Metadata = buildMetadata(ROUTE);

/**
 * The public changelog.
 *
 * Records what this site did, dated. Deliberately starts at launch rather than
 * inventing a back-history — an empty-looking changelog on a new site is
 * honest, and a fabricated one would undermine everything else on the page.
 */
interface ChangeEntry {
  readonly date: string;
  readonly kind: "rate" | "content" | "site";
  readonly title: string;
  readonly detail: string;
  readonly sourceUrl?: string;
  readonly sourceLabel?: string;
}

const ENTRIES: readonly ChangeEntry[] = [
  {
    date: "2026-08-17T00:00:00Z",
    kind: "rate",
    title: "Rate registry established and verified",
    detail:
      "Standard rate recorded at 0.0038 USD per eligible Earned Robux (114 USD per 30,000), the legacy rate at 0.0035 for balances earned before 5 September 2025 at 10:00 PT, and the conditional U.S. 18+ rate at 0.0054. The 30,000 Earned Robux minimum and the full eligibility list were verified at the same time. All checked directly against the Roblox Creator Hub DevEx documentation.",
    sourceUrl: "https://create.roblox.com/docs/production/monetization/developer-exchange",
    sourceLabel: "Roblox Creator Hub — Developer Exchange",
  },
  {
    date: "2026-08-17T00:00:00Z",
    kind: "rate",
    title: "Marketplace commission rates recorded",
    detail:
      "In-experience purchases recorded at 70% to the creator and 30% to Roblox. Marketplace avatar item sales recorded with the progressive revenue share table from 30% at the price floor to 70% at six times the floor. Avatar items sold inside an experience recorded as 30% creator, 40% experience owner, 30% Roblox.",
    sourceUrl: "https://create.roblox.com/docs/marketplace/marketplace-fees-and-commissions",
    sourceLabel: "Roblox Creator Hub — Marketplace fees and commissions",
  },
  {
    date: "2026-08-17T00:00:00Z",
    kind: "site",
    title: "Bulgarian lev removed from supported currencies",
    detail:
      "The European Central Bank stopped publishing a BGN reference rate after 31 December 2025. Rather than continue showing a rate frozen at that date, BGN was removed from the currency selector. Listing a currency the configured provider no longer supplies would misrepresent how current the figure is.",
    sourceUrl: "https://data-api.ecb.europa.eu/",
    sourceLabel: "ECB Data Portal — Exchange Rates",
  },
  {
    date: "2026-08-17T00:00:00Z",
    kind: "site",
    title: "Site launched",
    detail:
      "Initial release: DevEx calculator with quick, split and target modes; Robux to USD and payout target pages; marketplace fee calculator; conversion hub with eight curated amount pages; and the full guide and trust set. Every rate-sensitive page carries a source citation and verification date from launch.",
  },
];

const KIND_LABELS: Record<ChangeEntry["kind"], { label: string; tone: "warning" | "info" | "neutral" }> = {
  rate: { label: "Rate data", tone: "warning" },
  content: { label: "Content", tone: "info" },
  site: { label: "Site", tone: "neutral" },
};

export default function ChangelogPage() {
  const record = requireRoute(ROUTE);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs route={ROUTE} />
        <PageHeader
          record={record}
          intro="What changed on this site, when, and which source justified it."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer jumpTo="entries" jumpLabel="See the entries">
            {record.quickAnswer}
          </QuickAnswer>

          <Section
            id="entries"
            heading="Change history"
            description={`Rate registry version ${rateRegistry.registryVersion}, last verified ${formatDate(rateRegistry.lastVerifiedAt)}.`}
          >
            <ol className="flex flex-col gap-4">
              {ENTRIES.map((entry, index) => {
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

          <RelatedLinks
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
