"use client";

import type { Translate } from "@/i18n/get-dictionary";
import { currencyName } from "@/i18n/currency-name";
import { useId } from "react";
import { selectableRates } from "@/lib/calculations/rate-registry";
import { supportedCurrencies, formatCompactRobux, formatRate } from "@/lib/calculations/format";
import { Rational } from "@/lib/calculations/rational";
import { cx } from "@/components/ui";

/**
 * Calculator form controls.
 *
 * Every control is a real `<input>`, `<select>` or `<button>` with a real
 * `<label>`. Error text is wired through `aria-describedby` and `aria-invalid`
 * so a screen reader announces the problem with the field rather than leaving
 * it as red text floating nearby.
 */

// ---------------------------------------------------------------------------
// Amount input
// ---------------------------------------------------------------------------

export function AmountInput({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder = "100,000",
  suffix = "Robux",
  autoFocus = false,
  id: providedId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  hint?: string;
  placeholder?: string;
  suffix?: string;
  autoFocus?: boolean;
  id?: string;
}) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-(--color-text)">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type="text"
          // `inputMode="numeric"` gives a numeric keypad on mobile while still
          // allowing the separators and shorthand the parser accepts, which a
          // strict `type="number"` would reject outright.
          inputMode="numeric"
          autoComplete="off"
          enterKeyHint="done"
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cx(
            "control numeric-display min-h-[52px] w-full rounded-(--radius-control) border bg-(--color-surface) px-3 py-2.5 text-lg text-(--color-text) placeholder:text-(--color-text-muted)/60",
            suffix ? "pr-20" : "",
            error ? "border-(--color-danger)" : "border-(--color-border-strong)",
          )}
        />
        {suffix ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-(--color-text-muted)"
          >
            {suffix}
          </span>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-(--color-text-muted)">
          {hint}
        </p>
      ) : null}
      {error ? (
        // `role="alert"` announces the problem as soon as it appears, without
        // the reader needing to navigate back to the field.
        <p id={errorId} role="alert" className="mt-1.5 text-sm font-medium text-(--color-danger)">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rate selector
// ---------------------------------------------------------------------------

export function RateSelector({
  value,
  onChange,
  label,
  t,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  readonly t: Translate;
}) {
  const id = useId();
  const selected = selectableRates.find((rate) => rate.id === value);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-(--color-text)">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={`${id}-note`}
        className="control mt-1.5 min-h-[52px] w-full rounded-(--radius-control) border border-(--color-border-strong) bg-(--color-surface) px-3 py-2.5 text-(--color-text)"
      >
        {selectableRates.map((rate) => (
          <option key={rate.id} value={rate.id}>
            {t("calculator.controls.rateOption", {
              rate: rate.label,
              rateValue: formatRate(Rational.fromDecimalString(rate.usdPerRobux)),
            })}
          </option>
        ))}
      </select>
      <p id={`${id}-note`} className="mt-1.5 text-xs text-(--color-text-muted)">
        {selected?.conditionNote ??
          selected?.eligibilitySummary ??
          t("calculator.controls.rateFallbackNote")}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Currency selector
// ---------------------------------------------------------------------------

export function CurrencySelector({
  value,
  onChange,
  disabled = false,
  t,
  locale,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  readonly t: Translate;
  /** BCP 47 tag, for the currency names. `pt-BR`, not the `/pt-br` prefix. */
  readonly locale: string;
}) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-(--color-text)">{t("calculator.controls.body.intro.p1")}</label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="control mt-1.5 min-h-[52px] w-full rounded-(--radius-control) border border-(--color-border-strong) bg-(--color-surface) px-3 py-2.5 text-(--color-text) disabled:opacity-60"
      >
        {supportedCurrencies.map((currency) => (
          <option key={currency.code} value={currency.code}>
            {currency.code} — {currencyName(locale, currency.code, currency.name)}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preset chips
// ---------------------------------------------------------------------------

/**
 * Quick amounts.
 *
 * Chosen from demand in the supplied keyword data and capped at eight so the
 * row wraps to at most two lines on a 320px screen. Longer-tail amounts live
 * in the conversion table rather than crowding the tool.
 */
export const QUICK_PRESETS: readonly bigint[] = [
  1_000n,
  5_000n,
  10_000n,
  30_000n,
  50_000n,
  100_000n,
  500_000n,
  1_000_000n,
];

export function QuickPresets({
  onSelect,
  activeValue,
  t,
}: {
  onSelect: (value: bigint) => void;
  activeValue: string;
  readonly t: Translate;
}) {
  return (
    <div>
      <p id="presets-label" className="text-sm font-semibold text-(--color-text)">{t("calculator.controls.body.presetsLabel.p1")}</p>
      <div
        role="group"
        aria-labelledby="presets-label"
        className="mt-2 flex flex-wrap gap-2"
      >
        {QUICK_PRESETS.map((preset) => {
          const isActive = activeValue === preset.toString();
          return (
            <button
              key={preset.toString()}
              type="button"
              onClick={() => onSelect(preset)}
              aria-pressed={isActive}
              className={cx(
                "min-h-[44px] rounded-full border px-4 text-sm font-semibold",
                "transition-[background-color,border-color,color,box-shadow,transform] duration-150",
                "hover:-translate-y-px active:translate-y-0",
                isActive
                  ? "border-(--color-primary) bg-(--color-primary) text-(--color-on-primary) shadow-sm"
                  : "border-(--color-border-strong) bg-(--color-surface) text-(--color-text) hover:border-(--color-primary) hover:bg-(--color-primary-soft) hover:shadow-sm",
              )}
            >
              {formatCompactRobux(preset)}
              <span className="sr-only"> Robux</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Percentage / fee inputs
// ---------------------------------------------------------------------------

export function PercentInput({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder = "0",
  suffix = "%",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  hint?: string;
  placeholder?: string;
  suffix?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-(--color-text)">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cx(
            "control numeric-display min-h-[44px] w-full rounded-(--radius-control) border bg-(--color-surface) px-3 py-2 pr-9 text-(--color-text)",
            error ? "border-(--color-danger)" : "border-(--color-border-strong)",
          )}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-(--color-text-muted)"
        >
          {suffix}
        </span>
      </div>
      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-(--color-text-muted)">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-sm font-medium text-(--color-danger)">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mode tabs
// ---------------------------------------------------------------------------

export interface ModeOption {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

/**
 * Mode switcher, built as a real tab list.
 *
 * Arrow keys move between tabs and only the active tab is in the tab order,
 * which is the behaviour a screen-reader user expects from `role="tablist"`.
 */
export function ModeTabs({
  options,
  value,
  onChange,
  t,
}: {
  options: readonly ModeOption[];
  value: string;
  onChange: (value: string) => void;
  readonly t: Translate;
}) {
  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const index = options.findIndex((option) => option.id === value);
    if (index === -1) return;

    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % options.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + options.length) % options.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = options.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    const next = options[nextIndex];
    if (!next) return;
    onChange(next.id);
    document.getElementById(`mode-tab-${next.id}`)?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={t("calculator.modes.label")}
      onKeyDown={onKeyDown}
      className="flex w-full gap-1 rounded-(--radius-control) border border-(--color-border) bg-(--color-surface-subtle) p-1"
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            id={`mode-tab-${option.id}`}
            role="tab"
            type="button"
            aria-selected={selected}
            aria-controls={`mode-panel-${option.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.id)}
            className={cx(
              "min-h-[44px] flex-1 rounded-(--radius-control) px-3 text-sm font-semibold transition-colors",
              selected
                ? "bg-(--color-surface) text-(--color-text) shadow-(--shadow-card)"
                : "text-(--color-text-muted) hover:text-(--color-text)",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
