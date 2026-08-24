"use client";

import Link from "next/link";
import { useClientValue } from "@/lib/utilities/use-client-value";
import { formatDate } from "@/lib/calculations/format";
import { ageInDays, describeAge, type RelativeDayWords } from "@/lib/utilities/relative-day";
import { RateSourceCheckBadge, type SourceCheckWords } from "./rate-source-check";

/**
 * The footer's status line, kept true on the day it is read.
 *
 * Three dates sit here and they are not the same kind of thing, which is the
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
 *
 * The third is `RateSourceCheckBadge`, and it is the one that legitimately
 * moves every day: the last time the scheduled job re-read Roblox's own
 * document and found these figures unchanged. It is labelled "checked" rather
 * than "verified" precisely because it is not the same claim, and it renders
 * nothing at all until a check has actually run.
 */

export function FooterStatus({
  siteName,
  verifiedAt,
  registryVersion,
  reviewCadenceDays,
  /** Age and year as of the build, used until hydration replaces them. */
  builtAgeDays,
  builtYear,
  dateLocale,
  sourcesHref,
  sourceCheck,
  words,
}: {
  siteName: string;
  verifiedAt: string;
  registryVersion: string;
  reviewCadenceDays: number;
  builtAgeDays: number;
  builtYear: number;
  /*
   * Everything language-shaped arrives as a prop. This is a Client Component,
   * so a dictionary reached from inside it would be a dictionary in the
   * browser bundle, in every language, on every page.
   */
  readonly dateLocale: string;
  readonly sourcesHref: string;
  readonly sourceCheck: SourceCheckWords;
  readonly words: {
    readonly copyright: string;
    readonly rateDataLabel: string;
    readonly verifiedOn: string;
    readonly dueForReview: string;
    readonly registryVersion: string;
    readonly relativeDay: RelativeDayWords;
  };
}) {
  const days = useClientValue(() => ageInDays(verifiedAt, Date.now()), builtAgeDays);
  const fill = (template: string, values: Record<string, string | number>): string =>
    template.replace(/{([a-zA-Z_][a-zA-Z0-9_]*)}/g, (whole, token: string) =>
      token in values ? String(values[token]) : whole,
    );
  const year = useClientValue(() => new Date().getUTCFullYear(), builtYear);

  // Past the cadence the site's own policy says these are due another look.
  // Saying so is more use to a reader than a number they have to judge.
  const overdue = days >= reviewCadenceDays;

  return (
    <div className="mt-6 flex flex-col items-center gap-2 border-t border-(--color-border) pt-6 text-center text-xs text-(--color-text-muted)">
      <p>{fill(words.copyright, { year, siteName })}</p>
      <p className="tabular">
        {words.rateDataLabel}{" "}
        <Link href={sourcesHref} className="underline hover:text-(--color-primary)">
          {fill(words.verifiedOn, { date: formatDate(verifiedAt, dateLocale) })}
        </Link>
        {" · "}
        <span className={overdue ? "font-semibold text-(--color-warning)" : undefined}>
          {describeAge(days, words.relativeDay)}
          {overdue ? words.dueForReview : null}
        </span>{" "}
        {/*
          No link to /api/ here. The Trust column already carries one, and a
          test holds the footer to exactly one — a second would be noise on a
          line that exists to carry dates.
        */}
        · {fill(words.registryVersion, { version: registryVersion })}
        <RateSourceCheckBadge words={sourceCheck} />
      </p>
    </div>
  );
}
