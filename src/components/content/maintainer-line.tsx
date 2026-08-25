import Link from "next/link";
import type { Translate } from "@/i18n/get-dictionary";
import { rich } from "@/i18n/rich";
import { localizedPath } from "@/i18n/locale-path";
import type { Locale } from "@/i18n/types";
import { AHMAD_RAZA, findPerson, personRoute } from "@/lib/content/authors";
import { rateRegistry } from "@/lib/calculations/rate-registry";
import { formatDate } from "@/lib/calculations/format";

/**
 * The byline: who maintains this page, who reviewed it, and when its figures
 * were last checked.
 *
 * Every segment after the first is conditional, and each condition is the
 * whole point:
 *
 *   **The reviewer segment renders only on a page that carries both
 *   `reviewedBy` and `reviewedAt`.** There is no default and no fallback. A
 *   reviewer's name under a page nobody reviewed is a fabricated trust signal —
 *   the exact thing an E-E-A-T byline is supposed to be evidence against — and
 *   it is worse than showing no reviewer at all. A slug that matches no known
 *   person renders nothing rather than the raw slug.
 *
 *   **The verification date renders only where the page shows a rate.** On a
 *   page with no figure on it, "rates verified" is a date attached to nothing,
 *   which invites a reader to believe the page itself was checked that day.
 *
 * The date comes from the rate registry, never from page copy. That is the
 * single source of truth every "verified" date on this site derives from.
 *
 * Nothing renders this today — the page header carries the byline instead. It
 * is kept because the separation it draws between "maintained" and "reviewed"
 * is the part that matters and would have to be rebuilt; it takes a translator
 * and a locale like any other component so that using it again is wiring
 * rather than a second extraction pass.
 */
export function MaintainerLine({
  locale,
  t,
  /** From the route registry. Both required together, or neither. */
  reviewedBy,
  reviewedAt,
  /** Whether this page displays a rate. Registry `rateSensitive`. */
  showsRate,
  className,
}: {
  readonly locale: Locale;
  readonly t: Translate;
  reviewedBy?: string;
  reviewedAt?: string;
  showsRate: boolean;
  className?: string;
}) {
  // Both, or neither. A reviewer with no date is a claim with nothing behind
  // it; a date with no reviewer names nobody.
  const reviewer = reviewedBy && reviewedAt ? findPerson(reviewedBy) : null;

  return (
    <p
      className={[
        "text-sm text-(--color-text-muted)",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {rich(t("common.byline.maintainedBy"), {
        maintainer: (
          <Link
            href={localizedPath(locale, personRoute(AHMAD_RAZA))}
            className="font-medium text-(--color-primary) underline underline-offset-2"
            rel="author"
          >
            {AHMAD_RAZA.name}
          </Link>
        ),
      })}
      {reviewer ? (
        <>
          {" · "}
          {rich(t("common.byline.reviewedBy"), {
            reviewer: (
              <Link
                href={localizedPath(locale, personRoute(reviewer))}
                className="font-medium text-(--color-primary) underline underline-offset-2"
              >
                {reviewer.name}
              </Link>
            ),
          })}
        </>
      ) : null}
      {showsRate ? (
        <>
          {" · "}
          {t("common.byline.ratesVerified", {
            date: formatDate(t.locale, rateRegistry.lastVerifiedAt),
          })}
        </>
      ) : null}
      {" · "}
      <Link
        href={localizedPath(locale, "/methodology/")}
        className="text-(--color-primary) underline underline-offset-2"
      >
        {t("common.byline.methodology")}
      </Link>
    </p>
  );
}
