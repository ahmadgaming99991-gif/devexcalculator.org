import type { Translate } from "@/i18n/get-dictionary";

/**
 * Choosing between a sentence's `one` and `other` forms, by the reader's rules.
 *
 * Every call site did this by hand as `count === 1 ? key.one : key.other`,
 * which is the English rule wearing no label. It is right for English, German,
 * Turkish and Indonesian and wrong for French and Brazilian Portuguese, where
 * **zero takes the singular**: `0 jour`, not `0 jours`. Measured with
 * `Intl.PluralRules`, not assumed —
 *
 *     fr.select(0)     → "one"
 *     pt-BR.select(0)  → "one"
 *     es.select(0)     → "other"
 *
 * — and the disagreement shows on any page that reports a count that can be
 * nothing: a chart with no observations yet, a plan reaching its target today.
 *
 * `many` exists in the French, Spanish and Portuguese category lists and is
 * deliberately not used. It applies to compact notation ("2 millions"), which
 * this site never selects a plural form for, so a `many` key would be one no
 * call site could reach and one every translator would have to write.
 */

/** The categories the catalogs actually carry. */
type Form = "one" | "other";

/**
 * The form this locale uses for this count.
 *
 * `Intl.PluralRules` can return `few`, `many`, `two` or `zero` for languages
 * this site does not ship yet. Those collapse to `other`, which is what the
 * catalogs have — and when such a locale is added, `checkPlurals` in the audit
 * harness fails the build until the keys exist, rather than letting this
 * silently pick the wrong one.
 */
export function pluralForm(locale: string, count: number): Form {
  try {
    return new Intl.PluralRules(locale).select(count) === "one" ? "one" : "other";
  } catch {
    // An unrecognised tag. English is what the rest of the site falls back to.
    return count === 1 ? "one" : "other";
  }
}

/**
 * `t` for a sentence that has a singular and a plural.
 *
 * Takes the key without its form — `common.spans.days` — and appends the one
 * this locale wants. The count is passed through as a value so the sentence
 * can interpolate it, which every one of these does.
 */
export function plural(
  t: Translate,
  locale: string,
  key: string,
  count: number,
  values: Readonly<Record<string, string | number>> = {},
): string {
  return t(`${key}.${pluralForm(locale, count)}`, { ...values });
}
