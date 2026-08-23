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

  /**
   * The named human who read this translation, and when.
   *
   * Both null until someone actually does it. `qualityReview` alone was not
   * enough: a string field can be edited to `native-reviewed` in one keystroke
   * and nothing about the change records who or when. These two make the claim
   * expensive — you have to name a person and a date — and `assertRegistry`
   * fails the build when the claim is made without them.
   */
  readonly reviewerName: string | null;
  readonly reviewedAt: string | null;

  /**
   * The English content this translation was made from.
   *
   * English is the source, and it moves: a rate changes, a paragraph is
   * corrected, a page is rewritten. Without a version stamp a translation
   * drifts out of date invisibly — the words are still fluent, they just
   * describe a page that no longer exists. The coverage report compares this
   * against the current English content hash and lists what has changed since.
   */
  readonly sourceContentVersion: string;
}

// ---------------------------------------------------------------------------
// Dictionaries
// ---------------------------------------------------------------------------

/**
 * The namespaces a page may ask for.
 *
 * Split by what a page actually renders rather than by which file the strings
 * came from, so a rate page loads rates and the shell — not the legal pages,
 * the platform charts and the contact form as well. A closed union, because
 * the value reaches a module import and an open `string` there would be a
 * path-traversal primitive.
 */
export type DictionaryNamespace =
  | "common"
  | "navigation"
  | "calculator"
  | "rates"
  | "marketplace"
  | "platform"
  | "guides"
  | "trust"
  | "legal"
  | "contact"
  | "errors"
  | "accessibility"
  | "seo"
  | "schema"
  | "routes";

/**
 * A namespace's contents.
 *
 * Deliberately a nested record of strings rather than `any`. Values may nest
 * for grouping and may be arrays for lists — an FAQ, a set of steps, a table
 * of rows — but a leaf is always a string. Raw HTML is not permitted in a
 * value: rich text is expressed as structured objects with typed link
 * placeholders, so a translation file can never inject markup.
 */
export type DictionaryValue = string | readonly DictionaryValue[] | { readonly [k: string]: DictionaryValue };

export type DictionaryNamespaceContent = Readonly<Record<string, DictionaryValue>>;

export type Dictionary = Readonly<Record<DictionaryNamespace, DictionaryNamespaceContent>>;

/** Every namespace, as a runtime value, for validators and extraction. */
export const DICTIONARY_NAMESPACES: readonly DictionaryNamespace[] = [
  "common",
  "navigation",
  "calculator",
  "rates",
  "marketplace",
  "platform",
  "guides",
  "trust",
  "legal",
  "contact",
  "errors",
  "accessibility",
  "seo",
  "schema",
  "routes",
];
