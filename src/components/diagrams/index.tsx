import { Fragment, type ReactNode } from "react";
import { cx } from "@/components/ui";

/**
 * Explanatory diagrams.
 *
 * The site had no imagery at all, and the guides read as walls of text. What
 * they were missing is not decoration: it is the two things prose is worst at
 * and a picture is best at — the order things happen in, and which of them is
 * a gate rather than a step.
 *
 * These are built from real text and CSS with SVG only for the connectors,
 * rather than drawn as pictures. That is a deliberate reversal of how the
 * charts in `components/charts` work, and the reason is that a chart's content
 * is a shape while a diagram's content is words:
 *
 *   - Text inside an `<svg>` scales with the viewBox, so a 720-wide drawing on
 *     a 320px screen renders 12px labels at about five. These reflow instead.
 *   - Real text honours the reader's own font size, can be selected, and is
 *     translated by a browser's translator. Text in an SVG is none of those.
 *   - A screen reader gets an ordered list describing the flow, because that is
 *     literally what the markup is. Nothing has to be restated in a hidden
 *     paragraph and kept in step by hand.
 *
 * No generated imagery, and specifically no depictions of the DevEx portal. An
 * invented screenshot of a real product is a fabricated record — the same thing
 * this site refuses to do with a rate, and worse, because a reader would try to
 * follow it. Every figure below comes from the rate registry rather than being
 * written into the drawing.
 */

type Tone = "neutral" | "primary" | "warning" | "success" | "danger";

const TONE_BORDER: Record<Tone, string> = {
  neutral: "border-l-(--color-border-strong)",
  primary: "border-l-(--color-primary)",
  warning: "border-l-(--color-warning)",
  success: "border-l-(--color-success)",
  danger: "border-l-(--color-danger)",
};

const TONE_MARKER: Record<Tone, string> = {
  neutral: "bg-(--color-surface-subtle) text-(--color-text-muted)",
  primary: "bg-(--color-primary-soft) text-(--color-primary-strong)",
  warning: "bg-(--color-warning-soft) text-(--color-warning)",
  success: "bg-(--color-success-soft) text-(--color-success)",
  danger: "bg-(--color-danger-soft) text-(--color-danger)",
};

/**
 * The connector between two stages.
 *
 * Rotated rather than swapped for a second glyph, so there is one shape to
 * keep consistent. It points down while the stages are stacked and right once
 * they sit in a row, which is the direction the reading order actually goes at
 * each width.
 */
function Connector() {
  return (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center self-center py-1 sm:px-1 sm:py-0"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5 rotate-90 text-(--color-border-strong) sm:rotate-0"
        fill="none"
        focusable="false"
      >
        <path
          d="M4 12h13m0 0-5-5m5 5-5 5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export interface FlowStage {
  readonly label: string;
  readonly detail: ReactNode;
  /**
   * Who controls this stage. Named because the single most useful thing these
   * flows show is that the money passes through hands that are not Roblox's
   * and not this site's.
   */
  readonly by?: string;
  readonly tone?: Tone;
  /**
   * Marks a stage that can end the flow rather than pass it along. Drawn
   * differently because "Roblox reviews the request" is not a step you complete
   * — it is a decision that can go against you, and a row of identical boxes
   * says the opposite.
   */
  readonly decision?: boolean;
}

/**
 * A left-to-right sequence of stages, stacking on narrow screens.
 *
 * An ordered list underneath the styling, so the order is in the markup rather
 * than only in the arrows.
 */
export function ValueFlow({
  stages,
  caption,
  className,
}: {
  stages: readonly FlowStage[];
  caption: string;
  className?: string;
}) {
  return (
    <figure className={cx("m-0 min-w-0", className)}>
      <ol className="flex list-none flex-col p-0 sm:flex-row sm:items-stretch">
        {stages.map((stage, index) => {
          const tone: Tone = stage.tone ?? "neutral";
          /*
           * A decision does not consume a number. Counting it produced a
           * sequence reading 1, 2, 3, ?, 5, which looks like a step went
           * missing rather than like one of them is not a step you perform.
           */
          const step = stages.slice(0, index + 1).filter((s) => !s.decision).length;
          return (
            <Fragment key={stage.label}>
              {index > 0 ? <Connector /> : null}
              <li
                className={cx(
                  "flex min-w-0 flex-1 flex-col rounded-(--radius-control) border border-(--color-border) border-l-4 bg-(--color-surface) p-3",
                  TONE_BORDER[tone],
                  stage.decision && "border-dashed",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cx(
                      "tabular flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      TONE_MARKER[tone],
                    )}
                  >
                    {stage.decision ? "?" : step}
                  </span>
                  <p className="min-w-0 text-sm font-semibold break-words text-(--color-text)">
                    {stage.label}
                  </p>
                </div>
                <p className="mt-2 text-sm text-(--color-text-muted)">{stage.detail}</p>
                {stage.by ? (
                  <p className="mt-2 text-xs font-medium text-(--color-text-muted)">
                    Applied by {stage.by}
                  </p>
                ) : null}
              </li>
            </Fragment>
          );
        })}
      </ol>
      <figcaption className="mt-3 text-sm text-(--color-text-muted)">{caption}</figcaption>
    </figure>
  );
}

/**
 * A proportional split of one payment between two parties.
 *
 * The percentages arrive as the registry's own strings and are printed
 * unchanged; they are parsed only to size the bar, which is presentation. A
 * share is never recomputed here — the one number this drawing exists to show
 * is the one number it must not invent.
 */
export function ShareSplit({
  total,
  parts,
  caption,
  className,
}: {
  total: string;
  parts: readonly {
    readonly label: string;
    /** Exactly as published, e.g. "70". Printed, not recalculated. */
    readonly percent: string;
    readonly tone: Tone;
    readonly note?: string;
  }[];
  caption: string;
  className?: string;
}) {
  const widths = parts.map((part) => Math.max(Number.parseFloat(part.percent) || 0, 0));
  const sum = widths.reduce((running, width) => running + width, 0) || 1;

  const FILL: Record<Tone, string> = {
    neutral: "bg-(--color-border-strong)",
    primary: "bg-(--color-primary)",
    warning: "bg-(--color-warning)",
    success: "bg-(--color-success)",
    danger: "bg-(--color-danger)",
  };

  return (
    <figure className={cx("m-0 min-w-0", className)}>
      <p className="text-sm font-semibold text-(--color-text)">{total}</p>

      <div
        aria-hidden="true"
        className="mt-2 flex h-8 w-full overflow-hidden rounded-(--radius-control) border border-(--color-border)"
      >
        {parts.map((part, index) => (
          <div
            key={part.label}
            className={cx(FILL[part.tone], index > 0 && "border-l border-(--color-surface)")}
            style={{ width: `${((widths[index] ?? 0) / sum) * 100}%` }}
          />
        ))}
      </div>

      {/*
        The figures live here rather than inside the bar. A label printed on a
        segment is unreadable once that segment is narrow, and the reader who
        most needs the number is the one looking at the smallest share.
      */}
      <ul className="mt-3 flex list-none flex-col gap-2 p-0 sm:flex-row sm:flex-wrap sm:gap-x-6">
        {parts.map((part) => (
          <li key={part.label} className="flex min-w-0 items-start gap-2">
            <span
              aria-hidden="true"
              className={cx("mt-1.5 size-3 shrink-0 rounded-xs", FILL[part.tone])}
            />
            <span className="min-w-0 text-sm text-(--color-text-muted)">
              <span className="tabular font-semibold text-(--color-text)">
                {part.percent}%
              </span>{" "}
              {part.label}
              {part.note ? (
                <span className="block text-xs">{part.note}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      <figcaption className="mt-3 text-sm text-(--color-text-muted)">{caption}</figcaption>
    </figure>
  );
}

/**
 * What passes a gate and what is stopped by it.
 *
 * The prose version of this is two bulleted lists, which describe the sorting
 * without showing that there is one — and the sorting is the whole point.
 */
export function EligibilityGate({
  accepted,
  rejected,
  outcome,
  caption,
  className,
}: {
  readonly accepted: { readonly heading: string; readonly items: readonly string[] };
  readonly rejected: { readonly heading: string; readonly items: readonly string[] };
  readonly outcome: ReactNode;
  readonly caption: string;
  readonly className?: string;
}) {
  return (
    <figure className={cx("m-0 min-w-0", className)}>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <div className="min-w-0 rounded-(--radius-control) border border-(--color-border) border-t-4 border-t-(--color-success) bg-(--color-surface) p-4">
          <p className="text-sm font-semibold text-(--color-text)">{accepted.heading}</p>
          <ul className="mt-3 flex list-none flex-col gap-2 p-0">
            {accepted.items.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-(--color-text-muted)">
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  focusable="false"
                  className="mt-0.5 size-4 shrink-0 text-(--color-success)"
                  fill="none"
                >
                  <path
                    d="m4 10.5 4 4 8-9"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 rounded-(--radius-control) border border-(--color-border) border-t-4 border-t-(--color-danger) bg-(--color-surface) p-4">
          <p className="text-sm font-semibold text-(--color-text)">{rejected.heading}</p>
          <ul className="mt-3 flex list-none flex-col gap-2 p-0">
            {rejected.items.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-(--color-text-muted)">
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  focusable="false"
                  className="mt-0.5 size-4 shrink-0 text-(--color-danger)"
                  fill="none"
                >
                  <path
                    d="M5 5l10 10M15 5 5 15"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div aria-hidden="true" className="flex justify-center py-2">
        <svg
          viewBox="0 0 24 24"
          className="size-6 text-(--color-border-strong)"
          fill="none"
          focusable="false"
        >
          <path
            d="M12 4v13m0 0-5-5m5 5 5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="min-w-0 rounded-(--radius-control) border border-(--color-primary) bg-(--color-primary-soft) p-4">
        <p className="text-sm text-(--color-text)">{outcome}</p>
      </div>

      <figcaption className="mt-3 text-sm text-(--color-text-muted)">{caption}</figcaption>
    </figure>
  );
}

/**
 * A threshold on a scale, with what each side of it means.
 *
 * Drawn because a minimum is one of the few facts on this site that is genuinely
 * positional: a balance is on one side of it or the other, and no amount of
 * being close counts for anything.
 */
export function ThresholdScale({
  thresholdLabel,
  below,
  above,
  caption,
  className,
}: {
  readonly thresholdLabel: string;
  readonly below: string;
  readonly above: string;
  readonly caption: string;
  readonly className?: string;
}) {
  return (
    <figure className={cx("m-0 min-w-0", className)}>
      <div aria-hidden="true" className="flex h-3 w-full overflow-hidden rounded-full">
        {/*
          Not to scale, and it must not look as though it were: there is no
          upper bound on a balance, so any width chosen for the eligible side
          would be arbitrary. The break is what carries the meaning.
        */}
        <div className="h-full w-2/5 bg-(--color-danger-soft)" />
        <div className="h-full w-1 bg-(--color-text)" />
        <div className="h-full flex-1 bg-(--color-success-soft)" />
      </div>

      {/*
        Anchored to the break rather than centred under the whole bar, where it
        read as a label for the entire scale instead of for the one point on it
        that means anything.
      */}
      <div className="mt-1 grid" style={{ gridTemplateColumns: "2fr 3fr" }}>
        <div />
        <p className="tabular min-w-0 text-sm font-semibold text-(--color-text)">
          <span aria-hidden="true">&uarr; </span>
          {thresholdLabel}
        </p>
      </div>

      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="min-w-0 rounded-(--radius-control) border border-(--color-border) border-l-4 border-l-(--color-danger) bg-(--color-surface) p-3">
          <p className="text-sm text-(--color-text-muted)">{below}</p>
        </div>
        <div className="min-w-0 rounded-(--radius-control) border border-(--color-border) border-l-4 border-l-(--color-success) bg-(--color-surface) p-3">
          <p className="text-sm text-(--color-text-muted)">{above}</p>
        </div>
      </div>

      <figcaption className="mt-3 text-sm text-(--color-text-muted)">{caption}</figcaption>
    </figure>
  );
}
