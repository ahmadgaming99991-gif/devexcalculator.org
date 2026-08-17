import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";
import { getRoute, requireRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Container, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, SourceNote } from "@/components/content";

const ROUTE = "/calculators/";

export const metadata: Metadata = buildMetadata(ROUTE);

/**
 * Directory of working tools.
 *
 * Only complete, shipped calculators appear here. There is no "coming soon"
 * entry: listing a tool that does not exist would make the directory a
 * placeholder rather than a directory.
 */
const TOOLS: readonly { route: string; answers: string; useWhen: string }[] = [
  {
    route: "/",
    answers: "What are my Earned Robux worth in dollars?",
    useWhen:
      "You have a balance and want a payout estimate. Handles a mixed balance across the standard, legacy and conditional rates.",
  },
  {
    route: "/robux-to-usd/",
    answers: "What is Robux worth in dollars?",
    useWhen:
      "You are not sure whether you want the creator payout or the retail purchase price. This page separates the two.",
  },
  {
    route: "/usd-to-robux/",
    answers: "How many Earned Robux do I need for a payout of X?",
    useWhen:
      "You have a figure in mind and want to know what it takes to reach it, including whether the minimum gets in the way.",
  },
  {
    route: "/robux-tax-calculator/",
    answers: "What do I keep after the Roblox commission?",
    useWhen:
      "You are pricing an item or a developer product and want to know your share, or what to charge to clear a target.",
  },
];

export default function CalculatorsPage() {
  const record = requireRoute(ROUTE);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs route={ROUTE} />
        <PageHeader
          record={record}
          intro="Four calculators, each answering one question properly rather than one tool trying to answer everything."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer>{record.quickAnswer}</QuickAnswer>

          <Section id="tools" heading="Available calculators">
            <ul className="grid gap-4 sm:grid-cols-2">
              {TOOLS.map((tool) => {
                const target = getRoute(tool.route);
                if (!target) return null;
                return (
                  <li key={tool.route}>
                    <Link
                      href={tool.route}
                      className="flex h-full flex-col rounded-[--radius-card] border border-[--color-border] bg-[--color-surface] p-5 hover:border-[--color-primary] hover:bg-[--color-surface-subtle]"
                    >
                      <span className="text-lg font-semibold text-[--color-text]">
                        {target.navLabel}
                      </span>
                      <span className="mt-2 text-sm font-medium text-[--color-primary]">
                        {tool.answers}
                      </span>
                      <span className="mt-2 text-sm text-[--color-text-muted]">
                        {tool.useWhen}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section
            id="conversions"
            heading="Looking up one specific amount?"
            description="The conversion hub has a server-rendered table of common amounts across all three rates."
          >
            <Link
              href="/conversions/"
              className="inline-flex rounded-[--radius-card] border border-[--color-border] bg-[--color-surface] p-5 hover:border-[--color-primary]"
            >
              <span>
                <span className="block text-lg font-semibold text-[--color-text]">
                  Robux to USD conversions
                </span>
                <span className="mt-1 block text-sm text-[--color-text-muted]">
                  Common amounts from 1,000 to 10 million, with detailed pages for
                  the ones creators ask about most.
                </span>
              </span>
            </Link>
          </Section>

          <Section
            id="guides"
            heading="Want to understand rather than calculate?"
            description="The guides explain the rules behind these numbers."
          >
            <Link
              href="/guides/"
              className="inline-flex rounded-[--radius-card] border border-[--color-border] bg-[--color-surface] p-5 hover:border-[--color-primary]"
            >
              <span>
                <span className="block text-lg font-semibold text-[--color-text]">
                  DevEx guides
                </span>
                <span className="mt-1 block text-sm text-[--color-text-muted]">
                  Rates, requirements, what counts as Earned Robux, and how the
                  cash-out process works.
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
