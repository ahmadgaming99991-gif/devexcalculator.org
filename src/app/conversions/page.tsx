import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Calculator } from "@/features/devex/calculator";
import { parseCalculatorState } from "@/features/devex/url-state";
import { Container, InlineLink, Section } from "@/components/ui";
import {
  EstimateDisclaimer,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
  SourceNote,
} from "@/components/content";
import { AmountTable } from "@/components/content/tables";
import { APPROVED_AMOUNTS, amountPageRoute, computeAmountValues } from "@/lib/content/amount-pages";

const ROUTE = "/conversions/";

export const metadata: Metadata = buildMetadata(ROUTE);

export default async function ConversionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const record = requireRoute(ROUTE);
  const initialState = parseCalculatorState(await searchParams);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs route={ROUTE} />
        <PageHeader
          record={record}
          intro="A server-rendered table of common amounts across all three documented rates, plus an input for anything not listed."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer jumpTo="table" jumpLabel="Jump to the table">
            {record.quickAnswer}
          </QuickAnswer>

          <Section
            id="converter"
            heading="Convert any amount"
            description="Not every amount needs its own page. Enter yours here and share the resulting link."
          >
            <Calculator
              initialState={initialState}
              pathname={ROUTE}
              lockedMode="quick"
              showHistory={false}
            />
          </Section>

          <Section
            id="table"
            heading="Common amounts"
            description="Every figure below is rendered on the server, so it is here whether or not JavaScript runs."
          >
            <AmountTable />
          </Section>

          <Section
            id="detailed"
            heading="Amounts with a full breakdown"
            description="These amounts have enough demand and enough to say about them to justify a page of their own. The rest are served by the table above and by the calculator."
          >
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {APPROVED_AMOUNTS.map((definition) => {
                const values = computeAmountValues(definition.amount);
                return (
                  <li key={definition.amount}>
                    <Link
                      href={amountPageRoute(definition.amount)}
                      className="flex h-full flex-col rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4 hover:border-(--color-primary) hover:bg-(--color-surface-subtle)"
                    >
                      <span className="font-semibold text-(--color-text)">
                        {values.display} Robux
                      </span>
                      <span className="tabular mt-1 text-lg font-bold text-(--color-primary)">
                        {values.standardUsd}
                      </span>
                      <span className="mt-1 text-xs text-(--color-text-muted)">
                        {values.meetsMinimum
                          ? `${values.multipleOfMinimum}× the DevEx minimum`
                          : "Below the DevEx minimum"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-sm text-(--color-text-muted)">
              This list is deliberately short. A page for every number would be a
              page that says nothing new, which is both unhelpful and against
              search-quality guidance. Amounts are added only when they clear a
              demand threshold and there is something specific to say about them.{" "}
              <InlineLink href="/editorial-policy/">
                See the publication policy
              </InlineLink>
              .
            </p>
          </Section>

          <Section
            id="rounding"
            heading="How these figures are rounded"
            description="Displayed to the cent, calculated with more precision than that."
          >
            <p className="text-(--color-text-muted)">
              Each figure is Robux multiplied by an exact decimal rate, held as a
              fraction throughout and rounded to the cent only when it is
              printed. Nothing is rounded partway through, so a total never
              disagrees with the sum of its parts.{" "}
              <InlineLink href="/methodology/">Full methodology</InlineLink>.
            </p>
          </Section>

          <RelatedLinks
            record={record}
            relationships={["parent", "tool", "prerequisite"]}
            heading="Related pages"
            id="related"
          />

          <EstimateDisclaimer />
          <SourceNote sourceIds={record.sourceIds} />
        </div>
      </Container>
    </>
  );
}
