import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";
import { getRoute, requireRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Container, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, SourceNote } from "@/components/content";
import { formatDate } from "@/lib/calculations/format";

const ROUTE = "/guides/";

export const metadata: Metadata = buildMetadata(ROUTE);

/**
 * The guides, arranged as a reading order.
 *
 * This directory exists because the order matters: a creator who reads about
 * rates before understanding Earned Robux will calculate a payout on a balance
 * that does not qualify. Each entry states what it answers and what it assumes
 * you already know, which is the value a bare list of links would not add.
 *
 * No separate `/guides/[slug]/` articles are published. The explanatory pages
 * already exist as pillars in their own right, and duplicating them under a
 * second URL prefix would be cannibalisation dressed up as information
 * architecture.
 */
const READING_ORDER: readonly { route: string; answers: string; assumes: string }[] = [
  {
    route: "/earned-robux/",
    answers: "Which of my Robux can actually be cashed out?",
    assumes: "Nothing. Start here — it decides whether the rest applies to you.",
  },
  {
    route: "/devex-requirements/",
    answers: "What do I need before I can submit a request?",
    assumes: "That you know the difference between Earned Robux and your balance.",
  },
  {
    route: "/devex-rates/",
    answers: "What does Roblox pay per Earned Robux?",
    assumes: "That you know which part of your balance qualifies.",
  },
  {
    route: "/devex-rate-history/",
    answers: "Why does part of my balance convert at a different rate?",
    assumes: "That you have read the rates page.",
  },
  {
    route: "/how-to-cash-out-robux/",
    answers: "What is the actual process?",
    assumes: "That you meet the requirements and know what your balance is worth.",
  },
  {
    route: "/devex-fees-and-taxes/",
    answers: "What comes off the payout before it reaches me?",
    assumes: "That you have a payout figure to work from.",
  },
];

export default function GuidesPage() {
  const record = requireRoute(ROUTE);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs route={ROUTE} />
        <PageHeader
          record={record}
          intro="Six guides covering everything between earning a Robux and having the money in your account, in the order that makes sense to read them."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer>{record.quickAnswer}</QuickAnswer>

          <Section
            id="reading-order"
            heading="Suggested reading order"
            description="Each guide states its sources and the date its facts were last checked."
          >
            <ol className="flex flex-col gap-3">
              {READING_ORDER.map((entry, index) => {
                const target = getRoute(entry.route);
                if (!target) return null;
                return (
                  <li key={entry.route}>
                    <Link
                      href={entry.route}
                      className="flex gap-4 rounded-[--radius-card] border border-[--color-border] bg-[--color-surface] p-5 hover:border-[--color-primary] hover:bg-[--color-surface-subtle]"
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[--color-primary-soft] text-sm font-bold text-[--color-primary]"
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-lg font-semibold text-[--color-text]">
                          {target.navLabel}
                        </span>
                        <span className="mt-1 block text-sm font-medium text-[--color-primary]">
                          {entry.answers}
                        </span>
                        <span className="mt-1.5 block text-sm text-[--color-text-muted]">
                          Assumes: {entry.assumes}
                        </span>
                        <span className="mt-1.5 block text-xs text-[--color-text-muted]">
                          Last reviewed {formatDate(target.lastReviewedAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </Section>

          <Section
            id="calculators"
            heading="Prefer to just calculate?"
            description="Every guide links to the tool it supports, but you can go straight there."
          >
            <Link
              href="/calculators/"
              className="inline-flex rounded-[--radius-card] border border-[--color-border] bg-[--color-surface] p-5 hover:border-[--color-primary]"
            >
              <span>
                <span className="block text-lg font-semibold text-[--color-text]">
                  All calculators
                </span>
                <span className="mt-1 block text-sm text-[--color-text-muted]">
                  DevEx payout, Robux to USD, payout targets and marketplace fees.
                </span>
              </span>
            </Link>
          </Section>

          <SourceNote sourceIds={record.sourceIds} />
        </div>
      </Container>
    </>
  );
}
