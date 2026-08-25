import type { Translate } from "@/i18n/get-dictionary";

/**
 * Reading the reader-facing half of the registries in the reader's language.
 *
 * The registries under `src/data/` hold two different kinds of thing in the
 * same object: figures the build validates (a rate, a source id, a
 * verification date) and prose a reader is shown (what the rate means, what a
 * citation supports). The figures must stay in one file with their provenance;
 * the prose must be translatable. So the prose is mirrored into the `data`
 * namespace by `scripts/i18n/sync-data-dictionary.ts`, and these helpers are
 * the only place that knows how a registry row maps to its key.
 *
 * They take the row rather than its id so a caller cannot pass an id from one
 * registry and get a key in another, and so the English in `src/data/` stays
 * the thing that decides which rows exist.
 *
 * Every one of these throws for a key the dictionary lacks, exactly like `t`
 * itself — which is what makes an untranslated new rate a failed build rather
 * than an English sentence in a German page.
 */

/** `data` must be among a page's namespaces before any of this is reachable. */

const slug = (label: string): string =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function evidenceLabel(t: Translate, source: { readonly evidenceLabel: string }): string {
  return t(`data.evidence.${slug(source.evidenceLabel)}`);
}

export function sourceFacts(
  t: Translate,
  source: { readonly id: string; readonly factsSupported: readonly string[] },
): readonly string[] {
  return source.factsSupported.map((_, index) => t(`data.sources.${source.id}.facts.${index}`));
}

export function rateLabel(t: Translate, rate: { readonly id: string }): string {
  return t(`data.rates.${rate.id}.label`);
}

export function rateShortLabel(t: Translate, rate: { readonly id: string }): string {
  return t(`data.rates.${rate.id}.shortLabel`);
}

export function rateSummary(t: Translate, rate: { readonly id: string }): string {
  return t(`data.rates.${rate.id}.eligibilitySummary`);
}

/**
 * Null when the rate carries no condition, mirroring the registry field.
 *
 * The key is absent rather than empty in that case, so asking for it would
 * throw — which is right for a typo and wrong for a rate that genuinely has no
 * caveat.
 */
export function rateCondition(
  t: Translate,
  rate: { readonly id: string; readonly conditionNote: string | null },
): string | null {
  return rate.conditionNote === null ? null : t(`data.rates.${rate.id}.conditionNote`);
}

export function schemeLabel(t: Translate, scheme: { readonly id: string }): string {
  return t(`data.schemes.${scheme.id}.label`);
}

export function schemeDescription(t: Translate, scheme: { readonly id: string }): string {
  return t(`data.schemes.${scheme.id}.description`);
}

export function minimumNote(t: Translate): string {
  return t("data.minimum.note");
}

export function limitsNote(t: Translate): string {
  return t("data.limits.note");
}

export function currenciesNote(t: Translate): string {
  return t("data.currencies.note");
}

// ---------------------------------------------------------------------------
// Platform metrics
// ---------------------------------------------------------------------------

/** The three series on the stats page, named as they are in the registry. */
export type SeriesId = "developerExchangeFees" | "revenue" | "shareOfRevenue";

export function seriesLabel(t: Translate, series: SeriesId): string {
  return t(`data.metrics.${series}.label`);
}

export function seriesDescription(t: Translate, series: SeriesId): string {
  return t(`data.metrics.${series}.description`);
}

/** How a derived period was arrived at. Null for a period Roblox reported. */
export function periodDerivation(
  t: Translate,
  series: SeriesId,
  period: { readonly id: string; readonly derivation?: string },
): string | null {
  return period.derivation === undefined
    ? null
    : t(`data.metrics.${series}.derivation.${period.id}`);
}

export function contextLabel(t: Translate): string {
  return t("data.metrics.companyContext.label");
}

export function contextDescription(t: Translate): string {
  return t("data.metrics.companyContext.description");
}

export function contextFigureLabel(t: Translate, figure: { readonly id: string }): string {
  return t(`data.metrics.companyContext.figures.${figure.id}.label`);
}

export function contextFigureNote(t: Translate, figure: { readonly id: string }): string {
  return t(`data.metrics.companyContext.figures.${figure.id}.note`);
}

export function engagementLabel(t: Translate): string {
  return t("data.metrics.engagement.label");
}

export function engagementDescription(t: Translate): string {
  return t("data.metrics.engagement.description");
}

export function engagementFigureLabel(t: Translate, figure: { readonly id: string }): string {
  return t(`data.metrics.engagement.figures.${figure.id}.label`);
}

/**
 * The magnitude as the release words it — "123 million".
 *
 * Translated rather than formatted, because the digits and the word are
 * quoted together from the filing and only the word has a translation.
 */
export function engagementFigureValue(t: Translate, figure: { readonly id: string }): string {
  return t(`data.metrics.engagement.figures.${figure.id}.value`);
}

export function engagementFigureChange(t: Translate, figure: { readonly id: string }): string {
  return t(`data.metrics.engagement.figures.${figure.id}.change`);
}

export function engagementFigureNote(t: Translate, figure: { readonly id: string }): string {
  return t(`data.metrics.engagement.figures.${figure.id}.note`);
}

export function unpublishedLabel(t: Translate, entry: { readonly id: string }): string {
  return t(`data.metrics.engagement.notPublished.${entry.id}.label`);
}

export function unpublishedReason(t: Translate, entry: { readonly id: string }): string {
  return t(`data.metrics.engagement.notPublished.${entry.id}.reason`);
}
