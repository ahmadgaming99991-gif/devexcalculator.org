/**
 * Original brand mark.
 *
 * A rounded square holding a division rule over a currency-style stroke: the
 * calculation motif, not a game motif. Deliberately geometric and unrelated to
 * Roblox trade dress — no blocky avatar, no orange-and-black, nothing that
 * could be read as an official mark.
 */
export function Logo({ className = "size-8" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="DevEx Calculator"
    >
      <rect width="32" height="32" rx="8" fill="var(--color-primary)" />
      {/* Division rule: two dots and a bar, the arithmetic half of the mark. */}
      <circle cx="16" cy="10" r="2" fill="white" />
      <rect x="8" y="15" width="16" height="2" rx="1" fill="white" />
      <circle cx="16" cy="22" r="2" fill="white" />
      {/* Accent stroke suggesting an upward conversion. */}
      <path
        d="M23.5 24.5 L27 21"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Full lockup used in the header and footer. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-bold tracking-tight text-(--color-text)">DevEx</span>
      <span className="font-medium tracking-tight text-(--color-text-muted)">Calculator</span>
    </span>
  );
}
