import type { Metadata } from "next";
import { cache } from "react";
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
import { MultiSeriesChart, Sparkline, TimeSeriesChart } from "@/components/charts";
import {
  approvalPercent,
  DISPLAY_LIMIT,
  EXPERIENCE_CACHE_SECONDS,
  experienceUrl,
  fetchRankings,
  type ExperienceObservation,
  type PlatformTotal,
  type Ranking,
} from "@/lib/platform/roblox-api";
import {
  CHART_WINDOWS,
  COLLECTION_INTERVAL_MINUTES,
  DEFAULT_CHART_WINDOW,
  describeSpan,
  MINIMUM_POINTS_FOR_CHART,
  everyGameSeries,
  gameSeries,
  GAME_HISTORY_POINTS,
  largestExperienceSeries,
  readGameHistory,
  readSeries,
  resolveChartWindow,
  RETENTION_DAYS,
  sliceSeries,
  summarise,
  windowCounts,
  type ChartWindow,
  type GameHistory,
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
 * The upstream response is edge-cached for the collection interval, so this is a
 * cache read for almost every visitor rather than a call to Roblox.
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
  const days = typeof params.days === "string" ? params.days : undefined;
  const chartWindow = resolveChartWindow(days);
  const experience =
    typeof params.experience === "string" ? Number(params.experience) : undefined;

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
              edge-cached for the collection interval, so all but one request in
              that window is a cache read, and every call carries its own
              timeout — a slow Roblox produces a stated outage, not a hanging
              page.
            */}
            <LiveExperiences
              requested={requested}
              window={chartWindow}
              experience={Number.isFinite(experience) ? experience : undefined}
            />
          </Section>

          <Section
            id="experiences-over-time"
            heading="Top experiences over time"
            description="Every experience this site is tracking, on one set of axes, from the counts recorded every 15 minutes. The eight busiest carry a colour and a name; the rest are drawn behind them so the shape of the whole ranking is visible."
          >
            <TopExperiencesOverTime />
          </Section>

          <Section
            id="largest"
            heading="The busiest single experience"
            description="The highest player count any one experience held at each observation — the platform's peak title rather than its total, which move independently."
          >
            <LargestExperience />
          </Section>

          <Section
            id="history"
            heading="Observed over time"
            description="Every 15 minutes this site records the total players across the experiences Roblox is ranking, and charts what it has. The window grows as observations accumulate; nothing is back-filled."
          >
            {/* Same reasoning as above; this one is a KV read, so there was
                little to stream in the first place. */}
            <ObservedHistory window={chartWindow} selectedRanking={requested} />
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
 * A link to this page with one selection changed and the rest kept.
 *
 * Both switchers go through here. They used to build their own URLs, and the
 * ranking tabs quietly dropped `days`: choosing a 24-hour chart and then a
 * different ranking reset the range to fourteen days. A parameter that only
 * one control remembers is a parameter that will be forgotten.
 *
 * Defaults are omitted rather than written out, so the plain `/platform/` URL
 * stays the canonical one instead of collecting redundant query strings.
 */
function platformHref({
  ranking,
  days,
  experience,
  hash,
}: {
  ranking?: string;
  days?: number;
  experience?: number;
  hash?: string;
}): string {
  const query = new URLSearchParams();
  if (ranking) query.set("ranking", ranking);
  if (days !== undefined && days !== DEFAULT_CHART_WINDOW.days) {
    query.set("days", String(days));
  }
  if (experience !== undefined) query.set("experience", String(experience));
  const search = query.toString();
  return `${ROUTE}${search ? `?${search}` : ""}${hash ?? ""}`;
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
  days,
}: {
  rankings: readonly Ranking[];
  selectedId: string;
  days: number;
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
                href={platformHref({
                  ranking: current ? undefined : ranking.id,
                  days,
                })}
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

async function LiveExperiences({
  requested,
  window: chartWindow,
  experience,
}: {
  requested?: string;
  window: ChartWindow;
  experience?: number;
}) {
  // Both are wanted by the same section, and neither depends on the other.
  const [result, history] = await Promise.all([fetchRankings(requested), loadGameHistory()]);

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

  const { platform } = result.data;
  const totalPlaying = experiences.reduce((sum, entry) => sum + entry.playing, 0);
  const hasVisits = experiences.some((entry) => entry.visits !== null);
  const hasVotes = experiences.some((entry) => approvalPercent(entry) !== null);
  const hasGenre = experiences.some((entry) => entry.genre !== null);
  const busiest = experiences.reduce((best, entry) =>
    entry.playing > best.playing ? entry : best,
  );

  return (
    <div className="min-w-0">
      <PlatformFigure platform={platform} observedAt={result.observedAt} />

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Players in this ranking" value={numberFormat.format(totalPlaying)} />
        <Stat label="Experiences shown" value={`${experiences.length} of ${selected.size}`} />
        <Stat label="Roblox ranking" value={selected.name} />
        <Stat label="Busiest right now" value={busiest.name} />
      </div>

      <RankingTabs rankings={rankings} selectedId={selected.id} days={chartWindow.days} />

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
              {history ? <Th>Last 24h</Th> : null}
              {hasVisits ? <Th>Lifetime visits</Th> : null}
              {hasVotes ? <Th>Approval</Th> : null}
              {hasGenre ? <Th>Genre</Th> : null}
            </tr>
          </thead>
          <tbody>
            {experiences.map((row, index) => (
              <ExperienceRow
                key={row.universeId}
                experience={row}
                rank={index + 1}
                showVisits={hasVisits}
                showVotes={hasVotes}
                showGenre={hasGenre}
                history={history}
                ranking={requested}
                days={chartWindow.days}
              />
            ))}
          </tbody>
        </Table>
      </TableWrapper>

      {history && experience !== undefined && history.players[String(experience)] ? (
        <ExperienceDetail
          history={history}
          universeId={experience}
          ranking={requested}
          days={chartWindow.days}
        />
      ) : null}

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

/**
 * A shared, guarded read of the per-experience history.
 *
 * Three sections want it — the table's sparklines, the multi-series chart and
 * the busiest-experience record — and each states its own absence rather than
 * throwing: a missing binding or an unreadable store is a fact about this
 * deployment, not a reason for the page to fail.
 *
 * Wrapped in `cache` so those three are one read and one parse per request
 * rather than three. The stored value is tens of kilobytes now and grows
 * towards a couple of hundred as observations accumulate, so reading it three
 * times was work that would have got steadily worse.
 */
const loadGameHistory = cache(async (): Promise<GameHistory | null> => {
  const store = await getHistoryStore();
  if (!store) return null;
  return readGameHistory(store).catch(() => null);
});

function HistoryUnavailable({ what }: { what: string }) {
  return (
    <Callout tone="info" title={`${what} is not available in this environment`}>
      Per-experience counts are stored in a Cloudflare KV namespace bound to the
      deployed Worker. Without that binding there is nothing recorded to draw,
      which is why this says so rather than showing an empty axis.
    </Callout>
  );
}

async function TopExperiencesOverTime() {
  const history = await loadGameHistory();
  if (!history) return <HistoryUnavailable what="Per-experience history" />;

  const tracked = everyGameSeries(history);
  const plottable = tracked.filter((entry) => entry.series.points.length >= 2);

  if (plottable.length === 0) {
    return (
      <Callout tone="info" title="Not enough observations yet to draw lines">
        {tracked.length === 0
          ? "No per-experience counts have been recorded yet."
          : `${tracked.length} experiences have been seen once each.`}{" "}
        A line needs at least two observations of the same experience, so the
        chart appears after the next collection run rather than joining a single
        point to itself.
      </Callout>
    );
  }

  return (
    <div className="min-w-0">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Experiences tracked" value={numberFormat.format(tracked.length)} />
        <Stat
          label="Observations held"
          value={numberFormat.format(history.at.length)}
          note={`Kept for the last ${(GAME_HISTORY_POINTS * COLLECTION_INTERVAL_MINUTES) / 60} hours`}
        />
        <Stat
          label="Busiest tracked"
          value={plottable[0]?.name ?? "—"}
          note={
            plottable[0]
              ? `${numberFormat.format(plottable[0].latest)} players at the last observation`
              : undefined
          }
        />
      </div>

      <div className="mt-6">
        <MultiSeriesChart
          series={plottable.map((entry) => ({
            id: entry.id,
            name: entry.name,
            latest: entry.latest,
            points: entry.series.points.map((point) => ({
              at: point.at,
              value: point.totalPlaying,
            })),
          }))}
          caption={`The ${Math.min(plottable.length, 48)} busiest of ${numberFormat.format(tracked.length)} tracked experiences, from observations recorded every ${COLLECTION_INTERVAL_MINUTES} minutes. Each point was measured; nothing between two points is drawn as though it were. Every experience in the table above has its own trend line there, and the figures behind this picture are in that table as text.`}
          formatValue={(value) => compact(value)}
        />
      </div>
    </div>
  );
}

async function LargestExperience() {
  const history = await loadGameHistory();
  if (!history) return <HistoryUnavailable what="The busiest-experience record" />;

  const { series, leaders } = largestExperienceSeries(history);
  const summary = summarise(series);
  const latest = series.points[series.points.length - 1];

  if (!series.chartable) {
    return (
      <Callout tone="info" title="Not enough observations yet">
        {series.points.length} observation{series.points.length === 1 ? "" : "s"} so
        far. A chart needs {MINIMUM_POINTS_FOR_CHART} to be a line rather than a dot.
      </Callout>
    );
  }

  return (
    <div className="min-w-0">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Busiest right now"
          value={numberFormat.format(latest?.totalPlaying ?? 0)}
          note={latest ? leaders[latest.at] : undefined}
        />
        {summary ? (
          <Stat
            label="Highest observed"
            value={numberFormat.format(summary.peak.totalPlaying)}
            note={`${leaders[summary.peak.at] ?? ""} · ${formatObserved(summary.peak.at)}`}
          />
        ) : null}
        {summary ? (
          <Stat
            label="Lowest observed"
            value={numberFormat.format(summary.low.totalPlaying)}
            note={`${leaders[summary.low.at] ?? ""} · ${formatObserved(summary.low.at)}`}
          />
        ) : null}
      </div>

      <div className="mt-6">
        <TimeSeriesChart
          points={series.points.map((point) => ({ at: point.at, value: point.totalPlaying }))}
          caption={`The highest player count held by any single experience at each observation, over the ${describeSpan(series)} recorded. The leading experience changes; this line follows the count, not one title.`}
          formatValue={(value) => compact(value)}
        />
      </div>

      <p className="mt-4 text-sm text-(--color-text-muted)">
        &ldquo;Highest observed&rdquo; means the highest this site saw at one of its
        own observations. It is not an all-time record: nothing before this site
        began watching is known to it, and it will not borrow a figure it did not
        measure. <Badge tone="neutral">Recorded by this site</Badge>
      </p>
    </div>
  );
}

/**
 * The platform-wide figure.
 *
 * The number a reader comes to a page like this for, and the one Roblox does
 * not publish. It is stated as exactly what it is — the sum across every
 * experience in every public Roblox ranking, each counted once — and described
 * as a floor rather than a total, because Roblox ranks a fraction of what it
 * hosts. Presenting it as "players online right now" would be a bigger,
 * rounder, wrong number, and the method is printed beside it so nobody has to
 * take this site's word for how it was reached.
 */
function PlatformFigure({
  platform,
  observedAt,
}: {
  platform: PlatformTotal;
  observedAt: string;
}) {
  return (
    <Card>
      <p className="text-sm text-(--color-text-muted)">
        Players across every experience Roblox is ranking
      </p>
      <p className="tabular mt-1 text-4xl font-bold break-words text-(--color-text) sm:text-5xl">
        {numberFormat.format(platform.players)}
      </p>
      <p className="mt-3 text-sm text-(--color-text-muted)">
        Summed from {numberFormat.format(platform.experiences)} experiences across
        Roblox&rsquo;s {platform.rankings} public rankings, counted once each even
        where a ranking lists the same experience twice, as read at{" "}
        <time dateTime={observedAt}>{formatObserved(observedAt)}</time>.
      </p>
      <p className="mt-2 text-sm text-(--color-text-muted)">
        <strong className="text-(--color-text)">This is a floor, not a platform total.</strong>{" "}
        Roblox publishes no live figure for the whole platform and this site does
        not estimate one. Roblox ranks a small share of the experiences it hosts,
        so the real number of people playing is higher than this — by how much,
        nobody outside Roblox can say.
      </p>
    </Card>
  );
}

/**
 * One experience's own chart, shown when a reader asks for it.
 *
 * Rendered for a single experience rather than expanding every row, because
 * ninety full charts on one page is work the Worker does not have the budget
 * for and nobody reads. Selecting one is a link, so it survives without
 * JavaScript and can be shared.
 */
function ExperienceDetail({
  history,
  universeId,
  ranking,
  days,
}: {
  history: GameHistory;
  universeId: number;
  ranking?: string;
  days: number;
}) {
  const series = gameSeries(history, universeId);
  const name = history.names[String(universeId)] ?? "This experience";
  const summary = summarise(series);

  return (
    <div id="experience" className="mt-6">
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-lg font-bold text-(--color-text)">{name}</h3>
        <InlineLink href={platformHref({ ranking, days, hash: "#live" })}>
          Close this chart
        </InlineLink>
      </div>

      {series.chartable ? (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Stat
              label="Observations"
              value={numberFormat.format(series.points.length)}
              note={`Over ${describeSpan(series)}`}
            />
            {summary ? (
              <Stat
                label="Observed peak"
                value={numberFormat.format(summary.peak.totalPlaying)}
                note={formatObserved(summary.peak.at)}
              />
            ) : null}
            {summary ? (
              <Stat
                label="Observed low"
                value={numberFormat.format(summary.low.totalPlaying)}
                note={formatObserved(summary.low.at)}
              />
            ) : null}
          </div>

          <div className="mt-6">
            <TimeSeriesChart
              points={series.points.map((point) => ({
                at: point.at,
                value: point.totalPlaying,
              }))}
              caption={`Players in ${name}, over the ${describeSpan(series)} this site has observations for. Each point is one recorded observation; gaps are gaps in collection, not zeroes.`}
              formatValue={(value) => compact(value)}
            />
          </div>
        </>
      ) : (
        <p className="mt-3 text-(--color-text-muted)">
          Only {series.points.length} observation
          {series.points.length === 1 ? "" : "s"} of this experience{" "}
          {series.points.length === 1 ? "has" : "have"} been recorded, which is not
          enough to draw a line. Per-experience counts are kept for the last{" "}
          {GAME_HISTORY_POINTS * COLLECTION_INTERVAL_MINUTES / 60} hours, and an
          experience is only recorded while Roblox is ranking it.
        </p>
      )}
    </Card>
    </div>
  );
}

function ExperienceRow({
  experience,
  rank,
  showVisits,
  showVotes,
  showGenre,
  history,
  ranking,
  days,
}: {
  experience: ExperienceObservation;
  rank: number;
  showVisits: boolean;
  showVotes: boolean;
  showGenre: boolean;
  history: GameHistory | null;
  ranking?: string;
  days: number;
}) {
  const url = experienceUrl(experience);
  const approval = approvalPercent(experience);
  const trend = history ? gameSeries(history, experience.universeId) : null;

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
      {history ? (
        <Td>
          {trend && trend.points.length >= 2 ? (
            <Link
              href={platformHref({
                ranking,
                days,
                experience: experience.universeId,
                hash: "#experience",
              })}
              scroll={false}
              className="inline-flex min-h-[44px] items-center rounded-(--radius-control) px-1 motion-safe:transition-opacity hover:opacity-70"
            >
              <Sparkline
                points={trend.points.map((point) => ({
                  at: point.at,
                  value: point.totalPlaying,
                }))}
              />
              <span className="sr-only">
                Chart the last 24 hours for {experience.name}
              </span>
            </Link>
          ) : (
            <span className="text-sm text-(--color-text-muted)">
              not tracked yet
              <span className="sr-only">
                {" "}— this experience has not been observed enough times to draw a line
              </span>
            </span>
          )}
        </Td>
      ) : null}
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

/**
 * The chart range switcher.
 *
 * Same technique as the ranking tabs: real links, server-rendered, no client
 * JavaScript. Selecting a range narrows which stored observations are plotted;
 * it never stretches a short history across a longer axis. Early on, "14 days"
 * and "24 hours" legitimately draw the same points, and the caption says how
 * much was actually collected so the axis cannot imply more.
 */
function ChartRangeTabs({
  selected,
  ranking,
  counts,
}: {
  selected: ChartWindow;
  ranking?: string;
  /** Observations each range would chart, so a button that changes nothing says so. */
  counts?: Record<number, number>;
}) {
  return (
    <nav aria-label="Chart range" className="mb-6">
      <ul className="flex flex-wrap gap-2">
        {CHART_WINDOWS.map((option) => {
          const current = option.days === selected.days;
          return (
            <li key={option.days}>
              <Link
                href={platformHref({ ranking, days: option.days, hash: "#history" })}
                scroll={false}
                aria-current={current ? "true" : undefined}
                className={
                  current
                    ? "inline-flex min-h-[44px] items-center rounded-(--radius-control) border border-(--color-primary) bg-(--color-primary) px-4 text-sm font-semibold text-(--color-on-primary)"
                    : "inline-flex min-h-[44px] items-center rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) px-4 text-sm font-semibold text-(--color-text) motion-safe:transition-colors hover:border-(--color-primary) hover:text-(--color-primary)"
                }
              >
                {option.label}
                {counts ? (
                  <span
                    className={
                      current
                        ? "ml-2 text-xs font-normal opacity-80"
                        : "ml-2 text-xs font-normal text-(--color-text-muted)"
                    }
                  >
                    {numberFormat.format(counts[option.days] ?? 0)}
                  </span>
                ) : null}
                <span className="sr-only">
                  {counts
                    ? `, ${counts[option.days] ?? 0} observations`
                    : ""}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

async function ObservedHistory({
  window: chartWindow,
  selectedRanking,
}: {
  window: ChartWindow;
  selectedRanking?: string;
}) {
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

  /*
   * Read once at the full retention window, then narrow in memory.
   *
   * Reading per range would be the obvious shape and would cost a store round
   * trip per view for no gain — the rollup is a single value, so every range is
   * already in hand. It also makes the counts below possible, which is what
   * stops the range buttons from looking broken.
   */
  let full: HistorySeries;
  try {
    full = await readSeries(store, RETENTION_DAYS);
  } catch {
    return (
      <Callout tone="warning" title="Recorded observations could not be read">
        The store did not answer. Live figures above are unaffected.
      </Callout>
    );
  }

  const counts = windowCounts(full);
  const series = sliceSeries(full, chartWindow.days);

  /*
   * Whether the chosen range is wider than anything collected.
   *
   * Thirteen hours of history sits inside all four ranges, so every button
   * charts the same points and a reader clicking through them sees no figure
   * move. That is correct behaviour and it looked exactly like a broken
   * control, so the page now says which it is.
   */
  const rangeExceedsHistory =
    full.points.length > 0 && full.spanHours < chartWindow.days * 24;

  if (series.points.length === 0) {
    return (
      <div className="min-w-0">
        <ChartRangeTabs selected={chartWindow} ranking={selectedRanking} counts={counts} />
        <Callout tone="info" title={`No observations recorded in the last ${chartWindow.label}`}>
          Nothing has been stored for this range. Where the scheduled job is
          running, an observation is written every {COLLECTION_INTERVAL_MINUTES}{" "}
          minutes and the chart appears once there are {MINIMUM_POINTS_FOR_CHART} of
          them. A wider range may hold more; what it will never do is invent a point
          to fill this one.
        </Callout>
      </div>
    );
  }

  const latest = series.points[series.points.length - 1];
  const summary = summarise(series);

  if (!series.chartable) {
    return (
      <div className="min-w-0">
        <ChartRangeTabs selected={chartWindow} ranking={selectedRanking} counts={counts} />
        <Card tone="subtle">
          <p className="text-(--color-text)">
            <strong>{series.points.length}</strong> observation
            {series.points.length === 1 ? " falls" : "s fall"} within the last{" "}
            {chartWindow.label}, the most recent showing{" "}
            {numberFormat.format(latest?.totalPlaying ?? 0)} players. A chart needs at
            least {MINIMUM_POINTS_FOR_CHART} points to be a line rather than a dot, so
            the figures are listed instead.
          </p>
          <ul className="mt-3 flex flex-col gap-1 text-sm text-(--color-text-muted)">
            {series.points.map((point) => (
              <li key={point.at} className="tabular">
                {formatObserved(point.at)} — {numberFormat.format(point.totalPlaying)}{" "}
                players
              </li>
            ))}
          </ul>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <ChartRangeTabs selected={chartWindow} ranking={selectedRanking} counts={counts} />

      {rangeExceedsHistory ? (
        <Callout
          tone="info"
          title={`Everything collected so far fits inside ${chartWindow.label}`}
        >
          This site has been observing for {describeSpan(full)}, which is less than
          the {chartWindow.label} selected — so this range and every wider one chart
          the same {numberFormat.format(full.points.length)} observations, and the
          figures do not change between them. They will diverge once there is more
          history than a range covers. Nothing is padded to fill the difference.
        </Callout>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Observations recorded"
          value={numberFormat.format(series.points.length)}
          note={
            rangeExceedsHistory
              ? "Every observation held — the range is wider than the history"
              : `Within the last ${chartWindow.label}`
          }
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
