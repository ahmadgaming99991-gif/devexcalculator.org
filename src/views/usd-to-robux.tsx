import { loadWords } from "@/i18n/client-words";
import { getTranslator } from "@/i18n/get-dictionary";
import Link from "next/link";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Calculator } from "@/features/devex/calculator";
import { CALCULATOR_WORDS } from "@/features/devex/calculator.words";
import { Planner } from "@/features/devex/planner";
import { PLANNER_WORDS } from "@/features/devex/planner.words";
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
  const t = await getTranslator(locale, ["rates"]);
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
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("rates.usdToRobux.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="rounding" jumpLabel="Why the answer rounds up">
            {record.quickAnswer}
          </QuickAnswer>

          <Calculator words={await loadWords(locale, CALCULATOR_WORDS)} initialState={initialState} pathname={ROUTE} lockedMode="target" />

          <TableOfContents locale={locale} sections={record.sections} />

          <Section
            id="rounding"
            heading="Why the answer rounds up"
            description={t("rates.usdToRobux.roundingDescription")}
          >
            <div className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4">
              <p className="numeric-display text-sm text-(--color-text)">
                required Earned Robux = ceiling( target USD ÷ rate per Robux )
              </p>
              <p className="mt-3 text-sm text-(--color-text-muted)">
                {t("rates.usdToRobux.body.rounding.p1", {
                  rate: formatCurrency(Rational.of(263_157n).mul(rate), "USD"),
                  rate2: formatCurrency(Rational.of(263_158n).mul(rate), "USD"),
                })}
              </p>
              <MethodologyNote locale={locale} className="mt-3" />
            </div>
          </Section>

          <Section
            id="minimum"
            heading={t("rates.usdToRobux.minimumHeading")}
            description={t("rates.usdToRobux.minimumDescription")}
          >
            <Callout tone="warning" title={t("rates.usdToRobux.smallTargetTitle")}>
              {t("rates.usdToRobux.body.minimum.p1", {
                minimumEarnedRobux: formatRobux(minimumEarnedRobux),
                rate: formatCurrency(Rational.fromInt(minimumEarnedRobux).mul(rate), "USD"),
              })}
            <Link href="/devex-requirements/">{t("rates.usdToRobux.seeRequirementsLink")}{" "}</Link>.
                    </Callout>
                  </Section>
        
                  <Section
                    id="planner"
                    heading={t("rates.usdToRobux.paceHeading")}
                    description={t("rates.usdToRobux.paceDescription")}
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
        
                    <Planner words={await loadWords(locale, PLANNER_WORDS)} />
                  </Section>
        
                  <Section
                    id="examples"
                    heading={t("rates.usdToRobux.commonTargetsHeading")}
                    description={t("rates.usdToRobux.commonTargetsDescription")}
                  >
                    <TableWrapper label={t("rates.usdToRobux.commonTargetsLabel")}>
                      <Table caption={t("rates.usdToRobux.commonTargetsCaption")}>
                        <thead>
                          <tr>
                            <Th>{t("rates.usdToRobux.columnTargetPayout")}</Th>
                            <Th numeric>{t("rates.usdToRobux.columnExactDivision")}</Th>
                            <Th numeric>{t("rates.usdToRobux.columnRobuxNeeded")}</Th>
                            <Th>{t("rates.usdToRobux.columnMinimumApplies")}</Th>
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
              {t("rates.usdToRobux.body.examples.p1", {
                effective: formatRobux(row.effective),
              })}
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
            heading={t("rates.usdToRobux.notBuyingHeading")}
            description={t("rates.usdToRobux.notBuyingDescription")}
          >
            <p className="text-(--color-text-muted)">
              {t("rates.usdToRobux.body.buyingRobux.p1")}
            <InlineLink href="/robux-to-usd/">{t("rates.usdToRobux.body.buyingRobux.p2")}</InlineLink>
                      .
                    </p>
                  </Section>
        
                  <FAQAccordion locale={locale} faqs={record.faqs} heading={t("rates.usdToRobux.faqsHeading")} />
        
                  <RelatedLinks locale={locale}
                    record={record}
                    relationships={["sibling", "prerequisite", "next-step"]}
                    id="related"
                  />
        
                  <EstimateDisclaimer locale={locale} />
                  <SourceNote locale={locale} sourceIds={record.sourceIds} />
                </div>
              </Container>
            </>
  );
}
