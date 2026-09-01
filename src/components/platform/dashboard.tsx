"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MultiSeriesChart, TimeSeriesChart } from "@/components/charts";
import {
  Badge,
  Callout,
  Card,
  Foreign,
  Section,
  SourceLink,
  Table,
  TableWrapper,
  Td,
  Th,
} from "@/components/ui";
import { translatorFor, type LocaleWords } from "@/i18n/client-words";
import { rich } from "@/i18n/rich";
import type { Translate } from "@/i18n/get-dictionary";
import {
  approvalPercent,
  experienceUrl,
  fetchExperience,
  fetchHighlights,
  fetchRankings,
  fetchTotals,
  HISTORY_DAYS,
  RETENTION_DAYS,
  type ApiDetail,
  type ApiExperience,
  type ApiResult,
  type ExperiencePayload,
  type HighlightsPayload,
  type RankingsPayload,
  type SeriesPayload,
} from "@/lib/platform/data-api";
import { DEFAULT_RANGE, RANGES, useDashboardState } from "./url-state";

/**
 * Everything on `/platform/` that changes, and nothing that does not.
 *
 * The page around this is a static document: no server render, no reader
 * request to Roblox, one prerendered file for every query string. This island
 * fetches from the data Worker after load and draws the result.
 *
 * What its **first** render produces matters as much as what it eventually
 * draws, because that first render is what is baked into the static HTML and
 * what a crawler without JavaScript sees. So every section here renders its
 * heading, its description and a stated waiting-or-unavailable state from the
 * start. There is no point at which this page is a blank frame.
 *
 * Three rules the states follow, in order of importance:
 *
 *   - Nothing is ever shown as zero because it could not be loaded. An absent
 *     figure is stated as absent.
 *   - Nothing dated is presented as current. Every reading carries the time it
 *     was observed, and a collector that has stalled says so.
 *   - Player counts and slow metadata are refreshed on different clocks, so
 *     they carry different timestamps and the UI distinguishes them wherever a
 *     reader could otherwise assume one time covers both.
 */

const numberFormat = new Intl.NumberFormat("en-US");
/** How many rows of a ranking the table shows. */
const DISPLAY_LIMIT = 90;
const MINIMUM_POINTS_FOR_CHART = 3;

type Phase<T> = { kind: "loading" } | { kind: "ready"; value: T } | { kind: "failed"; failure: "empty" | "offline" | "not-found" };

/** Which endpoint a resource reads. Kept as a value so it can be an effect dep. */
type Resource = "rankings" | "totals" | "highlights" | "experience";

/**
 * The one place a request is issued, at module scope so it is a stable value.
 *
 * A loader defined inside the component would be a new function on every
 * render, which either drops out of the effect's dependencies or re-runs the
 * fetch on every render. Taking the inputs as primitives instead means the
 * effect below can declare all of them honestly.
 */
function loadResource(
  resource: Resource,
  ranking: string | null,
  days: number,
  experience: number | null,
  signal: AbortSignal,
): Promise<ApiResult<unknown>> {
  switch (resource) {
    case "rankings":
      return fetchRankings(ranking, signal);
    case "totals":
      return fetchTotals(days, signal);
    case "highlights":
      return fetchHighlights(signal);
    default:
      return experience === null
        ? Promise.resolve({ ok: false, error: { kind: "not-found", status: null } } as ApiResult<unknown>)
        : fetchExperience(experience, Math.min(days, HISTORY_DAYS), signal);
  }
}

/**
 * Runs one fetch per set of inputs and keeps the last outcome.
 *
 * The previous request is aborted when the inputs change, and the outcome
 * carries the inputs it belongs to, so a slow earlier response cannot land
 * after a fast later one and put the wrong table under the wrong tab.
 */
function useResource<T>(
  resource: Resource,
  ranking: string | null,
  days: number,
  experience: number | null,
  attempt: number,
): Phase<T> {
  const key = `${resource}|${ranking ?? ""}|${days}|${experience ?? ""}|${attempt}`;
  const [entry, setEntry] = useState<{ key: string; phase: Phase<T> }>({
    key,
    phase: { kind: "loading" },
  });

  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    loadResource(resource, ranking, days, experience, controller.signal)
      .then((result) => {
        if (!live) return;
        setEntry({
          key,
          phase: result.ok
            ? { kind: "ready", value: result.data as T }
            : { kind: "failed", failure: result.error.kind },
        });
      })
      .catch(() => {
        if (live) setEntry({ key, phase: { kind: "failed", failure: "offline" } });
      });
    return () => {
      live = false;
      controller.abort();
    };
  }, [key, resource, ranking, days, experience]);

  // An outcome from a previous set of inputs is not this one's answer.
  return entry.key === key ? entry.phase : { kind: "loading" };
}

export function PlatformDashboard({ words }: { readonly words: LocaleWords }) {
  const t = translatorFor(words);
  const [state, update] = useDashboardState();
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  /*
   * The range is deliberately not part of the rankings or highlights key.
   *
   * Neither endpoint varies by it: the rankings are a snapshot, and the
   * highlights are the whole seven days, narrowed to the chosen window in the
   * browser. Passing the range would re-issue both requests every time a reader
   * touched a range button, for two responses that would come back identical.
   */
  const rankings = useResource<RankingsPayload>("rankings", state.ranking, DEFAULT_RANGE, null, attempt);
  const highlights = useResource<HighlightsPayload>("highlights", null, DEFAULT_RANGE, null, attempt);
  const totals = useResource<SeriesPayload>("totals", null, state.days, null, attempt);

  return (
    <>
      <Section id="live" heading={t("platform.live.nowHeading")} description={t("platform.live.nowDescription")}>
        <LiveSection t={t} phase={rankings} state={state} update={update} retry={retry} attempt={attempt} />
      </Section>

      <Section
        id="experiences-over-time"
        heading={t("platform.history.topOverTimeHeading")}
        description={t("platform.history.topOverTimeDescription", { days: String(HISTORY_DAYS) })}
      >
        <HighlightsSection t={t} phase={highlights} days={state.days} retry={retry} />
      </Section>

      <Section
        id="largest"
        heading={t("platform.history.busiestSingleHeading")}
        description={t("platform.history.busiestSingleDescription")}
      >
        <BusiestSection t={t} phase={highlights} days={state.days} retry={retry} />
      </Section>

      <Section
        id="history"
        heading={t("platform.history.observedHeading")}
        description={t("platform.history.observedDescription")}
      >
        <RangeTabs t={t} days={state.days} onSelect={(days) => update({ days })} />
        <TotalsSection t={t} phase={totals} retry={retry} />
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------------
// States
// ---------------------------------------------------------------------------

function Waiting({ t }: { readonly t: Translate }) {
  return (
    <Card tone="subtle">
      <p aria-live="polite" className="text-(--color-text)">
        <strong>{t("platform.dashboard.loadingTitle")}</strong>
      </p>
      <p className="mt-2 text-sm text-(--color-text-muted)">{t("platform.dashboard.loadingBody")}</p>
    </Card>
  );
}

/**
 * The two ways there can be no data, said as the two different things they are.
 *
 * `empty` is a working data plane that has not collected anything yet, which is
 * the true state of a fresh deployment. `offline` is a data plane that could
 * not be reached. Collapsing them into one message would tell a reader the site
 * is broken when it is simply new.
 */
function Unavailable({
  t,
  failure,
  retry,
}: {
  readonly t: Translate;
  failure: "empty" | "offline" | "not-found";
  retry: () => void;
}) {
  const empty = failure !== "offline";
  return (
    <Callout tone={empty ? "info" : "warning"} title={t(empty ? "platform.dashboard.emptyTitle" : "platform.dashboard.offlineTitle")}>
      <p>{t(empty ? "platform.dashboard.emptyBody" : "platform.dashboard.offlineBody")}</p>
      {empty ? null : (
        <p className="mt-3">
          <button
            type="button"
            onClick={retry}
            className="inline-flex min-h-[44px] items-center rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) px-4 text-sm font-semibold text-(--color-text) motion-safe:transition-colors hover:border-(--color-primary) hover:text-(--color-primary)"
          >
            {t("platform.dashboard.retry")}
          </button>
        </p>
      )}
    </Callout>
  );
}

// ---------------------------------------------------------------------------
// Live
// ---------------------------------------------------------------------------

function LiveSection({
  t,
  phase,
  state,
  update,
  retry,
  attempt,
}: {
  readonly t: Translate;
  phase: Phase<RankingsPayload>;
  state: ReturnType<typeof useDashboardState>[0];
  update: ReturnType<typeof useDashboardState>[1];
  retry: () => void;
  attempt: number;
}) {
  if (phase.kind === "loading") return <Waiting t={t} />;
  if (phase.kind === "failed") return <Unavailable t={t} failure={phase.failure} retry={retry} />;

  const data = phase.value;
  const rows = data.experiences.slice(0, DISPLAY_LIMIT);
  if (rows.length === 0) {
    return <Callout tone="info" title={t("platform.live.noExperiencesTitle")}>{t("platform.live.body.related.p3")}</Callout>;
  }

  const selected = data.rankings.find((entry) => entry.id === data.ranking);
  const totalPlaying = rows.reduce((sum, row) => sum + row.p, 0);
  const busiest = rows.reduce((best, row) => (row.p > best.p ? row : best));
  const hasVisits = rows.some((row) => row.x?.v != null);
  const hasVotes = rows.some((row) => approvalPercent(row.x) !== null);
  const hasGenre = rows.some((row) => row.x?.g != null);

  return (
    <div className="min-w-0">
      <StaleNotice t={t} observedAt={data.observedAt} intervalMinutes={data.collectionIntervalMinutes} />

      <PlatformFigure t={t} platform={data.platform} observedAt={data.observedAt} />

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("platform.live.stats.playersInRanking")} value={numberFormat.format(totalPlaying)} />
        <Stat
          label={t("platform.live.stats.experiencesShown")}
          value={t("platform.live.stats.experiencesShownValue", {
            shown: rows.length,
            total: selected?.size ?? data.experiences.length,
          })}
        />
        <Stat label={t("platform.live.stats.robloxRanking")} value={selected?.name ?? data.ranking} foreign />
        <Stat label={t("platform.live.stats.busiestRightNow")} value={busiest.n} foreign />
      </div>

      <RankingTabs
        t={t}
        rankings={data.rankings}
        selectedId={data.ranking}
        onSelect={(id) => update({ ranking: id, experience: null })}
      />

      <p className="mt-4 text-sm text-(--color-text-muted)">
        {selected?.subtitle ? `${selected.subtitle}. ` : null}
        {t("platform.dashboard.observedAt", { when: formatObserved(data.observedAt, t) })}{" "}
        {t("platform.dashboard.sourcesLabel")}{" "}
        <SourceLink t={t} href="https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=devexcalculator">
          {t("platform.live.body.related.p4")}
        </SourceLink>
        {hasVisits ? (
          <>
            {" · "}
            <SourceLink t={t} href="https://games.roblox.com/v1/games">
              {t("platform.live.body.related.p5")}
            </SourceLink>
          </>
        ) : null}
        .
      </p>

      <TableWrapper label={t("platform.live.table.wrapperLabel", { ranking: selected?.name ?? data.ranking })}>
        <Table
          caption={t("platform.live.table.caption", {
            count: String(rows.length),
            ranking: selected?.name ?? data.ranking,
          })}
        >
          <thead>
            <tr>
              <Th>#</Th>
              <Th>{t("platform.live.table.experience")}</Th>
              <Th>{t("platform.live.table.playersNow")}</Th>
              <Th>{t("platform.live.table.last24h")}</Th>
              {hasVisits ? <Th>{t("platform.live.table.lifetimeVisits")}</Th> : null}
              {hasVotes ? <Th>{t("platform.live.table.approval")}</Th> : null}
              {hasGenre ? <Th>{t("platform.live.table.genre")}</Th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <ExperienceRow
                key={row.i}
                t={t}
                row={row}
                rank={index + 1}
                showVisits={hasVisits}
                showVotes={hasVotes}
                showGenre={hasGenre}
                selected={state.experience === row.i}
                onSelect={() => update({ experience: state.experience === row.i ? null : row.i })}
              />
            ))}
          </tbody>
        </Table>
      </TableWrapper>

      {state.experience === null ? null : (
        <ExperienceDetail
          t={t}
          universeId={state.experience}
          days={state.days}
          attempt={attempt}
          onClose={() => update({ experience: null })}
        />
      )}

      <p className="mt-3 text-sm text-(--color-text-muted)">
        {t("platform.dashboard.detailsClockNote", { interval: String(data.collectionIntervalMinutes) })}
      </p>

      <p className="mt-3 text-sm text-(--color-text-muted)">
        {t(data.rankings.length === 1 ? "platform.live.rankingsNote.one" : "platform.live.rankingsNote.other", {
          rankingsCount: String(data.rankings.length),
          displayLimit: String(DISPLAY_LIMIT),
        })}
      </p>
    </div>
  );
}

/**
 * Says so when the last observation is older than the schedule allows.
 *
 * A missed run is a hiccup; four in a row is a pattern, and a page that quietly
 * shows a two-hour-old reading as though it were current is the exact failure
 * this whole architecture exists to avoid.
 */
function StaleNotice({
  t,
  observedAt,
  intervalMinutes,
}: {
  readonly t: Translate;
  observedAt: string;
  intervalMinutes: number;
}) {
  const [now, setNow] = useState<number | null>(null);
  /*
   * The clock is read after paint, never during render.
   *
   * This component is prerendered at build time. Computing "now" during render
   * would bake the build clock into the static HTML and then disagree with the
   * browser's first render, which React reports as a hydration mismatch.
   */
  useEffect(() => {
    let live = true;
    const frame = requestAnimationFrame(() => {
      if (live) setNow(Date.now());
    });
    return () => {
      live = false;
      cancelAnimationFrame(frame);
    };
  }, [observedAt]);

  const at = Date.parse(observedAt);
  if (now === null || !Number.isFinite(at)) return null;
  const ageMinutes = Math.round((now - at) / 60_000);
  if (ageMinutes <= intervalMinutes * 4) return null;

  return (
    <Callout tone="warning" title={t("platform.dashboard.staleTitle")} className="mb-4">
      {t("platform.dashboard.staleBody", { minutes: numberFormat.format(ageMinutes) })}
    </Callout>
  );
}

function PlatformFigure({
  t,
  platform,
  observedAt,
}: {
  readonly t: Translate;
  platform: RankingsPayload["platform"];
  observedAt: string;
}) {
  return (
    <Card>
      <p className="text-sm text-(--color-text-muted)">{t("platform.platformFigure.label")}</p>
      <p className="tabular mt-1 text-4xl font-bold break-words text-(--color-text) sm:text-5xl">
        {numberFormat.format(platform.players)}
      </p>
      <p className="mt-3 text-sm text-(--color-text-muted)">
        {t("platform.platformFigure.method", {
          experiences: numberFormat.format(platform.experiences),
          rankings: String(platform.rankings),
          observedAt: formatObserved(observedAt, t),
        })}
      </p>
      <p className="mt-2 text-sm text-(--color-text-muted)">
        <strong className="text-(--color-text)">{t("platform.platformFigure.floorHeading")}</strong>{" "}
        {t("platform.platformFigure.floorBody")}
      </p>
    </Card>
  );
}

function RankingTabs({
  t,
  rankings,
  selectedId,
  onSelect,
}: {
  readonly t: Translate;
  rankings: RankingsPayload["rankings"];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (rankings.length < 2) return null;
  return (
    <nav aria-label={t("platform.live.rankingsLabel")} className="mt-6">
      <ul className="flex flex-wrap gap-2">
        {rankings.map((ranking) => {
          const current = ranking.id === selectedId;
          return (
            <li key={ranking.id}>
              <button
                type="button"
                onClick={() => onSelect(ranking.id)}
                aria-current={current ? "true" : undefined}
                className={
                  current
                    ? "inline-flex min-h-[44px] items-center rounded-(--radius-control) border border-(--color-primary) bg-(--color-primary) px-4 text-sm font-semibold text-(--color-on-primary)"
                    : "inline-flex min-h-[44px] items-center rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) px-4 text-sm font-semibold text-(--color-text) motion-safe:transition-colors hover:border-(--color-primary) hover:text-(--color-primary)"
                }
              >
                <Foreign>{ranking.name}</Foreign>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Roblox's age recommendation, with the label in the reader's language.
 *
 * The API returns label and rating in one string. The label is this site's
 * chrome and gets translated; the rating is Roblox's published value and does
 * not, because inventing a translation for a content rating would present a
 * descriptor Roblox has not issued.
 */
function MaturityNote({ value, t }: { readonly value: string; readonly t: Translate }) {
  const split = value.indexOf(":");
  const rating = split === -1 ? "" : value.slice(split + 1).trim();
  if (rating === "") return <span lang="en">{value}</span>;
  // The rating stays marked as English so a screen reader pronounces Roblox's
  // published descriptor as English rather than as the page language.
  return <>{rich(t("platform.live.maturity"), { rating: <span lang="en">{rating}</span> })}</>;
}

function ExperienceRow({
  t,
  row,
  rank,
  showVisits,
  showVotes,
  showGenre,
  selected,
  onSelect,
}: {
  readonly t: Translate;
  row: ApiExperience;
  rank: number;
  showVisits: boolean;
  showVotes: boolean;
  showGenre: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const url = experienceUrl(row);
  const approval = approvalPercent(row.x);
  const detail: ApiDetail | null = row.x;

  return (
    <tr>
      <Td className="tabular">{rank}</Td>
      <Td>
        {url ? (
          <SourceLink t={t} href={url}>
            <Foreign>{row.n}</Foreign>
          </SourceLink>
        ) : (
          <Foreign>{row.n}</Foreign>
        )}
        {row.s ? (
          <>
            {" "}
            <Badge tone="warning">{t("platform.live.sponsored")}</Badge>
          </>
        ) : null}
        <span className="block text-sm text-(--color-text-muted)">
          {detail?.c ? (
            <>
              {rich(t("platform.live.byCreator"), { creator: <Foreign>{detail.c}</Foreign> })}
              {detail.cv ? ` ${t("platform.live.verifiedSuffix")}` : ""}
            </>
          ) : null}
          {detail?.c && detail.a ? " · " : null}
          {row.a ? <MaturityNote value={row.a} t={t} /> : null}
          {detail?.f != null ? (
            <>
              {detail.c || detail.a ? " · " : null}
              {t("platform.live.favouritesCount", { count: numberFormat.format(detail.f) })}
            </>
          ) : null}
          {/*
            The second clock, shown where it matters.

            Player counts are minutes old; this row's metadata may be hours
            old, because enrichment sweeps on a slower rotation. Stating one
            time for both would present the older figures as freshly read.
          */}
          <span className="block text-xs">
            {detail
              ? t("platform.dashboard.detailsRefreshed", { when: formatObserved(detail.o, t) })
              : t("platform.dashboard.detailsPending")}
          </span>
        </span>
      </Td>
      <Td className="tabular">{numberFormat.format(row.p)}</Td>
      <Td>
        <button
          type="button"
          onClick={onSelect}
          aria-expanded={selected}
          className="inline-flex min-h-[44px] items-center rounded-(--radius-control) px-1 motion-safe:transition-opacity hover:opacity-70"
        >
          <span aria-hidden="true" className="text-sm text-(--color-text-muted)">
            {selected ? "▾" : "▸"}
          </span>
          <span className="sr-only">
            {t("platform.live.body.experience.p5", { gameHistoryDays: String(HISTORY_DAYS), name: row.n })}
          </span>
        </button>
      </Td>
      {showVisits ? <Td className="tabular">{detail?.v == null ? "—" : numberFormat.format(detail.v)}</Td> : null}
      {showVotes ? (
        <Td className="tabular">
          {approval === null ? (
            "—"
          ) : (
            <>
              {approval.toFixed(1)}%
              <span className="block text-xs text-(--color-text-muted)">
                {numberFormat.format((detail?.u ?? 0) + (detail?.d ?? 0))}
              </span>
            </>
          )}
        </Td>
      ) : null}
      {showGenre ? <Td>{detail?.g ?? "—"}</Td> : null}
    </tr>
  );
}

function ExperienceDetail({
  t,
  universeId,
  days,
  attempt,
  onClose,
}: {
  readonly t: Translate;
  universeId: number;
  days: number;
  attempt: number;
  onClose: () => void;
}) {
  const phase = useResource<ExperiencePayload>("experience", null, days, universeId, attempt);

  const name =
    phase.kind === "ready" ? (phase.value.name ?? t("platform.history.unnamedExperience")) : t("platform.history.unnamedExperience");

  return (
    <div id="experience" className="mt-6">
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-lg font-bold text-(--color-text)">
            <Foreign>{name}</Foreign>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] text-sm font-medium text-(--color-primary) underline underline-offset-2"
          >
            {t("platform.live.body.experience.p1")}
          </button>
        </div>

        {phase.kind === "loading" ? (
          <p className="mt-3 text-sm text-(--color-text-muted)" aria-live="polite">
            {t("platform.dashboard.loadingTitle")}
          </p>
        ) : phase.kind === "failed" ? (
          <p className="mt-3 text-sm text-(--color-text-muted)">
            {t(
              phase.failure === "not-found"
                ? "platform.live.body.experience.p7"
                : "platform.dashboard.offlineBody",
            )}
          </p>
        ) : (
          <ExperienceChart t={t} payload={phase.value} name={name} />
        )}
      </Card>
    </div>
  );
}

function ExperienceChart({
  t,
  payload,
  name,
}: {
  readonly t: Translate;
  payload: ExperiencePayload;
  name: string;
}) {
  const points = payload.points;
  if (points.length < MINIMUM_POINTS_FOR_CHART) {
    return (
      <p className="mt-3 text-(--color-text-muted)">
        {t(points.length === 1 ? "platform.history.onlyNObservations.one" : "platform.history.onlyNObservations.other", {
          count: String(points.length),
          gameHistoryDays: String(HISTORY_DAYS),
        })}
      </p>
    );
  }

  const extremes = summarise(points);
  return (
    <>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Stat
          label={t("platform.history.stats.observations")}
          value={numberFormat.format(points.length)}
          note={t("platform.history.stats.overSpan", { span: describeSpan(points) })}
        />
        <Stat
          label={t("platform.history.stats.observedPeak")}
          value={numberFormat.format(extremes.peak[1])}
          note={formatObserved(new Date(extremes.peak[0]).toISOString(), t)}
        />
        <Stat
          label={t("platform.history.stats.observedLow")}
          value={numberFormat.format(extremes.low[1])}
          note={formatObserved(new Date(extremes.low[0]).toISOString(), t)}
        />
      </div>
      <div className="mt-6">
        <TimeSeriesChart
          points={toChartPoints(points)}
          caption={t("platform.history.charts.experienceCaption", { name, span: describeSpan(points) })}
          formatValue={compact}
        />
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

function RangeTabs({
  t,
  days,
  onSelect,
}: {
  readonly t: Translate;
  days: number;
  onSelect: (days: number) => void;
}) {
  return (
    <nav aria-label={t("platform.history.rangeLabel")} className="mb-6">
      <ul className="flex flex-wrap gap-2">
        {RANGES.map((option) => {
          const current = option === days;
          return (
            <li key={option}>
              <button
                type="button"
                onClick={() => onSelect(option)}
                aria-current={current ? "true" : undefined}
                className={
                  current
                    ? "inline-flex min-h-[44px] items-center rounded-(--radius-control) border border-(--color-primary) bg-(--color-primary) px-4 text-sm font-semibold text-(--color-on-primary)"
                    : "inline-flex min-h-[44px] items-center rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) px-4 text-sm font-semibold text-(--color-text) motion-safe:transition-colors hover:border-(--color-primary) hover:text-(--color-primary)"
                }
              >
                {rangeLabel(t, option)}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function TotalsSection({
  t,
  phase,
  retry,
}: {
  readonly t: Translate;
  phase: Phase<SeriesPayload>;
  retry: () => void;
}) {
  if (phase.kind === "loading") return <Waiting t={t} />;
  if (phase.kind === "failed") return <Unavailable t={t} failure={phase.failure} retry={retry} />;

  const points = phase.value.points;
  if (points.length < MINIMUM_POINTS_FOR_CHART) {
    return (
      <Callout tone="info" title={t("platform.history.notEnoughYetTitle")}>
        {t(points.length === 1 ? "platform.history.observationsSoFar.one" : "platform.history.observationsSoFar.other", {
          count: String(points.length),
          minimumPointsForChart: String(MINIMUM_POINTS_FOR_CHART),
        })}
      </Callout>
    );
  }

  const extremes = summarise(points);
  const latest = points[points.length - 1]!;

  return (
    <div className="min-w-0">
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t("platform.history.stats.observationsRecorded")}
          value={numberFormat.format(points.length)}
        />
        <Stat label={t("platform.history.stats.periodCovered")} value={describeSpan(points)} />
        <Stat label={t("platform.history.stats.mostRecentTotal")} value={numberFormat.format(latest[1])} />
        <Stat
          label={t("platform.history.stats.observedPeak")}
          value={numberFormat.format(extremes.peak[1])}
          note={formatObserved(new Date(extremes.peak[0]).toISOString(), t)}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Stat
          label={t("platform.history.stats.observedLow")}
          value={numberFormat.format(extremes.low[1])}
          note={formatObserved(new Date(extremes.low[0]).toISOString(), t)}
        />
        <Stat
          label={t("platform.history.stats.averageAcrossObservations")}
          value={numberFormat.format(extremes.mean)}
          note={t("platform.history.stats.meanNoteText", { points: numberFormat.format(points.length) })}
        />
      </div>

      <div className="mt-6">
        <TimeSeriesChart
          points={toChartPoints(points)}
          caption={t("platform.history.charts.totalCaption", { span: describeSpan(points) })}
          formatValue={compact}
        />
      </div>

      <p className="mt-4 text-sm text-(--color-text-muted)">
        {t("platform.live.body.experience.p16", { retentionDays: RETENTION_DAYS })}{" "}
        <Badge tone="neutral">{t("platform.history.recordedByThisSite")}</Badge>
      </p>
    </div>
  );
}

/** Turns the stored highlights matrix into per-series point lists for one window. */
function useSeries(payload: HighlightsPayload, days: number) {
  return useMemo(() => {
    const cutoff = payload.at.length === 0 ? 0 : payload.at[payload.at.length - 1]! - days * 86_400_000;
    return payload.series
      .map((entry) => {
        const points: [number, number][] = [];
        for (let i = 0; i < entry.players.length; i += 1) {
          const at = payload.at[i];
          const value = entry.players[i];
          // A null is "not observed at that hour" and is dropped rather than
          // drawn as a zero. The chart shows a gap, which is what happened.
          if (at === undefined || at < cutoff || value === null || value === undefined) continue;
          points.push([at, value]);
        }
        return { id: entry.id, name: entry.name, points };
      })
      .filter((entry) => entry.points.length >= 2);
  }, [payload, days]);
}

function HighlightsSection({
  t,
  phase,
  days,
  retry,
}: {
  readonly t: Translate;
  phase: Phase<HighlightsPayload>;
  days: number;
  retry: () => void;
}) {
  if (phase.kind === "loading") return <Waiting t={t} />;
  if (phase.kind === "failed") return <Unavailable t={t} failure={phase.failure} retry={retry} />;
  return <HighlightsCharts t={t} payload={phase.value} days={days} />;
}

function HighlightsCharts({
  t,
  payload,
  days,
}: {
  readonly t: Translate;
  payload: HighlightsPayload;
  days: number;
}) {
  const series = useSeries(payload, days);

  if (series.length === 0) {
    return (
      <Callout tone="info" title={t("platform.history.notEnoughLinesTitle")}>
        {t("platform.history.noPerExperienceCounts")} {t("platform.history.notEnoughLinesBody")}
      </Callout>
    );
  }

  const busiest = series.reduce((best, entry) => {
    const latest = entry.points[entry.points.length - 1]![1];
    return latest > best.latest ? { name: entry.name, latest } : best;
  }, { name: series[0]!.name, latest: series[0]!.points[series[0]!.points.length - 1]![1] });

  return (
    <div className="min-w-0">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={t("platform.history.stats.experiencesTracked")} value={numberFormat.format(series.length)} />
        <Stat
          label={t("platform.history.stats.observationsHeld")}
          value={numberFormat.format(payload.at.length)}
          note={t("platform.history.stats.observationsNote", { days: HISTORY_DAYS })}
        />
        <Stat
          label={t("platform.history.stats.busiestTracked")}
          value={busiest.name}
          foreign
          note={t("platform.history.stats.busiestNote", { players: numberFormat.format(busiest.latest) })}
        />
      </div>

      <div className="mt-6">
        <MultiSeriesChart
          series={series.map((entry) => ({
            id: entry.id,
            name: entry.name,
            latest: entry.points[entry.points.length - 1]![1],
            points: toChartPoints(entry.points),
          }))}
          caption={t("platform.history.charts.topOverTimeCaption", {
            plotted: String(series.length),
            tracked: numberFormat.format(series.length),
            intervalMinutes: String(payload.intervalMinutes),
          })}
          formatValue={compact}
        />
      </div>
    </div>
  );
}

/**
 * The busiest single experience at each observation.
 *
 * Taken as the maximum across the charted series rather than across every
 * experience ever seen. The busiest experience is by definition among the
 * busiest twelve, so the two are the same number — and this needs no second
 * request.
 */
function BusiestSection({
  t,
  phase,
  days,
  retry,
}: {
  readonly t: Translate;
  phase: Phase<HighlightsPayload>;
  days: number;
  retry: () => void;
}) {
  if (phase.kind === "loading") return <Waiting t={t} />;
  if (phase.kind === "failed") return <Unavailable t={t} failure={phase.failure} retry={retry} />;
  return <BusiestChart t={t} payload={phase.value} days={days} />;
}

function BusiestChart({ t, payload, days }: { readonly t: Translate; payload: HighlightsPayload; days: number }) {
  const series = useSeries(payload, days);

  const { points, leaders } = useMemo(() => {
    const best = new Map<number, { value: number; name: string }>();
    for (const entry of series) {
      for (const [at, value] of entry.points) {
        const current = best.get(at);
        if (!current || value > current.value) best.set(at, { value, name: entry.name });
      }
    }
    const ordered = [...best.entries()].sort((a, b) => a[0] - b[0]);
    return {
      points: ordered.map(([at, entry]) => [at, entry.value] as [number, number]),
      leaders: Object.fromEntries(ordered.map(([at, entry]) => [at, entry.name])),
    };
  }, [series]);

  if (points.length < MINIMUM_POINTS_FOR_CHART) {
    return (
      <Callout tone="info" title={t("platform.history.notEnoughYetTitle")}>
        {t(points.length === 1 ? "platform.history.observationsSoFar.one" : "platform.history.observationsSoFar.other", {
          count: String(points.length),
          minimumPointsForChart: String(MINIMUM_POINTS_FOR_CHART),
        })}
      </Callout>
    );
  }

  const extremes = summarise(points);
  const latest = points[points.length - 1]!;

  return (
    <div className="min-w-0">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label={t("platform.live.stats.busiestRightNow")}
          value={numberFormat.format(latest[1])}
          note={leaders[latest[0]]}
        />
        <Stat
          label={t("platform.history.stats.highestObserved")}
          value={numberFormat.format(extremes.peak[1])}
          note={`${leaders[extremes.peak[0]] ?? ""} · ${formatObserved(new Date(extremes.peak[0]).toISOString(), t)}`}
        />
        <Stat
          label={t("platform.history.stats.lowestObserved")}
          value={numberFormat.format(extremes.low[1])}
          note={`${leaders[extremes.low[0]] ?? ""} · ${formatObserved(new Date(extremes.low[0]).toISOString(), t)}`}
        />
      </div>

      <div className="mt-6">
        <TimeSeriesChart
          points={toChartPoints(points)}
          caption={t("platform.history.charts.busiestCaption", { span: describeSpan(points) })}
          formatValue={compact}
        />
      </div>

      <p className="mt-4 text-sm text-(--color-text-muted)">
        {t("platform.history.highestObservedNote")} <Badge tone="neutral">{t("platform.history.recordedByThisSite")}</Badge>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

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

function rangeLabel(t: Translate, days: number): string {
  if (days === 1) return t("common.ranges.day");
  if (days === 3) return t("common.ranges.threeDays");
  if (days === 7) return t("common.ranges.sevenDays");
  return t("common.ranges.days", { days: String(days) });
}

function toChartPoints(points: readonly (readonly [number, number])[]) {
  return points.map(([at, value]) => ({ at: new Date(at).toISOString(), value }));
}

function summarise(points: readonly (readonly [number, number])[]) {
  let peak = points[0]!;
  let low = points[0]!;
  let sum = 0;
  for (const point of points) {
    if (point[1] > peak[1]) peak = point;
    if (point[1] < low[1]) low = point;
    sum += point[1];
  }
  return { peak, low, mean: Math.round(sum / points.length) };
}

/** The span actually covered, never the span the range button asked for. */
function describeSpan(points: readonly (readonly [number, number])[]): string {
  if (points.length < 2) return "—";
  const hours = (points[points.length - 1]![0] - points[0]![0]) / 3_600_000;
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
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

export { DEFAULT_RANGE };
