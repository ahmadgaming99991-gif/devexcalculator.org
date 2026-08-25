/**
 * A currency's name, in the reader's language.
 *
 * `currencies.json` carries an English name for each code, and the selector
 * rendered it directly — so a French reader chose between "Japanese yen" and
 * "Swedish krona". Translating twenty-eight currency names by hand into six
 * languages would be work the platform has already done: `Intl.DisplayNames`
 * ships with the runtime and knows every ISO 4217 code in every locale it
 * supports.
 *
 * The English name in the data file stays as the fallback, for a runtime
 * without the API and for a code the runtime does not recognise. It is never
 * the first choice, which is the point.
 */

const cache = new Map<string, Intl.DisplayNames | null>();

function namesFor(locale: string): Intl.DisplayNames | null {
  const existing = cache.get(locale);
  if (existing !== undefined) return existing;

  let display: Intl.DisplayNames | null = null;
  try {
    display = new Intl.DisplayNames([locale], { type: "currency" });
  } catch {
    // A runtime without the API, or without data for this locale.
    display = null;
  }
  cache.set(locale, display);
  return display;
}

/**
 * @param locale BCP 47 tag — `pt-BR`, not the `/pt-br` URL prefix.
 * @param code ISO 4217, uppercase.
 * @param fallback The English name from the data file.
 */
export function currencyName(locale: string, code: string, fallback: string): string {
  const display = namesFor(locale);
  if (!display) return fallback;
  try {
    /*
     * `of` returns the code itself when it has no name for it, which would
     * render "JPY — JPY". The fallback is more use than that.
     */
    const name = display.of(code);
    return name && name !== code ? name : fallback;
  } catch {
    return fallback;
  }
}
