import { DEFAULT_LOCALE, getLocaleMeta, localeRegistry } from "./config";
import type { Locale } from "./types";

/**
 * Turning a path into a locale, and a locale into a path.
 *
 * Everything here is a pure string function so it can be tested exhaustively —
 * which matters more than usual, because these are the functions a hostile URL
 * reaches first. `/../../etc/passwd` and `/EN/` and `/pt-br` without its slash
 * all arrive here before anything else looks at them.
 *
 * Three rules hold throughout:
 *
 *   1. **A prefix is a locale only if the registry says so.** Never infer one
 *      from "the first segment looks like a language code" — that turns every
 *      two-letter typo into a dictionary import path.
 *   2. **The trailing slash is not optional.** The site's canonical policy is
 *      one URL per page, with a trailing slash, and a helper that sometimes
 *      omits it manufactures a redirect inside an hreflang cluster.
 *   3. **English has no prefix.** `/en/…` is not a valid URL on this site and
 *      these functions never produce one.
 */

/** Longest prefix first, so `/zh-hans` is not shadowed by a shorter match. */
const PREFIXED = [...localeRegistry]
  .filter((meta) => meta.prefix !== "")
  .sort((a, b) => b.prefix.length - a.prefix.length);

/** Ensures exactly one leading and one trailing slash. */
function normalise(path: string): string {
  const withLeading = path.startsWith("/") ? path : `/${path}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

/**
 * The locale a pathname belongs to.
 *
 * Returns the default locale for anything unprefixed, which is correct: an
 * English URL carries no marker. It does not validate that the rest of the
 * path exists — that is the router's job, and conflating the two is how an
 * unknown slug ends up rendering a 200 in a valid locale.
 */
export function getLocaleFromPath(pathname: string): Locale {
  const path = normalise(pathname);
  for (const meta of PREFIXED) {
    if (path === `${meta.prefix}/` || path.startsWith(`${meta.prefix}/`)) return meta.locale;
  }
  return DEFAULT_LOCALE;
}

/**
 * The canonical English path a localized URL corresponds to.
 *
 * `/pt-br/devex-rates/` becomes `/devex-rates/`, and `/pt-br/` becomes `/`.
 * This is the key every dictionary and route lookup uses, so a future slug
 * change cannot orphan a translation.
 */
export function stripLocalePrefix(pathname: string): string {
  const path = normalise(pathname);
  for (const meta of PREFIXED) {
    if (path === `${meta.prefix}/`) return "/";
    if (path.startsWith(`${meta.prefix}/`)) return path.slice(meta.prefix.length);
  }
  return path;
}

/**
 * The URL for a canonical route in a given locale.
 *
 * `localizedPath("es", "/devex-rates/")` is `/es/devex-rates/`.
 * `localizedPath("en", "/devex-rates/")` is `/devex-rates/` — never `/en/…`.
 *
 * Accepts a path that already carries a prefix and re-points it, so callers do
 * not have to strip first and risk forgetting.
 */
export function localizedPath(locale: Locale, canonicalRoute: string): string {
  const canonical = stripLocalePrefix(normalise(canonicalRoute));
  const { prefix } = getLocaleMeta(locale);
  if (prefix === "") return canonical;
  return canonical === "/" ? `${prefix}/` : `${prefix}${canonical}`;
}

/**
 * Where the language selector should send someone.
 *
 * Keeps the query string, because a shared calculation lives in it and losing
 * it on a language switch would silently throw away the reader's work. The
 * hash is kept only when the caller confirms the target route has that anchor
 * — a fragment that does not exist on the destination scrolls nowhere and
 * looks broken.
 */
export function switchLocalePath(
  targetLocale: Locale,
  pathname: string,
  search = "",
  hash = "",
  hashExistsOnTarget = false,
): string {
  const canonical = stripLocalePrefix(pathname);
  const path = localizedPath(targetLocale, canonical);
  const query = search && search !== "?" ? (search.startsWith("?") ? search : `?${search}`) : "";
  const fragment =
    hashExistsOnTarget && hash && hash !== "#" ? (hash.startsWith("#") ? hash : `#${hash}`) : "";
  return `${path}${query}${fragment}`;
}

/**
 * Reads a locale from a raw route segment, for the localized route handler.
 *
 * **The segment is the prefix, not the locale tag.** Portuguese is `pt-BR`
 * as a BCP 47 tag and `/pt-br/` as a URL, and treating the two as the same
 * string produces two addresses for every Portuguese page. That is not
 * hypothetical: the route parameters were generated from the tag, so the
 * build prerendered `/pt-BR/…` while every link on those pages pointed at
 * `/pt-br/…`.
 *
 * Case-sensitive on purpose. `/PT-BR/` is not a URL this site serves, and
 * quietly accepting it would create that second address again — the
 * duplicate-content problem the trailing-slash policy exists to prevent.
 * Returns null rather than a default so the caller can answer 404.
 */
export function parseLocaleSegment(segment: string): Locale | null {
  for (const meta of PREFIXED) {
    if (meta.prefix === `/${segment}`) return meta.locale;
  }
  return null;
}

/** The URL segment a locale is served under, with no slashes. */
export function localeSegment(locale: Locale): string {
  return getLocaleMeta(locale).prefix.replace(/^\//, "");
}
