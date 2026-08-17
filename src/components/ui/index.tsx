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
    default: "bg-[--color-surface] shadow-[--shadow-card]",
    subtle: "bg-[--color-surface-subtle]",
    raised: "bg-[--color-surface-raised] shadow-[--shadow-raised]",
  };
  return (
    <Tag
      className={cx(
        "card rounded-[--radius-card] border border-[--color-border] p-4 sm:p-6",
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
          "font-semibold tracking-tight text-[--color-text]",
          headingLevel === 2 ? "text-xl sm:text-2xl" : "text-lg sm:text-xl",
        )}
      >
        {heading}
      </Heading>
      {description ? (
        <p className="mt-2 text-[--color-text-muted]">{description}</p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Buttons and links
// ---------------------------------------------------------------------------

const buttonBase =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[--radius-control] " +
  "px-4 py-2.5 text-sm font-semibold transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-55";

const buttonVariants = {
  primary:
    "bg-[--color-primary] text-white hover:bg-[--color-primary-strong] " +
    "dark:text-[#08111f]",
  secondary:
    "border border-[--color-border-strong] bg-[--color-surface] text-[--color-text] " +
    "hover:bg-[--color-surface-subtle]",
  ghost: "text-[--color-primary] hover:bg-[--color-primary-soft]",
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentPropsWithoutRef<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      className={cx(buttonBase, buttonVariants[variant], className)}
      {...props}
    />
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
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {children}
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
        "font-medium text-[--color-primary] underline underline-offset-2 hover:text-[--color-primary-strong]",
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
        "font-medium text-[--color-primary] underline underline-offset-2 hover:text-[--color-primary-strong]",
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
  neutral: "bg-[--color-surface-subtle] text-[--color-text-muted]",
  info: "bg-[--color-accent-soft] text-[--color-accent]",
  success: "bg-[--color-success-soft] text-[--color-success]",
  warning: "bg-[--color-warning-soft] text-[--color-warning]",
  danger: "bg-[--color-danger-soft] text-[--color-danger]",
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
    neutral: "border-l-[--color-border-strong]",
    info: "border-l-[--color-accent]",
    success: "border-l-[--color-success]",
    warning: "border-l-[--color-warning]",
    danger: "border-l-[--color-danger]",
  };
  return (
    <div
      className={cx(
        "rounded-[--radius-control] border border-[--color-border] border-l-4 bg-[--color-surface] p-4",
        borders[tone],
        className,
      )}
    >
      <p className="text-sm font-semibold text-[--color-text]">{title}</p>
      <div className="mt-1.5 text-sm text-[--color-text-muted] [&_a]:text-[--color-primary] [&_a]:underline">
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
        "overflow-x-auto rounded-[--radius-control] border border-[--color-border]",
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
  return (
    <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
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
        "border-b border-[--color-border] bg-[--color-surface-subtle] px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-[--color-text-muted]",
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
        "border-b border-[--color-border] px-3 py-2.5 text-[--color-text]",
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
        "group rounded-[--radius-control] border border-[--color-border] bg-[--color-surface]",
        className,
      )}
    >
      <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[--color-text] [&::-webkit-details-marker]:hidden">
        <span>{summary}</span>
        <svg
          className="size-4 shrink-0 text-[--color-text-muted] transition-transform group-open:rotate-180"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="border-t border-[--color-border] px-4 py-3 text-sm text-[--color-text-muted]">
        {children}
      </div>
    </details>
  );
}
