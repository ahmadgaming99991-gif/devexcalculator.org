/**
 * Types for the locale registry.
 *
 * `Locale` is a closed union rather than `string`, so a typo in a path helper,
 * a dictionary import or an hreflang cluster is a build error rather than a
 * page that renders in the wrong language.
 */

export type Locale =
  | "en"
  | "pt-BR"
  | "es"
  | "id"
  | "fr"
  | "de"
  | "tr"
  | "pl"
  | "it"
  | "vi"
  | "th"
  | "ja"
  | "ko"
  | "ar"
  | "zh-Hans"
  | "zh-Hant";

/**
 * Where a locale is in its life.
 *
 *   `planned`   the registry knows about it; nothing exists yet
 *   `draft`     translation in progress, incomplete, never public
 *   `review`    complete but not yet checked by a native speaker
 *   `published` public: routes, selector, hreflang, sitemap, IndexNow
 *   `retired`   was public, no longer is; redirects are somebody's decision
 */
export type LocaleStatus = "planned" | "draft" | "review" | "published" | "retired";

/**
 * Who has actually read the translation — deliberately not the same field as
 * `status`, because a locale can be public without having been reviewed, and
 * saying otherwise would be a fabricated claim.
 *
 *   `source`          this is the language the content was written in
 *   `none`            nothing exists yet
 *   `machine-drafted` translated by a machine, read by nobody
 *   `self-reviewed`   read by the maintainer, who is not a native speaker
 *   `native-reviewed` read by a named native speaker, recorded in the docs
 */
export type QualityReview =
  | "source"
  | "none"
  | "machine-drafted"
  | "self-reviewed"
  | "native-reviewed";

export type Direction = "ltr" | "rtl";

export interface LocaleMeta {
  readonly locale: Locale;
  /** URL prefix with a leading slash and no trailing slash. Empty for English. */
  readonly prefix: string;
  readonly bcp47: string;
  /** Value used in `hreflang`. Usually the same as `bcp47`. */
  readonly hreflang: string;
  /** Value used in `<html lang>`. */
  readonly htmlLang: string;
  readonly ogLocale: string;
  readonly englishName: string;
  /** Shown in the language selector, in its own language. */
  readonly nativeName: string;
  readonly direction: Direction;
  readonly status: LocaleStatus;
  readonly qualityReview: QualityReview;
  /** What separates the fraction. Used by the locale-aware input parser. */
  readonly decimalSeparator: string;
  /**
   * What separates thousands. French really is a narrow no-break space
   * (U+202F), which is what `Intl` emits — a plain space here would make the
   * parser reject numbers the site itself formatted.
   */
  readonly groupSeparator: string;
  /**
   * A hint for keyword research only. Never used to pick a currency, a tax
   * assumption, or to redirect anyone: a language is not a country, and
   * Spanish and Arabic in particular span many of both.
   */
  readonly searchRegion: string | null;
}
