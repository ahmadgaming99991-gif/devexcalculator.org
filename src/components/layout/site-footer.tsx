import Link from "next/link";
import { footerNavigation } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { rateRegistry } from "@/lib/calculations/rate-registry";
import { formatDate } from "@/lib/calculations/format";
import { Container } from "@/components/ui";
import { Logo, Wordmark } from "./logo";

export function SiteFooter() {
  const year = new Date(siteConfig.contentReviewedAt).getUTCFullYear();

  return (
    <footer className="mt-16 border-t border-(--color-border) bg-(--color-surface)">
      <Container width="wide">
        <div className="grid gap-8 py-10 text-center sm:grid-cols-2 sm:text-left lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Link
              href="/"
              className="group inline-flex items-center justify-center gap-2.5 sm:justify-start"
            >
              <Logo
                interactive
                instance="footer"
                className="size-7 motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out group-hover:motion-safe:scale-105"
              />
              <Wordmark className="text-sm" />
            </Link>
            <p className="mt-3 text-sm text-(--color-text-muted)">
              Independent DevEx payout estimates for Roblox creators, with every
              figure traced to an official source.
            </p>
          </div>

          {footerNavigation.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-(--color-text)">
                {group.heading}
              </h2>
              <ul className="mt-3 flex flex-col items-center gap-2 sm:items-start">
                {group.items.map((entry) => (
                  <li key={entry.href}>
                    <Link
                      href={entry.href}
                      className="text-sm text-(--color-text-muted) hover:text-(--color-primary) hover:underline"
                    >
                      {entry.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/*
          Trademark and affiliation notice. Required on every page, kept
          readable rather than shrunk into unreadable legal small print.
        */}
        <div className="border-t border-(--color-border) py-6">
          <p className="text-center text-sm text-balance text-(--color-text-muted) sm:text-left">
            <strong className="font-semibold text-(--color-text)">
              Not affiliated with Roblox Corporation.
            </strong>{" "}
            DevExCalculator.org is an independent tool. Roblox, Robux and Developer
            Exchange are trademarks of Roblox Corporation, used here only to
            describe the subject of these calculations. This site is not endorsed,
            sponsored or operated by Roblox Corporation, and it cannot determine
            whether any DevEx request will be approved.
          </p>

          <div className="mt-4 flex flex-col items-center gap-2 text-center text-xs text-(--color-text-muted) sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <p>
              © {year} {siteConfig.name}. Every payout figure is an estimate.
            </p>
            <p className="tabular">
              Rate data{" "}
              <Link href="/sources/" className="underline hover:text-(--color-primary)">
                verified {formatDate(rateRegistry.lastVerifiedAt)}
              </Link>{" "}
              · registry {rateRegistry.registryVersion}
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
