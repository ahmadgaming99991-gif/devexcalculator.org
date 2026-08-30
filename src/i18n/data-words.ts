import { allRates, marketplaceSchemes } from "@/lib/calculations/rate-registry";
import { dataKeys } from "@/i18n/data-text";

/**
 * The `data` keys a Client Component needs when it names a rate.
 *
 * The rate tables in the calculator islands print a rate's name and summary,
 * and those live in the `data` namespace because the English originals live in
 * `src/data/rates.json`. A Client Component reads only the words its server
 * parent copied for it, so those keys have to be in its list — and they cannot
 * be found by scanning the source, because the component asks for
 * `data.rates.${rate.id}.label` with an id it gets at runtime.
 *
 * Derived from the registry rather than written out, so adding a fourth rate
 * cannot leave the islands throwing for the one rate nobody clicked.
 *
 * The key templates come from `dataKeys` rather than being written again here.
 * They were written again here, and `data-text.ts` said in its header that it
 * was the only place that knew them — a rename would have moved one and left
 * the other, in the file whose whole job is to list keys that cannot be found
 * by scanning the source.
 */
export const RATE_WORDS: readonly string[] = allRates.flatMap((rate) => [
  dataKeys.rateLabel(rate),
  dataKeys.rateShortLabel(rate),
  dataKeys.rateSummary(rate),
  ...(rate.conditionNote === null ? [] : [dataKeys.rateCondition(rate)]),
]);

/** The `data` keys a Client Component needs when it names a marketplace scheme. */
export const SCHEME_WORDS: readonly string[] = marketplaceSchemes.flatMap((scheme) => [
  dataKeys.schemeLabel(scheme),
  dataKeys.schemeDescription(scheme),
]);
