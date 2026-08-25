"use client";

import { formatDate } from "@/lib/calculations/format";
import { ageInDays, describeAge, type RelativeDayWords } from "@/lib/utilities/relative-day";
import { rich } from "@/i18n/rich";
import { useRateCheck } from "@/lib/rates/use-rate-check";
import { useClientValue } from "@/lib/utilities/use-client-value";

/**
 * "Checked against Roblox's own page on …", where the date is really today's.
 *
 * The footer already carries a verification date, and it is deliberately
 * frozen: it is the day a person read Roblox's documentation and confirmed
 * every figure. Advancing that date on its own would be claiming a check
 * nobody performed.
 *
 * This is the other half. A scheduled job re-reads the markdown Roblox
 * publishes for its DevEx page four times a day and compares the figures to
 * the ones this site shows, so there is a second date that moves every day and
 * is true. Both are shown, and they are labelled as the different things they
 * are — "verified" for the human review, "checked" for the automatic one.
 *
 * Nothing is shown until a check has actually run. `unknown` renders nothing
 * rather than a reassuring placeholder, which is the only behaviour that keeps
 * the line worth reading.
 */

/**
 * `Date.now()` reaches render through `useClientValue` rather than being called
 * during it. These components render nothing until the fetch lands, so a
 * mismatch is not the risk it usually is — but reading the clock during render
 * is impure whether or not it happens to be observable, and the project has one
 * way of doing this already.
 */
function useNow(): number {
  return useClientValue(() => Date.now(), 0);
}

/**
 * Everything this component says, handed in from the server.
 *
 * A Client Component, so a dictionary reached from here would be a dictionary
 * in the browser bundle — in every language, on every page. The footer loads
 * these once and passes them down.
 */
export interface SourceCheckWords {
  readonly changedHeading: string;
  readonly changedBody: string;
  readonly unreadableBody: string;
  readonly unchanged: string;
  readonly unchangedLinkLabel: string;
  readonly sourceUpdatedAt: string;
  readonly badgeChanged: string;
  readonly badgeUnreachable: string;
  readonly badgeChecked: string;
  readonly relativeDay: RelativeDayWords;
  /** BCP 47 tag, for the dates. */
  readonly dateLocale: string;
}

/** Fills a `{token}` with a string, matching `interpolate`. */
function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/{([a-zA-Z_][a-zA-Z0-9_]*)}/g, (whole, token: string) =>
    token in values ? String(values[token]) : whole,
  );
}

function CheckedOn({
  checkedAt,
  words,
}: {
  checkedAt: string;
  words: SourceCheckWords;
}) {
  const now = useNow();
  return (
    <>
      <span className="tabular">{formatDate(words.dateLocale, checkedAt)}</span> (
      {describeAge(ageInDays(checkedAt, now), words.relativeDay)})
    </>
  );
}

/**
 * The full sentence, shown under the rate strip.
 *
 * Deliberately says what was compared and against what. "Up to date" on its
 * own is the claim every competitor makes without doing anything; naming the
 * document, the day and the outcome is the part they cannot copy without
 * building it.
 */
export function RateSourceCheck({
  className,
  words,
}: {
  className?: string;
  words: SourceCheckWords;
}) {
  const check = useRateCheck();
  if (!check || check.status === "unknown" || !check.checkedAt) return null;

  if (check.status === "changed") {
    return (
      <p className={className}>
        <span className="font-semibold text-(--color-warning)">{words.changedHeading}</span>{" "}
        {rich(words.changedBody, {
          checked: <CheckedOn checkedAt={check.checkedAt} words={words} />,
        })}
      </p>
    );
  }

  if (check.status === "unreadable") {
    return (
      <p className={className}>
        {rich(words.unreadableBody, {
          checked: <CheckedOn checkedAt={check.checkedAt} words={words} />,
        })}
      </p>
    );
  }

  return (
    <p className={className}>
      {/*
        One sentence with the link inside it. Written as prefix + link + suffix
        it can only be assembled in English word order, and this sentence puts
        the date before the link in German.
      */}
      {rich(words.unchanged, {
        link: (
          <a
            href="https://create.roblox.com/docs/production/monetization/developer-exchange"
            rel="noopener nofollow"
            className="underline hover:text-(--color-primary)"
          >
            {words.unchangedLinkLabel}
          </a>
        ),
        checked: <CheckedOn checkedAt={check.checkedAt} words={words} />,
      })}
      {check.sourceUpdatedAt ? (
        <>
          {" "}
          {fill(words.sourceUpdatedAt, {
            date: formatDate(words.dateLocale, check.sourceUpdatedAt),
          })}
        </>
      ) : null}
    </p>
  );
}

/**
 * The same fact in three words, for the dates line at the very bottom.
 *
 * That line is already dense, and repeating the whole sentence there would
 * push a reader past it. What it adds is the one thing the frozen verification
 * date beside it cannot say: that somebody — something — looked today.
 */
export function RateSourceCheckBadge({ words }: { words: SourceCheckWords }) {
  const check = useRateCheck();
  const now = useNow();
  if (!check || check.status === "unknown" || !check.checkedAt) return null;

  const when = describeAge(ageInDays(check.checkedAt, now), words.relativeDay);

  if (check.status === "changed") {
    return (
      <>
        {" · "}
        <span className="font-semibold text-(--color-warning)">{words.badgeChanged}</span>
      </>
    );
  }

  if (check.status === "unreadable") {
    return <>{` · ${fill(words.badgeUnreachable, { when })}`}</>;
  }

  return <>{` · ${fill(words.badgeChecked, { when })}`}</>;
}
