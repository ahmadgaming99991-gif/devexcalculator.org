import { allRates, marketplaceSchemes } from "@/lib/calculations/rate-registry";

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
 */
export const RATE_WORDS: readonly string[] = allRates.flatMap((rate) => [
  `data.rates.${rate.id}.label`,
  `data.rates.${rate.id}.shortLabel`,
  `data.rates.${rate.id}.eligibilitySummary`,
  ...(rate.conditionNote === null ? [] : [`data.rates.${rate.id}.conditionNote`]),
]);

/** The `data` keys a Client Component needs when it names a marketplace scheme. */
export const SCHEME_WORDS: readonly string[] = marketplaceSchemes.flatMap((scheme) => [
  `data.schemes.${scheme.id}.label`,
  `data.schemes.${scheme.id}.description`,
]);
