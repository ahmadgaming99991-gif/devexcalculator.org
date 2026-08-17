import Link from "next/link";
import type { ReactNode } from "react";
import type { FaqEntry, RouteRecord, SectionRef } from "@/types/content";
import { getRoute } from "@/lib/content/route-registry";
import { getSources, rateRegistry, registryFreshness } from "@/lib/calculations/rate-registry";
import { formatDate } from "@/lib/calculations/format";
import { Badge, Callout, Card, Disclosure, InlineLink, SourceLink, cx } from "@/components/ui";

/**
 * Reusable content blocks.
 *
 * These carry the site's trust obligations — sourcing, verification dates,
 * estimate disclaimers — so those cannot be forgotten on an individual page.
 * All are Server Components and render fully without JavaScript.
 */

// ---------------------------------------------------------------------------
// Direct answer
// ---------------------------------------------------------------------------

/**
 * The direct answer block placed near the top of every substantial page.
 * Answering immediately is what makes a page useful to a reader in a hurry and
 * quotable to an answer engine; both want the same thing.
 */
export function QuickAnswer({
  children,
  jumpTo,
  jumpLabel = "See the detail",
}: {
  children: ReactNode;
  jumpTo?: string;
  jumpLabel?: string;
}) {
  return (
    <Card tone="subtle" className="border-l-4 border-l-(--color-primary)">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
        In short
      </h2>
      <p className="mt-2 text-base leading-relaxed text-(--color-text) sm:text-lg">
        {children}
      </p>
      {jumpTo ? (
        <p className="mt-3">
          <a
            href={`#${jumpTo}`}
            className="text-sm font-semibold text-(--color-primary) underline underline-offset-2"
          >
            {jumpLabel}
          </a>
        </p>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Trust badges
// ---------------------------------------------------------------------------

/**
 * Shows when the rate data was last checked against official documentation,
 * and escalates its tone once the review cadence has lapsed. A stale badge is
 * more useful than a confident one that is quietly out of date.
 */
export function LastVerifiedBadge({ className }: { className?: string }) {
  const freshness = registryFreshness();
  const tone =
    freshness.state === "critical" ? "warning" : freshness.state === "review-due" ? "info" : "success";

  return (
    <Badge tone={tone} className={className}>
      <svg
        className="size-3.5"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="6.25" />
        <path d="M8 4.5V8l2.25 1.5" strokeLinecap="round" />
      </svg>
      Rates verified {formatDate(rateRegistry.lastVerifiedAt)}
    </Badge>
  );
}

/** Compact strip of trust signals shown directly under the H1 on tool pages. */
export function TrustStrip() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <LastVerifiedBadge />
      <Badge tone="info">Official Roblox sources cited</Badge>
      <Badge tone="neutral">Estimates only</Badge>
    </div>
  );
}

/**
 * Citations for the facts on a page. Every rate-sensitive page renders this,
 * and the publish-queue validator refuses to ship one that does not.
 */
export function SourceNote({
  sourceIds,
  className,
  heading = "Sources",
}: {
  sourceIds: readonly string[];
  className?: string;
  heading?: string;
}) {
  if (sourceIds.length === 0) return null;
  const sources = getSources(sourceIds);

  return (
    <Card tone="subtle" className={cx("text-sm", className)}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
        {heading}
      </h2>
      <ul className="mt-2 flex flex-col gap-2">
        {sources.map((source) => (
          <li key={source.id}>
            <SourceLink href={source.url}>{source.title}</SourceLink>
            <span className="text-(--color-text-muted)">
              {" "}
              — {source.publisher}. Checked {formatDate(source.lastCheckedAt)}.
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-(--color-text-muted)">
        Rates and requirements change.{" "}
        <InlineLink href="/sources/">See every source and its review cadence</InlineLink>, or{" "}
        <InlineLink href="/corrections/">report something that is out of date</InlineLink>.
      </p>
    </Card>
  );
}

/**
 * The estimate disclaimer.
 *
 * Stated plainly rather than buried: a creator planning around a payout needs
 * to know up front that this site cannot determine eligibility or approval.
 */
export function EstimateDisclaimer({ className }: { className?: string }) {
  return (
    <Callout tone="warning" title="This is an estimate, not a decision" className={className}>
      Figures here use the rates Roblox currently documents. Roblox alone decides
      which of your Robux count as Earned Robux, which rate applies to which part
      of your balance, and whether a DevEx request is approved. Payment-provider
      fees and your own tax obligations are not included unless you add them.{" "}
      <Link href="/disclaimer/">Read the full disclaimer</Link>.
    </Callout>
  );
}

/** The Earned Robux warning shown next to any conversion result. */
export function EarnedRobuxNote({ className }: { className?: string }) {
  return (
    <Callout tone="info" title="DevEx applies to Earned Robux only" className={className}>
      Robux you bought, received as a gift, or acquired outside creator earnings
      are not Earned Robux and cannot be cashed out. Retail Robux pricing is a
      separate thing entirely and is never mixed into these figures.{" "}
      <Link href="/earned-robux/">What counts as Earned Robux</Link>.
    </Callout>
  );
}

export function MethodologyNote({ className }: { className?: string }) {
  return (
    <p className={cx("text-sm text-(--color-text-muted)", className)}>
      Calculations use exact decimal arithmetic and round only at the point of
      display; required-Robux figures always round up.{" "}
      <InlineLink href="/methodology/">Read the full methodology</InlineLink>.
    </p>
  );
}

export function LimitationsNote({
  items,
  className,
}: {
  items: readonly string[];
  className?: string;
}) {
  return (
    <Card tone="subtle" className={className}>
      <h2 className="text-sm font-semibold text-(--color-text)">What this does not cover</h2>
      <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-(--color-text-muted)">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Definitions
// ---------------------------------------------------------------------------

export function DefinitionBlock({
  term,
  children,
  className,
}: {
  term: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4",
        className,
      )}
    >
      <dl>
        <dt className="text-sm font-semibold text-(--color-text)">{term}</dt>
        <dd className="mt-1 text-sm leading-relaxed text-(--color-text-muted)">{children}</dd>
      </dl>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FAQs
// ---------------------------------------------------------------------------

/**
 * Visible FAQs.
 *
 * Built on native `<details>`, so the answers stay in the DOM, remain
 * crawlable, and work without JavaScript. No FAQPage JSON-LD is emitted:
 * Google removed FAQ rich-result support for most sites, so adding the markup
 * would be schema for its own sake rather than for a reader.
 */
export function FAQAccordion({
  faqs,
  heading = "Questions creators ask",
  id = "faqs",
}: {
  faqs: readonly FaqEntry[];
  heading?: string;
  id?: string;
}) {
  if (faqs.length === 0) return null;

  return (
    <section id={id} className="scroll-mt-24" aria-labelledby={`${id}-heading`}>
      <h2
        id={`${id}-heading`}
        className="text-xl font-semibold tracking-tight text-(--color-text) sm:text-2xl"
      >
        {heading}
      </h2>
      <div className="mt-4 flex flex-col gap-2">
        {faqs.map((faq, index) => (
          <Disclosure key={faq.question} summary={faq.question} defaultOpen={index === 0}>
            <p className="leading-relaxed">{faq.answer}</p>
            {faq.sourceIds && faq.sourceIds.length > 0 ? (
              <p className="mt-2 text-xs">
                Source:{" "}
                {getSources(faq.sourceIds).map((source, i) => (
                  <span key={source.id}>
                    {i > 0 ? ", " : ""}
                    <SourceLink href={source.url}>{source.title}</SourceLink>
                  </span>
                ))}
              </p>
            ) : null}
          </Disclosure>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Navigation aids
// ---------------------------------------------------------------------------

export function TableOfContents({ sections }: { sections: readonly SectionRef[] }) {
  if (sections.length < 3) return null;

  return (
    <nav aria-labelledby="toc-heading" className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4">
      <h2 id="toc-heading" className="text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
        On this page
      </h2>
      <ol className="mt-2 flex flex-col gap-1.5 text-sm">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="text-(--color-primary) hover:underline"
            >
              {section.heading}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Contextual links to related pages.
 *
 * Reads from the route's own `internalLinks`, filtered by relationship, so the
 * rendered links and the internal-link graph the validator checks are the same
 * data and cannot drift apart.
 */
export function RelatedLinks({
  record,
  relationships,
  heading,
  id,
}: {
  record: RouteRecord;
  relationships: readonly string[];
  heading: string;
  id: string;
}) {
  const links = record.internalLinks
    .filter((link) => relationships.includes(link.relationship))
    .map((link) => ({ link, target: getRoute(link.route) }))
    .filter((entry): entry is { link: (typeof record.internalLinks)[number]; target: RouteRecord } =>
      entry.target !== null,
    );

  if (links.length === 0) return null;

  return (
    <section id={id} className="scroll-mt-24" aria-labelledby={`${id}-heading`}>
      <h2
        id={`${id}-heading`}
        className="text-xl font-semibold tracking-tight text-(--color-text) sm:text-2xl"
      >
        {heading}
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {links.map(({ link, target }) => (
          <li key={link.route}>
            <Link
              href={link.route}
              className="flex h-full flex-col rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4 hover:border-(--color-primary) hover:bg-(--color-surface-subtle)"
            >
              <span className="font-semibold text-(--color-text)">{target.navLabel}</span>
              <span className="mt-1 text-sm text-(--color-text-muted)">{link.anchor}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Page header: H1, one-line purpose, and trust signals. */
export function PageHeader({
  record,
  intro,
  children,
}: {
  record: RouteRecord;
  intro: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight text-(--color-text) sm:text-3xl lg:text-4xl">
        {record.h1}
      </h1>
      <p className="mt-3 max-w-2xl text-base text-(--color-text-muted) sm:text-lg">{intro}</p>
      {record.rateSensitive ? (
        <div className="mt-4">
          <TrustStrip />
        </div>
      ) : null}
      {children}
    </div>
  );
}
