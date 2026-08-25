import { interpolate } from "@/i18n/interpolate";
import type { Translate } from "@/i18n/get-dictionary";

/*
 * A type-only import, and it has to stay one.
 *
 * `get-dictionary` names every locale file. Importing a *value* from it
 * here would put all seven languages of every namespace in the browser
 * bundle, because every Client Component imports this module. A type is
 * erased; `getTranslator` is not, and moving it out is why
 * `server-words.ts` exists.
 */

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
