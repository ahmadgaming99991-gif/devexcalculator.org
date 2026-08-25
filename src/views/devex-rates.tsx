import { getTranslator } from "@/i18n/get-dictionary";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Container, InlineLink, Section, Table, TableWrapper, Td, Th } from "@/components/ui";
import {
  DefinitionBlock,
  EstimateDisclaimer,
  FAQAccordion,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
  SourceNote,
  TableOfContents,
} from "@/components/content";
import { RateTable } from "@/components/content/tables";
import { allRates, getRateValue } from "@/lib/calculations/rate-registry";
import { standardRateId } from "@/lib/calculations/devex";
import { Rational } from "@/lib/calculations/rational";
import { formatCurrency, formatDate, formatRobux } from "@/lib/calculations/format";

const ROUTE = "/devex-rates/";


const EXAMPLE_AMOUNTS = [1_000, 30_000, 100_000, 1_000_000] as const;

export async function DevexRatesView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["rates"]);
  const record = await localizedRoute(locale, ROUTE);
  const standard = getRateValue(standardRateId);

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("rates.devexRates.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="current-rates" jumpLabel={t("rates.devexRates.jumpLabel")}>
            {record.quickAnswer}
          </QuickAnswer>

          <TableOfContents locale={locale} sections={record.sections} />

          <Section
            id="current-rates"
            heading={t("rates.devexRates.threeRatesHeading")}
            description={t("rates.devexRates.threeRatesDescription")}
          >
            <RateTable t={t} />
          </Section>

          <Section
            id="examples"
            heading={t("rates.devexRates.whatEachPaysHeading")}
            description={t("rates.devexRates.whatEachPaysDescription")}
          >
            <TableWrapper label={t("rates.devexRates.workedExamplesLabel")}>
              <Table caption={t("rates.devexRates.workedExamplesCaption")}>
                <thead>
                  <tr>
                    <Th>Earned Robux</Th>
                    {allRates.map((rate) => (
                      <Th key={rate.id} numeric>
                        {rate.shortLabel}
                      </Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {EXAMPLE_AMOUNTS.map((amount) => (
                    <tr key={amount}>
                      <Th scope="row">{formatRobux(amount)}</Th>
                      {allRates.map((rate) => (
                        <Td key={rate.id} numeric className={rate.status === "active" ? "font-semibold" : ""}>
                          {formatCurrency(
                            Rational.fromInt(amount).mul(Rational.fromDecimalString(rate.usdPerRobux)),
                            "USD",
                          )}
                        </Td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
            <p className="mt-3 text-sm text-(--color-text-muted)">
              <InlineLink href="/">{t("rates.devexRates.useCalculatorLink")}</InlineLink>, or{" "}
              <InlineLink href="/conversions/">{t("rates.devexRates.browseHubLink")}</InlineLink>.
            </p>
          </Section>

          <Section
            id="which-applies"
            heading={t("rates.devexRates.whichAppliesHeading")}
            description={t("rates.devexRates.whichAppliesDescription")}
          >
            <div className="flex flex-col gap-3">
              {allRates.map((rate) => (
                <DefinitionBlock key={rate.id} term={rate.label}>
                  {rate.eligibilitySummary}
                  {rate.conditionNote ? (
                    <span className="mt-2 block font-medium text-(--color-text)">
                      {rate.conditionNote}
                    </span>
                  ) : null}
                </DefinitionBlock>
              ))}
            </div>
            <p className="mt-4 text-sm text-(--color-text-muted)">
              A single balance can span more than one rate — Robux earned before
              and after the September 2025 transition are treated separately, and
              Roblox cashes the older portion out first.{" "}
              <InlineLink href="/">{t("rates.devexRates.body.whichApplies.p2")}</InlineLink>
              .
            </p>
          </Section>

          <Section
            id="difference"
            heading={t("rates.devexRates.compareHeading")}
            description={t("rates.devexRates.compareDescription")}
          >
            <div className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4">
              <p className="text-sm text-(--color-text-muted)">
                The gap between the current and legacy rates is{" "}
                {formatCurrency(
                  Rational.fromInt(100_000).mul(standard).sub(
                    Rational.fromInt(100_000).mul(getRateValue("legacy-pre-2025-09-05")),
                  ),
                  "USD",
                )}{" "}
                per 100,000 Earned Robux — about 8.6% more under the current rate.
                The conditional U.S. 18+ rate pays roughly 42% more than the
                standard rate on the portion of a balance that qualifies for it.
              </p>
              <p className="mt-3">
                <InlineLink href="/">{t("rates.devexRates.openCalculatorLink")}</InlineLink>
              </p>
            </div>
          </Section>

          <Section
            id="changes"
            heading={t("rates.devexRates.canChangeHeading")}
            description={t("rates.devexRates.canChangeDescription")}
          >
            <p className="text-(--color-text-muted)">
              Roblox moved the standard rate from 0.0035 to 0.0038 on{" "}
              {formatDate("2025-09-05T10:00:00-07:00")}. There is no way to know
              from outside Roblox whether or when it will change again, so this
              page makes no forecast. What it does record is the date every
              figure here was last checked against the official documentation,
              shown at the top of the page and in the{" "}
              <InlineLink href="/sources/">source registry</InlineLink>.
            </p>
            <p className="mt-3 text-(--color-text-muted)">
              <InlineLink href="/devex-rate-history/">{t("rates.devexRates.body.changes.p2")}</InlineLink>{" "}
              ·{" "}
              <InlineLink href="/changelog/">{t("rates.devexRates.body.changes.p3")}</InlineLink>
            </p>
          </Section>

          <FAQAccordion locale={locale} faqs={record.faqs} heading={t("rates.devexRates.faqsHeading")} />

          <RelatedLinks locale={locale}
            record={record}
            relationships={["child", "sibling", "prerequisite", "next-step"]}
            id="related"
          />

          <EstimateDisclaimer locale={locale} />
          <SourceNote locale={locale} sourceIds={record.sourceIds} />
        </div>
      </Container>
    </>
  );
}
