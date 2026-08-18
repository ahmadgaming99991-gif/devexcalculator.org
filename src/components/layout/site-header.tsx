import Link from "next/link";
import { primaryNavigation } from "@/config/navigation";
import { features } from "@/config/site";
import { Container } from "@/components/ui";
import { Logo, Wordmark } from "./logo";
import { MobileNavigation } from "./mobile-navigation";
import { ThemeToggle } from "./theme-toggle";

/**
 * Site header.
 *
 * A Server Component: the desktop navigation is plain server-rendered links so
 * it is crawlable and works with JavaScript disabled. Only the mobile
 * disclosure and the theme toggle hydrate.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-(--color-border) bg-(--color-surface)/95 backdrop-blur supports-[backdrop-filter]:bg-(--color-surface)/80">
      <Container width="wide">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 rounded-(--radius-control) py-1"
          >
            <Logo className="size-8 shrink-0" />
            <Wordmark className="text-base sm:text-lg" />
            <span className="sr-only">— home</span>
          </Link>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {primaryNavigation.map((entry) => (
                <li key={entry.href}>
                  <Link
                    href={entry.href}
                    className="inline-flex min-h-[44px] items-center rounded-(--radius-control) px-3 text-sm font-medium text-(--color-text-muted) hover:bg-(--color-surface-subtle) hover:text-(--color-text)"
                  >
                    {entry.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            {features.darkMode ? <ThemeToggle /> : null}
            <MobileNavigation items={primaryNavigation} />
          </div>
        </div>

        {/*
          Without JavaScript the mobile menu button cannot open, and the
          desktop navigation is hidden below the `md` breakpoint — which left
          a small-screen no-script reader with no header navigation at all.
          This renders only when scripting is off, and only below `md`, so it
          never duplicates the navigation for anyone else.
        */}
        <noscript>
          <nav aria-label="Site sections" className="border-t border-(--color-border) py-2 lg:hidden">
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {primaryNavigation.map((entry) => (
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
        </noscript>
      </Container>
    </header>
  );
}
