/**
 * The words a 404 renders.
 *
 * Its own module because the 404 body is a Client Component — it reads the
 * path to work out which language the reader was asking for, which is
 * something `not-found.tsx` is never told — and a Server Component cannot
 * read a value exported from a client module.
 *
 * Written out rather than derived from the component: the popular-page links
 * are chosen by a list the component builds, so a scan of the source finds
 * the keys, but the whole point of the catalogue is that the *server* copies
 * these for every language, and a key it forgets is a blank line in the one
 * language nobody tested.
 */
export const NOT_FOUND_WORDS: readonly string[] = [
  "errors.notFound.body",
  "errors.notFound.currentRates",
  "errors.notFound.eyebrow",
  "errors.notFound.goToCalculator",
  "errors.notFound.popular.conversions",
  "errors.notFound.popular.guides",
  "errors.notFound.popular.requirements",
  "errors.notFound.popular.robuxToUsd",
  "errors.notFound.popular.usdToRobux",
  "errors.notFound.popularHeading",
  "errors.notFound.title",
];
