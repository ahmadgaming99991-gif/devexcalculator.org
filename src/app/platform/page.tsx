import type { Metadata } from "next";
import Link from "next/link";
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
  approvalPercent,
  DISPLAY_LIMIT,
  EXPERIENCE_CACHE_SECONDS,
  experienceUrl,
  fetchRankings,
  type ExperienceObservation,
  type Ranking,
} from "@/lib/platform/roblox-api";
import {
  COLLECTION_INTERVAL_MINUTES,
  describeSpan,
  MINIMUM_POINTS_FOR_CHART,
  readSeries,
  RETENTION_DAYS,
  summarise,
  type HistorySeries,
  type HistoryStore,
} from "@/lib/platform/history";

const ROUTE = "/platform/";

/**
 * Canonical stays `/platform/` for every ranking.
 *
 * The ranking is a query parameter on one page, not a page of its own: the
 * commentary, the history and the sourcing are identical, and only the table
 * changes. Emitting a canonical per ranking would ask search engines to index
 * five near-identical pages.
 */
export const metadata: Metadata = buildMetadata(ROUTE);

/**
 * Live figures, so the page is rendered per request rather than at build time.
 * The upstream response is cached for five minutes, so this is a cache read for
 * almost every visitor rather than a call to Roblox.
 */
export const revalidate = 0;

const numberFormat = new Intl.NumberFormat("en-US");

interface PageProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PlatformPage({ searchParams }: PageProps) {
  const record = requireRoute(ROUTE);
  const params = await searchParams;
  const requested = typeof params.ranking === "string" ? params.ranking : undefined;

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs route={ROUTE} />
        <PageHeader
          record={record}
          intro="Live player counts from Roblox's own public endpoints, across every ranking Roblox publishes, and a record of what this site has observed since it started watching."
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
            {/*
              Awaited inline rather than streamed behind Suspense.

              A Suspense boundary looked like the careful choice — a slow
              upstream would delay one section instead of the page — but React
              delivers streamed content in a hidden holder and moves it into
              place with an inline script. With JavaScript off that script never
              runs, so this table, the entire live section, simply never
              appeared: `#live table` did not exist in the DOM. The page claimed
              to work without JavaScript and the test that checked it only
              measured the static commentary around the hole.

              Blocking is affordable here because the upstream response is
              edge-cached, so all but one request in five minutes is a cache
              read, and both calls carry their own timeout — a slow Roblox
              produces a stated outage, not a hanging page.
            */}
            <LiveExperiences requested={requested} />
          </Section>

          <Section
            id="history"
            heading="Observed over time"
            description="Every 15 minutes this site records the total players across the experiences Roblox is ranking, and charts what it has. The window grows as observations accumulate; nothing is back-filled."
          >
            {/* Same reasoning as above; this one is a KV read, so there was
                little to stream in the first place. */}
            <ObservedHistory />
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
              Which experiences appear, how many players each has, and how each has
              been voted on all come from Roblox. This site does not rank
              experiences, does not estimate player counts, and does not publish a
              figure it did not either read from Roblox or observe itself and label
              as such. The approval share is the only arithmetic on this page, and it
              is Roblox&rsquo;s own up and down vote counts divided. For the money
              side of the platform, see{" "}
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

/**
 * The ranking switcher.
 *
 * Plain links, server-rendered. Roblox publishes several rankings in one
 * response, so switching between them costs nothing upstream, and doing it with
 * links rather than a client component means it works with JavaScript off, is
 * crawlable, and adds no bytes to the bundle.
 */
function RankingTabs({
  rankings,
  selectedId,
}: {
  rankings: readonly Ranking[];
  selectedId: string;
}) {
  if (rankings.length < 2) return null;

  return (
    <nav aria-label="Roblox rankings" className="mt-6">
      <ul className="flex flex-wrap gap-2">
        {rankings.map((ranking) => {
          const current = ranking.id === selectedId;
          return (
            <li key={ranking.id}>
              <Link
                href={current ? ROUTE : `${ROUTE}?ranking=${encodeURIComponent(ranking.id)}`}
                scroll={false}
                aria-current={current ? "true" : undefined}
                className={
                  current
                    ? "inline-flex min-h-[44px] items-center rounded-(--radius-control) border border-(--color-primary) bg-(--color-primary) px-4 text-sm font-semibold text-(--color-on-primary)"
                    : "inline-flex min-h-[44px] items-center rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) px-4 text-sm font-semibold text-(--color-text) motion-safe:transition-colors hover:border-(--color-primary) hover:text-(--color-primary)"
                }
              >
                {ranking.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

async function LiveExperiences({ requested }: { requested?: string }) {
  const result = await fetchRankings(requested);

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

  const { rankings, selected, experiences, detailsLoaded } = result.data;

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
  const hasVotes = experiences.some((entry) => approvalPercent(entry) !== null);
  const hasGenre = experiences.some((entry) => entry.genre !== null);
  const busiest = experiences.reduce((best, entry) =>
    entry.playing > best.playing ? entry : best,
  );

  return (
    <div className="min-w-0">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Players in these experiences" value={numberFormat.format(totalPlaying)} />
        <Stat label="Experiences shown" value={`${experiences.length} of ${selected.size}`} />
        <Stat label="Roblox ranking" value={selected.name} />
        <Stat label="Busiest right now" value={busiest.name} />
      </div>

      <RankingTabs rankings={rankings} selectedId={selected.id} />

      <p className="mt-4 text-sm text-(--color-text-muted)">
        {selected.subtitle ? `${selected.subtitle}. ` : null}
        Observed{" "}
        <time dateTime={result.observedAt}>{formatObserved(result.observedAt)}</time>.{" "}
        Source:{" "}
        <SourceLink href="https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=devexcalculator">
          Roblox explore endpoint
        </SourceLink>
        {hasVisits ? (
          <>
            {" "}and{" "}
            <SourceLink href="https://games.roblox.com/v1/games">
              Roblox games endpoint
            </SourceLink>
          </>
        ) : null}
        .
      </p>

      <TableWrapper label={`Experiences in Roblox's ${selected.name} ranking`}>
        <Table
          caption={`The top ${experiences.length} experiences in Roblox's ${selected.name} ranking, with the players in each at the moment this page was served.`}
        >
          <thead>
            <tr>
              <Th>#</Th>
              <Th>Experience</Th>
              <Th>Players now</Th>
              {hasVisits ? <Th>Lifetime visits</Th> : null}
              {hasVotes ? <Th>Approval</Th> : null}
              {hasGenre ? <Th>Genre</Th> : null}
            </tr>
          </thead>
          <tbody>
            {experiences.map((experience, index) => (
              <ExperienceRow
                key={experience.universeId}
                experience={experience}
                rank={index + 1}
                showVisits={hasVisits}
                showVotes={hasVotes}
                showGenre={hasGenre}
              />
            ))}
          </tbody>
        </Table>
      </TableWrapper>

      {detailsLoaded ? null : (
        <p className="mt-3 text-sm text-(--color-text-muted)">
          Visit counts, favourites and creator names are omitted: the endpoint that
          supplies them did not answer for this request. Player counts and votes above
          come from the ranking itself and are unaffected.
        </p>
      )}

      <p className="mt-3 text-sm text-(--color-text-muted)">
        Roblox publishes {rankings.length} ranking
        {rankings.length === 1 ? "" : "s"}; this shows the first {DISPLAY_LIMIT} of
        whichever is selected. The order is Roblox&rsquo;s, not this site&rsquo;s.
      </p>
    </div>
  );
}

function ExperienceRow({
  experience,
  rank,
  showVisits,
  showVotes,
  showGenre,
}: {
  experience: ExperienceObservation;
  rank: number;
  showVisits: boolean;
  showVotes: boolean;
  showGenre: boolean;
}) {
  const url = experienceUrl(experience);
  const approval = approvalPercent(experience);

  return (
    <tr>
      <Td className="tabular">{rank}</Td>
      <Td>
        {url ? (
          <SourceLink href={url}>{experience.name}</SourceLink>
        ) : (
          experience.name
        )}
        {experience.isSponsored ? (
          <>
            {" "}
            <Badge tone="warning">Sponsored</Badge>
          </>
        ) : null}
        <span className="block text-sm text-(--color-text-muted)">
          {experience.creatorName ? (
            <>
              by {experience.creatorName}
              {experience.creatorVerified ? " (verified)" : ""}
            </>
          ) : null}
          {experience.creatorName && experience.maturity ? " · " : null}
          {experience.maturity}
          {experience.favourites !== null ? (
            <>
              {experience.creatorName || experience.maturity ? " · " : null}
              {numberFormat.format(experience.favourites)} favourites
            </>
          ) : null}
        </span>
      </Td>
      <Td className="tabular">{numberFormat.format(experience.playing)}</Td>
      {showVisits ? (
        <Td className="tabular">
          {experience.visits === null ? "—" : numberFormat.format(experience.visits)}
        </Td>
      ) : null}
      {showVotes ? (
        <Td className="tabular">
          {approval === null ? (
            "—"
          ) : (
            <>
              {approval.toFixed(1)}%
              <span className="block text-xs text-(--color-text-muted)">
                {numberFormat.format((experience.upVotes ?? 0) + (experience.downVotes ?? 0))}{" "}
                votes
              </span>
            </>
          )}
        </Td>
      ) : null}
      {showGenre ? <Td>{experience.genre ?? "—"}</Td> : null}
    </tr>
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
  const summary = summarise(series);

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Observations recorded"
          value={numberFormat.format(series.points.length)}
        />
        <Stat label="Period covered" value={describeSpan(series)} />
        <Stat
          label="Most recent total"
          value={numberFormat.format(latest?.totalPlaying ?? 0)}
          note={
            summary?.change
              ? `${signed(summary.change.absolute)} since the previous observation ${summary.change.minutesApart} minutes earlier`
              : undefined
          }
        />
        {summary ? (
          <Stat
            label="Observed peak"
            value={numberFormat.format(summary.peak.totalPlaying)}
            note={formatObserved(summary.peak.at)}
          />
        ) : null}
      </div>

      {summary ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Stat
            label="Observed low"
            value={numberFormat.format(summary.low.totalPlaying)}
            note={formatObserved(summary.low.at)}
          />
          <Stat
            label="Average across observations"
            value={numberFormat.format(summary.mean)}
            note={`Mean of ${numberFormat.format(series.points.length)} recorded points, not a platform average`}
          />
        </div>
      ) : null}

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
        a job. Peak, low and average describe these recorded points only — the total
        may have been higher between two observations, and this site does not claim
        otherwise. <Badge tone="neutral">Recorded by this site</Badge>
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

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card tone="subtle" className="min-w-0">
      <p className="text-sm text-(--color-text-muted)">{label}</p>
      <p className="tabular mt-1 text-xl font-bold break-words text-(--color-text)">{value}</p>
      {note ? <p className="mt-1 text-xs text-(--color-text-muted)">{note}</p> : null}
    </Card>
  );
}

function signed(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±";
  return `${sign}${numberFormat.format(Math.abs(value))}`;
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
