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
    status: "planned",
    qualityReview: "none",
    decimalSeparator: ",",
    groupSeparator: ".",
    searchRegion: "BR",
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
    status: "planned",
    qualityReview: "none",
    decimalSeparator: ",",
    groupSeparator: ".",
    // Deliberately not a country. Spanish is spoken across many currencies and
    // tax regimes, and this site never infers either from a language.
    searchRegion: null,
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
    status: "planned",
    qualityReview: "none",
    decimalSeparator: ",",
    groupSeparator: ".",
    searchRegion: "ID",
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
    status: "planned",
    qualityReview: "none",
    decimalSeparator: ",",
    // A narrow no-break space, which is what `Intl` actually emits for French.
    // Writing a plain space here would make the parser reject its own output.
    groupSeparator: " ",
    searchRegion: "FR",
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
    status: "planned",
    qualityReview: "none",
    decimalSeparator: ",",
    groupSeparator: ".",
    searchRegion: "DE",
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
    status: "planned",
    qualityReview: "none",
    decimalSeparator: ",",
    groupSeparator: ".",
    searchRegion: "TR",
  },

  /*
   * Tier 2 and Tier 3. Present so the architecture is shaped for them now —
   * the direction field, the separators, the RTL flag — and absent from every
   * public surface because `status` is `planned`. Arabic in particular is
   * listed here so that logical CSS properties and `dir` handling are designed
   * against a real record rather than a hypothetical one.
   */
  { locale: "pl", prefix: "/pl", bcp47: "pl", hreflang: "pl", htmlLang: "pl", ogLocale: "pl_PL", englishName: "Polish", nativeName: "Polski", direction: "ltr", status: "planned", qualityReview: "none", decimalSeparator: ",", groupSeparator: " ", searchRegion: "PL" },
  { locale: "it", prefix: "/it", bcp47: "it", hreflang: "it", htmlLang: "it", ogLocale: "it_IT", englishName: "Italian", nativeName: "Italiano", direction: "ltr", status: "planned", qualityReview: "none", decimalSeparator: ",", groupSeparator: ".", searchRegion: "IT" },
  { locale: "vi", prefix: "/vi", bcp47: "vi", hreflang: "vi", htmlLang: "vi", ogLocale: "vi_VN", englishName: "Vietnamese", nativeName: "Tiếng Việt", direction: "ltr", status: "planned", qualityReview: "none", decimalSeparator: ",", groupSeparator: ".", searchRegion: "VN" },
  { locale: "th", prefix: "/th", bcp47: "th", hreflang: "th", htmlLang: "th", ogLocale: "th_TH", englishName: "Thai", nativeName: "ไทย", direction: "ltr", status: "planned", qualityReview: "none", decimalSeparator: ".", groupSeparator: ",", searchRegion: "TH" },
  { locale: "ja", prefix: "/ja", bcp47: "ja", hreflang: "ja", htmlLang: "ja", ogLocale: "ja_JP", englishName: "Japanese", nativeName: "日本語", direction: "ltr", status: "planned", qualityReview: "none", decimalSeparator: ".", groupSeparator: ",", searchRegion: "JP" },
  { locale: "ko", prefix: "/ko", bcp47: "ko", hreflang: "ko", htmlLang: "ko", ogLocale: "ko_KR", englishName: "Korean", nativeName: "한국어", direction: "ltr", status: "planned", qualityReview: "none", decimalSeparator: ".", groupSeparator: ",", searchRegion: "KR" },
  { locale: "ar", prefix: "/ar", bcp47: "ar", hreflang: "ar", htmlLang: "ar", ogLocale: "ar_AR", englishName: "Arabic", nativeName: "العربية", direction: "rtl", status: "planned", qualityReview: "none", decimalSeparator: ".", groupSeparator: ",", searchRegion: null },
  { locale: "zh-Hans", prefix: "/zh-hans", bcp47: "zh-Hans", hreflang: "zh-Hans", htmlLang: "zh-Hans", ogLocale: "zh_CN", englishName: "Simplified Chinese", nativeName: "简体中文", direction: "ltr", status: "planned", qualityReview: "none", decimalSeparator: ".", groupSeparator: ",", searchRegion: null },
  { locale: "zh-Hant", prefix: "/zh-hant", bcp47: "zh-Hant", hreflang: "zh-Hant", htmlLang: "zh-Hant", ogLocale: "zh_TW", englishName: "Traditional Chinese", nativeName: "繁體中文", direction: "ltr", status: "planned", qualityReview: "none", decimalSeparator: ".", groupSeparator: ",", searchRegion: null },
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
