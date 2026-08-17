import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { metadataFromRecord } from "@/lib/seo/metadata";
import { getRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Container, InlineLink, Section, Table, TableWrapper, Td, Th } from "@/components/ui";
import {
  EstimateDisclaimer,
  FAQAccordion,
  PageHeader,
  QuickAnswer,
  SourceNote,
} from "@/components/content";
import {
  APPROVED_AMOUNTS,
  amountPageRoute,
  amountPageSlug,
  computeAmountValues,
  findAmountPage,
  parseAmountSlug,
} from "@/lib/content/amount-pages";
import { allRates, getRateValue, minimumEarnedRobux } from "@/lib/calculations/rate-registry";
import { standardRateId } from "@/lib/calculations/devex";
import { Rational } from "@/lib/calculations/rational";
import { formatCurrency, formatRobux } from "@/lib/calculations/format";

/**
 * Standalone amount pages.
 *
 * Only the amounts in `APPROVED_AMOUNTS` are prerendered, and every other slug
 * calls `notFound()` below — so the route cannot become an unbounded crawl
 * space of one page per number.
 *
 * `dynamicParams = false` would express the same intent declaratively, but the
 * Cloudflare adapter cannot resolve a fallback for it and every prerendered
 * path 404s with `NoFallbackError` under the Workers runtime. The explicit
 * `notFound()` is what actually enforces the guarantee, and it behaves
 * identically from outside: approved amounts return a prerendered 200,
 * everything else returns a genuine 404.
 */

export function generateStaticParams(): { slug: string }[] {
  return APPROVED_AMOUNTS.map((definition) => ({ slug: amountPageSlug(definition.amount) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const amount = parseAmountSlug(slug);
  if (amount === null) return {};
  const record = getRoute(amountPageRoute(amount));
  return record ? metadataFromRecord(record) : {};
}

export default async function AmountPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const amount = parseAmountSlug(slug);
  if (amount === null) notFound();

  const definition = findAmountPage(amount);
  const route = amountPageRoute(amount);
  const record = getRoute(route);
  if (!definition || !record) notFound();

  const values = computeAmountValues(amount);
  const robux = Rational.fromInt(amount);
  const standardRate = getRateValue(standardRateId);

  // What it takes to reach this amount, and what it is worth in context.
  const reverseTargets = [100, 250, 500, 1_000].map((target) => {
    const targetUsd = Rational.fromInt(target);
    const required = targetUsd.div(standardRate).ceilToBigInt();
    return { target, targetUsd, required, covered: BigInt(amount) >= required };
  });

  return (
    <>
      <JsonLd route={route} />
      <Container width="wide">
        <Breadcrumbs route={route} />
        <PageHeader
          record={record}
          intro={`What ${values.display} eligible Earned Robux converts to under each of the three documented DevEx rates.`}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer jumpTo="rate-comparison" jumpLabel="Compare all three rates">
            {record.quickAnswer}
          </QuickAnswer>

          <Section
            id="value"
            heading={`What ${values.display} Robux is worth`}
            description="At the current standard rate, before any payment-provider fee or tax."
          >
            <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-subtle) p-5">
              <p className="text-sm font-medium text-(--color-text-muted)">
                {values.display} eligible Earned Robux
              </p>
              <p className="numeric-display mt-1 text-4xl font-bold text-(--color-text)">
                {values.standardUsd}
              </p>
              <p className="mt-2 text-sm text-(--color-text-muted)">
                {values.meetsMinimum ? (
                  <>
                    That is {values.multipleOfMinimum} times the{" "}
                    {formatRobux(minimumEarnedRobux)} Earned Robux minimum, so it
                    clears the threshold to submit a request. Clearing the
                    threshold is not approval — Roblox reviews every request.
                  </>
                ) : (
                  <>
                    This is below the {formatRobux(minimumEarnedRobux)} Earned
                    Robux minimum, so a DevEx request cannot be submitted at this
                    balance yet.
                  </>
                )}
              </p>
              <p className="mt-4">
                <InlineLink href={`/?robux=${amount}`}>
                  Open this amount in the full calculator
                </InlineLink>
              </p>
            </div>
          </Section>

          <Section
            id="rate-comparison"
            heading="Across all three rates"
            description="Roblox decides which rate applies to which part of a balance. This shows what each would pay."
          >
            <TableWrapper label={`${values.display} Robux valued at each DevEx rate`}>
              <Table caption={`Payout for ${values.display} Earned Robux under each documented DevEx rate`}>
                <thead>
                  <tr>
                    <Th>Rate</Th>
                    <Th numeric>Per Robux</Th>
                    <Th numeric>Payout</Th>
                    <Th numeric>vs standard</Th>
                  </tr>
                </thead>
                <tbody>
                  {allRates.map((rate) => {
                    const rateValue = Rational.fromDecimalString(rate.usdPerRobux);
                    const payout = robux.mul(rateValue);
                    const difference = payout.sub(robux.mul(standardRate));
                    const isStandard = rate.id === standardRateId;
                    return (
                      <tr key={rate.id}>
                        <Th scope="row">{rate.label}</Th>
                        <Td numeric>${rate.usdPerRobux}</Td>
                        <Td numeric className="font-semibold">
                          {formatCurrency(payout, "USD")}
                        </Td>
                        <Td numeric>
                          {isStandard ? (
                            <span className="text-(--color-text-muted)">baseline</span>
                          ) : (
                            <span
                              className={
                                difference.gt(Rational.ZERO)
                                  ? "text-(--color-success)"
                                  : "text-(--color-text-muted)"
                              }
                            >
                              {difference.gt(Rational.ZERO) ? "+" : ""}
                              {formatCurrency(difference, "USD")}
                            </span>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrapper>
            <p className="mt-3 text-sm text-(--color-text-muted)">
              The {values.standardVsLegacyUsd} gap between the current and legacy
              rates is what the September 2025 change is worth at this amount.{" "}
              <InlineLink href="/devex-rate-history/">
                See the rate history
              </InlineLink>
              .
            </p>
          </Section>

          <Section id="context" heading="Why this amount matters">
            <p className="text-(--color-text-muted)">{definition.context}</p>
          </Section>

          <Section
            id="reverse"
            heading="Reaching this amount"
            description="Working the other way: what payout targets this balance covers."
          >
            <TableWrapper label="Payout targets and whether this amount covers them">
              <Table caption={`Whether ${values.display} Earned Robux covers common payout targets`}>
                <thead>
                  <tr>
                    <Th>Payout target</Th>
                    <Th numeric>Earned Robux needed</Th>
                    <Th>Covered by {values.display}?</Th>
                  </tr>
                </thead>
                <tbody>
                  {reverseTargets.map((row) => (
                    <tr key={row.target}>
                      <Th scope="row">{formatCurrency(row.targetUsd, "USD")}</Th>
                      <Td numeric>{formatRobux(row.required)}</Td>
                      <Td>
                        {row.covered ? (
                          <span className="font-medium text-(--color-success)">Yes</span>
                        ) : (
                          <span className="text-(--color-text-muted)">
                            Not yet — {formatRobux(row.required - BigInt(amount))} more
                          </span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
            <p className="mt-3 text-sm text-(--color-text-muted)">
              <InlineLink href="/usd-to-robux/">
                Work backwards from your own target
              </InlineLink>
            </p>
          </Section>

          <Section
            id="nearby"
            heading="Nearby amounts"
            description="Adjacent amounts with their own detailed breakdown."
          >
            <ul className="grid gap-3 sm:grid-cols-2">
              {definition.relatedAmounts.map((related) => {
                const relatedValues = computeAmountValues(related);
                return (
                  <li key={related}>
                    <Link
                      href={amountPageRoute(related)}
                      className="flex items-baseline justify-between gap-3 rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4 hover:border-(--color-primary)"
                    >
                      <span className="font-semibold text-(--color-text)">
                        {relatedValues.display} Robux
                      </span>
                      <span className="tabular font-bold text-(--color-primary)">
                        {relatedValues.standardUsd}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-sm text-(--color-text-muted)">
              <InlineLink href="/conversions/">
                Back to all conversions
              </InlineLink>{" "}
              ·{" "}
              <InlineLink href="/robux-to-usd/">
                Convert a different amount
              </InlineLink>{" "}
              ·{" "}
              <InlineLink href="/devex-rates/">The rates used here</InlineLink>
            </p>
          </Section>

          <FAQAccordion faqs={record.faqs} heading={`Questions about ${values.display} Robux`} />

          <EstimateDisclaimer />
          <SourceNote sourceIds={record.sourceIds} />
        </div>
      </Container>
    </>
  );
}
