"use client";

import { parseMessage } from "@/i18n/parse-message";
import { translatorFor, type LocaleWords } from "@/i18n/client-words";
import type { Translate } from "@/i18n/get-dictionary";
import { useId, useMemo, useState } from "react";
import {
  calculateAfterFee,
  calculateBeforeFee,
  defaultSchemeId,
  marketplaceSchemes,
} from "@/lib/calculations/marketplace";
import { parseRobuxAmount } from "@/lib/calculations/parse-amount";
import { maxRobuxInput } from "@/lib/calculations/rate-registry";
import { Rational } from "@/lib/calculations/rational";
import { formatPercent, formatRobux } from "@/lib/calculations/format";
import { Card, Table, TableWrapper, Td, Th, cx } from "@/components/ui";
import { AmountInput, ModeTabs, type ModeOption } from "@/features/devex/components/controls";
import { ResultAnnouncer, ResultSummary } from "@/features/devex/components/results";
import { CopyButton } from "@/features/devex/components/actions";

/**
 * Roblox marketplace fee calculator.
 *
 * A separate tool from the DevEx calculator on purpose. The platform
 * commission applies when Robux are earned; DevEx applies when Earned Robux
 * are converted to cash. Chaining them automatically would double-count the
 * 30%, which is a mistake several competitor calculators make.
 *
 * All arithmetic comes from src/lib/calculations/marketplace.ts.
 */

const modes = (t: Translate): readonly ModeOption[] => [
  { id: "after", label: t("marketplace.modes.after.label"), description: t("marketplace.modes.after.description") },
  { id: "before", label: t("marketplace.modes.before.label"), description: t("marketplace.modes.before.description") },
];

export function MarketplaceCalculator({ words }: { readonly words: LocaleWords }) {
  const t = useMemo(() => translatorFor(words), [words]);
  const [mode, setMode] = useState<"after" | "before">("after");
  const [schemeId, setSchemeId] = useState<string>(defaultSchemeId);
  const [amount, setAmount] = useState("1000");
  const [multiple, setMultiple] = useState("1");
  const schemeSelectId = useId();
  const multipleId = useId();

  const scheme = marketplaceSchemes.find((entry) => entry.id === schemeId) ?? marketplaceSchemes[0];
  const isProgressive = scheme?.progressive ?? false;

  const parsed = useMemo(
    () => (amount.trim() === "" ? null : parseRobuxAmount(amount, maxRobuxInput)),
    [amount],
  );
  const robux = parsed?.ok ? parsed.value.robux : 0n;

  const priceFloorMultiple = useMemo(() => {
    if (!isProgressive) return null;
    try {
      const value = Rational.fromDecimalString(multiple.trim() || "1");
      return value.gt(Rational.ZERO) ? value : Rational.ONE;
    } catch {
      return Rational.ONE;
    }
  }, [isProgressive, multiple]);

  const afterFee = useMemo(
    () =>
      calculateAfterFee({
        grossRobux: robux,
        schemeId: scheme?.id ?? defaultSchemeId,
        priceFloorMultiple,
      }),
    [robux, scheme?.id, priceFloorMultiple],
  );

  const beforeFee = useMemo(
    () =>
      calculateBeforeFee({
        targetNetRobux: robux,
        schemeId: scheme?.id ?? defaultSchemeId,
        priceFloorMultiple,
      }),
    [robux, scheme?.id, priceFloorMultiple],
  );

  const [announcement, setAnnouncement] = useState("");

  const primaryValue =
    mode === "after" ? formatRobux(afterFee.creatorRobux) : formatRobux(beforeFee.requiredGrossRobux);

  const summaryText =
    robux === 0n
      ? ""
      : mode === "after"
        ? [
            `Sale price: ${formatRobux(afterFee.grossRobux)} Robux`,
            `Scheme: ${afterFee.scheme.label}`,
            `Your share: ${formatPercent(afterFee.creatorSharePercent, 0)}`,
            `You keep: ${formatRobux(afterFee.creatorRobux)} Robux`,
            `Roblox keeps: ${formatRobux(afterFee.platformRobux)} Robux`,
            t("marketplace.results.estimateFrom"),
          ].join("\n")
        : [
            `Target after fee: ${formatRobux(beforeFee.targetNetRobux)} Robux`,
            `Scheme: ${beforeFee.scheme.label}`,
            `Your share: ${formatPercent(beforeFee.creatorSharePercent, 0)}`,
            `Price to charge: ${formatRobux(beforeFee.requiredGrossRobux)} Robux`,
            t("marketplace.results.estimateFrom"),
          ].join("\n");

  return (
    <Card as="section">
      <h2 className="sr-only">{t("marketplace.srHeading")}</h2>

      <ModeTabs t={t} options={modes(t)} value={mode} onChange={(next) => setMode(next as "after" | "before")} />

      <div
        id={`mode-panel-${mode}`}
        role="tabpanel"
        aria-labelledby={`mode-tab-${mode}`}
        tabIndex={0}
        className="mt-5 grid min-w-0 gap-6 lg:grid-cols-2"
      >
        <div className="flex min-w-0 flex-col gap-5">
          <div>
            <label htmlFor={schemeSelectId} className="block text-sm font-semibold text-(--color-text)">{t("marketplace.body.intro.p1")}</label>
            <select
              id={schemeSelectId}
              value={schemeId}
              onChange={(event) => setSchemeId(event.target.value)}
              aria-describedby={`${schemeSelectId}-note`}
              className="control mt-1.5 min-h-[52px] w-full rounded-(--radius-control) border border-(--color-border-strong) bg-(--color-surface) px-3 py-2.5 text-(--color-text)"
            >
              {marketplaceSchemes.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
            <p id={`${schemeSelectId}-note`} className="mt-1.5 text-xs text-(--color-text-muted)">
              {scheme?.description}
            </p>
          </div>

          <AmountInput
            label={mode === "after" ? "Sale price" : "Robux you want to keep"}
            value={amount}
            onChange={setAmount}
            error={parseMessage(t, parsed)}
            hint={
              mode === "after"
                ? "What the buyer pays."
                : t("marketplace.inputs.afterCommissionHint")
            }
          />

          {isProgressive ? (
            <div>
              <label htmlFor={multipleId} className="block text-sm font-semibold text-(--color-text)">{t("marketplace.body.intro.p2")}</label>
              <input
                id={multipleId}
                type="text"
                inputMode="decimal"
                value={multiple}
                onChange={(event) => setMultiple(event.target.value)}
                aria-describedby={`${multipleId}-note`}
                className="control numeric-display mt-1.5 min-h-[52px] w-full rounded-(--radius-control) border border-(--color-border-strong) bg-(--color-surface) px-3 py-2.5 text-(--color-text)"
              />
              <p id={`${multipleId}-note`} className="mt-1.5 text-xs text-(--color-text-muted)">{t("marketplace.body.intro.p3")}</p>
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <ResultSummary
            primaryLabel={mode === "after" ? "Robux you keep" : "Price to charge"}
            primaryValue={primaryValue}
            secondary={
              mode === "after" ? (
                <>
                  {formatPercent(afterFee.creatorSharePercent, 0)} of{" "}
                  {formatRobux(afterFee.grossRobux)} Robux
                  {afterFee.appliedTierMultiple
                    ? `, at the ${afterFee.appliedTierMultiple}× tier`
                    : ""}
                </>
              ) : (
                <>
                  to clear {formatRobux(beforeFee.targetNetRobux)} Robux at{" "}
                  {formatPercent(beforeFee.creatorSharePercent, 0)}
                </>
              )
            }
          />

          {robux > 0n ? (
            <TableWrapper label={t("marketplace.results.tableLabel")}>
              <Table caption={t("marketplace.results.tableCaption")}>
                <thead>
                  <tr>
                    <Th>{t("marketplace.results.columnGoesTo")}</Th>
                    <Th numeric>Robux</Th>
                    <Th numeric>Share</Th>
                  </tr>
                </thead>
                <tbody>
                  {mode === "after" ? (
                    <>
                      <tr>
                        <Th scope="row">You</Th>
                        <Td numeric className="font-semibold">
                          {formatRobux(afterFee.creatorRobux)}
                        </Td>
                        <Td numeric>{formatPercent(afterFee.creatorSharePercent, 0)}</Td>
                      </tr>
                      {afterFee.experienceOwnerRobux !== null ? (
                        <tr>
                          <Th scope="row">{t("marketplace.results.experienceOwner")}</Th>
                          <Td numeric>{formatRobux(afterFee.experienceOwnerRobux)}</Td>
                          <Td numeric>
                            {formatPercent(
                              Rational.fromDecimalString(
                                afterFee.scheme.experienceOwnerSharePercent ?? "0",
                              ),
                              0,
                            )}
                          </Td>
                        </tr>
                      ) : null}
                      <tr>
                        <Th scope="row">Roblox</Th>
                        <Td numeric>{formatRobux(afterFee.platformRobux)}</Td>
                        <Td numeric>
                          {formatPercent(
                            Rational.fromInt(100)
                              .sub(afterFee.creatorSharePercent)
                              .sub(
                                Rational.fromDecimalString(
                                  afterFee.scheme.experienceOwnerSharePercent ?? "0",
                                ),
                              ),
                            0,
                          )}
                        </Td>
                      </tr>
                      <tr className="bg-(--color-surface-subtle)">
                        <Th scope="row">Total</Th>
                        <Td numeric className="font-bold">
                          {formatRobux(afterFee.grossRobux)}
                        </Td>
                        <Td numeric>100%</Td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr>
                        <Th scope="row">{t("marketplace.results.chargeTheBuyer")}</Th>
                        <Td numeric className="font-semibold">
                          {formatRobux(beforeFee.requiredGrossRobux)}
                        </Td>
                        <Td numeric>100%</Td>
                      </tr>
                      <tr>
                        <Th scope="row">{t("marketplace.results.youActuallyKeep")}</Th>
                        <Td numeric>{formatRobux(beforeFee.actualNetRobux)}</Td>
                        <Td numeric>{formatPercent(beforeFee.creatorSharePercent, 0)}</Td>
                      </tr>
                    </>
                  )}
                </tbody>
              </Table>
            </TableWrapper>
          ) : null}

          {mode === "after" && afterFee.exactCreatorRobux.floorToBigInt() !== afterFee.creatorRobux ? null : null}

          <p
            className={cx(
              "rounded-(--radius-control) border border-(--color-border) border-l-4 border-l-(--color-accent) bg-(--color-surface) p-3 text-sm text-(--color-text-muted)",
            )}
          >
            {t("marketplace.prose.notAppliedTwice")}
          </p>

          <div className="flex flex-wrap gap-2">
            <CopyButton
              t={t}
              label={t("marketplace.results.copyResult")}
              text={primaryValue}
              variant="primary"
              onAnnounce={setAnnouncement}
            />
            <CopyButton
              t={t}
              label={t("marketplace.results.copySummary")}
              text={summaryText}
              onAnnounce={setAnnouncement}
            />
          </div>
        </div>
      </div>

      <ResultAnnouncer
        message={
          announcement ||
          (robux === 0n
            ? ""
            : mode === "after"
              ? `You keep ${formatRobux(afterFee.creatorRobux)} Robux of ${formatRobux(afterFee.grossRobux)}.`
              : `Charge ${formatRobux(beforeFee.requiredGrossRobux)} Robux to keep ${formatRobux(beforeFee.targetNetRobux)}.`)
        }
      />
    </Card>
  );
}
