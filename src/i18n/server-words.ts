import { getTranslator, type Translate } from "@/i18n/get-dictionary";
import { LOCALE_KEY, type LocaleWords } from "@/i18n/client-words";
import type { DictionaryNamespace, Locale } from "@/i18n/types";

/**
 * Copying a Client Component's words out of a dictionary, on the server.
 *
 * Separate from `client-words` because reaching a dictionary at all pulls in
 * the loader, and the loader names every locale file. A Client Component that
 * imported this would ship all seven languages to the browser — which is
 * exactly what happened while these two lived in one module.
 */

/**
 * Copies exactly the named keys out of a dictionary.
 *
 * Throws through `t` for a key the dictionary does not have, at render time
 * on the server, where a build is watching.
 */
export function pickWords(t: Translate, keys: readonly string[]): LocaleWords {
  const words: Record<string, string> = { [LOCALE_KEY]: t.locale };
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
