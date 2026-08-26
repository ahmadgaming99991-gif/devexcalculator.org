import { requireRoute } from "@/lib/content/route-registry";
import { getNamespace, interpolate } from "@/i18n/get-dictionary";
import { withFigures } from "@/i18n/figures";
import { getLocaleMeta } from "@/i18n/config";
import { routeKey } from "@/i18n/route-key";
import type { Locale } from "@/i18n/types";
import type { RouteRecord } from "@/types/content";

/**
 * A route's registry record with its words in one language.
 *
 * The registry holds about a third of everything a reader sees — the title,
 * the H1, the nav label, the quick answer, every section heading, every FAQ
 * pair and every internal link's anchor text, for all 36 routes. A dozen
 * components read those fields: the header, the breadcrumbs, the table of
 * contents, the FAQ accordion, the related links, the structured data.
 *
 * Translating them by threading a locale through all twelve would mean twelve
 * chances to miss one, and a missed one is invisible — an English heading
 * inside a Spanish page still renders. So the substitution happens once, here,
 * and every component keeps taking the same `RouteRecord` it always did.
 *
 * **What is not translated.** `route`, `sourceIds`, dates, schema types,
 * `parent` and the keyword-research fields stay exactly as the registry has
 * them. They are identifiers and structure; a localized route path would be a
 * different URL, and a machine-translated keyword is a term nobody searches
 * for in that language.
 *
 * **A missing key throws.** It does not leave the English behind. English
 * prose under a Spanish heading is precisely the failure this exists to
 * prevent, and it is one that renders perfectly and fails no test.
 */

interface RouteStrings {
  readonly title: string;
  readonly metaDescription: string;
  readonly h1: string;
  readonly navLabel: string;
  readonly quickAnswer: string;
  readonly ogImageAlt: string;
  readonly sections: Readonly<Record<string, string>>;
  readonly faqs: Readonly<Record<string, { question: string; answer: string }>>;
  readonly links: Readonly<Record<string, string>>;
}

/** Matches the extractor: FAQs are numbered so two cannot collide. */
function faqKey(index: number): string {
  return `q${String(index + 1).padStart(2, "0")}`;
}

/**
 * The short label each route goes by, in one language, for any route.
 *
 * The navigation dictionary holds labels only for the destinations that are
 * actually in a menu, which is most routes and not all of them — the eight
 * amount pages are linked from within the content and appear in a breadcrumb
 * trail without ever being in the header. `routes.json` covers all 36.
 *
 * Returns a lookup rather than a single label so a component with a trail of
 * four crumbs loads the namespace once.
 */
export async function routeLabels(locale: Locale): Promise<(route: string) => string> {
  const routes = await getNamespace<Record<string, RouteStrings>>(locale, "routes");
  return (route) => {
    const key = routeKey(route);
    const label = routes[key]?.navLabel;
    if (label === undefined) {
      throw new Error(`No "routes.${key}.navLabel" for ${route} in locale "${locale}".`);
    }
    return label;
  };
}

export async function localizedRoute(locale: Locale, route: string): Promise<RouteRecord> {
  const record = requireRoute(route);
  const routes = await getNamespace<Record<string, RouteStrings>>(locale, "routes");
  const key = routeKey(route);
  const strings = routes[key];
  if (!strings) {
    throw new Error(`No "routes.${key}" entry for ${route} in locale "${locale}".`);
  }

  /*
   * The route strings are read straight out of the namespace rather than
   * through `t`, so the registry figures have to be filled in here too. A
   * quick answer that resolves `{payout30000}` on the page and prints the
   * token in the `<title>` is the failure this is guarding against.
   */
  const values = withFigures(getLocaleMeta(locale).bcp47);
  const fill = (value: string): string => interpolate(value, values);

  const need = (value: string | undefined, what: string): string => {
    if (value === undefined) {
      throw new Error(`No "routes.${key}.${what}" for ${route} in locale "${locale}".`);
    }
    return fill(value);
  };

  return {
    ...record,
    title: fill(strings.title),
    metaDescription: fill(strings.metaDescription),
    h1: fill(strings.h1),
    navLabel: fill(strings.navLabel),
    quickAnswer: fill(strings.quickAnswer),
    ogImageAlt: fill(strings.ogImageAlt),
    sections: record.sections.map((section) => ({
      ...section,
      heading: need(strings.sections[section.id], `sections.${section.id}`),
    })),
    faqs: record.faqs.map((faq, index) => {
      const translated = strings.faqs[faqKey(index)];
      if (!translated) {
        throw new Error(
          `No "routes.${key}.faqs.${faqKey(index)}" for ${route} in locale "${locale}".`,
        );
      }
      return { ...faq, question: fill(translated.question), answer: fill(translated.answer) };
    }),
    internalLinks: record.internalLinks.map((link) => ({
      ...link,
      anchor: need(strings.links[routeKey(link.route)], `links.${routeKey(link.route)}`),
    })),
  };
}
