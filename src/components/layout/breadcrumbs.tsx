import Link from "next/link";
import { breadcrumbTrail, getRoute } from "@/lib/content/route-registry";
import { getTranslator } from "@/i18n/get-dictionary";
import { routeLabels } from "@/i18n/localized-route";
import { localizedPath } from "@/i18n/locale-path";
import type { Locale } from "@/i18n/types";

/**
 * Visible breadcrumbs matching the canonical hierarchy.
 *
 * The trail is derived from the same `parent` field the BreadcrumbList JSON-LD
 * uses, so the visible trail and the structured data cannot disagree. The
 * current page is the last item and is not a link, marked `aria-current`.
 */
export async function Breadcrumbs({
  locale,
  route,
}: {
  readonly locale: Locale;
  route: string;
}) {
  const record = getRoute(route);
  const trail = breadcrumbTrail(route);
  if (!record || trail.length === 0) return null;

  /*
   * The labels come from the dictionary, and "Home" from the same key the
   * BreadcrumbList structured data uses — the visible trail and the markup
   * describing it saying different words is worse than either saying nothing.
   */
  const t = await getTranslator(locale, ["navigation", "schema"]);
  const navLabel = await routeLabels(locale);
  const label = (target: string) =>
    target === "/" ? t("schema.labels.breadcrumbHome") : navLabel(target);

  return (
    <nav aria-label={t("navigation.breadcrumb")} className="mb-4">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-(--color-text-muted)">
        {trail.map((ancestor) => (
          <li key={ancestor.route} className="flex items-center gap-1.5">
            <Link
              href={localizedPath(locale, ancestor.route)}
              className="hover:text-(--color-primary) hover:underline"
            >
              {label(ancestor.route)}
            </Link>
            <span aria-hidden="true" className="text-(--color-border-strong)">
              /
            </span>
          </li>
        ))}
        <li>
          <span aria-current="page" className="font-medium text-(--color-text)">
            {label(record.route)}
          </span>
        </li>
      </ol>
    </nav>
  );
}
