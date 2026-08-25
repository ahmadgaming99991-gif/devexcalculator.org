import { getTranslator } from "@/i18n/get-dictionary";
import { renderableLocales } from "@/i18n/visibility";
import { pickWords } from "@/i18n/server-words";
import { NOT_FOUND_WORDS } from "./not-found.words";
import { LocalizedNotFound, type NotFoundCatalogue } from "./not-found";

/**
 * The 404 message, in every language this build serves.
 *
 * Shared by the two `not-found.tsx` files — the root one, which answers every
 * unmatched URL on the site, and the one inside the English group, which
 * answers a `notFound()` thrown by an English page. They render the same page
 * and neither knows the locale, so the catalogue is built once here rather
 * than assembled twice with a chance of diverging.
 */
export async function NotFoundBody() {
  const catalogue: Record<string, Record<string, string>> = {};
  for (const meta of renderableLocales()) {
    const t = await getTranslator(meta.locale, ["errors"]);
    catalogue[meta.locale] = { ...pickWords(t, NOT_FOUND_WORDS) };
  }
  return <LocalizedNotFound catalogue={catalogue as NotFoundCatalogue} />;
}
