"use client";

import { translatorFor, type LocaleWords } from "@/i18n/client-words";
import { rich } from "@/i18n/rich";
import type { Translate } from "@/i18n/get-dictionary";
import { useId, useMemo, useState, type ReactNode } from "react";
import { loadChecklist, saveChecklist } from "./storage";
import { useClientValue } from "@/lib/utilities/use-client-value";
import { Badge, Callout, Card, cx, InlineLink } from "@/components/ui";
import { formatRobux } from "@/lib/calculations/format";
import { minimumEarnedRobux } from "@/lib/calculations/rate-registry";

/**
 * The preparation checklist, with the reader's progress kept.
 *
 * The list was already here as prose. What it could not do was hold a place:
 * these steps are done days apart — a tax form, an email verification, a
 * balance that has to grow — and a static list asks someone to remember where
 * they were.
 *
 * The line this must not cross is the one the whole site is built on. Ticking
 * every box means the reader has prepared, not that they are eligible and not
 * that a request will be approved. Roblox decides that, and it decides it after
 * the request is submitted. So the summary counts steps and says so; there is
 * no state in which this component congratulates anyone on qualifying.
 *
 * Progress lives in the reader's own browser and nowhere else, which is what
 * the privacy policy already says about everything else stored here.
 */

interface Step {
  /** Stable id. Stored, so it must not change when the wording does. */
  readonly id: string;
  readonly label: ReactNode;
}

/**
 * The list, in one language.
 *
 * The two links are passed in rather than written here: this is a Client
 * Component, and the locale it is standing in is known only to the server
 * that rendered it. A hardcoded `/earned-robux/` would send a Spanish reader
 * to the English page.
 */
function steps(
  t: Translate,
  earnedRobuxHref: string,
  feesHref: string,
): readonly Step[] {
  return [
    {
      id: "balance",
      label: rich(t("calculator.preparation.balanceStep"), {
        minimum: formatRobux(t.locale, BigInt(minimumEarnedRobux)),
        earnedRobuxLink: (
          <InlineLink href={earnedRobuxHref}>
            {t("calculator.preparation.earnedRobuxLink")}
          </InlineLink>
        ),
      }),
    },
    { id: "email", label: t("calculator.preparation.verifyEmail") },
    { id: "portal", label: t("calculator.preparation.portalAccount") },
    {
      id: "tax-form",
      label: t("calculator.preparation.taxFormStep"),
    },
    {
      id: "standing",
      label: t("calculator.preparation.standingStep"),
    },
    {
      id: "destination",
      label: rich(t("calculator.preparation.destinationStep"), {
        feesLink: (
          <InlineLink href={feesHref}>{t("calculator.preparation.feesLink")}</InlineLink>
        ),
      }),
    },
  ];
}

export function PreparationChecklist({
  words,
  earnedRobuxHref,
  feesHref,
  cashOutHref,
}: {
  readonly words: LocaleWords;
  /** All three in the locale this page is being read in. */
  readonly earnedRobuxHref: string;
  readonly feesHref: string;
  readonly cashOutHref: string;
}) {
  const t = useMemo(() => translatorFor(words), [words]);
  const groupId = useId();
  const items = steps(t, earnedRobuxHref, feesHref);

  /*
   * The stored value pairs with an in-session override, which is the pattern the
   * calculator already uses for preferences and history.
   *
   * The server has no localStorage, so seeding state from it during render would
   * make the first client render disagree with the markup React is hydrating,
   * and reading it in an effect would cause a second render pass for every
   * visitor. `useClientValue` renders the server snapshot while hydrating and
   * swaps in the real value in the same commit; the override is written only
   * from an event handler.
   *
   * Carried as JSON because the hook holds a primitive — an array identity would
   * change on every render and never settle.
   */
  const storedJson = useClientValue(() => JSON.stringify(loadChecklist()), "[]");
  const [override, setOverride] = useState<readonly string[] | null>(null);

  const stored = useMemo<string[]>(() => {
    try {
      const parsed: unknown = JSON.parse(storedJson);
      return Array.isArray(parsed) ? parsed.filter((e): e is string => typeof e === "string") : [];
    } catch {
      return [];
    }
  }, [storedJson]);

  const done = override ?? stored;

  const toggle = (id: string) => {
    const next = done.includes(id)
      ? done.filter((entry) => entry !== id)
      : [...done, id];
    setOverride(next);
    saveChecklist(next);
  };

  const clear = () => {
    setOverride([]);
    saveChecklist([]);
  };

  const completed = items.filter((item) => done.includes(item.id)).length;
  const allPrepared = completed === items.length;

  return (
    <div className="min-w-0">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold text-(--color-text)">
            {completed} of {items.length} prepared
          </p>
          {completed > 0 ? (
            <button
              type="button"
              onClick={clear}
              className="rounded-(--radius-control) px-2 py-1 text-sm font-medium text-(--color-primary) hover:bg-(--color-primary-soft)"
            >
              Clear
            </button>
          ) : null}
        </div>

        {/*
          A meter rather than a progress bar: this is a measured amount out of a
          known total, which is what `meter` means, and it is labelled with the
          same words shown above rather than a bare percentage.
        */}
        <div
          role="meter"
          aria-valuenow={completed}
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-label={t("calculator.checklist.meterLabel", {
            completed,
            total: items.length,
          })}
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-(--color-surface-subtle)"
        >
          <div
            className="h-full rounded-full bg-(--color-primary) motion-safe:transition-[width] motion-safe:duration-300"
            style={{ width: `${(completed / items.length) * 100}%` }}
          />
        </div>

        <ul className="mt-5 flex list-none flex-col gap-3 p-0">
          {items.map((item, index) => {
            const id = `${groupId}-${item.id}`;
            const checked = done.includes(item.id);
            return (
              <li key={item.id} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id={id}
                  checked={checked}
                  onChange={() => toggle(item.id)}
                  className="mt-1 size-5 shrink-0 accent-(--color-primary)"
                />
                <label
                  htmlFor={id}
                  className={cx(
                    "text-(--color-text-muted)",
                    checked && "line-through decoration-(--color-border-strong)",
                  )}
                >
                  <span className="sr-only">Step {index + 1}: </span>
                  {item.label}
                </label>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-sm text-(--color-text-muted)">{t("calculator.preparation.body.intro.p1")}</p>
      </Card>

      {allPrepared ? (
        <Callout tone="info" title={t("calculator.preparation.preparedNotApprovedTitle")} className="mt-4">
          <p>
            {t("calculator.preparation.body.intro.p2")}
          <Badge tone="neutral">{t("calculator.preparation.robloxDecides")}{" "}</Badge>
                </p>
                <p className="mt-2">
            {t("calculator.preparation.body.intro.p3")}
          <InlineLink href={cashOutHref}>{t("calculator.preparation.body.intro.p4")}</InlineLink>
                </p>
              </Callout>
            ) : null}
          </div>
  );
}
