"use client";

import { formatDate } from "@/lib/calculations/format";
import { ageInDays, describeAge } from "@/lib/utilities/relative-day";
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

function CheckedOn({ checkedAt }: { checkedAt: string }) {
  const now = useNow();
  return (
    <>
      <span className="tabular">{formatDate(checkedAt)}</span> (
      {describeAge(ageInDays(checkedAt, now))})
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
export function RateSourceCheck({ className }: { className?: string }) {
  const check = useRateCheck();
  if (!check || check.status === "unknown" || !check.checkedAt) return null;

  if (check.status === "changed") {
    return (
      <p className={className}>
        <span className="font-semibold text-(--color-warning)">
          Roblox&rsquo;s page no longer matches these figures.
        </span>{" "}
        Found by the automatic check on <CheckedOn checkedAt={check.checkedAt} />. The figures
        above stand until a person has read what changed.
      </p>
    );
  }

  if (check.status === "unreadable") {
    return (
      <p className={className}>
        Roblox&rsquo;s page could not be read on <CheckedOn checkedAt={check.checkedAt} />, so
        these figures are the ones from the last review rather than a fresh comparison.
      </p>
    );
  }

  return (
    <p className={className}>
      Checked against{" "}
      <a
        href="https://create.roblox.com/docs/production/monetization/developer-exchange"
        rel="noopener nofollow"
        className="underline hover:text-(--color-primary)"
      >
        Roblox&rsquo;s own DevEx page
      </a>{" "}
      on <CheckedOn checkedAt={check.checkedAt} /> — unchanged.
      {check.sourceUpdatedAt ? (
        <> Roblox last updated that page on {formatDate(check.sourceUpdatedAt)}.</>
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
export function RateSourceCheckBadge() {
  const check = useRateCheck();
  const now = useNow();
  if (!check || check.status === "unknown" || !check.checkedAt) return null;

  const when = describeAge(ageInDays(check.checkedAt, now));

  if (check.status === "changed") {
    return (
      <>
        {" · "}
        <span className="font-semibold text-(--color-warning)">source changed, under review</span>
      </>
    );
  }

  if (check.status === "unreadable") {
    return <>{` · source unreachable ${when}`}</>;
  }

  return <>{` · source checked ${when}`}</>;
}
