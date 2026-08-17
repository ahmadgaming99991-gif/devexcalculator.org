import type { Metadata } from "next";
import Link from "next/link";
import { Container, ButtonLink } from "@/components/ui";

/**
 * 404 page.
 *
 * Returns a real 404 status (Next.js does this for `not-found.tsx`), stays out
 * of the index, and never redirects to the homepage — a silent redirect hides
 * the broken link from both the reader and from crawl reporting.
 */
export const metadata: Metadata = {
  title: "Page not found",
  description: "That page does not exist on DevExCalculator.org.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <Container width="prose">
      <div className="py-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-(--color-text-muted)">
          Error 404
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-(--color-text)">
          That page does not exist
        </h1>
        <p className="mt-3 text-(--color-text-muted)">
          The address may have changed, or the link that brought you here may be
          wrong. Nothing has been deleted — this site has never had a page at
          this address.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <ButtonLink href="/">Go to the DevEx calculator</ButtonLink>
          <ButtonLink href="/devex-rates/" variant="secondary">
            Current rates
          </ButtonLink>
        </div>

        <h2 className="mt-8 text-lg font-semibold text-(--color-text)">
          What people usually want
        </h2>
        <ul className="mt-3 flex flex-col gap-2 text-(--color-primary)">
          <li>
            <Link href="/robux-to-usd/" className="underline underline-offset-2">
              Convert Robux to US dollars
            </Link>
          </li>
          <li>
            <Link href="/usd-to-robux/" className="underline underline-offset-2">
              Work out the Earned Robux needed for a payout target
            </Link>
          </li>
          <li>
            <Link href="/devex-requirements/" className="underline underline-offset-2">
              Check the DevEx minimum and requirements
            </Link>
          </li>
          <li>
            <Link href="/conversions/" className="underline underline-offset-2">
              Look up a specific amount
            </Link>
          </li>
          <li>
            <Link href="/guides/" className="underline underline-offset-2">
              Browse every guide
            </Link>
          </li>
        </ul>
      </div>
    </Container>
  );
}
