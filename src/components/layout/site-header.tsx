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
    <header className="site-header sticky top-0 z-30 border-b border-(--color-border) bg-(--color-surface)/95 backdrop-blur supports-[backdrop-filter]:bg-(--color-surface)/80">
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
          {/*
            Stop the header sticking while this block is open.

            With scripting off there is no menu to open, so the whole grouped
            navigation renders inline — twenty-one links, around eleven hundred
            pixels of it. Inside a `position: sticky` header on a phone that is
            not a tall header, it is a header taller than the screen, pinned
            over the page for the entire scroll: the reader can see the site's
            navigation and nothing else, forever.

            A `<style>` inside `<noscript>` is the one way CSS gets to know
            whether scripting is on. The rule applies only when this block
            renders, and only where the block itself applies, so a reader with
            JavaScript keeps the sticky header exactly as it was.

            Found by a no-JavaScript end-to-end test that had been passing for
            the wrong reason — it returned early whenever storage was unbound,
            which is every environment it had ever run in.
          */}
          <style>{"@media (max-width: 1023.98px){.site-header{position:static}}"}</style>
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
