import { localizedPath } from "@/i18n/locale-path";
import { rich } from "@/i18n/rich";
import { getTranslator } from "@/i18n/get-dictionary";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge, Container, InlineLink, Section, Table, TableWrapper, Td, Th } from "@/components/ui";
import {
  EstimateDisclaimer,
  FAQAccordion,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
  SourceNote,
} from "@/components/content";
import { getRateValue } from "@/lib/calculations/rate-registry";
import { legacyRateId, standardRateId } from "@/lib/calculations/devex";
import { Rational } from "@/lib/calculations/rational";
import { formatCurrency, formatDate, formatRobux } from "@/lib/calculations/format";

const ROUTE = "/devex-rate-history/";


const COMPARISON_AMOUNTS = [30_000, 100_000, 500_000, 1_000_000] as const;

export async function RateHistoryView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["rates"]);
  const record = await localizedRoute(locale, ROUTE);
  const standard = getRateValue(standardRateId);
  const legacy = getRateValue(legacyRateId);

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("rates.rateHistory.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="timeline" jumpLabel={t("rates.rateHistory.jumpLabel")}>
            {record.quickAnswer}
          </QuickAnswer>

          <Section
            id="timeline"
            heading={t("rates.rateHistory.timelineHeading")}
            description={t("rates.rateHistory.timelineDescription")}
          >
            <ol className="flex flex-col gap-4">
              <li className="rounded-(--radius-control) border border-(--color-border) border-l-4 border-l-(--color-success) bg-(--color-surface) p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="success">{t("common.rateStatus.active")}</Badge>
                  <span className="text-sm font-semibold text-(--color-text)">
                    {t("rates.rateHistory.changedAt", {
                      date: formatDate(t.locale, "2025-09-05T10:00:00-07:00"),
                    })}
                  </span>
                </div>
                <p className="mt-2 font-semibold text-(--color-text)">{t("rates.rateHistory.body.timeline.p1")}</p>
                <p className="mt-1 text-sm text-(--color-text-muted)">{t("rates.rateHistory.body.timeline.p2")}</p>
              </li>

              <li className="rounded-(--radius-control) border border-(--color-border) border-l-4 border-l-(--color-border-strong) bg-(--color-surface) p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{t("common.rateStatus.legacy")}</Badge>
                  <span className="text-sm font-semibold text-(--color-text)">
                    {t("rates.rateHistory.untilDate", {
                      date: formatDate(t.locale, "2025-09-05T10:00:00-07:00"),
                    })}
                  </span>
                </div>
                <p className="mt-2 font-semibold text-(--color-text)">{t("rates.rateHistory.body.timeline.p3")}</p>
                <p className="mt-1 text-sm text-(--color-text-muted)">{t("rates.rateHistory.body.timeline.p4")}</p>
              </li>

              <li className="rounded-(--radius-control) border border-(--color-border) border-l-4 border-l-(--color-accent) bg-(--color-surface) p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="info">{t("common.rateStatus.conditional")}</Badge>
                  <span className="text-sm font-semibold text-(--color-text)">{t("rates.rateHistory.body.timeline.p5")}</span>
                </div>
                <p className="mt-2 font-semibold text-(--color-text)">{t("rates.rateHistory.body.timeline.p6")}</p>
                <p className="mt-1 text-sm text-(--color-text-muted)">{t("rates.rateHistory.body.timeline.p7")}</p>
              </li>
            </ol>
          </Section>

          <Section
            id="comparison"
            heading={t("rates.rateHistory.worthHeading")}
            description={t("rates.rateHistory.worthDescription")}
          >
            <TableWrapper label={t("rates.rateHistory.comparisonLabel")}>
              <Table caption={t("rates.rateHistory.comparisonCaption")}>
                <thead>
                  <tr>
                    <Th>{t("common.columns.earnedRobux")}</Th>
                    <Th numeric>{t("rates.rateHistory.comparisonAtRate", { rate: "0.0035" })}</Th>
                    <Th numeric>{t("rates.rateHistory.comparisonAtRate", { rate: "0.0038" })}</Th>
                    <Th numeric>{t("common.columns.difference")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_AMOUNTS.map((amount) => {
                    const robux = Rational.fromInt(amount);
                    const before = robux.mul(legacy);
                    const after = robux.mul(standard);
                    return (
                      <tr key={amount}>
                        <Th scope="row">{formatRobux(t.locale, amount)}</Th>
                        <Td numeric className="text-(--color-text-muted)">
                          {formatCurrency(t.locale, before, "USD")}
                        </Td>
                        <Td numeric className="font-semibold">
                          {formatCurrency(t.locale, after, "USD")}
                        </Td>
                        <Td numeric className="text-(--color-success)">
                          +{formatCurrency(t.locale, after.sub(before), "USD")}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrapper>
            <p className="mt-3 text-sm text-(--color-text-muted)">{t("rates.rateHistory.body.comparison.p1")}</p>
          </Section>

          <Section
            id="legacy-balances"
            heading={t("rates.rateHistory.legacyHeading")}
            description={t("rates.rateHistory.legacyDescription")}
          >
            <p className="text-(--color-text-muted)">
              {t("rates.rateHistory.prose.legacySplit")}
            <InlineLink href="/">{t("rates.rateHistory.body.legacyBalances.p1")}</InlineLink>
              {t("rates.rateHistory.body.legacyBalances.p2")}
            </p>
          </Section>

          <Section
            id="no-forecast"
            heading={t("rates.rateHistory.noForecastHeading")}
            description={t("rates.rateHistory.noForecastDescription")}
          >
            <p className="text-(--color-text-muted)">
              {rich(t("rates.rateHistory.prose.whenItChanges"), {
                changelog: (
                  <InlineLink href={localizedPath(locale, "/changelog/")}>
                    {t("rates.rateHistory.publicChangelogLink")}
                  </InlineLink>
                ),
              })}
            </p>
                  </Section>
        
                  <FAQAccordion locale={locale} faqs={record.faqs} heading={t("rates.rateHistory.faqsHeading")} />
        
                  <RelatedLinks locale={locale}
                    record={record}
                    relationships={["parent", "tool", "next-step"]}
                    id="related"
                  />
        
                  <EstimateDisclaimer locale={locale} />
                  <SourceNote locale={locale} sourceIds={record.sourceIds} />
                </div>
              </Container>
            </>
  );
}
