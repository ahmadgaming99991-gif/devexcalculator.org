"use client";

import Link from "next/link";
import { useClientValue } from "@/lib/utilities/use-client-value";
import { formatDate } from "@/lib/calculations/format";

/**
 * The footer's status line, kept true on the day it is read.
 *
 * Two dates sit here and they are not the same kind of thing, which is the
 * whole reason this component exists.
 *
 * The verification date is a fact about the past: the day someone checked
 * these figures against Roblox's own documentation. It must never advance on
 * its own. A footer that printed today's date beside "verified" would be
 * claiming a check that nobody performed, which is the one thing this site
 * refuses to do anywhere else.
 *
 * Its *age* is a different matter, and that was the real problem: every page
 * here is prerendered, so a "4 days ago" written at build time would still say
 * four days a month later. The age is therefore computed in the reader's own
 * browser from the recorded date, which makes it right every day with no
 * rebuild — and the same for the copyright year, which had been derived from a
 * fixed content-review date and would have sat on 2026 into 2027.
 *
 * Both render the build-time value first and swap to the live one during
 * hydration, so a reader with no JavaScript sees a correct date and a slightly
 * stale age rather than nothing at all.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

function ageInDays(iso: string, now: number): number {
  const verified = Date.parse(iso);
  if (!Number.isFinite(verified)) return 0;
  return Math.max(0, Math.floor((now - verified) / DAY_MS));
}

/** Plain words for a small number of days; a figure once it stops being one. */
function describeAge(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function FooterStatus({
  siteName,
  verifiedAt,
  registryVersion,
  reviewCadenceDays,
  /** Age and year as of the build, used until hydration replaces them. */
  builtAgeDays,
  builtYear,
}: {
  siteName: string;
  verifiedAt: string;
  registryVersion: string;
  reviewCadenceDays: number;
  builtAgeDays: number;
  builtYear: number;
}) {
  const days = useClientValue(() => ageInDays(verifiedAt, Date.now()), builtAgeDays);
  const year = useClientValue(() => new Date().getUTCFullYear(), builtYear);

  // Past the cadence the site's own policy says these are due another look.
  // Saying so is more use to a reader than a number they have to judge.
  const overdue = days >= reviewCadenceDays;

  return (
    <div className="mt-6 flex flex-col items-center gap-2 border-t border-(--color-border) pt-6 text-center text-xs text-(--color-text-muted)">
      <p>
        © {year} {siteName}. Every payout figure is an estimate.
      </p>
      <p className="tabular">
        Rate data{" "}
        <Link href="/sources/" className="underline hover:text-(--color-primary)">
          verified {formatDate(verifiedAt)}
        </Link>
        {" · "}
        <span className={overdue ? "font-semibold text-(--color-warning)" : undefined}>
          {describeAge(days)}
          {overdue ? ", due for review" : null}
        </span>{" "}
        {/*
          No link to /api/ here. The Trust column already carries one, and a
          test holds the footer to exactly one — a second would be noise on a
          line that exists to carry dates.
        */}
        · registry {registryVersion}
      </p>
    </div>
  );
}
