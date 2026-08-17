import Link from "next/link";
import { breadcrumbTrail, getRoute } from "@/lib/content/route-registry";

/**
 * Visible breadcrumbs matching the canonical hierarchy.
 *
 * The trail is derived from the same `parent` field the BreadcrumbList JSON-LD
 * uses, so the visible trail and the structured data cannot disagree. The
 * current page is the last item and is not a link, marked `aria-current`.
 */
export function Breadcrumbs({ route }: { route: string }) {
  const record = getRoute(route);
  const trail = breadcrumbTrail(route);
  if (!record || trail.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-(--color-text-muted)">
        {trail.map((ancestor) => (
          <li key={ancestor.route} className="flex items-center gap-1.5">
            <Link
              href={ancestor.route}
              className="hover:text-(--color-primary) hover:underline"
            >
              {ancestor.route === "/" ? "Home" : ancestor.navLabel}
            </Link>
            <span aria-hidden="true" className="text-(--color-border-strong)">
              /
            </span>
          </li>
        ))}
        <li>
          <span aria-current="page" className="font-medium text-(--color-text)">
            {record.navLabel}
          </span>
        </li>
      </ol>
    </nav>
  );
}
