import "server-only";
import { DEFAULT_LOCALE, getLocaleMeta } from "./config";
import { interpolate } from "./interpolate";
import { withFigures } from "./figures";
import { isRenderable } from "./visibility";
import type { Dictionary, DictionaryNamespace, Locale } from "./types";

/**
 * Loading one language's words, on the server, for one request.
 *
 * Three properties this design exists to guarantee, each of which the obvious
 * approach gets wrong:
 *
 *   1. **No dictionary reaches the browser.** Guarded twice, deliberately, and
 *      the two guards catch different things.
 *
 *      `import "server-only"` above fails the build at the moment a client
 *      module imports this one, naming the chain. That is the door.
 *
 *      `scripts/quality/check-bundle-budget.ts` searches every emitted client
 *      chunk for a long ASCII run taken from a non-English catalog at run
 *      time, and fails on a match. That is the room — it catches a leak that
 *      never touched this file, such as a component importing
 *      `locales/de/common.json` directly, which `server-only` cannot see.
 *
 *      The design still stands on its own: every export here is async and
 *      every caller is a Server Component, so a dictionary cannot be reached
 *      from client code without an `await` a Client Component cannot perform,
 *      and client components are handed the handful of strings they render as
 *      props from their server parent.
 *
 *      This paragraph used to say the bundle validator already did this, and
 *      used that to explain declining the dependency. It did not, and there
 *      was no check of any kind. See D-045 in `docs/decision-log.md`.
 *
 *   2. **One locale per request, one namespace per need.** The imports are
 *      dynamic and per-namespace, so rendering the rate page loads the rates
 *      namespace in one language — not seven languages of everything. A single
 *      barrel file re-exporting every locale would defeat this silently, which
 *      is why there isn't one.
 *
 *   3. **The locale is validated before it becomes a path.** This value
 *      arrives from the URL. `import(\`./locales/\${segment}/…\`)` with an
 *      unvalidated segment is a path-traversal primitive, so nothing gets that
 *      far: the argument is the `Locale` union, the router obtained it through
 *      `resolveRenderableLocale`, and the switch below maps it to a literal
 *      path rather than interpolating it.
 *
 * **There is no English fallback, and that is deliberate.** A missing key
 * throws in development and fails the build through the coverage validator.
 * Falling back would render an English sentence inside a Portuguese paragraph
 * and no test would ever see it — the exact "translated navigation around an
 * English article" failure this whole system is meant to prevent.
 */

/**
 * Every namespace, mapped to a literal import.
 *
 * Written out rather than interpolated. A template string here would work and
 * would also let any string reach the module resolver; a switch cannot.
 */
async function importNamespace(
  locale: Locale,
  namespace: DictionaryNamespace,
): Promise<Record<string, unknown>> {
  switch (locale) {
    case "en":
      return (await import(`./locales/en/${namespace}.json`)).default;
    case "pt-BR":
      return (await import(`./locales/pt-BR/${namespace}.json`)).default;
    case "es":
      return (await import(`./locales/es/${namespace}.json`)).default;
    case "id":
      return (await import(`./locales/id/${namespace}.json`)).default;
    case "fr":
      return (await import(`./locales/fr/${namespace}.json`)).default;
    case "de":
      return (await import(`./locales/de/${namespace}.json`)).default;
    case "tr":
      return (await import(`./locales/tr/${namespace}.json`)).default;
    default:
      // A locale in the registry with no dictionary directory. Reaching this
      // is a programming error, not a reader's mistake.
      throw new Error(`No dictionary directory for locale "${locale}".`);
  }
}

/**
 * The words for one namespace in one language.
 *
 * Throws for a locale this build does not render, rather than quietly serving
 * English under a localized URL.
 */
export async function getNamespace<T = Record<string, unknown>>(
  locale: Locale,
  namespace: DictionaryNamespace,
): Promise<T> {
  if (!isRenderable(locale)) {
    throw new Error(
      `Locale "${locale}" is not renderable in this build. ` +
        `Set ENABLE_REVIEW_LOCALES=true to render locales awaiting native review.`,
    );
  }
  return (await importNamespace(locale, namespace)) as T;
}

/**
 * Several namespaces at once, loaded in parallel.
 *
 * A page names what it needs; nothing loads the whole language.
 */
export async function getDictionary<K extends DictionaryNamespace>(
  locale: Locale,
  namespaces: readonly K[],
): Promise<Pick<Dictionary, K>> {
  const loaded = await Promise.all(
    namespaces.map(async (namespace) => [namespace, await getNamespace(locale, namespace)] as const),
  );
  return Object.fromEntries(loaded) as Pick<Dictionary, K>;
}

/**
 * Fills `{tokens}` in a translated string.
 *
 * Interpolation is positional by name and never by order, because word order
 * differs between languages — a German sentence puts the verb where an English
 * one puts the object, and a positional `%s` would silently swap two values.
 *
 * An unknown token is left exactly as written rather than replaced with
 * "undefined". The validator catches it at build time; if one ever survives to
 * runtime, a visible `{amount}` is a bug report, and the word "undefined" in a
 * payout sentence is a wrong figure.
 */
export { interpolate };

/**
 * A reader for one page's loaded namespaces.
 *
 * `t("rates.devexRates.body.changes.p1")` — the namespace, then the dotted
 * path inside it. The namespace is part of the key rather than bound when the
 * translator is made, because a page renders words from several of them and a
 * key that names its own namespace can be grepped for from either side.
 *
 * **A missing key throws.** It does not return the key, and it does not fall
 * back to English. Returning the key puts `rates.devexRates.body.changes.p1`
 * in front of a reader; falling back puts an English sentence inside a
 * Portuguese paragraph, which no test would ever see and which is the exact
 * failure this whole system exists to prevent. Throwing fails the build,
 * where somebody is looking.
 */
export type Translate = ((
  key: string,
  values?: Readonly<Record<string, string | number>>,
) => string) & {
  /**
   * The BCP 47 tag this translator reads, e.g. `pt-BR`.
   *
   * Here rather than passed separately because a sentence and the number
   * inside it are the same fact. Every component that renders text already
   * holds a `t`; making it hold a locale as well is how a figure ends up
   * formatted for a different language than the words around it.
   *
   * The tag, not the URL segment: `pt-BR`, never `/pt-br`. `Intl` wants the
   * former and the router produces the latter.
   */
  readonly locale: string;
};

export function translator(dictionary: Partial<Dictionary>, locale: Locale): Translate {
  const read = (key: string, values?: Readonly<Record<string, string | number>>): string => {
    const separator = key.indexOf(".");
    const namespace = separator === -1 ? key : key.slice(0, separator);
    const path = separator === -1 ? "" : key.slice(separator + 1);
    const loaded = dictionary[namespace as DictionaryNamespace];
    if (loaded === undefined) {
      throw new Error(
        `Key "${key}" needs the "${namespace}" namespace, which this page did not load.`,
      );
    }
    const value = path
      .split(".")
      .reduce<unknown>(
        (node, part) =>
          node !== null && typeof node === "object"
            ? (node as Record<string, unknown>)[part]
            : undefined,
        loaded,
      );
    if (typeof value !== "string") {
      throw new Error(`No string at "${key}".`);
    }
    /*
     * Always interpolated, even with no caller values, because the registry
     * figures are supplied here rather than by the call site. See
     * `./figures` — a rate written into a sentence as text is a rate that
     * stops matching the calculator the day it changes.
     */
    return interpolate(value, withFigures(getLocaleMeta(locale).bcp47, values));
  };
  return Object.assign(read, { locale: getLocaleMeta(locale).bcp47 });
}

/**
 * The namespaces every translator can answer for, whatever it was asked for.
 *
 * Shared components render strings of their own — the source link's "(opens in
 * a new tab)", the rate table's caption, the estimate callout — and they are
 * handed the calling page's translator rather than building one each. Without
 * these, whether a component worked depended on which namespaces the page
 * around it happened to need, and the failure was a prerender error naming a
 * key the page never mentions.
 *
 * `data` is the third and joins them for the same reason, not a weaker one.
 * It holds the reader-facing half of the registries under `src/data/` — what a
 * rate means, what a citation supports, what a metric series is called — and
 * the components that render those (the rate table, the common-amounts table,
 * the rate selector) appear on most pages of the site. Leaving it to each page
 * to remember would reintroduce exactly the failure the other two are here to
 * prevent. It costs a server-side JSON read and nothing in the browser: no
 * dictionary reaches a client bundle, which the bundle validator checks.
 */
const SHARED_NAMESPACES = ["common", "accessibility", "data"] as const;

/** The namespaces a page needs, and a reader for them, in one await. */
export async function getTranslator(
  locale: Locale,
  namespaces: readonly DictionaryNamespace[],
): Promise<Translate> {
  const all = [...new Set([...namespaces, ...SHARED_NAMESPACES])];
  return translator(await getDictionary(locale, all), locale);
}
/** English, for the extraction scripts and for tests that need a baseline. */
export async function getSourceNamespace<T = Record<string, unknown>>(
  namespace: DictionaryNamespace,
): Promise<T> {
  return getNamespace<T>(DEFAULT_LOCALE, namespace);
}
