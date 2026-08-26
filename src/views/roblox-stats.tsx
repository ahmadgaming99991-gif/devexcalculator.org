import { getTranslator } from "@/i18n/get-dictionary";
import { rich } from "@/i18n/rich";
import {
  contextDescription,
  contextFigureLabel,
  contextFigureNote,
  engagementDescription,
  engagementFigureChange,
  engagementFigureLabel,
  engagementFigureNote,
  engagementFigureValue,
  periodDerivation,
  unpublishedLabel,
  unpublishedReason,
} from "@/i18n/data-text";
import { localizedPath } from "@/i18n/locale-path";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { DataDownload } from "@/components/content/data-download";
import { Badge, Callout, Card, Container, Foreign, InlineLink, Section, SourceLink, Table, TableWrapper, Td, Th } from "@/components/ui";
import {
  EstimateDisclaimer,
  FAQAccordion,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
  SourceNote,
} from "@/components/content";
import { BarChart, ChartWithTable, StepChart } from "@/components/charts";
import {
  companyContext,
  devExFeesByQuarter,
  devExFeesByYear,
  engagement,
  formatUsdMagnitude,
  hoursPerDauPerDay,
  percentChange,
  platformMetrics,
} from "@/lib/platform/metrics";
import { getRateValue, getSource } from "@/lib/calculations/rate-registry";
import { legacyRateId, standardRateId, us18RateId } from "@/lib/calculations/devex";
import { Rational } from "@/lib/calculations/rational";
import { formatCurrency } from "@/lib/calculations/format";
import { formatRobux } from "@/lib/calculations/format";

const ROUTE = "/roblox-stats/";


/** One hundred thousand Earned Robux, used to make each rate concrete. */
const WORKED_AMOUNT = 100_000;

/**
 * Axis ticks for a series whose values are in millions of dollars. Written here
 * rather than in the chart because the chart cannot know the unit.
 */
function millionsTick(value: number): string {
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}B`;
  return `$${value}M`;
}

export async function RobloxStatsView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["platform"]);
  const record = await localizedRoute(locale, ROUTE);

  const fy2024 = devExFeesByYear.find((p) => p.id === "fy-2024");
  const fy2025 = devExFeesByYear.find((p) => p.id === "fy-2025");
  const latestQuarter = devExFeesByQuarter[devExFeesByQuarter.length - 1];

  const quarterData = devExFeesByQuarter.map((period) => ({
    label: period.label,
    value: Number(BigInt(period.amountUsd ?? "0") / 1_000_000n),
    display: formatUsdMagnitude(period.amountUsd ?? "0"),
    provisional: period.origin === "derived",
  }));

  const yearData = devExFeesByYear.map((period) => ({
    label: period.label,
    value: Number(BigInt(period.amountUsd ?? "0") / 1_000_000n),
    display: formatUsdMagnitude(period.amountUsd ?? "0"),
    provisional: period.origin === "derived",
  }));

  /*
   * Only two of the three rates belong on a timeline. The conditional U.S. 18+
   * rate runs alongside the standard rate rather than after it, so putting it
   * on a time axis would draw a rise that never happened. It stays in the
   * table, where it can be described for what it is.
   */
  const rates = [
    { id: legacyRateId, label: t("platform.stats.rateBefore"), from: "2025-09-05", onTimeline: true },
    { id: standardRateId, label: t("platform.stats.rateFrom"), from: "2025-09-05", onTimeline: true },
    { id: us18RateId, label: t("platform.stats.rateConditional"), from: "2025-09-05", onTimeline: false },
  ].map((entry) => {
    const rate = getRateValue(entry.id);
    return {
      label: entry.label,
      from: entry.from,
      onTimeline: entry.onTimeline,
      value: Number(rate.toFixed(4, "half-up")),
      display: `$${rate.toFixed(4, "half-up")}`,
      payout: Rational.fromInt(WORKED_AMOUNT).mul(rate),
    };
  });

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("platform.stats.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="payouts" jumpLabel={t("platform.stats.jumpLabel")}>
            {record.quickAnswer}
          </QuickAnswer>

          <Section
            id="payouts"
            heading={t("platform.stats.payoutsHeading")}
            description={t("platform.stats.payoutsDescription")}
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label={t("platform.stats.paidIn2025")}
                value={formatUsdMagnitude(fy2025?.amountUsd ?? "0")}
                note={t("platform.stats.paidIn2025Note")}
              />
              <Stat
                label={t("platform.stats.paidIn2024")}
                value={formatUsdMagnitude(fy2024?.amountUsd ?? "0")}
                note={t("platform.stats.paidIn2024Note")}
              />
              <Stat
                label={t("platform.stats.yearOnYearChange")}
                value={percentChange(fy2024?.amountUsd ?? "0", fy2025?.amountUsd ?? "0")}
                note={t("platform.stats.yearOnYearNote", {
                  from: fy2024?.label ?? "",
                  to: fy2025?.label ?? "",
                })}
              />
              <Stat
                label={t("platform.stats.latestQuarterLabel", {
                  quarter: latestQuarter?.label ?? "",
                })}
                value={formatUsdMagnitude(latestQuarter?.amountUsd ?? "0")}
                note={t("platform.stats.quarterNote")}
              />
            </div>

            <div className="mt-8">
              <ChartWithTable
                chart={
                  <BarChart
                    t={t}
                    data={yearData}
                    caption={t("platform.stats.byYearChartCaption")}
                    valueLabel={t("platform.stats.usDollarsLabel")}
                    formatTick={millionsTick}
                  />
                }
              >
                <TableWrapper label={t("platform.stats.byYearTableLabel")}>
                  <Table caption={t("platform.stats.byYearTableCaption")}>
                    <thead>
                      <tr>
                        <Th>{t("common.columns.year")}</Th>
                        <Th>{t("platform.stats.columnPaidToCreators")}{" "}</Th>
                        <Th>{t("common.columns.revenue")}</Th>
                        <Th>{t("common.columns.source")}</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {devExFeesByYear.map((period) => {
                        const revenue = platformMetrics.revenue.periods.find(
                          (entry) => entry.id === period.id,
                        );
                        return (
                          <tr key={period.id}>
                            <Td>{period.label}</Td>
                            <Td className="tabular">{formatUsdMagnitude(period.amountUsd ?? "0")}</Td>
                            <Td className="tabular">
                              {revenue ? formatUsdMagnitude(revenue.amountUsd ?? "0") : "—"}
                            </Td>
                            <Td>
                              <SourceLink t={t} href={getSource(period.sourceId).url}>
                                <Foreign>{getSource(period.sourceId).title}</Foreign>
                              </SourceLink>
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </TableWrapper>
              </ChartWithTable>
            </div>
          </Section>

          <Section
            id="quarterly"
            heading={t("platform.stats.byQuarterHeading")}
            description={t("platform.stats.byQuarterDescription")}
          >
            <ChartWithTable
              chart={
                <BarChart
                  t={t}
                  data={quarterData}
                  caption={t("platform.stats.byQuarterChartCaption")}
                  valueLabel={t("platform.stats.usDollarsLabel")}
                  formatTick={millionsTick}
                />
              }
            >
              <TableWrapper label={t("platform.stats.byQuarterTableLabel")}>
                <Table caption={t("platform.stats.byQuarterTableCaption")}>
                  <thead>
                    <tr>
                      <Th>{t("common.columns.quarter")}</Th>
                      <Th>{t("platform.stats.columnPaidToCreators")}{" "}</Th>
                      <Th>{t("common.origin.howWeKnow")}</Th>
                      <Th>{t("common.columns.source")}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {devExFeesByQuarter.map((period) => (
                      <tr key={period.id}>
                        <Td>{period.label}</Td>
                        <Td className="tabular">{formatUsdMagnitude(period.amountUsd ?? "0")}</Td>
                        <Td>
                          {period.origin === "reported" ? (
                            <Badge tone="success">{t("common.origin.reported")}</Badge>
                          ) : (
                            <>
                              <Badge tone="warning">{t("common.origin.derived")}</Badge>{" "}
                              <span className="text-sm text-(--color-text-muted)">
                                {periodDerivation(t, "developerExchangeFees", period)}
                              </span>
                            </>
                          )}
                        </Td>
                        <Td>
                          <SourceLink t={t} href={getSource(period.sourceId).url}>
                            <Foreign>{getSource(period.sourceId).title}</Foreign>
                          </SourceLink>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrapper>
            </ChartWithTable>
          </Section>

          <Section
            id="rate-history"
            heading={t("platform.stats.rateTimelineHeading")}
            description={t("platform.stats.payoutTotalNote")}
          >
            <ChartWithTable
              chart={
                <StepChart
                  points={rates
                    .filter((rate) => rate.onTimeline)
                    .map((rate) => ({
                      label: rate.label,
                      value: rate.value,
                      display: rate.display,
                      from: rate.from,
                    }))}
                  caption={t("platform.stats.rateTimelineCaption")}
                />
              }
            >
              <TableWrapper label={t("platform.stats.rateTableLabel")}>
                <Table caption={t("platform.stats.rateTableCaption")}>
                  <thead>
                    <tr>
                      <Th>{t("common.columns.rate")}</Th>
                      <Th>{t("common.columns.perRobux")}</Th>
                      <Th>
                        {t("platform.stats.workedAmountColumn", {
                          robux: formatRobux(t.locale, WORKED_AMOUNT),
                        })}
                      </Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map((rate) => (
                      <tr key={rate.label}>
                        <Td>{rate.label}</Td>
                        <Td className="tabular">{rate.display}</Td>
                        <Td className="tabular">{formatCurrency(t.locale, rate.payout, "USD")}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrapper>
            </ChartWithTable>
          </Section>

          <Section
            id="engagement"
            heading={t("platform.stats.usageHeading")}
            description={engagementDescription(t)}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {engagement.figures.map((figure) => (
                <Card key={figure.id} tone="subtle" className="min-w-0">
                  <p className="text-sm text-(--color-text-muted)">
                    {engagementFigureLabel(t, figure)}
                  </p>
                  <p className="tabular mt-1 text-2xl font-bold break-words text-(--color-text)">
                    {engagementFigureValue(t, figure)}
                  </p>
                  <p className="mt-1 text-sm text-(--color-text-muted)">
                    {engagementFigureChange(t, figure)}
                  </p>
                  <p className="mt-2 text-xs text-(--color-text-muted)">
                    {engagementFigureNote(t, figure)}
                  </p>
                </Card>
              ))}

              {/*
                The only arithmetic in this section, marked as such. Roblox
                reports the two figures above; this is the one step between
                them, and it is computed rather than written down so it cannot
                describe a quarter that has been replaced.
              */}
              <Card tone="subtle" className="min-w-0">
                <p className="text-sm text-(--color-text-muted)">{t("platform.stats.body.engagement.p1")}</p>
                <p className="tabular mt-1 text-2xl font-bold break-words text-(--color-text)">
                  {t("platform.stats.aboutValue", { value: hoursPerDauPerDay() })}
                </p>
                <p className="mt-1 text-sm text-(--color-text-muted)">
                  <Badge tone="neutral">{t("platform.stats.derivedHere")}</Badge>
                </p>
                <p className="mt-2 text-xs text-(--color-text-muted)">
                  {t("platform.stats.body.engagement.p2", {
                    hoursBillions: engagement.reported.hoursBillions,
                    dauMillions: engagement.reported.dauMillions,
                    periodDays: engagement.periodDays,
                  })}
                </p>
              </Card>
            </div>

            <p className="mt-4 text-(--color-text-muted)">
              {rich(t("platform.stats.prose.engagementSource"), {
                filings: (
                  <SourceLink t={t} href={getSource(engagement.sourceId).url}>
                    <Foreign>{getSource(engagement.sourceId).title}</Foreign>
                  </SourceLink>
                ),
              })}
                    </p>
        
                    <Callout tone="info" title={t("platform.stats.twoFiguresTitle")}>
                      <ul className="mt-1 flex list-none flex-col gap-3 p-0">
                        {engagement.notPublished.map((entry) => (
                          <li key={entry.id}>
                            <span className="font-semibold text-(--color-text)">
                              {unpublishedLabel(t, entry)}
                            </span>
                            <span className="block text-sm">{unpublishedReason(t, entry)}</span>
                          </li>
                        ))}
                      </ul>
                    </Callout>
                  </Section>
        
                  <Section
                    id="business"
                    heading={t("platform.stats.businessHeading")}
                    description={contextDescription(t)}
                  >
                    <TableWrapper label={t("platform.stock.reportedResultsLabel")}>
                      <Table caption={t("platform.stock.reportedResultsCaption")}>
                        <thead>
                          <tr>
                            <Th>{t("common.columns.measure")}</Th>
                            <Th>{companyContext.period}</Th>
                            <Th>{companyContext.comparedWith}</Th>
                            <Th>{t("common.columns.note")}</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {companyContext.figures.map((figure) => (
                            <tr key={figure.id}>
                              <Td>{contextFigureLabel(t, figure)}</Td>
                              <Td className="tabular">{figure.current}</Td>
                              <Td className="tabular">{figure.previous}</Td>
                              <Td className="text-sm text-(--color-text-muted)">
                                {contextFigureNote(t, figure)}
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </TableWrapper>
        
                    <p className="mt-4 text-(--color-text-muted)">
                      {rich(t("platform.stats.prose.quarterOfRevenue"), {
                        filings: (
                          <SourceLink t={t} href={getSource(companyContext.sourceId).url}>
                            <Foreign>{getSource(companyContext.sourceId).title}</Foreign>
                          </SourceLink>
                        ),
                      })}
                    </p>
        
                    <Callout tone="warning" title={t("platform.stats.noSharePriceTitle")}>{t("platform.stats.body.business.p2")}</Callout>
                  </Section>
        
                  <Section
                    id="data"
                    heading={t("platform.stats.downloadHeading")}
                    description={t("platform.stats.downloadDescription")}
                  >
                    <DataDownload
                      heading={t("platform.stats.downloadInnerHeading")}
                      description={t("platform.stats.downloadInnerDescription")}
                      formats={[
                        { label: t("platform.stats.downloadFormats.csvPayouts"), href: "/api/stats/?format=csv" },
                        { label: t("platform.stats.downloadFormats.csvAbsences"), href: "/api/stats/?format=csv-unpublished" },
                        { label: t("platform.stats.downloadFormats.jsonEverything"), href: "/api/stats/" },
                      ]}
                      limitations={[
                        t("platform.stats.limitations.reportedOrDerived"),
                        t("platform.stats.limitations.exactDecimal"),
                        t("platform.stats.limitations.filingLinked"),
                        t("platform.stats.limitations.absencesIncluded"),
                      ]}
                    />
                  </Section>
        
                  <Section id="what-it-means" heading={t("platform.stats.whatItMeansHeading")}>
                    <p className="text-(--color-text-muted)">
                      {rich(t("platform.stats.prose.whatItMeansIntro"), {
                        calculator: (
                          <InlineLink href={localizedPath(locale, "/")}>
                            {t("platform.stats.calculatorLink")}
                          </InlineLink>
                        ),
                      })}
                    </p>
                    <p className="mt-3 text-(--color-text-muted)">
                      {t("platform.stats.prose.whatItMeans", {
                        amount: formatUsdMagnitude(fy2025?.amountUsd ?? "0"),
                      })}
                    </p>
                  </Section>
        
                  <Section id="no-live-data" heading={t("platform.stats.noLiveDataHeading")}>
                    <Callout tone="info" title={t("platform.stats.quarterlyNotLiveTitle")}>{t("platform.stats.body.noLiveData.p1")}</Callout>
                    <p className="mt-4 text-(--color-text-muted)">
                      {rich(t("platform.stats.prose.precision"), {
                        methodology: (
                          <InlineLink href={localizedPath(locale, "/methodology/")}>
                            {t("platform.stats.methodologyLink")}
                          </InlineLink>
                        ),
                      })}
                    </p>
                  </Section>
        
                  <Section id="faqs" heading={t("platform.stats.faqsHeading")}>
                    <FAQAccordion locale={locale} faqs={record.faqs} />
                  </Section>
        
                  <SourceNote locale={locale} sourceIds={record.sourceIds} />
                  <EstimateDisclaimer locale={locale} />
                  <RelatedLinks locale={locale}
                    record={record}
                    relationships={["sibling", "prerequisite", "next-step"]}
                    id="related"
                  />
                </div>
              </Container>
            </>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Card tone="subtle" className="min-w-0">
      <p className="text-sm text-(--color-text-muted)">{label}</p>
      <p className="tabular mt-1 text-2xl font-bold text-(--color-text)">{value}</p>
      <p className="mt-1 text-xs text-(--color-text-muted)">{note}</p>
    </Card>
  );
}
