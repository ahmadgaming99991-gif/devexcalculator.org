/**
 * Brand mark.
 *
 * A payout line: a balance at the origin, a path that dips and then climbs, and
 * a head at the top right. It says the one thing this site does — a figure is
 * converted and it ends up somewhere — and it is legible as a shape at 16px,
 * which a more literal drawing of coins or a calculator would not be.
 *
 * Two earlier attempts are worth recording so they are not tried again. The
 * first was a division sign in a blue square: generic, because nothing in it
 * belonged to this site rather than to any calculator. The second crossed two
 * strokes into an X for "exchange" — at small sizes it read as a close button,
 * which is the last thing a brand mark should say.
 *
 * Deliberately geometric and unrelated to Roblox trade dress — no blocky
 * avatar, no orange-and-black, nothing that could be read as an official mark.
 *
 * The gradient is defined with instance-unique ids. Two marks appear on every
 * page (header and footer) and duplicate SVG ids make the second one reference
 * the first's definitions, which breaks the moment either is removed.
 */
export function Logo({
  className = "size-8",
  interactive = false,
  instance = "logo",
}: {
  className?: string;
  /**
   * Opts into the hover behaviour. Only true where the mark sits inside a link
   * that owns the `group`, so a decorative instance never animates on a hover
   * that has nothing to do with it.
   */
  interactive?: boolean;
  /**
   * Distinguishes this mark's gradient ids from any other on the page.
   *
   * Every caller rendering a second mark must pass a different value. Deriving
   * it from `interactive` was not enough the moment both the header and the
   * footer became interactive: they collided on one id, and the footer's
   * gradient silently resolved to the header's definition. `useId` would solve
   * it generically but would make this a Client Component for the sake of two
   * call sites.
   */
  instance?: string;
}) {
  const id = `logo-${instance}`;

  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="DevEx Calculator"
    >
      <defs>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--color-primary)" />
          <stop offset="1" stopColor="var(--color-secondary)" />
        </linearGradient>
        {/* A soft top-left highlight, which is what stops a flat fill from
            reading as a placeholder rectangle at small sizes. */}
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="32" height="32" rx="9" fill={`url(#${id}-tile)`} />
      <rect width="32" height="32" rx="9" fill={`url(#${id}-sheen)`} />

      {/*
        The line itself. Four points rather than a smooth curve: a curve at this
        size flattens into a smudge, while the corners survive being drawn 16
        pixels wide.
      */}
      <path
        className={
          interactive
            ? "motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700 motion-safe:ease-out"
            : undefined
        }
        d="M9 21.5 L14 16.5 L18 19 L23.5 10.5"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* The head, drawn as two strokes so it keeps the same weight and cap as
          the line rather than reading as a solid wedge stuck on the end. */}
      <path
        d="M18.6 10.5 L23.5 10.5 L23.5 15.4"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* The balance, before it becomes anything. */}
      <circle
        className={
          interactive
            ? "origin-center motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out group-hover:motion-safe:scale-125"
            : undefined
        }
        cx="9"
        cy="21.5"
        r="2.7"
        fill="#ffffff"
      />
    </svg>
  );
}

/**
 * Full lockup used in the header and footer.
 *
 * "DevEx" carries the weight because that is the name people search for;
 * "Calculator" is set lighter so the lockup has a hierarchy rather than being
 * one undifferentiated string. The two are a single word visually, so there is
 * no space between them and the tracking is tightened to match.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-bold tracking-tight text-(--color-text)">DevEx</span>
      <span className="font-medium tracking-tight text-(--color-text-muted)">Calculator</span>
    </span>
  );
}
