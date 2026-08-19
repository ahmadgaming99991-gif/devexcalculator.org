import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

/**
 * Shared UI primitives.
 *
 * Kept as Server Components with no client JavaScript. Every interactive
 * element here is a real `<button>` or `<a>`, never a clickable `div`, so
 * keyboard operation and accessible names come from the platform rather than
 * from ARIA patched on afterwards.
 */

export function cx(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function Container({
  children,
  className,
  width = "default",
}: {
  children: ReactNode;
  className?: string;
  width?: "default" | "wide" | "prose";
}) {
  const widths = {
    default: "max-w-5xl",
    wide: "max-w-6xl",
    prose: "max-w-3xl",
  };
  return (
    <div className={cx("mx-auto w-full px-4 sm:px-6", widths[width], className)}>
      {children}
    </div>
  );
}

export function Card({
  children,
  className,
  as: Tag = "div",
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside";
  tone?: "default" | "subtle" | "raised";
}) {
  const tones = {
    default: "bg-(--color-surface) shadow-(--shadow-card)",
    subtle: "bg-(--color-surface-subtle)",
    raised: "bg-(--color-surface-raised) shadow-(--shadow-raised)",
  };
  return (
    <Tag
      className={cx(
        "card rounded-(--radius-card) border border-(--color-border) p-4 sm:p-6",
        tones[tone],
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function Section({
  id,
  heading,
  headingLevel = 2,
  children,
  description,
  className,
}: {
  id: string;
  heading: string;
  headingLevel?: 2 | 3;
  children: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section id={id} className={cx("scroll-mt-24", className)} aria-labelledby={`${id}-heading`}>
      <Heading
        id={`${id}-heading`}
        className={cx(
          "font-semibold tracking-tight text-(--color-text)",
          headingLevel === 2 ? "text-xl sm:text-2xl" : "text-lg sm:text-xl",
        )}
      >
        {heading}
      </Heading>
      {description ? (
        <p className="mt-2 text-(--color-text-muted)">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Buttons and links
// ---------------------------------------------------------------------------

/*
 * Shared button shape and motion.
 *
 * `relative` and `overflow-hidden` exist so a variant can lay a sheen over
 * itself without it spilling past the rounded corners. The timing is 200ms on
 * the way in and rests at 150ms, which is enough for the lift to register as a
 * response rather than a twitch, and short enough not to lag a fast pointer.
 *
 * Every motion property is behind `motion-safe:`. The stylesheet already
 * collapses transition durations under a reduced-motion preference, but a
 * transform with no duration still jumps, so the transform itself is gated:
 * those readers get a still button, not a snapping one. They keep the colour
 * and shadow change, so the control is no less legible.
 *
 * `isolate` pairs with the sheen below. An absolutely positioned pseudo-element
 * paints above non-positioned content — including the label — so without a
 * stacking context and an explicit order the sweep would wash the text it is
 * meant to pass behind.
 */
const buttonBase =
  "relative isolate inline-flex min-h-[44px] items-center justify-center gap-2 overflow-hidden " +
  "rounded-(--radius-control) px-4 py-2.5 text-sm font-semibold " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-200 " +
  "ease-[cubic-bezier(0.2,0.8,0.2,1)] " +
  "motion-safe:active:translate-y-0 motion-safe:active:duration-75 " +
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none " +
  "disabled:hover:translate-y-0 disabled:hover:shadow-none";

/*
 * The primary button carries a gradient and a light sweep on hover.
 *
 * The sweep is a pseudo-element translated across the face, not an opacity
 * fade, so it reads as light moving over a surface rather than the button
 * changing colour. It is decorative and skipped entirely under reduced motion;
 * the contrast of the label never depends on it, which is why the text colour
 * stays on its own token throughout.
 */
const buttonVariants = {
  primary:
    /*
     * The solid colour under the gradient is not decoration.
     *
     * It is the fallback wherever the gradient does not paint — forced colours,
     * a printed page, an older renderer — and it is deliberately the stop with
     * the *worse* contrast against the label in each mode, so measuring the
     * button's background colour measures the worst case rather than flattering
     * it. In light mode that is the lighter stop under white text; in dark mode
     * the darker stop under dark text. Removing it would leave the label over
     * transparency and quietly disable the contrast test that guards it.
     */
    "bg-(--color-primary) " +
    "bg-linear-to-br from-(--color-primary) to-(--color-primary-strong) " +
    "text-(--color-on-primary) shadow-sm " +
    "hover:shadow-lg " +
    "motion-safe:hover:-translate-y-0.5 active:shadow-sm " +
    "motion-safe:before:absolute motion-safe:before:inset-0 motion-safe:before:-z-10 " +
    "motion-safe:before:-translate-x-full motion-safe:before:bg-linear-to-r " +
    "motion-safe:before:from-transparent motion-safe:before:via-white/25 " +
    "motion-safe:before:to-transparent " +
    "motion-safe:before:transition-transform motion-safe:before:duration-700 " +
    "motion-safe:hover:before:translate-x-full",
  secondary:
    "border border-(--color-border-strong) bg-(--color-surface) text-(--color-text) " +
    "hover:border-(--color-primary) hover:bg-(--color-surface-subtle) " +
    "hover:text-(--color-primary) hover:shadow-md " +
    "motion-safe:hover:-translate-y-0.5",
  ghost:
    "text-(--color-primary) hover:bg-(--color-primary-soft) " +
    "motion-safe:hover:-translate-y-0.5",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

/**
 * Lifts the label above the primary variant's sweep.
 *
 * Cheap enough to apply to every variant rather than making the caller know
 * which one needs it, and it keeps the accessible name unchanged — a span
 * inside a button contributes its text exactly as a bare string does.
 */
function ButtonLabel({ children }: { children: ReactNode }) {
  return <span className="relative z-10 inline-flex items-center gap-2">{children}</span>;
}

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      className={cx(buttonBase, buttonVariants[variant], className)}
      {...props}
    >
      <ButtonLabel>{children}</ButtonLabel>
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
  external = false,
}: {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
  external?: boolean;
}) {
  const classes = cx(buttonBase, buttonVariants[variant], className);
  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer">
        <ButtonLabel>{children}</ButtonLabel>
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      <ButtonLabel>{children}</ButtonLabel>
    </Link>
  );
}

/**
 * A link to an official external source.
 *
 * Opens in a new tab with `noopener noreferrer`, but deliberately without
 * `nofollow`: these are authoritative citations, and marking them nofollow
 * would misrepresent the relationship.
 */
export function SourceLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cx(
        "font-medium text-(--color-primary) underline underline-offset-2 hover:text-(--color-primary-strong)",
        className,
      )}
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function InlineLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "font-medium text-(--color-primary) underline underline-offset-2 hover:text-(--color-primary-strong)",
        className,
      )}
    >
      {children}
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Badges and notes
// ---------------------------------------------------------------------------

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-(--color-surface-subtle) text-(--color-text-muted)",
  info: "bg-(--color-accent-soft) text-(--color-accent)",
  success: "bg-(--color-success-soft) text-(--color-success)",
  warning: "bg-(--color-warning-soft) text-(--color-warning)",
  danger: "bg-(--color-danger-soft) text-(--color-danger)",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * A callout. The tone is carried by a text label as well as by colour, so the
 * meaning survives for anyone who cannot distinguish the colours.
 */
export function Callout({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: BadgeTone;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const borders: Record<BadgeTone, string> = {
    neutral: "border-l-(--color-border-strong)",
    info: "border-l-(--color-accent)",
    success: "border-l-(--color-success)",
    warning: "border-l-(--color-warning)",
    danger: "border-l-(--color-danger)",
  };
  return (
    <div
      className={cx(
        "rounded-(--radius-control) border border-(--color-border) border-l-4 bg-(--color-surface) p-4",
        borders[tone],
        className,
      )}
    >
      <p className="text-sm font-semibold text-(--color-text)">{title}</p>
      <div className="mt-1.5 text-sm text-(--color-text-muted) [&_a]:text-(--color-primary) [&_a]:underline">
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

/**
 * A data table with its own horizontal scroll container.
 *
 * The wrapper is focusable and labelled so a keyboard user can scroll a wide
 * table; without `tabIndex` the overflow region is unreachable without a mouse.
 */
export function TableWrapper({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cx(
        // `min-w-0` is load-bearing. Grid and flex items default to
        // `min-width: auto`, which means they refuse to shrink below their
        // content — so a wide table inside one pushes the whole page sideways
        // instead of scrolling within this container. Without it the tax
        // calculator overflowed by 227px at 320px wide.
        //
        // `relative` is load-bearing for a subtler reason. `overflow` does not
        // make an element the containing block for absolutely positioned
        // descendants, and `.sr-only` is absolutely positioned — so a
        // screen-reader-only label inside a cell beyond the fold was laid out
        // against the initial containing block and escaped this scroller
        // entirely. Sixteen of them in the platform table pushed the page 56px
        // sideways at 320px while the table itself scrolled correctly, which is
        // why the usual overflow diagnosis pointed at nothing: the offenders
        // were invisible and the visible element was properly contained.
        "relative min-w-0 max-w-full overflow-x-auto rounded-(--radius-control) border border-(--color-border)",
        className,
      )}
      tabIndex={0}
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  );
}

export function Table({ children, caption }: { children: ReactNode; caption: string }) {
  /*
   * The minimum width is in pixels, not rem, deliberately. A rem minimum
   * scales with the root font size, so a reader at 200% text zoom made this
   * table demand 1024px and pushed the page sideways — the exact failure
   * WCAG 1.4.4 is about. In pixels the columns still get the room they need to
   * stay readable, and zooming the text does not widen the table.
   */
  return (
    <table className="w-full min-w-[512px] border-collapse text-left text-sm">
      <caption className="sr-only">{caption}</caption>
      {children}
    </table>
  );
}

export function Th({
  children,
  scope = "col",
  numeric = false,
}: {
  children: ReactNode;
  scope?: "col" | "row";
  numeric?: boolean;
}) {
  return (
    <th
      scope={scope}
      className={cx(
        "border-b border-(--color-border) bg-(--color-surface-subtle) px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)",
        numeric && "text-right",
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  numeric = false,
  className,
}: {
  children: ReactNode;
  numeric?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cx(
        "border-b border-(--color-border) px-3 py-2.5 text-(--color-text)",
        numeric && "text-right tabular",
        className,
      )}
    >
      {children}
    </td>
  );
}

// ---------------------------------------------------------------------------
// Disclosure
// ---------------------------------------------------------------------------

/**
 * A native `<details>` disclosure.
 *
 * Native elements give keyboard operation, the correct expanded state and
 * screen-reader semantics without any JavaScript, and the content inside stays
 * in the DOM so it remains crawlable and findable with in-page search.
 */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  className,
}: {
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details
      open={defaultOpen}
      className={cx(
        "group rounded-(--radius-control) border border-(--color-border) bg-(--color-surface)",
        className,
      )}
    >
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-(--color-text) [&::-webkit-details-marker]:hidden">
        <span>{summary}</span>
        <svg
          className="size-4 shrink-0 text-(--color-text-muted) transition-transform group-open:rotate-180"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="border-t border-(--color-border) px-4 py-3 text-sm text-(--color-text-muted)">
        {children}
      </div>
    </details>
  );
}
