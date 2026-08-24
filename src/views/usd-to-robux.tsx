import Link from "next/link";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Calculator } from "@/features/devex/calculator";
import { Planner } from "@/features/devex/planner";
import { parseCalculatorState } from "@/features/devex/url-state";
import { Callout, Container, InlineLink, Section, Table, TableWrapper, Td, Th } from "@/components/ui";
import {
  EstimateDisclaimer,
  FAQAccordion,
  MethodologyNote,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
  SourceNote,
  TableOfContents,
} from "@/components/content";
import { Rational } from "@/lib/calculations/rational";
import { getRateValue, minimumEarnedRobux } from "@/lib/calculations/rate-registry";
import { standardRateId } from "@/lib/calculations/devex";
import { formatCurrency, formatRobux } from "@/lib/calculations/format";

const ROUTE = "/usd-to-robux/";


/** Worked targets, computed through the engine so the table cannot drift. */
const TARGETS = [50, 100, 114, 250, 500, 1_000, 5_000, 10_000] as const;

export async function UsdToRobuxView({
  locale,
  searchParams,
}: {
  readonly locale: Locale;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const record = await localizedRoute(locale, ROUTE);
  const initialState = parseCalculatorState(await searchParams);
  const rate = getRateValue(standardRateId);

  const rows = TARGETS.map((target) => {
    const targetUsd = Rational.fromInt(target);
    const exact = targetUsd.div(rate);
    const required = exact.ceilToBigInt();
    const belowMinimum = required < BigInt(minimumEarnedRobux);
    return {
      target,
      targetUsd,
      exact,
      required,
      belowMinimum,
      effective: belowMinimum ? BigInt(minimumEarnedRobux) : required,
    };
  });

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro="Set the payout you are aiming for and see exactly how many eligible Earned Robux it takes to get there."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="rounding" jumpLabel="Why the answer rounds up">
            {record.quickAnswer}
          </QuickAnswer>

          <Calculator initialState={initialState} pathname={ROUTE} lockedMode="target" />

          <TableOfContents locale={locale} sections={record.sections} />

          <Section
            id="rounding"
            heading="Why the answer rounds up"
            description="Rounding down would leave you a fraction of a cent short of your own target, every time."
          >
            <div className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4">
              <p className="numeric-display text-sm text-(--color-text)">
                required Earned Robux = ceiling( target USD ÷ rate per Robux )
              </p>
              <p className="mt-3 text-sm text-(--color-text-muted)">
                A 1,000 dollar target divided by 0.0038 gives 263,157.89. Robux
                come in whole units, so 263,157 would pay{" "}
                {formatCurrency(Rational.of(263_157n).mul(rate), "USD")} — just
                under the target. Rounding up to 263,158 pays{" "}
                {formatCurrency(Rational.of(263_158n).mul(rate), "USD")}, which
                clears it. That is why every figure on this page rounds up rather
                than to the nearest whole number.
              </p>
              <MethodologyNote locale={locale} className="mt-3" />
            </div>
          </Section>

          <Section
            id="minimum"
            heading="The minimum still applies"
            description="Arithmetic and eligibility are two different constraints, and the larger one wins."
          >
            <Callout tone="warning" title="A small target does not mean a small cash-out">
              Roblox requires {formatRobux(minimumEarnedRobux)} Earned Robux
              before a DevEx request can be submitted at all. If your target
              needs fewer than that, the minimum is what you actually have to
              reach — and it would pay{" "}
              {formatCurrency(Rational.fromInt(minimumEarnedRobux).mul(rate), "USD")}{" "}
              rather than your original target.{" "}
              <Link href="/devex-requirements/">See the full requirements</Link>.
            </Callout>
          </Section>

          <Section
            id="planner"
            heading="How long it takes at your pace"
            description="The target tells you how much. This works out when — or, from a date, what you would have to earn to get there."
          >
            {/*
              Server-rendered first, so the section explains itself to a reader
              with no JavaScript and to a crawler. The planner below is an
              island; this paragraph is not, and is the reason the page is not
              blank here without it.
            */}
            <p className="text-(--color-text-muted)">
              A payout target is a distance. Turning it into a date needs one
              more fact — how fast you earn — and turning a date into a plan
              needs the same fact in reverse. Both are the same division:{" "}
              {/*
                Allowed to wrap. Held on one line it measured 488px, which
                pushed the whole page 187px sideways at 320px — the exact
                class of defect the overflow check exists to catch.
              */}
              <span className="numeric-display">
                days = remaining Earned Robux ÷ Earned Robux per day
              </span>
              , rounded up, because a part day earns nothing and a part Robux
              does not exist. Nothing here assumes your earnings grow, and
              nothing here is a date Roblox will pay on — Roblox publishes no
              DevEx processing time, so none is added.
            </p>

            <Planner />
          </Section>

          <Section
            id="examples"
            heading="Common payout targets"
            description="Each row is computed with the same formula the calculator uses."
          >
            <TableWrapper label="Earned Robux required for common payout targets">
              <Table caption="Eligible Earned Robux needed to reach common USD payout targets at the standard DevEx rate">
                <thead>
                  <tr>
                    <Th>Target payout</Th>
                    <Th numeric>Exact division</Th>
                    <Th numeric>Earned Robux needed</Th>
                    <Th>Minimum applies?</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.target}>
                      <Th scope="row">{formatCurrency(row.targetUsd, "USD")}</Th>
                      <Td numeric className="text-(--color-text-muted)">
                        {row.exact.toFixed(2)}
                      </Td>
                      <Td numeric className="font-semibold">
                        {formatRobux(row.required)}
                      </Td>
                      <Td>
                        {row.belowMinimum ? (
                          <span className="text-(--color-warning)">
                            Yes — you would need {formatRobux(row.effective)}
                          </span>
                        ) : (
                          <span className="text-(--color-text-muted)">No</span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
          </Section>

          <Section
            id="buying-robux"
            heading="This is not about buying Robux"
            description="The reverse direction has a very different answer depending on who is asking."
          >
            <p className="text-(--color-text-muted)">
              This page answers the creator question: how much do I need to earn
              to receive a given amount of money. It does not tell you how many
              Robux a given amount of money will buy. Roblox prices Robux
              packages by region, platform and promotion, and there is no single
              rate that would be true for everyone — so this site does not
              publish one.{" "}
              <InlineLink href="/robux-to-usd/">
                The distinction is explained in full on the Robux to USD page
              </InlineLink>
              .
            </p>
          </Section>

          <FAQAccordion locale={locale} faqs={record.faqs} heading="Questions about payout targets" />

          <RelatedLinks locale={locale}
            record={record}
            relationships={["sibling", "prerequisite", "next-step"]}
            heading="Related pages"
            id="related"
          />

          <EstimateDisclaimer locale={locale} />
          <SourceNote locale={locale} sourceIds={record.sourceIds} />
        </div>
      </Container>
    </>
  );
}
