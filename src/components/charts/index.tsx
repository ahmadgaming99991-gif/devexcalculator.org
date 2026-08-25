import type { Translate } from "@/i18n/get-dictionary";
import type { ReactNode } from "react";
import { cx } from "@/components/ui";

/**
 * Charts, drawn as server-rendered SVG.
 *
 * No charting library and no client JavaScript. A competitor's stats page
 * serves an empty document without scripts; these render in the HTML, so a
 * crawler, a reader with scripting off and a screen reader all get the figures.
 *
 * Accessibility is not the `<svg>`'s job here. Every chart is marked
 * `aria-hidden` and paired with the same numbers as a real table: a bar chart
 * announced as a list of coordinates helps nobody, while a table is something
 * assistive technology already navigates well. The picture is decoration over
 * data that is present either way.
 *
 * Colours come from theme tokens, so charts follow light and dark like the rest
 * of the site rather than baking in a palette.
 */

export interface ChartDatum {
  readonly label: string;
  /** Bar length. Non-negative. */
  readonly value: number;
  /** What to print — kept separate so exact strings are never re-formatted. */
  readonly display: string;
  /** Marks a value that was derived rather than published. */
  readonly provisional?: boolean;
  readonly note?: string;
}

function niceCeiling(max: number): number {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10]) {
    const candidate = step * magnitude;
    if (candidate >= max) return candidate;
  }
  return 10 * magnitude;
}

/**
 * A vertical bar chart.
 *
 * Sized in a viewBox with `preserveAspectRatio`, so it scales with its column
 * instead of carrying a fixed pixel width that would overflow a narrow screen.
 */
export function BarChart({
  data,
  caption,
  valueLabel,
  t,
  formatTick,
  className,
}: {
  data: readonly ChartDatum[];
  caption: string;
  valueLabel: string;
  readonly t: Translate;
  /**
   * Formats an axis tick. Supplied by the caller because only the caller knows
   * what the numbers mean: a generic formatter rounded values that were already
   * in millions and printed "1k" twice on the same axis.
   */
  formatTick?: (value: number) => string;
  className?: string;
}) {
  const tickLabel = formatTick ?? ((value: number) => defaultTick(value, data));
  const width = 720;
  const height = 300;
  const padding = { top: 16, right: 12, bottom: 44, left: 64 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const ceiling = niceCeiling(Math.max(...data.map((d) => d.value)));
  const slot = plotWidth / Math.max(data.length, 1);
  const barWidth = Math.min(slot * 0.62, 74);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => fraction * ceiling);

  return (
    <figure className={cx("m-0", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-auto w-full"
        role="presentation"
        aria-hidden="true"
        focusable="false"
      >
        {ticks.map((tick) => {
          const y = padding.top + plotHeight - (tick / ceiling) * plotHeight;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="var(--color-border)"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="12"
                fill="var(--color-text-muted)"
              >
                {tickLabel(tick)}
              </text>
            </g>
          );
        })}

        {data.map((datum, index) => {
          const barHeight = (datum.value / ceiling) * plotHeight;
          const x = padding.left + index * slot + (slot - barWidth) / 2;
          const y = padding.top + plotHeight - barHeight;
          return (
            <g key={datum.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 1)}
                rx="4"
                fill="var(--color-primary)"
                // A derived figure is drawn hollow, so the chart makes the
                // same distinction the table does rather than presenting
                // arithmetic as though it were published.
                fillOpacity={datum.provisional ? 0.35 : 1}
                stroke="var(--color-primary)"
                strokeWidth={datum.provisional ? 1.5 : 0}
                strokeDasharray={datum.provisional ? "4 3" : undefined}
              />
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill="var(--color-text)"
              >
                {datum.display}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - padding.bottom + 20}
                textAnchor="middle"
                fontSize="12"
                fill="var(--color-text-muted)"
              >
                {datum.label}
              </text>
            </g>
          );
        })}

        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={padding.top + plotHeight}
          y2={padding.top + plotHeight}
          stroke="var(--color-border-strong)"
          strokeWidth="1"
        />
      </svg>

      <figcaption className="mt-2 text-sm text-(--color-text-muted)">
        {t("common.charts.body.intro.p1", { caption, valueLabel })}
      </figcaption>
    </figure>
  );
}

/**
 * A last-resort tick format. Kept deliberately plain: it prints enough decimals
 * to keep every tick on an axis distinct, because the earlier version rounded
 * to whole thousands and produced an axis reading 0k, 1k, 1k, 2k, 2k.
 */
function defaultTick(tick: number, data: readonly ChartDatum[]): string {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (max >= 1_000) {
    const thousands = tick / 1_000;
    return `${thousands % 1 === 0 ? thousands : thousands.toFixed(1)}k`;
  }
  return tick % 1 === 0 ? String(tick) : tick.toFixed(2);
}

export interface StepPoint {
  readonly label: string;
  readonly value: number;
  readonly display: string;
  /** When this value took effect. */
  readonly from: string;
}

/**
 * A step chart for a value that changes on a date and holds until the next
 * change — which is how a published rate behaves. A straight line between two
 * points would imply the rate drifted in between, and it did not.
 */
export function StepChart({
  points,
  caption,
  className,
}: {
  points: readonly StepPoint[];
  caption: string;
  className?: string;
}) {
  const width = 720;
  const height = 260;
  const padding = { top: 24, right: 20, bottom: 48, left: 76 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const max = Math.max(...points.map((p) => p.value));
  const min = Math.min(...points.map((p) => p.value));
  const span = max - min || max || 1;
  const ceiling = max + span * 0.25;
  const floor = Math.max(0, min - span * 0.35);

  const yFor = (value: number) =>
    padding.top + plotHeight - ((value - floor) / (ceiling - floor)) * plotHeight;
  const segment = plotWidth / Math.max(points.length, 1);

  const path = points
    .map((point, index) => {
      const x = padding.left + index * segment;
      const y = yFor(point.value);
      return index === 0 ? `M ${x} ${y} H ${x + segment}` : `V ${y} H ${x + segment}`;
    })
    .join(" ");

  return (
    <figure className={cx("m-0", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-auto w-full"
        role="presentation"
        aria-hidden="true"
        focusable="false"
      >
        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={padding.top + plotHeight}
          y2={padding.top + plotHeight}
          stroke="var(--color-border-strong)"
        />
        <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="3" />

        {points.map((point, index) => {
          const x = padding.left + index * segment;
          const y = yFor(point.value);
          return (
            <g key={point.label}>
              <circle cx={x} cy={y} r="5" fill="var(--color-primary)" />
              <text
                x={x + segment / 2}
                y={y - 14}
                textAnchor="middle"
                fontSize="13"
                fontWeight="600"
                fill="var(--color-text)"
              >
                {point.display}
              </text>
              <text
                x={x + segment / 2}
                y={height - padding.bottom + 22}
                textAnchor="middle"
                fontSize="12"
                fill="var(--color-text-muted)"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-sm text-(--color-text-muted)">{caption}</figcaption>
    </figure>
  );
}

/** Wraps a chart and the table that carries the same numbers. */
export function ChartWithTable({
  chart,
  children,
}: {
  chart: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      {chart}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export interface SeriesPoint {
  /** ISO timestamp of the observation. */
  readonly at: string;
  readonly value: number;
}

/**
 * A time series drawn from observations that were actually recorded.
 *
 * The x axis is real time, not evenly spaced slots, so a gap in collection
 * shows as a gap rather than being quietly closed up. Nothing is interpolated
 * or back-filled: if the collector missed an hour, the line reflects that.
 *
 * The chart does not assume any particular window. On the first day it draws a
 * few hours; as observations accumulate it draws more, with no code change.
 */
export function TimeSeriesChart({
  points,
  caption,
  formatValue,
  className,
}: {
  points: readonly SeriesPoint[];
  caption: string;
  formatValue: (value: number) => string;
  className?: string;
}) {
  const width = 720;
  const height = 260;
  const padding = { top: 20, right: 16, bottom: 40, left: 72 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const values = points.map((point) => point.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  // A flat series would otherwise divide by zero and draw nothing.
  const span = max - min || Math.max(max, 1);
  const ceiling = max + span * 0.15;
  const floor = Math.max(0, min - span * 0.15);

  const times = points.map((point) => Date.parse(point.at));
  const firstTime = Math.min(...times);
  const lastTime = Math.max(...times);
  const timeSpan = lastTime - firstTime || 1;

  const xFor = (time: number) => padding.left + ((time - firstTime) / timeSpan) * plotWidth;
  const yFor = (value: number) =>
    padding.top + plotHeight - ((value - floor) / (ceiling - floor)) * plotHeight;

  const path = points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${xFor(Date.parse(point.at)).toFixed(1)} ${yFor(point.value).toFixed(1)}`;
    })
    .join(" ");

  const ticks = [floor, floor + (ceiling - floor) / 2, ceiling];
  const firstLabel = points[0]?.at ?? "";
  const lastLabel = points[points.length - 1]?.at ?? "";

  return (
    <figure className={cx("m-0", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-auto w-full"
        role="presentation"
        aria-hidden="true"
        focusable="false"
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={yFor(tick)}
              y2={yFor(tick)}
              stroke="var(--color-border)"
            />
            <text
              x={padding.left - 10}
              y={yFor(tick) + 4}
              textAnchor="end"
              fontSize="12"
              fill="var(--color-text-muted)"
            >
              {formatValue(tick)}
            </text>
          </g>
        ))}

        <path d={path} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" />

        {/* A handful of points, so a short series still reads as measurements. */}
        {points.length <= 24
          ? points.map((point) => (
              <circle
                key={point.at}
                cx={xFor(Date.parse(point.at))}
                cy={yFor(point.value)}
                r="3"
                fill="var(--color-primary)"
              />
            ))
          : null}

        <text
          x={padding.left}
          y={height - 14}
          fontSize="12"
          fill="var(--color-text-muted)"
        >
          {shortTime(firstLabel)}
        </text>
        <text
          x={width - padding.right}
          y={height - 14}
          textAnchor="end"
          fontSize="12"
          fill="var(--color-text-muted)"
        >
          {shortTime(lastLabel)}
        </text>
      </svg>
      <figcaption className="mt-2 text-sm text-(--color-text-muted)">{caption}</figcaption>
    </figure>
  );
}

/** "18 Aug 14:30 UTC" — explicit about the zone, since readers are worldwide. */
function shortTime(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return `${at.getUTCDate()} ${
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][
      at.getUTCMonth()
    ]
  } ${String(at.getUTCHours()).padStart(2, "0")}:${String(at.getUTCMinutes()).padStart(2, "0")} UTC`;
}

/**
 * A single-row trend line, sized to sit inside a table cell.
 *
 * Drawn for every row of a ranking, so it is deliberately cheap: no axes, no
 * labels, no gradient, and the points are thinned before any coordinate is
 * computed. Ninety of these render on one page, and the Worker's CPU budget is
 * the constraint that shapes them.
 *
 * `aria-hidden`, like every other chart here. The row already carries the
 * current figure as text, and the sparkline is a shape over data that is
 * present either way; the accessible name for the trend is on the link beside
 * it, which says what the line shows in words.
 */
export function Sparkline({
  points,
  className,
}: {
  points: readonly SeriesPoint[];
  className?: string;
}) {
  if (points.length < 2) return null;

  const width = 96;
  const height = 24;
  const pad = 2;

  // Thinning keeps the shape while capping the work per row. A day of
  // observations at fifteen minutes is 96 points; a 96-pixel-wide line cannot
  // show more than a fraction of that anyway.
  const maxPoints = 24;
  const step = Math.ceil(points.length / maxPoints);
  const sampled = points.filter(
    (_, index) => index % step === 0 || index === points.length - 1,
  );

  let min = Infinity;
  let max = -Infinity;
  for (const point of sampled) {
    if (point.value < min) min = point.value;
    if (point.value > max) max = point.value;
  }
  // A flat line sits in the middle rather than dividing by zero.
  const span = max - min || 1;

  const last = sampled.length - 1;
  const coordinates = sampled.map((point, index) => {
    const x = pad + (index / last) * (width - pad * 2);
    const y = height - pad - ((point.value - min) / span) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const rising = (sampled[last]?.value ?? 0) >= (sampled[0]?.value ?? 0);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      className={cx("block", className)}
    >
      <polyline
        points={coordinates.join(" ")}
        fill="none"
        stroke={rising ? "var(--color-success)" : "var(--color-danger)"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export interface NamedSeries {
  readonly id: string;
  readonly name: string;
  readonly points: readonly SeriesPoint[];
  /** Current value, used to order the legend and pick which get a colour. */
  readonly latest: number;
}

/**
 * How many series get a colour of their own.
 *
 * Eight, because that is how many the categorical palette has, and a ninth is
 * never a generated hue. The competitor this page is measured against draws
 * around thirty coloured lines with a thirty-entry legend, which is why its
 * chart reads as a thicket: past a handful of hues nobody can match a line to
 * a name. Everything beyond the eighth is drawn in one muted colour — present
 * so the shape of the whole ranking is visible, claiming no identity.
 */
const NAMED_SERIES_LIMIT = 8;

/**
 * How many unnamed context lines are drawn behind the named ones.
 *
 * Bounded on purpose. Every tracked experience could be plotted — around 270 of
 * them — but at a full day of observations that is 270 paths of 96 points each,
 * built on every render inside a Worker's CPU budget and shipped in the HTML.
 * Forty is enough for the ranking to read as a body rather than eight isolated
 * lines, and the count is stated so nobody mistakes the picture for all of them.
 */
const CONTEXT_SERIES_LIMIT = 40;

/**
 * The most points any one line is drawn with.
 *
 * A 720-unit-wide plot cannot resolve more, so the rest is work and bytes spent
 * on detail nobody can see. Thinning keeps the first and last points so the
 * line still starts and ends where the data does.
 */
const MAX_POINTS_PER_LINE = 48;

function thin(points: readonly SeriesPoint[]): readonly SeriesPoint[] {
  if (points.length <= MAX_POINTS_PER_LINE) return points;
  const step = Math.ceil(points.length / MAX_POINTS_PER_LINE);
  return points.filter(
    (_, index) => index % step === 0 || index === points.length - 1,
  );
}

/**
 * Several experiences on one set of axes.
 *
 * The point of this chart is comparison: which experience is above which, and
 * which is climbing. That makes it a multi-line chart with a real legend rather
 * than one aggregate line, and the legend carries the name as text beside its
 * swatch — three of the eight light-mode hues sit below 3:1 on white, so colour
 * is never the only thing telling two series apart. The same figures appear as
 * text in the table below, which is the accessible view of this picture.
 */
export function MultiSeriesChart({
  series,
  caption,
  formatValue,
  className,
}: {
  series: readonly NamedSeries[];
  caption: string;
  formatValue: (value: number) => string;
  className?: string;
}) {
  const plotted = series
    .filter((entry) => entry.points.length >= 2)
    .slice(0, NAMED_SERIES_LIMIT + CONTEXT_SERIES_LIMIT)
    .map((entry) => ({ ...entry, points: thin(entry.points) }));
  if (plotted.length === 0) return null;

  const width = 720;
  const height = 300;
  const padding = { top: 16, right: 16, bottom: 36, left: 72 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  let max = -Infinity;
  let firstTime = Infinity;
  let lastTime = -Infinity;
  for (const entry of plotted) {
    for (const point of entry.points) {
      if (point.value > max) max = point.value;
      const time = Date.parse(point.at);
      if (time < firstTime) firstTime = time;
      if (time > lastTime) lastTime = time;
    }
  }

  // The floor is zero, not the smallest value: these are player counts, and a
  // cropped baseline would exaggerate every wobble into a cliff.
  const ceiling = niceCeiling(max);
  const timeSpan = lastTime - firstTime || 1;

  const xFor = (time: number) => padding.left + ((time - firstTime) / timeSpan) * plotWidth;
  const yFor = (value: number) => padding.top + plotHeight - (value / ceiling) * plotHeight;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => fraction * ceiling);

  // Named series are drawn last so they sit above the context lines.
  const named = plotted.slice(0, NAMED_SERIES_LIMIT);
  const rest = plotted.slice(NAMED_SERIES_LIMIT);

  const pathFor = (entry: NamedSeries) =>
    entry.points
      .map((point, index) =>
        `${index === 0 ? "M" : "L"} ${xFor(Date.parse(point.at)).toFixed(1)} ${yFor(point.value).toFixed(1)}`,
      )
      .join(" ");

  return (
    <figure className={cx("m-0 min-w-0", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-hidden="true"
        focusable="false"
        className="block h-auto w-full"
      >
        {ticks.map((value) => (
          <g key={value}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={yFor(value)}
              y2={yFor(value)}
              stroke="var(--color-border)"
              strokeWidth="1"
            />
            <text
              x={padding.left - 10}
              y={yFor(value) + 4}
              textAnchor="end"
              fontSize="12"
              fill="var(--color-text-muted)"
            >
              {formatValue(value)}
            </text>
          </g>
        ))}

        {rest.map((entry) => (
          <path
            key={entry.id}
            d={pathFor(entry)}
            fill="none"
            stroke="var(--color-series-other)"
            strokeWidth="1"
            strokeOpacity="0.45"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {named.map((entry, index) => (
          <path
            key={entry.id}
            d={pathFor(entry)}
            fill="none"
            stroke={`var(--color-series-${index + 1})`}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <text
          x={padding.left}
          y={height - 10}
          fontSize="12"
          fill="var(--color-text-muted)"
        >
          {shortTime(new Date(firstTime).toISOString())}
        </text>
        <text
          x={width - padding.right}
          y={height - 10}
          textAnchor="end"
          fontSize="12"
          fill="var(--color-text-muted)"
        >
          {shortTime(new Date(lastTime).toISOString())}
        </text>
      </svg>

      <ul className="mt-4 flex list-none flex-wrap gap-x-4 gap-y-2 p-0 text-sm">
        {named.map((entry, index) => (
          <li key={entry.id} className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block size-3 shrink-0 rounded-full"
              style={{ backgroundColor: `var(--color-series-${index + 1})` }}
            />
            <span className="truncate text-(--color-text)">{entry.name}</span>
            <span className="tabular shrink-0 text-(--color-text-muted)">
              {formatValue(entry.latest)}
            </span>
          </li>
        ))}
        {rest.length > 0 ? (
          <li className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block size-3 shrink-0 rounded-full"
              style={{ backgroundColor: "var(--color-series-other)" }}
            />
            <span className="text-(--color-text-muted)">
              {rest.length} more, unnamed
            </span>
          </li>
        ) : null}
      </ul>

      <figcaption className="mt-3 text-sm text-(--color-text-muted)">{caption}</figcaption>
    </figure>
  );
}
