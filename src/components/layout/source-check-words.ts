import { getLocaleMeta } from "@/i18n/config";
import type { Translate } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/types";
import type { SourceCheckWords } from "./rate-source-check";

/**
 * The source-check strings, gathered once for the components that need them.
 *
 * `RateSourceCheck` and `RateSourceCheckBadge` are Client Components, so their
 * words have to arrive as props — a dictionary reached from inside them would
 * be a dictionary in the browser bundle, in every language, on every page.
 * Three server components hand them down (the footer, the footer's status
 * line, and `/sources/`), and this exists so that "which strings" is answered
 * once rather than three times. A fourth caller that forgot one would render a
 * badge missing a word, which is exactly the kind of gap nobody notices.
 *
 * Kept out of `rate-source-check.tsx` because that file is `"use client"`, and
 * a builder living there would be shipped to the browser for no reason.
 */
export function sourceCheckWords(locale: Locale, t: Translate): SourceCheckWords {
  return {
    changedHeading: t("common.sourceCheck.changedHeading"),
    changedBody: t("common.sourceCheck.changedBody"),
    unreadableBody: t("common.sourceCheck.unreadableBody"),
    unchanged: t("common.sourceCheck.unchanged"),
    unchangedLinkLabel: t("common.sourceCheck.unchangedLinkLabel"),
    sourceUpdatedAt: t("common.sourceCheck.sourceUpdatedAt"),
    badgeChanged: t("common.sourceCheck.badgeChanged"),
    badgeUnreachable: t("common.sourceCheck.badgeUnreachable"),
    badgeChecked: t("common.sourceCheck.badgeChecked"),
    relativeDay: {
      today: t("common.relativeDay.today"),
      yesterday: t("common.relativeDay.yesterday"),
      daysAgo: t("common.relativeDay.daysAgo"),
    },
    dateLocale: getLocaleMeta(locale).bcp47,
  };
}
