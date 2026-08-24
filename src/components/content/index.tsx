import Link from "next/link";
import type { ReactNode } from "react";
import type { FaqEntry, RouteRecord, SectionRef } from "@/types/content";
import { getRoute } from "@/lib/content/route-registry";
import { getSources, rateRegistry, registryFreshness } from "@/lib/calculations/rate-registry";
import { formatDate } from "@/lib/calculations/format";
import { Badge, Callout, Card, Disclosure, InlineLink, SourceLink, cx } from "@/components/ui";
import { getTranslator } from "@/i18n/get-dictionary";
import { routeLabels } from "@/i18n/localized-route";
import { getLocaleMeta } from "@/i18n/config";
import { localizedPath } from "@/i18n/locale-path";
import { rich } from "@/i18n/rich";
import type { Locale } from "@/i18n/types";

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
export async function QuickAnswer({
  locale,
  children,
  jumpTo,
  jumpLabel,
}: {
  readonly locale: Locale;
  children: ReactNode;
  jumpTo?: string;
  jumpLabel?: string;
}) {
  const t = await getTranslator(locale, ["common"]);
  const label = jumpLabel ?? t("common.sections.jumpLabel");
  return (
    <Card tone="subtle" className="border-l-4 border-l-(--color-primary)">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
        {t("common.sections.inShort")}
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
            {label}
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
export async function LastVerifiedBadge({
  locale,
  className,
}: {
  readonly locale: Locale;
  className?: string;
}) {
  const t = await getTranslator(locale, ["common"]);
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
      {t("common.badges.ratesVerified", {
        lastVerifiedAt: formatDate(
          rateRegistry.lastVerifiedAt,
          getLocaleMeta(locale).bcp47,
        ),
      })}
    </Badge>
  );
}

/** Compact strip of trust signals shown directly under the H1 on tool pages. */
export async function TrustStrip({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["common"]);
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <LastVerifiedBadge locale={locale} />
      <Badge tone="info">{t("common.badges.officialSourcesCited")}</Badge>
      <Badge tone="neutral">{t("common.badges.estimatesOnly")}</Badge>
    </div>
  );
}

/**
 * Citations for the facts on a page. Every rate-sensitive page renders this,
 * and the publish-queue validator refuses to ship one that does not.
 */
export async function SourceNote({
  locale,
  sourceIds,
  className,
  heading,
}: {
  readonly locale: Locale;
  sourceIds: readonly string[];
  className?: string;
  heading?: string;
}) {
  if (sourceIds.length === 0) return null;
  const sources = getSources(sourceIds);
  const t = await getTranslator(locale, ["common"]);
  const { bcp47 } = getLocaleMeta(locale);

  return (
    <Card tone="subtle" className={cx("text-sm", className)}>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
        {heading ?? t("common.sections.sourcesHeading")}
      </h2>
      <ul className="mt-2 flex flex-col gap-2">
        {sources.map((source) => (
          <li key={source.id}>
            <SourceLink href={source.url}>{source.title}</SourceLink>
            <span className="text-(--color-text-muted)">
              {" "}
              {t("common.sections.sourceLine", {
                publisher: source.publisher,
                checked: formatDate(source.lastCheckedAt, bcp47),
              })}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-(--color-text-muted)">
        {/*
          One sentence with two links in it. Built as sentence + link +
          ", or " + link it could only ever be assembled in English word
          order, and neither link sits there in German.
        */}
        {rich(t("common.sections.sourcesFooter"), {
          ratesChange: t("common.sections.ratesChange"),
          seeEverySource: (
            <InlineLink href={localizedPath(locale, "/sources/")}>
              {t("common.sections.seeEverySource")}
            </InlineLink>
          ),
          reportOutOfDate: (
            <InlineLink href={localizedPath(locale, "/corrections/")}>
              {t("common.sections.reportOutOfDate")}
            </InlineLink>
          ),
        })}
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
export async function EstimateDisclaimer({
  locale,
  className,
}: {
  readonly locale: Locale;
  className?: string;
}) {
  const t = await getTranslator(locale, ["common"]);
  return (
    <Callout tone="warning" title={t("common.callouts.estimateTitle")} className={className}>
      {t("common.callouts.estimateBody")}{" "}
      <Link href={localizedPath(locale, "/disclaimer/")}>
        {t("common.callouts.estimateReadDisclaimer")}
      </Link>
      .
    </Callout>
  );
}

/** The Earned Robux warning shown next to any conversion result. */
export async function EarnedRobuxNote({
  locale,
  className,
}: {
  readonly locale: Locale;
  className?: string;
}) {
  const t = await getTranslator(locale, ["common"]);
  return (
    <Callout tone="info" title={t("common.callouts.earnedRobuxOnlyTitle")} className={className}>
      {t("common.callouts.earnedRobuxOnlyBody")}{" "}
      <Link href={localizedPath(locale, "/earned-robux/")}>
        {t("common.callouts.earnedRobuxOnlyLink")}
      </Link>
      .
    </Callout>
  );
}

export async function MethodologyNote({
  locale,
  className,
}: {
  readonly locale: Locale;
  className?: string;
}) {
  const t = await getTranslator(locale, ["common"]);
  return (
    <p className={cx("text-sm text-(--color-text-muted)", className)}>
      {t("common.callouts.methodologyBody")}{" "}
      <InlineLink href={localizedPath(locale, "/methodology/")}>
        {t("common.callouts.readMethodology")}
      </InlineLink>
      .
    </p>
  );
}

export async function LimitationsNote({
  locale,
  items,
  className,
}: {
  readonly locale: Locale;
  items: readonly string[];
  className?: string;
}) {
  const t = await getTranslator(locale, ["common"]);
  return (
    <Card tone="subtle" className={className}>
      <h2 className="text-sm font-semibold text-(--color-text)">
        {t("common.callouts.notCoveredHeading")}
      </h2>
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
export async function FAQAccordion({
  locale,
  faqs,
  heading,
  id = "faqs",
}: {
  readonly locale: Locale;
  faqs: readonly FaqEntry[];
  heading?: string;
  id?: string;
}) {
  if (faqs.length === 0) return null;
  const t = await getTranslator(locale, ["common"]);

  return (
    <section id={id} className="scroll-mt-24" aria-labelledby={`${id}-heading`}>
      <h2
        id={`${id}-heading`}
        className="text-xl font-semibold tracking-tight text-(--color-text) sm:text-2xl"
      >
        {heading ?? t("common.sections.faqHeading")}
      </h2>
      <div className="mt-4 flex flex-col gap-2">
        {faqs.map((faq, index) => (
          <Disclosure key={faq.question} summary={faq.question} defaultOpen={index === 0}>
            <p className="leading-relaxed">{faq.answer}</p>
            {faq.sourceIds && faq.sourceIds.length > 0 ? (
              <p className="mt-2 text-xs">
                {t("common.sections.sourcePrefix")}{" "}
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

export async function TableOfContents({
  locale,
  sections,
}: {
  readonly locale: Locale;
  sections: readonly SectionRef[];
}) {
  if (sections.length < 3) return null;
  const t = await getTranslator(locale, ["common"]);

  return (
    <nav aria-labelledby="toc-heading" className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4">
      <h2 id="toc-heading" className="text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
        {t("common.sections.onThisPage")}
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
export async function RelatedLinks({
  locale,
  record,
  relationships,
  heading,
  id,
}: {
  readonly locale: Locale;
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

  /*
   * The label comes from the navigation dictionary rather than from the
   * target's own record. The record is the English registry; only the
   * anchor text beside it arrives already translated, and one line in each
   * language reading half in the other is worse than either.
   */
  const navLabel = await routeLabels(locale);

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
              href={localizedPath(locale, link.route)}
              className="flex h-full flex-col rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4 hover:border-(--color-primary) hover:bg-(--color-surface-subtle)"
            >
              <span className="font-semibold text-(--color-text)">
                {navLabel(target.route)}
              </span>
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
  locale,
  record,
  intro,
  children,
}: {
  readonly locale: Locale;
  record: RouteRecord;
  intro: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 text-center">
      <h1 className="text-balance text-2xl font-bold tracking-tight text-(--color-text) sm:text-3xl lg:text-4xl">
        {record.h1}
      </h1>
      {/* `text-pretty` keeps a centred paragraph from ending on one orphan word. */}
      <p className="mx-auto mt-3 max-w-2xl text-pretty text-base text-(--color-text-muted) sm:text-lg">
        {intro}
      </p>
      {record.rateSensitive ? (
        <div className="mt-4 flex justify-center">
          <TrustStrip locale={locale} />
        </div>
      ) : null}
      {children}
    </div>
  );
}
