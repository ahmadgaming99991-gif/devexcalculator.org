import { getTranslator, type Translate } from "@/i18n/get-dictionary";
import { rich } from "@/i18n/rich";
import { localizedPath } from "@/i18n/locale-path";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { cache } from "react";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { DataDownload } from "@/components/content/data-download";
import { Badge, Callout, Card, Container, Foreign, InlineLink, Section, SourceLink, Table, TableWrapper, Td, Th } from "@/components/ui";
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
  type OutageReason,
  type PlatformTotal,
  type Ranking,
} from "@/lib/platform/roblox-api";
import {
  CHART_WINDOWS,
  chartWindowLabel,
  COLLECTION_INTERVAL_MINUTES,
  DEFAULT_CHART_WINDOW,
  describeSpan,
  MINIMUM_POINTS_FOR_CHART,
  everyGameSeries,
  gameSeries,
  GAME_HISTORY_DAYS,
  GAME_HISTORY_INTERVAL_MINUTES,
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
} from "@/lib/platform/history";
import { getHistoryStore } from "@/lib/platform/store";

const ROUTE = "/platform/";

/**
 * Canonical stays `/platform/` for every ranking.
 *
 * The ranking is a query parameter on one page, not a page of its own: the
 * commentary, the history and the sourcing are identical, and only the table
 * changes. Emitting a canonical per ranking would ask search engines to index
 * five near-identical pages.
 */

/**
 * Live figures, so the page is rendered per request rather than at build time.
 * The upstream response is edge-cached for the collection interval, so this is a
 * cache read for almost every visitor rather than a call to Roblox.
 */

/**
 * Roblox's outage, said in the reader's language.
 *
 * The network layer returns a code and its numbers; this turns them into a
 * sentence. Before, it built the English sentence itself and a Portuguese page
 * printed "Roblox did not respond within 5 seconds." mid-paragraph — which the
 * leakage check caught only because "did" and "not" are English function words.
 *
 * `detail` on an unreachable network error is deliberately dropped: it is the
 * runtime's own message, in English, and no reader can act on it.
 */
function outageReason(t: Translate, reason: OutageReason): string {
  switch (reason.kind) {
    case "timeout":
      return t("platform.live.outage.timeout", { seconds: reason.seconds });
    case "http":
      return t("platform.live.outage.http", { status: reason.status });
    case "unusable":
      return t("platform.live.outage.unusable");
    default:
      return t("platform.live.outage.unreachable");
  }
}

const numberFormat = new Intl.NumberFormat("en-US");

interface PageProps {
  readonly locale: Locale;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function PlatformView({ locale, searchParams }: PageProps) {
  const t = await getTranslator(locale, ["platform"]);
  const record = await localizedRoute(locale, ROUTE);
  const params = await searchParams;
  const requested = typeof params.ranking === "string" ? params.ranking : undefined;
  const days = typeof params.days === "string" ? params.days : undefined;
  const chartWindow = resolveChartWindow(days);
  const experience =
    typeof params.experience === "string" ? Number(params.experience) : undefined;

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("platform.live.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="live" jumpLabel={t("platform.live.jumpLabel")}>
            {record.quickAnswer}
          </QuickAnswer>

          <Section
            id="live"
            heading={t("platform.live.nowHeading")}
            description={t("platform.live.nowDescription")}
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
            <LiveExperiences locale={locale} t={t}
              requested={requested}
              window={chartWindow}
              experience={Number.isFinite(experience) ? experience : undefined}
            />
          </Section>

          <Section
            id="experiences-over-time"
            heading={t("platform.history.topOverTimeHeading")}
            description={t("platform.history.topOverTimeDescription", {
              days: String(GAME_HISTORY_DAYS),
            })}
          >
            <TopExperiencesOverTime t={t} days={chartWindow.days} />
          </Section>

          <Section
            id="largest"
            heading={t("platform.history.busiestSingleHeading")}
            description={t("platform.history.busiestSingleDescription")}
          >
            <LargestExperience t={t} days={chartWindow.days} />
          </Section>

          <Section
            id="history"
            heading={t("platform.history.observedHeading")}
            description={t("platform.history.observedDescription")}
          >
            {/* Same reasoning as above; this one is a KV read, so there was
                little to stream in the first place. */}
            <ObservedHistory locale={locale} t={t} window={chartWindow} selectedRanking={requested} />
          </Section>

          <Section id="how" heading={t("platform.method.heading")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card tone="subtle">
                <h3 className="font-semibold text-(--color-text)">
                  {t("platform.method.liveHeading")}
                </h3>
                <p className="mt-2 text-sm text-(--color-text-muted)">
                  {t("platform.method.liveBody", {
                    minutes: String(EXPERIENCE_CACHE_SECONDS / 60),
                  })}
                </p>
              </Card>
              <Card tone="subtle">
                <h3 className="font-semibold text-(--color-text)">
                  {t("platform.method.historyHeading")}
                </h3>
                <p className="mt-2 text-sm text-(--color-text-muted)">
                  {t("platform.method.historyBody", {
                    interval: String(COLLECTION_INTERVAL_MINUTES),
                    retention: String(RETENTION_DAYS),
                    gameDays: String(GAME_HISTORY_DAYS),
                  })}
                </p>
              </Card>
            </div>

            <Callout tone="info" title={t("platform.method.provenanceTitle")}>
              {rich(t("platform.method.provenanceBody"), {
                payoutStatisticsLink: (
                  <InlineLink href={localizedPath(locale, "/roblox-stats/")}>
                    {t("platform.method.payoutStatisticsLink")}
                  </InlineLink>
                ),
              })}
            </Callout>
          </Section>

          <Section
            id="data"
            heading={t("platform.download.heading")}
            description={t("platform.download.description")}
          >
            <DataDownload
              heading={t("platform.download.innerHeading")}
              description={t("platform.download.innerDescription")}
              formats={[
                { label: t("platform.download.formats.csvTotals"), href: "/api/platform/?format=csv" },
                { label: t("platform.download.formats.csvPerExperience"), href: "/api/platform/?series=experiences&format=csv" },
                { label: t("platform.download.formats.jsonTotals"), href: "/api/platform/" },
              ]}
              limitations={[
                t("platform.download.limitations.noInterpolation"),
                t("platform.download.limitations.cadence"),
                t("platform.download.limitations.coverage"),
                t("platform.download.limitations.rowProvenance"),
              ]}
            />
          </Section>

          <Section id="faqs" heading={t("platform.faqsHeading")}>
            <FAQAccordion locale={locale} faqs={record.faqs} />
          </Section>

          <EstimateDisclaimer locale={locale} />
          <RelatedLinks locale={locale}
            record={record}
            relationships={["sibling", "next-step", "parent"]}
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
  locale,
  ranking,
  days,
  experience,
  hash,
}: {
  readonly locale: Locale;
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
  return `${localizedPath(locale, ROUTE)}${search ? `?${search}` : ""}${hash ?? ""}`;
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
  locale,
  rankings,
  selectedId,
  days,
  t,
}: {
  readonly locale: Locale;
  rankings: readonly Ranking[];
  selectedId: string;
  days: number;
  readonly t: Translate;
}) {
  if (rankings.length < 2) return null;

  return (
    <nav aria-label={t("platform.live.rankingsLabel")} className="mt-6">
      <ul className="flex flex-wrap gap-2">
        {rankings.map((ranking) => {
          const current = ranking.id === selectedId;
          return (
            <li key={ranking.id}>
              <Link
                href={platformHref({ locale, ranking: current ? undefined : ranking.id,
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
                <Foreign>{ranking.name}</Foreign>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

async function LiveExperiences({
  locale,
  requested,
  window: chartWindow,
  experience,
  t,
}: {
  readonly locale: Locale;
  requested?: string;
  window: ChartWindow;
  experience?: number;
  readonly t: Translate;
}) {
  // Both are wanted by the same section, and neither depends on the other.
  const [result, history] = await Promise.all([fetchRankings(requested), loadGameHistory()]);

  if (!result.ok) {
    return (
      <Callout tone="warning" title={t("platform.live.unavailableTitle")}>
        {t("platform.live.body.related.p1", {
          reason: outageReason(t, result.reason),
        })}
      <InlineLink href={localizedPath(locale, "/")}>{t("platform.live.calculatorStillWorks")}</InlineLink>{t("platform.live.body.related.p2")}</Callout>
      );
    }
  
    const { rankings, selected, experiences, detailsLoaded } = result.data;
  
    if (experiences.length === 0) {
      return (
        <Callout tone="info" title={t("platform.live.noExperiencesTitle")}>{t("platform.live.body.related.p3")}</Callout>
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
        <PlatformFigure t={t} platform={platform} observedAt={result.observedAt} />
  
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={t("platform.live.stats.playersInRanking")} value={numberFormat.format(totalPlaying)} />
          <Stat
            label={t("platform.live.stats.experiencesShown")}
            value={t("platform.live.stats.experiencesShownValue", {
              shown: experiences.length,
              total: selected.size,
            })}
          />
          <Stat label={t("platform.live.stats.robloxRanking")} value={selected.name} foreign />
          <Stat label={t("platform.live.stats.busiestRightNow")} value={busiest.name} foreign />
        </div>
  
        <RankingTabs locale={locale} t={t} rankings={rankings} selectedId={selected.id} days={chartWindow.days} />
  
        <p className="mt-4 text-sm text-(--color-text-muted)">
          {selected.subtitle ? `${selected.subtitle}. ` : null}
          Observed{" "}
          <time dateTime={result.observedAt}>{formatObserved(result.observedAt, t)}</time>.{" "}
          Source:{" "}
          <SourceLink t={t} href="https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=devexcalculator">{t("platform.live.body.related.p4")}</SourceLink>
          {hasVisits ? (
            <>
              {" "}and{" "}
              <SourceLink t={t} href="https://games.roblox.com/v1/games">{t("platform.live.body.related.p5")}</SourceLink>
            </>
          ) : null}
          .
        </p>
  
        <TableWrapper
          label={t("platform.live.table.wrapperLabel", { ranking: selected.name })}
        >
          <Table
            caption={t("platform.live.table.caption", {
              count: String(experiences.length),
              ranking: selected.name,
            })}
          >
            <thead>
              <tr>
                <Th>#</Th>
                <Th>{t("platform.live.table.experience")}</Th>
                <Th>{t("platform.live.table.playersNow")}</Th>
                {history ? <Th>{t("platform.live.table.last24h")}</Th> : null}
                {hasVisits ? <Th>{t("platform.live.table.lifetimeVisits")}{" "}</Th> : null}
                {hasVotes ? <Th>{t("platform.live.table.approval")}</Th> : null}
                {hasGenre ? <Th>{t("platform.live.table.genre")}</Th> : null}
              </tr>
            </thead>
            <tbody>
              {experiences.map((row, index) => (
                <ExperienceRow locale={locale} t={t}
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
          <ExperienceDetail locale={locale} t={t}
            history={history}
            universeId={experience}
            ranking={requested}
            days={chartWindow.days}
          />
        ) : null}
  
        {detailsLoaded ? null : (
          <p className="mt-3 text-sm text-(--color-text-muted)">{t("platform.live.body.related.p6")}</p>
        )}
  
        <p className="mt-3 text-sm text-(--color-text-muted)">
          {t(
            rankings.length === 1
              ? "platform.live.rankingsNote.one"
              : "platform.live.rankingsNote.other",
            { rankingsCount: String(rankings.length), displayLimit: String(DISPLAY_LIMIT) },
          )}
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

function HistoryUnavailable({ what,
  t,
}: { what: string;
  readonly t: Translate;
}) {
  return (
    <Callout tone="info" title={t("platform.history.unavailableTitle", { what })}>
      {t("platform.live.body.related.p8")}
    </Callout>
  );
}

async function TopExperiencesOverTime({ days,
  t,
}: { days: number;
  readonly t: Translate;
}) {
  const history = await loadGameHistory();
  if (!history) return <HistoryUnavailable t={t} what={t("platform.history.perExperienceHistory")} />;

  /*
   * The range tabs govern these charts too. They did not need to while
   * per-experience history was a single day and the shortest range was also a
   * day; now that it reaches a week, a reader asking for 24 hours and being
   * shown seven days would be reading an axis that disagrees with the control
   * they just used.
   */
  const tracked = everyGameSeries(history).map((entry) => ({
    ...entry,
    series: sliceSeries(entry.series, days),
  }));
  const plottable = tracked.filter((entry) => entry.series.points.length >= 2);

  if (plottable.length === 0) {
    return (
      <Callout tone="info" title={t("platform.history.notEnoughLinesTitle")}>
        {tracked.length === 0
          ? t("platform.history.noPerExperienceCounts")
          : t("platform.history.seenOnceEach", { count: String(tracked.length) })}{" "}
        {t("platform.history.notEnoughLinesBody")}
      </Callout>
    );
  }

  return (
    <div className="min-w-0">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={t("platform.history.stats.experiencesTracked")} value={numberFormat.format(tracked.length)} />
        <Stat
          label={t("platform.history.stats.observationsHeld")}
          value={numberFormat.format(history.at.length)}
          note={t("platform.history.stats.observationsNote", { days: GAME_HISTORY_DAYS })}
        />
        <Stat
          label={t("platform.history.stats.busiestTracked")}
          value={plottable[0]?.name ?? "—"}
          foreign
          note={
            plottable[0]
              ? t("platform.history.stats.busiestNote", {
                  players: numberFormat.format(plottable[0].latest),
                })
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
          caption={t("platform.history.charts.topOverTimeCaption", {
            plotted: String(Math.min(plottable.length, 48)),
            tracked: numberFormat.format(tracked.length),
            intervalMinutes: String(GAME_HISTORY_INTERVAL_MINUTES),
          })}
          formatValue={(value) => compact(value)}
        />
      </div>
    </div>
  );
}

async function LargestExperience({ days,
  t,
}: { days: number;
  readonly t: Translate;
}) {
  const history = await loadGameHistory();
  if (!history) return <HistoryUnavailable t={t} what={t("platform.history.busiestExperienceRecord")} />;

  const { series: full, leaders } = largestExperienceSeries(history);
  const series = sliceSeries(full, days);
  const summary = summarise(series);
  const latest = series.points[series.points.length - 1];

  if (!series.chartable) {
    return (
      <Callout tone="info" title={t("platform.history.notEnoughYetTitle")}>
        {t(
          series.points.length === 1
            ? "platform.history.observationsSoFar.one"
            : "platform.history.observationsSoFar.other",
          {
            count: String(series.points.length),
            minimumPointsForChart: String(MINIMUM_POINTS_FOR_CHART),
          },
        )}
      </Callout>
    );
  }

  return (
    <div className="min-w-0">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label={t("platform.live.stats.busiestRightNow")}
          value={numberFormat.format(latest?.totalPlaying ?? 0)}
          note={latest ? leaders[latest.at] : undefined}
        />
        {summary ? (
          <Stat
            label={t("platform.history.stats.highestObserved")}
            value={numberFormat.format(summary.peak.totalPlaying)}
            note={`${leaders[summary.peak.at] ?? ""} · ${formatObserved(summary.peak.at, t)}`}
          />
        ) : null}
        {summary ? (
          <Stat
            label={t("platform.history.stats.lowestObserved")}
            value={numberFormat.format(summary.low.totalPlaying)}
            note={`${leaders[summary.low.at] ?? ""} · ${formatObserved(summary.low.at, t)}`}
          />
        ) : null}
      </div>

      <div className="mt-6">
        <TimeSeriesChart
          points={series.points.map((point) => ({ at: point.at, value: point.totalPlaying }))}
          caption={t("platform.history.charts.busiestCaption", {
            span: describeSpan(t, series),
          })}
          formatValue={(value) => compact(value)}
        />
      </div>

      <p className="mt-4 text-sm text-(--color-text-muted)">
        {t("platform.history.highestObservedNote")}{" "}
        <Badge tone="neutral">{t("platform.history.recordedByThisSite")}</Badge>
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
  t,
}: {
  platform: PlatformTotal;
  observedAt: string;
  readonly t: Translate;
}) {
  return (
    <Card>
      <p className="text-sm text-(--color-text-muted)">{t("platform.platformFigure.label")}</p>
      <p className="tabular mt-1 text-4xl font-bold break-words text-(--color-text) sm:text-5xl">
        {numberFormat.format(platform.players)}
      </p>
      <p className="mt-3 text-sm text-(--color-text-muted)">
        {rich(t("platform.platformFigure.method"), {
          experiences: numberFormat.format(platform.experiences),
          rankings: String(platform.rankings),
          observedAt: <time dateTime={observedAt}>{formatObserved(observedAt, t)}</time>,
        })}
      </p>
      <p className="mt-2 text-sm text-(--color-text-muted)">
        <strong className="text-(--color-text)">
          {t("platform.platformFigure.floorHeading")}
        </strong>{" "}
        {t("platform.platformFigure.floorBody")}
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
  locale,
  history,
  universeId,
  ranking,
  days,
  t,
}: {
  readonly locale: Locale;
  history: GameHistory;
  universeId: number;
  ranking?: string;
  days: number;
  readonly t: Translate;
}) {
  const series = sliceSeries(gameSeries(history, universeId), days);
  const name = history.names[String(universeId)] ?? t("platform.history.unnamedExperience");
  const summary = summarise(series);

  return (
    <div id="experience" className="mt-6">
    <Card>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-lg font-bold text-(--color-text)">{name}</h3>
        <InlineLink href={platformHref({ locale, ranking, days, hash: "#live" })}>{t("platform.live.body.experience.p1")}</InlineLink>
      </div>

      {series.chartable ? (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Stat
              label={t("platform.history.stats.observations")}
              value={numberFormat.format(series.points.length)}
              note={t("platform.history.stats.overSpan", { span: describeSpan(t, series) })}
            />
            {summary ? (
              <Stat
                label={t("platform.history.stats.observedPeak")}
                value={numberFormat.format(summary.peak.totalPlaying)}
                note={formatObserved(summary.peak.at, t)}
              />
            ) : null}
            {summary ? (
              <Stat
                label={t("platform.history.stats.observedLow")}
                value={numberFormat.format(summary.low.totalPlaying)}
                note={formatObserved(summary.low.at, t)}
              />
            ) : null}
          </div>

          <div className="mt-6">
            <TimeSeriesChart
              points={series.points.map((point) => ({
                at: point.at,
                value: point.totalPlaying,
              }))}
                caption={t("platform.history.charts.experienceCaption", {
                  name,
                  span: describeSpan(t, series),
                })}
              formatValue={(value) => compact(value)}
            />
          </div>
        </>
      ) : (
        <p className="mt-3 text-(--color-text-muted)">
          {t(
            series.points.length === 1
              ? "platform.history.onlyNObservations.one"
              : "platform.history.onlyNObservations.other",
            {
              count: String(series.points.length),
              gameHistoryDays: String(GAME_HISTORY_DAYS),
            },
          )}
        </p>
      )}
    </Card>
    </div>
  );
}

/**
 * Roblox's age recommendation, with the label in the reader's language.
 *
 * The API returns one string — `"Maturity: Minimal"` — label and rating
 * together, so a translated page printed an English label. The label is this
 * site's chrome and gets translated; the rating is Roblox's published value
 * and does not, because inventing a translation for a content rating would be
 * presenting a descriptor Roblox has not issued. It is marked `lang="en"` so a
 * screen reader pronounces it as English rather than as the page language.
 *
 * Anything not in `Label: Rating` shape is passed through untouched: Roblox
 * changing its wording must not blank the field.
 */
function MaturityNote({ value, t }: { readonly value: string; readonly t: Translate }) {
  const split = value.indexOf(":");
  if (split === -1) return <span lang="en">{value}</span>;

  const rating = value.slice(split + 1).trim();
  if (rating === "") return <span lang="en">{value}</span>;

  return rich(t("platform.live.maturity"), {
    rating: <span lang="en">{rating}</span>,
  });
}

function ExperienceRow({
  locale,
  experience,
  rank,
  showVisits,
  showVotes,
  showGenre,
  history,
  ranking,
  days,
  t,
}: {
  readonly locale: Locale;
  experience: ExperienceObservation;
  rank: number;
  showVisits: boolean;
  showVotes: boolean;
  showGenre: boolean;
  history: GameHistory | null;
  ranking?: string;
  days: number;
  readonly t: Translate;
}) {
  const url = experienceUrl(experience);
  const approval = approvalPercent(experience);
  const trend = history ? gameSeries(history, experience.universeId) : null;

  return (
    <tr>
      <Td className="tabular">{rank}</Td>
      <Td>
        {url ? (
          <SourceLink t={t} href={url}><Foreign>{experience.name}</Foreign></SourceLink>
        ) : (
          <Foreign>{experience.name}</Foreign>
        )}
        {experience.isSponsored ? (
          <>
            {" "}
            <Badge tone="warning">{t("platform.live.sponsored")}</Badge>
          </>
        ) : null}
        <span className="block text-sm text-(--color-text-muted)">
          {experience.creatorName ? (
            <>
              {rich(t("platform.live.byCreator"), {
                creator: <Foreign>{experience.creatorName}</Foreign>,
              })}
              {experience.creatorVerified ? ` ${t("platform.live.verifiedSuffix")}` : ""}
            </>
          ) : null}
          {experience.creatorName && experience.maturity ? " · " : null}
          {experience.maturity ? <MaturityNote value={experience.maturity} t={t} /> : null}
          {experience.favourites !== null ? (
            <>
              {experience.creatorName || experience.maturity ? " · " : null}
              {t("platform.live.favouritesCount", {
                count: numberFormat.format(experience.favourites),
              })}
            </>
          ) : null}
        </span>
      </Td>
      <Td className="tabular">{numberFormat.format(experience.playing)}</Td>
      {history ? (
        <Td>
          {trend && trend.points.length >= 2 ? (
            <Link
              href={platformHref({ locale, ranking,
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
                {t("platform.live.body.experience.p5", {
                  gameHistoryDays: String(GAME_HISTORY_DAYS),
                  name: experience.name,
                })}
              </span>
            </Link>
          ) : (
            <span className="text-sm text-(--color-text-muted)">
              {t("platform.live.body.experience.p7")}
              <span className="sr-only">
                {" "}
                {t("platform.live.body.experience.p8")}
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
  locale,
  selected,
  ranking,
  counts,
  t,
}: {
  readonly locale: Locale;
  selected: ChartWindow;
  ranking?: string;
  /** Observations each range would chart, so a button that changes nothing says so. */
  counts?: Record<number, number>;
  readonly t: Translate;
}) {
  return (
    <nav aria-label={t("platform.history.rangeLabel")} className="mb-6">
      <ul className="flex flex-wrap gap-2">
        {CHART_WINDOWS.map((option) => {
          const current = option.days === selected.days;
          return (
            <li key={option.days}>
              <Link
                href={platformHref({ locale, ranking, days: option.days, hash: "#history" })}
                scroll={false}
                aria-current={current ? "true" : undefined}
                className={
                  current
                    ? "inline-flex min-h-[44px] items-center rounded-(--radius-control) border border-(--color-primary) bg-(--color-primary) px-4 text-sm font-semibold text-(--color-on-primary)"
                    : "inline-flex min-h-[44px] items-center rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) px-4 text-sm font-semibold text-(--color-text) motion-safe:transition-colors hover:border-(--color-primary) hover:text-(--color-primary)"
                }
              >
                {chartWindowLabel(t, option)}
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
  locale,
  window: chartWindow,
  selectedRanking,
  t,
}: {
  readonly locale: Locale;
  window: ChartWindow;
  selectedRanking?: string;
  readonly t: Translate;
}) {
  const store = await getHistoryStore();

  if (!store) {
    return (
      <Callout tone="info" title={t("platform.history.unavailableInEnvironmentTitle")}>{t("platform.live.body.experience.p9")}</Callout>
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
      <Callout tone="warning" title={t("platform.history.unreadableTitle")}>{t("platform.live.body.experience.p10")}</Callout>
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
        <ChartRangeTabs locale={locale}
          selected={chartWindow}
          ranking={selectedRanking}
          counts={counts}
          t={t}
        />
        <Callout
          tone="info"
          title={t("platform.history.noObservationsTitle", {
            window: chartWindowLabel(t, chartWindow),
          })}
        >
          {t("platform.history.nothingStoredBody", {
            collectionIntervalMinutes: String(COLLECTION_INTERVAL_MINUTES),
            minimumPointsForChart: String(MINIMUM_POINTS_FOR_CHART),
          })}
        </Callout>
      </div>
    );
  }

  const latest = series.points[series.points.length - 1];
  const summary = summarise(series);

  if (!series.chartable) {
    return (
      <div className="min-w-0">
        <ChartRangeTabs locale={locale}
          selected={chartWindow}
          ranking={selectedRanking}
          counts={counts}
          t={t}
        />
        <Card tone="subtle">
          <p className="text-(--color-text)">
            {t(
              series.points.length === 1
                ? "platform.history.withinWindow.one"
                : "platform.history.withinWindow.other",
              {
                count: String(series.points.length),
                window: chartWindowLabel(t, chartWindow),
                players: numberFormat.format(latest?.totalPlaying ?? 0),
                minimumPointsForChart: String(MINIMUM_POINTS_FOR_CHART),
              },
            )}
          </p>
          <ul className="mt-3 flex flex-col gap-1 text-sm text-(--color-text-muted)">
            {series.points.map((point) => (
              <li key={point.at} className="tabular">
                {formatObserved(point.at, t)} — {numberFormat.format(point.totalPlaying)}{" "}
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
      <ChartRangeTabs locale={locale}
          selected={chartWindow}
          ranking={selectedRanking}
          counts={counts}
          t={t}
        />

      {rangeExceedsHistory ? (
        <Callout
          tone="info"
          title={t("platform.history.rangeExceedsTitle", {
            window: chartWindowLabel(t, chartWindow),
          })}
        >
          {t("platform.history.rangeExceedsBody", {
            span: describeSpan(t, full),
            window: chartWindowLabel(t, chartWindow),
            points: numberFormat.format(full.points.length),
          })}
        </Callout>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t("platform.history.stats.observationsRecorded")}
          value={numberFormat.format(series.points.length)}
          note={
            rangeExceedsHistory
              ? t("platform.history.stats.everyObservationHeld")
              : t("platform.history.stats.withinTheLast", {
                  window: chartWindowLabel(t, chartWindow),
                })
          }
        />
        <Stat label={t("platform.history.stats.periodCovered")} value={describeSpan(t, series)} />
        <Stat
          label={t("platform.history.stats.mostRecentTotal")}
          value={numberFormat.format(latest?.totalPlaying ?? 0)}
          note={
            summary?.change
              ? t("platform.history.stats.changeSincePrevious", {
                  change: signed(summary.change.absolute),
                  minutes: String(summary.change.minutesApart),
                })
              : undefined
          }
        />
        {summary ? (
          <Stat
            label={t("platform.history.stats.observedPeak")}
            value={numberFormat.format(summary.peak.totalPlaying)}
            note={formatObserved(summary.peak.at, t)}
          />
        ) : null}
      </div>

      {summary ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Stat
            label={t("platform.history.stats.observedLow")}
            value={numberFormat.format(summary.low.totalPlaying)}
            note={formatObserved(summary.low.at, t)}
          />
          <Stat
            label={t("platform.history.stats.averageAcrossObservations")}
            value={numberFormat.format(summary.mean)}
            note={t("platform.history.stats.meanNoteText", {
            points: numberFormat.format(series.points.length),
          })}
          />
        </div>
      ) : null}

      <div className="mt-6">
        <TimeSeriesChart
          points={series.points.map((point) => ({ at: point.at, value: point.totalPlaying }))}
          // Phrased so every span reads correctly. An earlier template produced
          // "over the under an hour this site has been observing" on day one,
          // because `describeSpan` returns a phrase, not a bare duration.
          caption={t("platform.history.charts.totalCaption", {
            span: describeSpan(t, series),
          })}
          formatValue={(value) => compact(value)}
        />
      </div>

      <p className="mt-4 text-sm text-(--color-text-muted)">
        {t("platform.live.body.experience.p16", {
          retentionDays: RETENTION_DAYS,
        })}
      <Badge tone="neutral">{t("platform.history.recordedByThisSite")}</Badge>
        </p>
      </div>
  );
}

function Stat({
  label,
  value,
  note,
  foreign,
}: {
  label: string;
  value: string;
  note?: string;
  /** The value is a name Roblox published, not prose this site wrote. */
  foreign?: boolean;
}) {
  return (
    <Card tone="subtle" className="min-w-0">
      <p className="text-sm text-(--color-text-muted)">{label}</p>
      <p className="tabular mt-1 text-xl font-bold break-words text-(--color-text)">
        {foreign ? <Foreign>{value}</Foreign> : value}
      </p>
      {note ? <p className="mt-1 text-xs text-(--color-text-muted)">{note}</p> : null}
    </Card>
  );
}

function signed(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±";
  return `${sign}${numberFormat.format(Math.abs(value))}`;
}

function formatObserved(iso: string, t: Translate): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return t("platform.live.unknownObservationTime");
  return `${at.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function compact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

export type { ExperienceObservation };
