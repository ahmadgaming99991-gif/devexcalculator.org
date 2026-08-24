import { getTranslator, interpolate, type Translate } from "@/i18n/get-dictionary";
import type { DictionaryNamespace, Locale } from "@/i18n/types";

/**
 * The handful of strings one Client Component renders, and nothing else.
 *
 * A dictionary reached from the browser is a dictionary in the browser bundle
 * — every namespace it touches, in every language, on every page that loads
 * that component. So a Client Component is handed its own words as a plain
 * object by the server component that renders it.
 *
 * The keys stay the dictionary's own dotted keys rather than being renamed on
 * the way across. Two reasons: a string is greppable from either side, so
 * "where does this sentence come from" has one answer; and the list of keys is
 * exported by the component itself, so the server cannot pass a set that has
 * drifted from what the component reads.
 */
export type LocaleWords = Readonly<Record<string, string>>;

/**
 * Copies exactly the named keys out of a dictionary.
 *
 * Throws through `t` for a key the dictionary does not have, at render time on
 * the server, where a build is watching.
 */
export function pickWords(t: Translate, keys: readonly string[]): LocaleWords {
  const words: Record<string, string> = {};
  for (const key of keys) words[key] = t(key);
  return words;
}

/**
 * The same, working out for itself which namespaces to load.
 *
 * Preferred over handing it the page's translator. The keys name their own
 * namespaces, so a component's words cannot depend on what the page around it
 * happened to need — which they did, and the symptom was a prerender error
 * naming a key the page never mentions.
 */
export async function loadWords(
  locale: Locale,
  keys: readonly string[],
): Promise<LocaleWords> {
  const namespaces = [
    ...new Set(keys.map((key) => key.slice(0, key.indexOf(".")))),
  ] as DictionaryNamespace[];
  return pickWords(await getTranslator(locale, namespaces), keys);
}

/**
 * The same `t(key, values)` shape, reading from the copied words.
 *
 * Same shape on purpose: a component that moves from the server to the browser
 * — or back — should not have to have every one of its sentences rewritten,
 * and a reviewer should not have to work out which kind of component they are
 * reading before they can tell what a line renders.
 *
 * A missing key throws here as well. It cannot happen when the keys came from
 * the component's own exported list, which is the point of that list; if it
 * ever does, an exception naming the key is a bug report, and a silent blank
 * where a sentence should be is not.
 */
export function translatorFor(words: LocaleWords): Translate {
  return (key, values) => {
    const value = words[key];
    if (value === undefined) {
      throw new Error(`"${key}" was not among the words handed to this component.`);
    }
    return values === undefined ? value : interpolate(value, values);
  };
}
