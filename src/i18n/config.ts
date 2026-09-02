import type { Locale, LocaleMeta, LocaleStatus } from "./types";

/**
 * Every language this site knows about, and exactly what state each is in.
 *
 * The registry is the gate, not a list of intentions. A locale generates
 * routes, appears in the language selector, joins an hreflang cluster, enters a
 * sitemap and becomes eligible for IndexNow **only** when its `status` is
 * `published`. Everything else — `planned`, `draft`, `review`, `retired` — is
 * invisible in production HTML. That is one flag rather than five separate
 * exclusion lists, so a half-finished language cannot leak out through the one
 * list somebody forgot to update.
 *
 * Two fields are deliberately separate and must not be conflated:
 *
 *   `status`        whether the locale is public
 *   `qualityReview` who has actually read the translation
 *
 * A locale can be `published` while its `qualityReview` is `machine-drafted`.
 * What is forbidden is claiming `native-reviewed` when no native speaker read
 * it — this site publishes figures about people's income, and a fabricated
 * review claim is the same class of lie as a fabricated verification date.
 *
 * English has no prefix and never will. `/en/` would be a second indexable
 * copy of the site competing with itself, which is the most common way a
 * multilingual rollout damages the site it was meant to grow.
 */

/** Translation volume this covers, measured rather than estimated: 30,883
 *  visible words per language across 36 indexable routes. */
export const MEASURED_WORDS_PER_LOCALE = 30_883;

/**
 * The English content every translation was drafted from.
 *
 * Bumped by hand when English prose changes materially. The coverage report
 * compares each locale's stamp against this and lists what has moved since —
 * a translation that still reads fluently while describing a page that no
 * longer exists is the failure mode nobody notices.
 */
export const SOURCE_CONTENT_VERSION = "2026-08-24.1";

export const DEFAULT_LOCALE: Locale = "en";

export const localeRegistry: readonly LocaleMeta[] = [
  {
    locale: "en",
    prefix: "",
    bcp47: "en",
    hreflang: "en",
    htmlLang: "en",
    ogLocale: "en_US",
    englishName: "English",
    nativeName: "English",
    direction: "ltr",
    status: "published",
    qualityReview: "source",
    decimalSeparator: ".",
    groupSeparator: ",",
    /** Research hint only. Never used to choose a currency or redirect anyone. */
    searchRegion: "US",
    reviewerName: null,
    reviewedAt: null,
    publicationApproval: null,
    sourceContentVersion: SOURCE_CONTENT_VERSION,
  },
  {
    locale: "pt-BR",
    prefix: "/pt-br",
    bcp47: "pt-BR",
    hreflang: "pt-BR",
    htmlLang: "pt-BR",
    ogLocale: "pt_BR",
    englishName: "Brazilian Portuguese",
    nativeName: "Português (Brasil)",
    direction: "ltr",
    status: "published",
    qualityReview: "machine-drafted",
    decimalSeparator: ",",
    groupSeparator: ".",
    searchRegion: "BR",
    reviewerName: null,
    reviewedAt: null,
    /*
     * Published unread, by the owner's explicit decision — D-047.
     *
     * `qualityReview` stays `machine-drafted` because that is what it is. The
     * gate used to demand a review, and the way to open it would have been to
     * move this locale to `self-reviewed` — "read by the maintainer" — which
     * nobody had done. Recording the decision instead keeps both facts true at
     * once: the translation has been read by nobody, and somebody accountable
     * decided to publish it anyway.
     */
    publicationApproval: {
      approvedBy: "owner",
      approvedAt: "2026-09-02",
      /*
       * The full basis is D-047 in docs/decision-log.md, including what the
       * approval explicitly does not rest on: no native speaker and no
       * maintainer has read these translations end to end.
       */
      basis: "QA gate passed, read by nobody; see docs/decision-log.md D-047",
    },
    sourceContentVersion: SOURCE_CONTENT_VERSION,
  },
  {
    locale: "es",
    prefix: "/es",
    bcp47: "es",
    hreflang: "es",
    htmlLang: "es",
    ogLocale: "es_ES",
    englishName: "Spanish",
    nativeName: "Español",
    direction: "ltr",
    status: "published",
    qualityReview: "machine-drafted",
    decimalSeparator: ",",
    groupSeparator: ".",
    // Deliberately not a country. Spanish is spoken across many currencies and
    // tax regimes, and this site never infers either from a language.
    searchRegion: null,
    reviewerName: null,
    reviewedAt: null,
    /*
     * Published unread, by the owner's explicit decision — D-047.
     *
     * `qualityReview` stays `machine-drafted` because that is what it is. The
     * gate used to demand a review, and the way to open it would have been to
     * move this locale to `self-reviewed` — "read by the maintainer" — which
     * nobody had done. Recording the decision instead keeps both facts true at
     * once: the translation has been read by nobody, and somebody accountable
     * decided to publish it anyway.
     */
    publicationApproval: {
      approvedBy: "owner",
      approvedAt: "2026-09-02",
      /*
       * The full basis is D-047 in docs/decision-log.md, including what the
       * approval explicitly does not rest on: no native speaker and no
       * maintainer has read these translations end to end.
       */
      basis: "QA gate passed, read by nobody; see docs/decision-log.md D-047",
    },
    sourceContentVersion: SOURCE_CONTENT_VERSION,
  },
  {
    locale: "id",
    prefix: "/id",
    bcp47: "id",
    hreflang: "id",
    htmlLang: "id",
    ogLocale: "id_ID",
    englishName: "Indonesian",
    nativeName: "Bahasa Indonesia",
    direction: "ltr",
    status: "published",
    qualityReview: "machine-drafted",
    decimalSeparator: ",",
    groupSeparator: ".",
    searchRegion: "ID",
    reviewerName: null,
    reviewedAt: null,
    /*
     * Published unread, by the owner's explicit decision — D-047.
     *
     * `qualityReview` stays `machine-drafted` because that is what it is. The
     * gate used to demand a review, and the way to open it would have been to
     * move this locale to `self-reviewed` — "read by the maintainer" — which
     * nobody had done. Recording the decision instead keeps both facts true at
     * once: the translation has been read by nobody, and somebody accountable
     * decided to publish it anyway.
     */
    publicationApproval: {
      approvedBy: "owner",
      approvedAt: "2026-09-02",
      /*
       * The full basis is D-047 in docs/decision-log.md, including what the
       * approval explicitly does not rest on: no native speaker and no
       * maintainer has read these translations end to end.
       */
      basis: "QA gate passed, read by nobody; see docs/decision-log.md D-047",
    },
    sourceContentVersion: SOURCE_CONTENT_VERSION,
  },
  {
    locale: "fr",
    prefix: "/fr",
    bcp47: "fr",
    hreflang: "fr",
    htmlLang: "fr",
    ogLocale: "fr_FR",
    englishName: "French",
    nativeName: "Français",
    direction: "ltr",
    status: "published",
    qualityReview: "machine-drafted",
    decimalSeparator: ",",
    // A narrow no-break space, which is what `Intl` actually emits for French.
    // Writing a plain space here would make the parser reject its own output.
    groupSeparator: " ",
    searchRegion: "FR",
    reviewerName: null,
    reviewedAt: null,
    /*
     * Published unread, by the owner's explicit decision — D-047.
     *
     * `qualityReview` stays `machine-drafted` because that is what it is. The
     * gate used to demand a review, and the way to open it would have been to
     * move this locale to `self-reviewed` — "read by the maintainer" — which
     * nobody had done. Recording the decision instead keeps both facts true at
     * once: the translation has been read by nobody, and somebody accountable
     * decided to publish it anyway.
     */
    publicationApproval: {
      approvedBy: "owner",
      approvedAt: "2026-09-02",
      /*
       * The full basis is D-047 in docs/decision-log.md, including what the
       * approval explicitly does not rest on: no native speaker and no
       * maintainer has read these translations end to end.
       */
      basis: "QA gate passed, read by nobody; see docs/decision-log.md D-047",
    },
    sourceContentVersion: SOURCE_CONTENT_VERSION,
  },
  {
    locale: "de",
    prefix: "/de",
    bcp47: "de",
    hreflang: "de",
    htmlLang: "de",
    ogLocale: "de_DE",
    englishName: "German",
    nativeName: "Deutsch",
    direction: "ltr",
    status: "published",
    qualityReview: "machine-drafted",
    decimalSeparator: ",",
    groupSeparator: ".",
    searchRegion: "DE",
    reviewerName: null,
    reviewedAt: null,
    /*
     * Published unread, by the owner's explicit decision — D-047.
     *
     * `qualityReview` stays `machine-drafted` because that is what it is. The
     * gate used to demand a review, and the way to open it would have been to
     * move this locale to `self-reviewed` — "read by the maintainer" — which
     * nobody had done. Recording the decision instead keeps both facts true at
     * once: the translation has been read by nobody, and somebody accountable
     * decided to publish it anyway.
     */
    publicationApproval: {
      approvedBy: "owner",
      approvedAt: "2026-09-02",
      /*
       * The full basis is D-047 in docs/decision-log.md, including what the
       * approval explicitly does not rest on: no native speaker and no
       * maintainer has read these translations end to end.
       */
      basis: "QA gate passed, read by nobody; see docs/decision-log.md D-047",
    },
    sourceContentVersion: SOURCE_CONTENT_VERSION,
  },
  {
    locale: "tr",
    prefix: "/tr",
    bcp47: "tr",
    hreflang: "tr",
    htmlLang: "tr",
    ogLocale: "tr_TR",
    englishName: "Turkish",
    nativeName: "Türkçe",
    direction: "ltr",
    status: "published",
    /*
     * Read by the maintainer against the English source on 2026-08-31, after
     * the four morphological negations were pulled out for checking. Not a
     * native review: `reviewerName` and `reviewedAt` stay null because those
     * fields record a named native speaker, and `assertRegistry` refuses them
     * without the matching claim. The review that did happen is written up in
     * `docs/i18n/critical-claims.md`.
     *
     * Published on that basis by the owner's decision — D-046. The four
     * morphological negations are settled per key in
     * `scripts/i18n/audit/checks.ts`, not waived.
     */
    qualityReview: "self-reviewed",
    decimalSeparator: ",",
    groupSeparator: ".",
    searchRegion: "TR",
    reviewerName: null,
    reviewedAt: null,
    publicationApproval: null,
    sourceContentVersion: SOURCE_CONTENT_VERSION,
  },

  /*
   * Tier 2 and Tier 3. Present so the architecture is shaped for them now —
   * the direction field, the separators, the RTL flag — and absent from every
   * public surface because `status` is `planned`. Arabic in particular is
   * listed here so that logical CSS properties and `dir` handling are designed
   * against a real record rather than a hypothetical one.
   */
  { locale: "pl", prefix: "/pl", bcp47: "pl", hreflang: "pl", htmlLang: "pl", ogLocale: "pl_PL", englishName: "Polish", nativeName: "Polski", direction: "ltr", status: "planned", qualityReview: "none", decimalSeparator: ",", groupSeparator: " ", searchRegion: "PL", reviewerName: null, reviewedAt: null, publicationApproval: null, sourceContentVersion: SOURCE_CONTENT_VERSION },
  { locale: "it", prefix: "/it", bcp47: "it", hreflang: "it", htmlLang: "it", ogLocale: "it_IT", englishName: "Italian", nativeName: "Italiano", direction: "ltr", status: "planned", qualityReview: "none", decimalSeparator: ",", groupSeparator: ".", searchRegion: "IT", reviewerName: null, reviewedAt: null, publicationApproval: null, sourceContentVersion: SOURCE_CONTENT_VERSION },
  { locale: "vi", prefix: "/vi", bcp47: "vi", hreflang: "vi", htmlLang: "vi", ogLocale: "vi_VN", englishName: "Vietnamese", nativeName: "Tiếng Việt", direction: "ltr", status: "planned", qualityReview: "none", decimalSeparator: ",", groupSeparator: ".", searchRegion: "VN", reviewerName: null, reviewedAt: null, publicationApproval: null, sourceContentVersion: SOURCE_CONTENT_VERSION },
  { locale: "th", prefix: "/th", bcp47: "th", hreflang: "th", htmlLang: "th", ogLocale: "th_TH", englishName: "Thai", nativeName: "ไทย", direction: "ltr", status: "planned", qualityReview: "none", decimalSeparator: ".", groupSeparator: ",", searchRegion: "TH", reviewerName: null, reviewedAt: null, publicationApproval: null, sourceContentVersion: SOURCE_CONTENT_VERSION },
  { locale: "ja", prefix: "/ja", bcp47: "ja", hreflang: "ja", htmlLang: "ja", ogLocale: "ja_JP", englishName: "Japanese", nativeName: "日本語", direction: "ltr", status: "planned", qualityReview: "none", decimalSeparator: ".", groupSeparator: ",", searchRegion: "JP", reviewerName: null, reviewedAt: null, publicationApproval: null, sourceContentVersion: SOURCE_CONTENT_VERSION },
  { locale: "ko", prefix: "/ko", bcp47: "ko", hreflang: "ko", htmlLang: "ko", ogLocale: "ko_KR", englishName: "Korean", nativeName: "한국어", direction: "ltr", status: "planned", qualityReview: "none", decimalSeparator: ".", groupSeparator: ",", searchRegion: "KR", reviewerName: null, reviewedAt: null, publicationApproval: null, sourceContentVersion: SOURCE_CONTENT_VERSION },
  { locale: "ar", prefix: "/ar", bcp47: "ar", hreflang: "ar", htmlLang: "ar", ogLocale: "ar_AR", englishName: "Arabic", nativeName: "العربية", direction: "rtl", status: "planned", qualityReview: "none", decimalSeparator: ".", groupSeparator: ",", searchRegion: null, reviewerName: null, reviewedAt: null, publicationApproval: null, sourceContentVersion: SOURCE_CONTENT_VERSION },
  { locale: "zh-Hans", prefix: "/zh-hans", bcp47: "zh-Hans", hreflang: "zh-Hans", htmlLang: "zh-Hans", ogLocale: "zh_CN", englishName: "Simplified Chinese", nativeName: "简体中文", direction: "ltr", status: "planned", qualityReview: "none", decimalSeparator: ".", groupSeparator: ",", searchRegion: null, reviewerName: null, reviewedAt: null, publicationApproval: null, sourceContentVersion: SOURCE_CONTENT_VERSION },
  { locale: "zh-Hant", prefix: "/zh-hant", bcp47: "zh-Hant", hreflang: "zh-Hant", htmlLang: "zh-Hant", ogLocale: "zh_TW", englishName: "Traditional Chinese", nativeName: "繁體中文", direction: "ltr", status: "planned", qualityReview: "none", decimalSeparator: ".", groupSeparator: ",", searchRegion: null, reviewerName: null, reviewedAt: null, publicationApproval: null, sourceContentVersion: SOURCE_CONTENT_VERSION },
];

/**
 * The seven locales this release is being built for.
 *
 * Separate from `status`: this names the intent, `status` names the reality.
 * A locale is in here while its content is being written and only becomes
 * `published` when every route in it is complete.
 */
export const LAUNCH_LOCALES: readonly Locale[] = ["en", "pt-BR", "es", "id", "fr", "de", "tr"];

const byLocale = new Map(localeRegistry.map((meta) => [meta.locale, meta]));

export function isSupportedLocale(value: string): value is Locale {
  return byLocale.has(value as Locale);
}

export function getLocaleMeta(locale: Locale): LocaleMeta {
  const meta = byLocale.get(locale);
  if (!meta) throw new Error(`Unknown locale: ${locale}`);
  return meta;
}

export function isPublishedLocale(value: string): value is Locale {
  return isSupportedLocale(value) && getLocaleMeta(value).status === "published";
}

/** Every locale that may appear in public HTML. Ordered as declared. */
export function publishedLocales(): readonly LocaleMeta[] {
  return localeRegistry.filter((meta) => meta.status === "published");
}

export function isRtl(locale: Locale): boolean {
  return getLocaleMeta(locale).direction === "rtl";
}

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return getLocaleMeta(locale).direction;
}

/** Statuses that may never reach production HTML. */
export const NON_PUBLIC_STATUSES: readonly LocaleStatus[] = [
  "planned",
  "draft",
  "review",
  "retired",
];
