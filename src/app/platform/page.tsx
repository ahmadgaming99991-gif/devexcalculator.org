import type { Metadata } from "next";
import { Suspense } from "react";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import {
  Badge,
  Callout,
  Card,
  Container,
  InlineLink,
  Section,
  SourceLink,
  Table,
  TableWrapper,
  Td,
  Th,
} from "@/components/ui";
import {
  EstimateDisclaimer,
  FAQAccordion,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
} from "@/components/content";
import { TimeSeriesChart } from "@/components/charts";
import {
  EXPERIENCE_CACHE_SECONDS,
  fetchTopExperiences,
  type ExperienceObservation,
} from "@/lib/platform/roblox-api";
import {
  COLLECTION_INTERVAL_MINUTES,
  describeSpan,
  MINIMUM_POINTS_FOR_CHART,
  readSeries,
  RETENTION_DAYS,
  type HistorySeries,
  type HistoryStore,
} from "@/lib/platform/history";

const ROUTE = "/platform/";

export const metadata: Metadata = buildMetadata(ROUTE);

/**
 * Live figures, so the page is rendered per request rather than at build time.
 * The upstream response is cached for five minutes, so this is a cache read for
 * almost every visitor rather than a call to Roblox.
 */
export const revalidate = 0;

const numberFormat = new Intl.NumberFormat("en-US");

export default function PlatformPage() {
  const record = requireRoute(ROUTE);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs route={ROUTE} />
        <PageHeader
          record={record}
          intro="Live player counts from Roblox's own public endpoints, and a record of what this site has observed since it started watching."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer jumpTo="live" jumpLabel="See the live figures">
            {record.quickAnswer}
          </QuickAnswer>

          <Section
            id="live"
            heading="What is being played right now"
            description="Read from Roblox's public explore and games endpoints when this page was served. No account, no third-party data provider, and nothing measured or estimated by this site."
          >
            <Suspense fallback={<LiveSkeleton />}>
              {/* Awaited inside a boundary so a slow upstream delays this
                  section rather than the whole page. */}
              <LiveExperiences />
            </Suspense>
          </Section>

          <Section
            id="history"
            heading="Observed over time"
            description="Every 15 minutes this site records the total players across the experiences Roblox is ranking, and charts what it has. The window grows as observations accumulate; nothing is back-filled."
          >
            <Suspense fallback={<HistorySkeleton />}>
              <ObservedHistory />
            </Suspense>
          </Section>

          <Section id="how" heading="How this page gets its numbers">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card tone="subtle">
                <h3 className="font-semibold text-(--color-text)">Live figures</h3>
                <p className="mt-2 text-sm text-(--color-text-muted)">
                  Fetched server-side from Roblox when the page is served and cached
                  for {EXPERIENCE_CACHE_SECONDS / 60} minutes. Your browser makes no
                  request to Roblox, and no script from Roblox runs on this page.
                </p>
              </Card>
              <Card tone="subtle">
                <h3 className="font-semibold text-(--color-text)">History</h3>
                <p className="mt-2 text-sm text-(--color-text-muted)">
                  A scheduled job records one observation every{" "}
                  {COLLECTION_INTERVAL_MINUTES} minutes. Observations are kept for{" "}
                  {RETENTION_DAYS} days and then expire. The chart shows what was
                  actually recorded, gaps included.
                </p>
              </Card>
            </div>

            <Callout tone="info" title="Ranking and counts are Roblox's, the record is ours">
              Which experiences appear, and how many players each has, come from
              Roblox. This site does not rank experiences, does not estimate player
              counts, and does not publish a figure it did not either read from
              Roblox or observe itself and label as such. For the money side of the
              platform, see{" "}
              <InlineLink href="/roblox-stats/">the payout statistics</InlineLink>,
              which come from Roblox&rsquo;s filings.
            </Callout>
          </Section>

          <Section id="faqs" heading="Questions about these figures">
            <FAQAccordion faqs={record.faqs} />
          </Section>

          <EstimateDisclaimer />
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

function LiveSkeleton() {
  return (
    <Card tone="subtle">
      <p className="text-(--color-text-muted)">Loading live figures from Roblox&hellip;</p>
    </Card>
  );
}

function HistorySkeleton() {
  return (
    <Card tone="subtle">
      <p className="text-(--color-text-muted)">Loading recorded observations&hellip;</p>
    </Card>
  );
}

async function LiveExperiences() {
  const result = await fetchTopExperiences(10);

  if (!result.ok) {
    return (
      <Callout tone="warning" title="Roblox's live figures are unavailable right now">
        {result.reason} Nothing is shown in their place, because a stale or invented
        number would be worse than none. The rest of this site does not depend on
        this endpoint — the{" "}
        <InlineLink href="/">payout calculator</InlineLink> works regardless.
      </Callout>
    );
  }

  const { sortName, experiences } = result.data;

  if (experiences.length === 0) {
    return (
      <Callout tone="info" title="Roblox returned no experiences">
        The endpoint answered, but its ranking was empty. That is unusual and
        probably temporary.
      </Callout>
    );
  }

  const totalPlaying = experiences.reduce((sum, entry) => sum + entry.playing, 0);
  const hasVisits = experiences.some((entry) => entry.visits !== null);

  return (
    <div className="min-w-0">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Players in these experiences" value={numberFormat.format(totalPlaying)} />
        <Stat label="Experiences listed" value={String(experiences.length)} />
        <Stat label="Roblox ranking" value={sortName} />
      </div>

      <p className="mt-4 text-sm text-(--color-text-muted)">
        Observed{" "}
        <time dateTime={result.observedAt}>{formatObserved(result.observedAt)}</time>.{" "}
        Source:{" "}
        <SourceLink href="https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=devexcalculator">
          Roblox explore endpoint
        </SourceLink>
        .
      </p>

      <TableWrapper label={`Experiences in Roblox's ${sortName} ranking`}>
        <Table
          caption={`Experiences in Roblox's ${sortName} ranking, with the players in each at the moment this page was served.`}
        >
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Experience</Th>
              <Th>Players now</Th>
              {hasVisits ? <Th>Lifetime visits</Th> : null}
            </tr>
          </thead>
          <tbody>
            {experiences.map((experience, index) => (
              <tr key={experience.universeId}>
                <Td className="tabular">{index + 1}</Td>
                <Td>
                  {experience.name}
                  {experience.creatorName ? (
                    <span className="block text-sm text-(--color-text-muted)">
                      by {experience.creatorName}
                    </span>
                  ) : null}
                </Td>
                <Td className="tabular">{numberFormat.format(experience.playing)}</Td>
                {hasVisits ? (
                  <Td className="tabular">
                    {experience.visits === null ? "—" : numberFormat.format(experience.visits)}
                  </Td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrapper>

      {hasVisits ? null : (
        <p className="mt-3 text-sm text-(--color-text-muted)">
          Visit counts are omitted: the endpoint that supplies them did not answer for
          this request. Player counts above are unaffected.
        </p>
      )}
    </div>
  );
}

async function ObservedHistory() {
  const store = await getHistoryStore();

  if (!store) {
    return (
      <Callout tone="info" title="History is not available in this environment">
        Observations are stored in a Cloudflare KV namespace that is bound to the
        deployed Worker. Running locally without that binding, there is nothing to
        chart — which is why this says so rather than drawing an empty axis.
      </Callout>
    );
  }

  let series: HistorySeries;
  try {
    series = await readSeries(store);
  } catch {
    return (
      <Callout tone="warning" title="Recorded observations could not be read">
        The store did not answer. Live figures above are unaffected.
      </Callout>
    );
  }

  if (series.points.length === 0) {
    return (
      <Callout tone="info" title="No observations recorded yet">
        The store is reachable and empty. Where the scheduled job is running, the
        first observation is written within {COLLECTION_INTERVAL_MINUTES} minutes and
        the chart appears once there are {MINIMUM_POINTS_FOR_CHART} of them. Until
        then there is nothing to draw, and drawing nothing is the honest option.
      </Callout>
    );
  }

  const latest = series.points[series.points.length - 1];

  if (!series.chartable) {
    return (
      <Card tone="subtle">
        <p className="text-(--color-text)">
          <strong>{series.points.length}</strong> observation
          {series.points.length === 1 ? "" : "s"} recorded so far, the most recent
          showing {numberFormat.format(latest?.totalPlaying ?? 0)} players. A chart
          needs at least {MINIMUM_POINTS_FOR_CHART} points to be a line rather than a
          dot, so the figures are listed instead.
        </p>
        <ul className="mt-3 flex flex-col gap-1 text-sm text-(--color-text-muted)">
          {series.points.map((point) => (
            <li key={point.at} className="tabular">
              {formatObserved(point.at)} — {numberFormat.format(point.totalPlaying)} players
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  return (
    <div className="min-w-0">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Observations recorded"
          value={numberFormat.format(series.points.length)}
        />
        <Stat label="Period covered" value={describeSpan(series)} />
        <Stat
          label="Most recent total"
          value={numberFormat.format(latest?.totalPlaying ?? 0)}
        />
      </div>

      <div className="mt-6">
        <TimeSeriesChart
          points={series.points.map((point) => ({ at: point.at, value: point.totalPlaying }))}
          // Phrased so every span reads correctly. An earlier template produced
          // "over the under an hour this site has been observing" on day one,
          // because `describeSpan` returns a phrase, not a bare duration.
          caption={`Total players across the ranked experiences. This site has been observing for ${describeSpan(series)}. Each point is one recorded observation; gaps are gaps in collection, not zeroes.`}
          formatValue={(value) => compact(value)}
        />
      </div>

      <p className="mt-4 text-sm text-(--color-text-muted)">
        The window widens on its own as observations accumulate, up to{" "}
        {RETENTION_DAYS} days. Older observations expire rather than being deleted by
        a job. <Badge tone="neutral">Recorded by this site</Badge>
      </p>
    </div>
  );
}

/**
 * The KV binding, when there is one.
 *
 * Reached through the adapter's context rather than a global, and returns null
 * anywhere it is absent — local `next dev`, `next start`, and the build — so
 * the page renders a stated absence instead of throwing.
 */
async function getHistoryStore(): Promise<HistoryStore | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true });
    const binding = (context.env as Record<string, unknown>).PLATFORM_HISTORY;
    return binding ? (binding as HistoryStore) : null;
  } catch {
    return null;
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card tone="subtle" className="min-w-0">
      <p className="text-sm text-(--color-text-muted)">{label}</p>
      <p className="tabular mt-1 text-xl font-bold break-words text-(--color-text)">{value}</p>
    </Card>
  );
}

function formatObserved(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "an unknown time";
  return `${at.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

export type { ExperienceObservation };
