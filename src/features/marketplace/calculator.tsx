"use client";

import { parseMessage } from "@/i18n/parse-message";
import { translatorFor, type LocaleWords } from "@/i18n/client-words";
import type { Translate } from "@/i18n/get-dictionary";
import { schemeLabel } from "@/i18n/data-text";
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
    mode === "after" ? formatRobux(t.locale, afterFee.creatorRobux) : formatRobux(t.locale, beforeFee.requiredGrossRobux);

  const summaryText =
    robux === 0n
      ? ""
      : mode === "after"
        ? [
            t("marketplace.results.summarySalePrice", {
              robux: formatRobux(t.locale, afterFee.grossRobux),
            }),
            t("marketplace.results.summaryScheme", {
              scheme: schemeLabel(t, afterFee.scheme),
            }),
            t("marketplace.results.summaryYourShare", {
              percent: formatPercent(t.locale, afterFee.creatorSharePercent, 0),
            }),
            t("marketplace.results.summaryYouKeep", {
              robux: formatRobux(t.locale, afterFee.creatorRobux),
            }),
            t("marketplace.results.summaryRobloxKeeps", {
              robux: formatRobux(t.locale, afterFee.platformRobux),
            }),
            t("marketplace.results.estimateFrom"),
          ].join("\n")
        : [
            t("marketplace.results.summaryTargetAfterFee", {
              robux: formatRobux(t.locale, beforeFee.targetNetRobux),
            }),
            t("marketplace.results.summaryScheme", {
              scheme: schemeLabel(t, beforeFee.scheme),
            }),
            t("marketplace.results.summaryYourShare", {
              percent: formatPercent(t.locale, beforeFee.creatorSharePercent, 0),
            }),
            t("marketplace.results.summaryPriceToCharge", {
              robux: formatRobux(t.locale, beforeFee.requiredGrossRobux),
            }),
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
            label={t(
              mode === "after" ? "marketplace.inputs.salePrice" : "marketplace.inputs.amountToKeep",
            )}
            value={amount}
            onChange={setAmount}
            error={parseMessage(t, parsed)}
            hint={
              mode === "after"
                ? t("marketplace.inputs.salePriceHint")
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
            primaryLabel={t(
              mode === "after"
                ? "marketplace.results.primaryLabelYouKeep"
                : "marketplace.results.primaryLabelPriceToCharge",
            )}
            primaryValue={primaryValue}
            secondary={
              mode === "after" ? (
                afterFee.appliedTierMultiple ? (
                  t("marketplace.results.secondaryAtTier", {
                    share: t("marketplace.results.secondaryAfterFee", {
                      percent: formatPercent(t.locale, afterFee.creatorSharePercent, 0),
                      robux: formatRobux(t.locale, afterFee.grossRobux),
                    }),
                    multiple: afterFee.appliedTierMultiple,
                  })
                ) : (
                  t("marketplace.results.secondaryAfterFee", {
                    percent: formatPercent(t.locale, afterFee.creatorSharePercent, 0),
                    robux: formatRobux(t.locale, afterFee.grossRobux),
                  })
                )
              ) : (
                t("marketplace.results.secondaryBeforeFee", {
                  robux: formatRobux(t.locale, beforeFee.targetNetRobux),
                  percent: formatPercent(t.locale, beforeFee.creatorSharePercent, 0),
                })
              )
            }
          />

          {robux > 0n ? (
            <TableWrapper label={t("marketplace.results.tableLabel")}>
              <Table caption={t("marketplace.results.tableCaption")}>
                <thead>
                  <tr>
                    <Th>{t("marketplace.results.columnGoesTo")}</Th>
                    <Th numeric>{t("marketplace.results.columnRobux")}</Th>
                    <Th numeric>{t("marketplace.results.columnShare")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {mode === "after" ? (
                    <>
                      <tr>
                        <Th scope="row">{t("marketplace.results.rowYou")}</Th>
                        <Td numeric className="font-semibold">
                          {formatRobux(t.locale, afterFee.creatorRobux)}
                        </Td>
                        <Td numeric>{formatPercent(t.locale, afterFee.creatorSharePercent, 0)}</Td>
                      </tr>
                      {afterFee.experienceOwnerRobux !== null ? (
                        <tr>
                          <Th scope="row">{t("marketplace.results.experienceOwner")}</Th>
                          <Td numeric>{formatRobux(t.locale, afterFee.experienceOwnerRobux)}</Td>
                          <Td numeric>
                            {formatPercent(t.locale, 
                              Rational.fromDecimalString(
                                afterFee.scheme.experienceOwnerSharePercent ?? "0",
                              ),
                              0,
                            )}
                          </Td>
                        </tr>
                      ) : null}
                      <tr>
                        <Th scope="row">{t("marketplace.results.rowRoblox")}</Th>
                        <Td numeric>{formatRobux(t.locale, afterFee.platformRobux)}</Td>
                        <Td numeric>
                          {formatPercent(t.locale, 
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
                        <Th scope="row">{t("marketplace.results.rowTotal")}</Th>
                        <Td numeric className="font-bold">
                          {formatRobux(t.locale, afterFee.grossRobux)}
                        </Td>
                        <Td numeric>{t("marketplace.results.totalShare")}</Td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr>
                        <Th scope="row">{t("marketplace.results.chargeTheBuyer")}</Th>
                        <Td numeric className="font-semibold">
                          {formatRobux(t.locale, beforeFee.requiredGrossRobux)}
                        </Td>
                        <Td numeric>{t("marketplace.results.totalShare")}</Td>
                      </tr>
                      <tr>
                        <Th scope="row">{t("marketplace.results.youActuallyKeep")}</Th>
                        <Td numeric>{formatRobux(t.locale, beforeFee.actualNetRobux)}</Td>
                        <Td numeric>{formatPercent(t.locale, beforeFee.creatorSharePercent, 0)}</Td>
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
              ? t("marketplace.results.announceAfterFee", {
                  kept: formatRobux(t.locale, afterFee.creatorRobux),
                  gross: formatRobux(t.locale, afterFee.grossRobux),
                })
              : t("marketplace.results.announceBeforeFee", {
                  gross: formatRobux(t.locale, beforeFee.requiredGrossRobux),
                  net: formatRobux(t.locale, beforeFee.targetNetRobux),
                }))
        }
      />
    </Card>
  );
}
