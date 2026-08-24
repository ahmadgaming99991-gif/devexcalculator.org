import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { DataDownload } from "@/components/content/data-download";
import {
  Badge,
  Callout,
  Card,
  Container,
  InlineLink,
  Section,
  SourceLink,
  Table,
  TableWrapper,
  Td,
  Th,
} from "@/components/ui";
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
    { id: legacyRateId, label: "Before 5 Sep 2025", from: "2025-09-05", onTimeline: true },
    { id: standardRateId, label: "From 5 Sep 2025", from: "2025-09-05", onTimeline: true },
    { id: us18RateId, label: "Conditional U.S. 18+", from: "2025-09-05", onTimeline: false },
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
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro="What Roblox actually pays creators, taken from its own filings with the SEC. Every figure below links to the document it came from."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="payouts" jumpLabel="See the payout figures">
            {record.quickAnswer}
          </QuickAnswer>

          <Section
            id="payouts"
            heading="What Roblox pays creators"
            description="Developer exchange fees are a line on Roblox's income statement: the money it paid out through DevEx. It is the closest thing to a measure of what the creator economy earns."
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Paid to creators in 2025"
                value={formatUsdMagnitude(fy2025?.amountUsd ?? "0")}
                note="Developer exchange fees, full year"
              />
              <Stat
                label="Paid in 2024"
                value={formatUsdMagnitude(fy2024?.amountUsd ?? "0")}
                note="The year before"
              />
              <Stat
                label="Year-on-year change"
                value={percentChange(fy2024?.amountUsd ?? "0", fy2025?.amountUsd ?? "0")}
                note="2024 to 2025"
              />
              <Stat
                label={`Latest quarter (${latestQuarter?.label ?? ""})`}
                value={formatUsdMagnitude(latestQuarter?.amountUsd ?? "0")}
                note="Three months ended 30 June 2026"
              />
            </div>

            <div className="mt-8">
              <ChartWithTable
                chart={
                  <BarChart
                    data={yearData}
                    caption="Developer exchange fees by financial year, as reported by Roblox."
                    valueLabel="US dollars"
                    formatTick={millionsTick}
                  />
                }
              >
                <TableWrapper label="Developer exchange fees by year">
                  <Table caption="Roblox developer exchange fees by financial year, with the filing each figure comes from.">
                    <thead>
                      <tr>
                        <Th>Year</Th>
                        <Th>Paid to creators</Th>
                        <Th>Revenue</Th>
                        <Th>Source</Th>
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
                              <SourceLink href={getSource(period.sourceId).url}>
                                {getSource(period.sourceId).title}
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
            heading="DevEx payouts by quarter"
            description="Roblox reports quarterly, so this is the finest resolution that exists. Two quarters are marked as derived: they are a six-month total minus the quarter Roblox printed, which is exact arithmetic but not a figure Roblox published on its own."
          >
            <ChartWithTable
              chart={
                <BarChart
                  data={quarterData}
                  caption="Developer exchange fees by quarter. Hollow bars are derived by subtraction rather than reported directly."
                  valueLabel="US dollars"
                  formatTick={millionsTick}
                />
              }
            >
              <TableWrapper label="Developer exchange fees by quarter">
                <Table caption="Roblox developer exchange fees by quarter, showing which figures were reported and which were derived.">
                  <thead>
                    <tr>
                      <Th>Quarter</Th>
                      <Th>Paid to creators</Th>
                      <Th>How we know</Th>
                      <Th>Source</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {devExFeesByQuarter.map((period) => (
                      <tr key={period.id}>
                        <Td>{period.label}</Td>
                        <Td className="tabular">{formatUsdMagnitude(period.amountUsd ?? "0")}</Td>
                        <Td>
                          {period.origin === "reported" ? (
                            <Badge tone="success">Reported</Badge>
                          ) : (
                            <>
                              <Badge tone="warning">Derived</Badge>{" "}
                              <span className="text-sm text-(--color-text-muted)">
                                {period.derivation}
                              </span>
                            </>
                          )}
                        </Td>
                        <Td>
                          <SourceLink href={getSource(period.sourceId).url}>
                            {getSource(period.sourceId).title}
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
            heading="What one Robux has been worth"
            description="A payout total says how much creators cashed out, not what each Robux was worth. That is a separate, documented figure, and it has changed once."
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
                  caption="USD per eligible Earned Robux over time. A step, not a slope: a published rate holds until it is changed. The conditional U.S. 18+ rate is not shown here because it runs alongside the standard rate rather than replacing it — it is in the table below."
                />
              }
            >
              <TableWrapper label="DevEx rates and what they pay">
                <Table caption="Each documented DevEx rate and the payout it produces for 100,000 eligible Earned Robux.">
                  <thead>
                    <tr>
                      <Th>Rate</Th>
                      <Th>Per Robux</Th>
                      <Th>{WORKED_AMOUNT.toLocaleString("en-US")} Earned Robux</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rates.map((rate) => (
                      <tr key={rate.label}>
                        <Td>{rate.label}</Td>
                        <Td className="tabular">{rate.display}</Td>
                        <Td className="tabular">{formatCurrency(rate.payout, "USD")}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrapper>
            </ChartWithTable>
          </Section>

          <Section
            id="engagement"
            heading="How many people use Roblox, and for how long"
            description={engagement.description}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              {engagement.figures.map((figure) => (
                <Card key={figure.id} tone="subtle" className="min-w-0">
                  <p className="text-sm text-(--color-text-muted)">{figure.label}</p>
                  <p className="tabular mt-1 text-2xl font-bold break-words text-(--color-text)">
                    {figure.value}
                  </p>
                  <p className="mt-1 text-sm text-(--color-text-muted)">{figure.change}</p>
                  <p className="mt-2 text-xs text-(--color-text-muted)">{figure.note}</p>
                </Card>
              ))}

              {/*
                The only arithmetic in this section, marked as such. Roblox
                reports the two figures above; this is the one step between
                them, and it is computed rather than written down so it cannot
                describe a quarter that has been replaced.
              */}
              <Card tone="subtle" className="min-w-0">
                <p className="text-sm text-(--color-text-muted)">
                  Hours per active user, per day
                </p>
                <p className="tabular mt-1 text-2xl font-bold break-words text-(--color-text)">
                  about {hoursPerDauPerDay()}
                </p>
                <p className="mt-1 text-sm text-(--color-text-muted)">
                  <Badge tone="neutral">Derived here</Badge>
                </p>
                <p className="mt-2 text-xs text-(--color-text-muted)">
                  {engagement.reported.hoursBillions} billion Hours ÷{" "}
                  {engagement.reported.dauMillions} million DAUs ÷ {engagement.periodDays}{" "}
                  days. Both inputs are rounded in the release, so this is approximate.
                </p>
              </Card>
            </div>

            <p className="mt-4 text-(--color-text-muted)">
              Every figure above except the last is quoted from{" "}
              <SourceLink href={getSource(engagement.sourceId).url}>
                {getSource(engagement.sourceId).title}
              </SourceLink>
              , for the three months ended 30 June 2026.
            </p>

            <Callout tone="info" title="Two figures other trackers show, and this page does not">
              <ul className="mt-1 flex list-none flex-col gap-3 p-0">
                {engagement.notPublished.map((entry) => (
                  <li key={entry.id}>
                    <span className="font-semibold text-(--color-text)">{entry.label}</span>
                    <span className="block text-sm">{entry.reason}</span>
                  </li>
                ))}
              </ul>
            </Callout>
          </Section>

          <Section
            id="business"
            heading="Roblox as a business"
            description={companyContext.description}
          >
            <TableWrapper label="Roblox reported results">
              <Table caption="Roblox's reported results for the most recent quarter, against the same quarter a year earlier.">
                <thead>
                  <tr>
                    <Th>Measure</Th>
                    <Th>{companyContext.period}</Th>
                    <Th>{companyContext.comparedWith}</Th>
                    <Th>Note</Th>
                  </tr>
                </thead>
                <tbody>
                  {companyContext.figures.map((figure) => (
                    <tr key={figure.id}>
                      <Td>{figure.label}</Td>
                      <Td className="tabular">{figure.current}</Td>
                      <Td className="tabular">{figure.previous}</Td>
                      <Td className="text-sm text-(--color-text-muted)">{figure.note}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>

            <p className="mt-4 text-(--color-text-muted)">
              The line worth reading twice is the second one. Developer exchange fees are
              about a quarter of Roblox&rsquo;s revenue, so a meaningful share of what the
              platform takes in leaves again as creator payouts. Every figure in this table
              is quoted from{" "}
              <SourceLink href={getSource(companyContext.sourceId).url}>
                {getSource(companyContext.sourceId).title}
              </SourceLink>{" "}
              rather than recomputed here.
            </p>

            <Callout tone="warning" title="There is no share price on this page, on purpose">
              A live RBLX quote would need a paid market-data feed and a third-party script
              running in your browser. This site loads no third-party scripts, and a number
              it cannot trace to a document is a number it will not publish. The figures
              above come from the filing itself, which is the same source a share price
              ultimately reacts to. None of this is investment advice, and a quarterly
              result says nothing about what any individual will be paid.
            </Callout>
          </Section>

          <Section
            id="data"
            heading="Download these figures"
            description="The rows behind the charts, with every figure labelled reported or derived."
          >
            <DataDownload
              heading="Roblox creator payout statistics"
              description="Everything charted on this page, plus the metrics Roblox does not publish, as a spreadsheet or as JSON."
              formats={[
                { label: "CSV — payout figures", href: "/api/stats/?format=csv" },
                { label: "CSV — metrics Roblox does not publish", href: "/api/stats/?format=csv-unpublished" },
                { label: "JSON — everything", href: "/api/stats/" },
              ]}
              limitations={[
                "Every row states whether Roblox reported the figure or this site derived it from reported ones. The derivations are described on the methodology page.",
                "Money is carried as an exact decimal string, never as a floating-point number, and never rounded on the way out.",
                "Each row names the filing it came from and links to it, so any figure can be checked against the original document.",
                "The metrics Roblox does not publish are included as absences with reasons, not omitted — a file without them would look like the complete picture.",
              ]}
            />
          </Section>

          <Section id="what-it-means" heading="What this means for your own payout">
            <p className="text-(--color-text-muted)">
              Very little, directly — and that is worth saying plainly. The totals on this
              page describe the whole platform. They do not change what your own balance
              converts to, they are not a forecast, and a rising total does not mean a
              rising rate. What decides your payout is the rate applied to your eligible
              Earned Robux, which you can work out on{" "}
              <InlineLink href="/">the calculator</InlineLink>.
            </p>
            <p className="mt-3 text-(--color-text-muted)">
              The one thing these figures do show is scale: DevEx is a programme through
              which Roblox paid out{" "}
              {formatUsdMagnitude(fy2025?.amountUsd ?? "0")} in a single year, which is
              context worth having before deciding whether the 30,000 Robux minimum is
              worth working towards.
            </p>
          </Section>

          <Section id="no-live-data" heading="Why there is no live data here">
            <Callout tone="info" title="Quarterly figures, not a live feed">
              Roblox publishes these numbers once a quarter, in a filing. That is the
              finest resolution that exists, so a chart claiming to show them changing by
              the minute would be showing something invented. This site runs no data
              collection, samples nothing and estimates nothing — it reads the filings and
              links to them.
            </Callout>
            <p className="mt-4 text-(--color-text-muted)">
              Figures are recorded to the precision the filing used. Where Roblox reported
              in thousands the amount is exact to the dollar; where it reported in
              millions, it is exact to the million and no further. Two quarters are marked
              as derived because they come from subtracting a reported quarter from a
              reported six-month total. Read more about how this site handles figures in{" "}
              <InlineLink href="/methodology/">the methodology</InlineLink>.
            </p>
          </Section>

          <Section id="faqs" heading="Questions about these figures">
            <FAQAccordion locale={locale} faqs={record.faqs} />
          </Section>

          <SourceNote locale={locale} sourceIds={record.sourceIds} />
          <EstimateDisclaimer locale={locale} />
          <RelatedLinks locale={locale}
            record={record}
            relationships={["sibling", "prerequisite", "next-step"]}
            heading="Related pages"
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
