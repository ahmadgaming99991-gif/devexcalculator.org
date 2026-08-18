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
  formatTick,
  className,
}: {
  data: readonly ChartDatum[];
  caption: string;
  valueLabel: string;
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
        {caption} Values are {valueLabel}.
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
