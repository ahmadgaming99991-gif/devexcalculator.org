import { DEFAULT_LOCALE } from "./config";
import { isRenderable } from "./visibility";
import type { Dictionary, DictionaryNamespace, Locale } from "./types";

/**
 * Loading one language's words, on the server, for one request.
 *
 * Three properties this design exists to guarantee, each of which the obvious
 * approach gets wrong:
 *
 *   1. **No dictionary reaches the browser.** Every export here is async and
 *      every caller is a Server Component, so a dictionary cannot be reached
 *      from client code without an `await` a Client Component cannot perform.
 *      Client components are handed the handful of strings they render, as
 *      props, from their server parent. The `server-only` package would state
 *      this to the compiler as well, and is not a dependency here: this
 *      project keeps its dependency list short on purpose, and the bundle
 *      validator already fails the build if locale JSON appears in a client
 *      chunk — a check that measures the real thing rather than asserting it.
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
export function interpolate(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (whole, token: string) => {
    const value = values[token];
    return value === undefined ? whole : String(value);
  });
}

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
export type Translate = (
  key: string,
  values?: Readonly<Record<string, string | number>>,
) => string;

export function translator(dictionary: Partial<Dictionary>): Translate {
  return (key, values) => {
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
    return values === undefined ? value : interpolate(value, values);
  };
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
 * Two namespaces, both small, both read by components that appear on nearly
 * every page. A third would want a better answer than this one.
 */
const SHARED_NAMESPACES = ["common", "accessibility"] as const;

/** The namespaces a page needs, and a reader for them, in one await. */
export async function getTranslator(
  locale: Locale,
  namespaces: readonly DictionaryNamespace[],
): Promise<Translate> {
  const all = [...new Set([...namespaces, ...SHARED_NAMESPACES])];
  return translator(await getDictionary(locale, all));
}
/** English, for the extraction scripts and for tests that need a baseline. */
export async function getSourceNamespace<T = Record<string, unknown>>(
  namespace: DictionaryNamespace,
): Promise<T> {
  return getNamespace<T>(DEFAULT_LOCALE, namespace);
}
