"use client";

import { parseMessage } from "@/i18n/parse-message";
import { translatorFor, type LocaleWords } from "@/i18n/client-words";
import type { Translate } from "@/i18n/get-dictionary";
import { useId, useState, useMemo } from "react";
import { calculateGroupSplit, standardRateId } from "@/lib/calculations/devex";
import { parseRobuxAmount } from "@/lib/calculations/parse-amount";
import { formatCurrency, formatRobux } from "@/lib/calculations/format";
import { maxRobuxInput, minimumEarnedRobux } from "@/lib/calculations/rate-registry";
import { Badge, Button, Callout, Card, Table, TableWrapper, Td, Th } from "@/components/ui";

/**
 * Splitting a group's Earned Robux between collaborators.
 *
 * Deliberately a separate component rather than a fourth mode in the main
 * calculator. The question is not "what is this worth" but "who gets what and
 * can they cash it out", the answer turns on a fact about DevEx that the
 * calculator has no reason to know, and weaving it through seven hundred lines
 * of shared state to reach the same place would have put the site's most-tested
 * feature at risk for it.
 *
 * The fact that makes this worth building: the DevEx minimum applies to the
 * balance one person submits, not to what a group earned. A group can clear the
 * minimum several times over and leave every member below it.
 *
 * All arithmetic goes through the same engine as the rest of the site. Nothing
 * here computes money.
 */

interface Row {
  readonly id: number;
  readonly name: string;
  readonly percent: string;
}

/**
 * The three rows the split opens with.
 *
 * Percentages only: the names are filled in from the dictionary once the
 * translator exists, because a component's module scope has no language.
 */
const STARTING_PERCENTS = ["50", "30", "20"] as const;

function startingRows(t: Translate): Row[] {
  return STARTING_PERCENTS.map((percent, index) => ({
    id: index + 1,
    name: t("calculator.groupSplit.defaultMemberName", { n: index + 1 }),
    percent,
  }));
}

/** Enough for a real collaboration, and short of a table nobody can read. */
const MAX_MEMBERS = 12;

export function GroupSplit({ words }: { readonly words: LocaleWords }) {
  const t = useMemo(() => translatorFor(words), [words]);
  const fieldId = useId();
  const [total, setTotal] = useState("300,000");
  const [rows, setRows] = useState<readonly Row[]>(() => startingRows(t));

  // Same parser and same ceiling as every other amount field on the site, so
  // "1.5m" and "300,000" behave here exactly as they do in the calculator.
  const parsed = parseRobuxAmount(total, maxRobuxInput, t.locale);
  const totalRobux = parsed.ok ? parsed.value.robux : 0n;

  const result = calculateGroupSplit(
    totalRobux,
    rows.map((row) => ({ name: row.name.trim() || "Unnamed", percent: row.percent })),
    standardRateId,
  );

  const update = (id: number, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const add = () =>
    setRows((current) =>
      current.length >= MAX_MEMBERS
        ? current
        : [
            ...current,
            {
              id: Math.max(0, ...current.map((row) => row.id)) + 1,
              name: t("calculator.groupSplit.defaultMemberName", { n: current.length + 1 }),
              percent: "0",
            },
          ],
    );

  const remove = (id: number) =>
    setRows((current) => (current.length <= 1 ? current : current.filter((row) => row.id !== id)));

  const below = result.members.filter((member) => member.threshold.shortfallRobux > 0n);

  return (
    <div className="min-w-0">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`${fieldId}-total`}
              className="block text-sm font-semibold text-(--color-text)"
            >
              {t("calculator.groupSplit.groupBalanceLabel")}
            </label>
            <input
              id={`${fieldId}-total`}
              inputMode="numeric"
              value={total}
              onChange={(event) => setTotal(event.target.value)}
              aria-invalid={total.trim() !== "" && !parsed.ok}
              aria-describedby={`${fieldId}-total-hint`}
              className="tabular mt-2 w-full rounded-(--radius-control) border border-(--color-border-strong) bg-(--color-surface) px-3 py-2.5 text-(--color-text)"
            />
            <p id={`${fieldId}-total-hint`} className="mt-2 text-sm text-(--color-text-muted)">
              {total.trim() !== "" && !parsed.ok
                ? parseMessage(t, parsed)
                : t("calculator.groupSplit.earnedOnlyNote")}
            </p>
          </div>

          <div className="self-end">
            <p className="text-sm text-(--color-text-muted)">{t("calculator.groupSplit.valuedAt")}</p>
            <p className="mt-1 font-semibold text-(--color-text)">{result.rate.label}</p>
            <p className="text-sm text-(--color-text-muted)">
              {t("calculator.groupSplit.perEligibleRobux", {
                rate: `$${result.rate.usdPerRobux}`,
              })}
            </p>
          </div>
        </div>

        <TableWrapper label={t("calculator.groupSplit.tableLabel")} className="mt-6">
          <Table caption={t("calculator.groupSplit.tableCaption")}>
            <thead>
              <tr>
                <Th>{t("calculator.groupSplit.columnMember")}</Th>
                <Th>{t("calculator.groupSplit.columnShare")}</Th>
                <Th numeric>{t("calculator.groupSplit.columnEarnedRobux")}</Th>
                <Th numeric>{t("calculator.groupSplit.columnEstimatedPayout")}</Th>
                <Th>{t("calculator.groupSplit.columnCanCashOut")}</Th>
                <Th>
                  <span className="sr-only">{t("calculator.groupSplit.removeRow")}</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const member = result.members[index];
                const short = member ? member.threshold.shortfallRobux : 0n;
                return (
                  <tr key={row.id}>
                    <Td>
                      <label className="sr-only" htmlFor={`${fieldId}-name-${row.id}`}>
                        {t("calculator.groupSplit.body.intro.p2", {
                          index: index + 1,
                        })}
                      </label>
                      <input
                        id={`${fieldId}-name-${row.id}`}
                        value={row.name}
                        onChange={(event) => update(row.id, { name: event.target.value })}
                        className="w-full min-w-[7rem] rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) px-2 py-1.5 text-sm text-(--color-text)"
                      />
                    </Td>
                    <Td>
                      <label className="sr-only" htmlFor={`${fieldId}-pct-${row.id}`}>
                        {t("calculator.groupSplit.percentageForLabel", {
                          member:
                            row.name ||
                            t("calculator.groupSplit.memberFallback", { index: index + 1 }),
                        })}
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          id={`${fieldId}-pct-${row.id}`}
                          inputMode="decimal"
                          value={row.percent}
                          onChange={(event) => update(row.id, { percent: event.target.value })}
                          className="tabular w-16 rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) px-2 py-1.5 text-sm text-(--color-text)"
                        />
                        <span aria-hidden="true" className="text-sm text-(--color-text-muted)">
                          %
                        </span>
                      </div>
                    </Td>
                    <Td numeric className="tabular">
                      {member ? formatRobux(t.locale, member.robux) : "0"}
                    </Td>
                    <Td numeric className="tabular font-semibold">
                      {member ? formatCurrency(t.locale, member.grossUsd, "USD") : "$0.00"}
                    </Td>
                    <Td>
                      {short === 0n ? (
                        <Badge tone="success">{t("calculator.groupSplit.meetsMinimum")}</Badge>
                      ) : (
                        <Badge tone="warning">
                          {formatRobux(t.locale, short)} short
                        </Badge>
                      )}
                    </Td>
                    <Td>
                      <Button
                        variant="ghost"
                        onClick={() => remove(row.id)}
                        disabled={rows.length <= 1}
                        className="px-2 text-sm"
                      >
                        {t("calculator.groupSplit.removeMember")}
                        <span className="sr-only"> {row.name || `member ${index + 1}`}</span>
                      </Button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrapper>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={add} disabled={rows.length >= MAX_MEMBERS}>
            {t("calculator.groupSplit.addMember")}
          </Button>
          <p className="text-sm text-(--color-text-muted)">
            {t("calculator.groupSplit.sharesTotal", {
              percent: result.allocatedPercent.toFixed(2, "half-up"),
            })}
            {result.unallocatedRobux > 0n ? (
              <> · {formatRobux(t.locale, result.unallocatedRobux)} Robux unallocated</>
            ) : null}
          </p>
        </div>
      </Card>

      {result.percentagesUnbalanced ? (
        <Callout tone="warning" title={t("calculator.groupSplit.sharesDoNotAddUpTitle")} className="mt-4">
          {t("calculator.groupSplit.body.intro.p3", {
            allocatedPercent: result.allocatedPercent.toFixed(2, "half-up"),
            unallocatedRobux: formatRobux(t.locale, result.unallocatedRobux),
          })}
        </Callout>
      ) : result.unallocatedRobux > 0n ? (
        <Callout tone="info" title={t("calculator.groupSplit.remainderTitle")} className="mt-4">
          {t("calculator.groupSplit.body.intro.p5", {
            unallocatedRobux: formatRobux(t.locale, result.unallocatedRobux),
          })}
        </Callout>
      ) : null}

      {below.length > 0 ? (
        <Callout
          tone="warning"
          title={t(
            below.length === 1
              ? "calculator.groupSplit.belowMinimumTitle.one"
              : "calculator.groupSplit.belowMinimumTitle.other",
            { below: String(below.length), total: String(result.members.length) },
          )}
          className="mt-4"
        >
          {t(
            below.length === 1
              ? "calculator.groupSplit.belowMinimumBody.one"
              : "calculator.groupSplit.belowMinimumBody.other",
            {
              minimum: formatRobux(t.locale, BigInt(minimumEarnedRobux)),
              total: formatRobux(t.locale, result.totalRobux),
              names: below.map((member) => member.name).join(", "),
            },
          )}
        </Callout>
      ) : null}

      <Callout tone="info" title={t("calculator.groupSplit.onePersonPaidTitle")} className="mt-4">{" "}{t("calculator.groupSplit.prose.robloxDoesNotDivide")}{" "}</Callout>
    </div>
  );
}
