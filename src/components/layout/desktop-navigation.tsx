import Link from "next/link";
import { navigationGroups, primaryDestination } from "@/config/navigation";
import { cx } from "@/components/ui";
import { NavDisclosures } from "./nav-disclosures";

/**
 * The desktop header menus.
 *
 * A Server Component. Every destination is a real `<a href>` in the delivered
 * HTML, open panel or not, so the crawl surface does not depend on anything
 * running in the browser.
 *
 * Built on `<details>` rather than on a button and a state hook. The native
 * element is a disclosure already: it opens on click and on Enter or Space,
 * exposes its expanded state to assistive technology, and — the part that
 * decided it — keeps working with JavaScript disabled, which no hand-built
 * dropdown does. `NavDisclosures` adds Escape, outside-click and mutual
 * exclusion on top; none of those are needed for the menu to open.
 *
 * Deliberately not an ARIA menu. `role="menu"` commits to arrow-key roving
 * focus and to treating these as commands rather than links, and a partial
 * implementation of that pattern is worse for a screen reader than the plain
 * disclosure-of-links this actually is.
 */
export function DesktopNavigation() {
  return (
    <NavDisclosures className="hidden lg:block">
      <nav aria-label="Main">
        <ul className="flex list-none items-center gap-1 p-0">
          {/* The calculator, never behind a disclosure. */}
          <li>
            <Link
              href={primaryDestination.href}
              className="inline-flex min-h-[44px] items-center rounded-(--radius-control) px-3 text-sm font-medium text-(--color-text-muted) hover:bg-(--color-surface-subtle) hover:text-(--color-text)"
            >
              {primaryDestination.label}
            </Link>
          </li>

          {navigationGroups.map((group, index) => {
            // The last panel is anchored to its right edge. A 288px panel
            // hung from the left of the final trigger runs off a 1280px page.
            const alignEnd = index === navigationGroups.length - 1;

            return (
              <li key={group.id} className="relative">
                <details name="site-navigation" data-nav-menu className="group/menu">
                  <summary
                    className={cx(
                      "inline-flex min-h-[44px] cursor-pointer list-none items-center gap-1 rounded-(--radius-control) px-3",
                      "text-sm font-medium text-(--color-text-muted)",
                      "hover:bg-(--color-surface-subtle) hover:text-(--color-text)",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-focus)",
                      // The default disclosure triangle is replaced by the
                      // chevron below, which can be turned with the panel.
                      "[&::-webkit-details-marker]:hidden",
                      "group-open/menu:bg-(--color-surface-subtle) group-open/menu:text-(--color-text)",
                    )}
                  >
                    {group.heading}
                    <svg
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      focusable="false"
                      className="size-4 motion-safe:transition-transform motion-safe:duration-200 group-open/menu:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m5 8 5 5 5-5" />
                    </svg>
                  </summary>

                  {/*
                    Absolutely positioned, so opening a menu never moves the
                    page under the reader's pointer.
                  */}
                  <div
                    className={cx(
                      "absolute top-full z-50 mt-1 w-72 rounded-(--radius-card) border border-(--color-border)",
                      "bg-(--color-surface) p-2 shadow-(--shadow-raised)",
                      alignEnd ? "right-0" : "left-0",
                    )}
                  >
                    <ul className="flex list-none flex-col gap-0.5 p-0">
                      {group.items.map((entry) => (
                        <li key={entry.href}>
                          <Link
                            href={entry.href}
                            className="flex flex-col rounded-(--radius-control) px-3 py-2 hover:bg-(--color-surface-subtle)"
                          >
                            <span className="text-sm font-semibold text-(--color-text)">
                              {entry.label}
                            </span>
                            {/*
                              The description is the point of grouping. A row
                              of bare labels tells a reader where they can go;
                              this tells them why they would.
                            */}
                            <span className="text-xs text-(--color-text-muted)">
                              {entry.description}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </nav>
    </NavDisclosures>
  );
}
