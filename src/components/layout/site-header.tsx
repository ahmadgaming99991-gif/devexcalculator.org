import Link from "next/link";
import { navigationGroups, primaryDestination } from "@/config/navigation";
import { features } from "@/config/site";
import { Container } from "@/components/ui";
import { Logo, Wordmark } from "./logo";
import { DesktopNavigation } from "./desktop-navigation";
import { MobileNavigation } from "./mobile-navigation";
import { ThemeToggle } from "./theme-toggle";

/**
 * Site header.
 *
 * A Server Component. The desktop menus are native disclosures rendered on the
 * server, so every destination is crawlable and the navigation opens with
 * JavaScript disabled; only the mobile drawer, the theme toggle and a small
 * behavioural enhancement for the menus hydrate.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-(--color-border) bg-(--color-surface)/95 backdrop-blur supports-[backdrop-filter]:bg-(--color-surface)/80">
      <Container width="wide">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* `group` so the mark can respond to a hover anywhere on the lockup,
              rather than only when the pointer is over the mark itself. */}
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2.5 rounded-(--radius-control) py-1"
          >
            <Logo interactive className="h-10" />
            <Wordmark className="text-base sm:text-lg" />
            <span className="sr-only">— home</span>
          </Link>

          <DesktopNavigation />

          <div className="flex items-center gap-2">
            {features.darkMode ? <ThemeToggle /> : null}
            <MobileNavigation primary={primaryDestination} groups={navigationGroups} />
          </div>
        </div>

        {/*
          Without JavaScript the mobile menu button cannot open, and the
          desktop navigation is hidden below the `lg` breakpoint — which left
          a small-screen no-script reader with no header navigation at all.
          This renders only when scripting is off, and only below `lg`, so it
          never duplicates the navigation for anyone else.

          Grouped rather than flat: twenty-one links in one wrapping row would
          push the page's own content most of a screen down.
        */}
        <noscript>
          <div className="border-t border-(--color-border) py-2 lg:hidden">
            <Link
              href={primaryDestination.href}
              className="inline-flex min-h-[44px] items-center text-sm font-semibold text-(--color-primary) underline underline-offset-2"
            >
              {primaryDestination.label}
            </Link>
            {navigationGroups.map((group) => (
              <nav key={group.id} aria-label={group.heading} className="mt-1">
                <h2 className="text-xs font-semibold tracking-wide text-(--color-text-muted) uppercase">
                  {group.heading}
                </h2>
                <ul className="flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
                  {group.items.map((entry) => (
                    <li key={entry.href}>
                      <Link
                        href={entry.href}
                        className="inline-flex min-h-[44px] items-center text-sm font-medium text-(--color-primary) underline underline-offset-2"
                      >
                        {entry.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </noscript>
      </Container>
    </header>
  );
}
