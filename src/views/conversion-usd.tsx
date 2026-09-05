import { getTranslator } from "@/i18n/get-dictionary";
import { localizedPath } from "@/i18n/locale-path";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import Link from "next/link";
import { notFound } from "next/navigation";
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
import { computeUsdValues, findUsdPage, parseUsdSlug, usdPageRoute } from "@/lib/content/amount-pages";
import { allRates, minimumEarnedRobux } from "@/lib/calculations/rate-registry";
import { standardRateId } from "@/lib/calculations/devex";
import { Rational } from "@/lib/calculations/rational";
import { formatCurrency, formatRobux } from "@/lib/calculations/format";

/**
 * Payout-target pages: how much Earned Robux a given payout needs.
 *
 * The mirror of `conversion-amount.tsx`, and deliberately a separate view
 * rather than that one with a direction flag. The two answer different
 * questions and the honest copy for each differs — the value page ends on
 * "what is this worth", this one ends on "can this be requested at all", which
 * is a threshold question the other never asks.
 *
 * Only the targets in `APPROVED_USD_AMOUNTS` are prerendered, and every other
 * slug calls `notFound()` below, for the reason documented on the sibling
 * view: the route must not become an unbounded crawl space of one page per
 * number.
 *
 * Every requirement is rounded **up**. A balance one Robux short of the
 * requirement does not pay the target, so rounding to nearest would print a
 * figure that is sometimes wrong in the direction that costs the reader money.
 */

export async function UsdAmountView({
  locale,
  slug,
}: {
  readonly locale: Locale;
  readonly slug: string;
}) {
  const t = await getTranslator(locale, ["calculator", "rates"]);
  const amount = parseUsdSlug(slug);
  if (amount === null) notFound();

  const definition = findUsdPage(amount);
  const route = usdPageRoute(amount);
  const record = getRoute(route);
  if (!definition || !record) notFound();

  const localized = await localizedRoute(locale, route);

  const values = computeUsdValues(amount);
  const usd = Rational.fromInt(amount);
  const minimum = BigInt(minimumEarnedRobux);
  const minimumDisplay = formatRobux(t.locale, minimumEarnedRobux);
  const standardRateString = allRates.find((rate) => rate.id === standardRateId)?.usdPerRobux ?? "0";

  /*
   * How this target sits against the one number that can stop it. Below the
   * minimum the shortfall is what the reader needs; above it, the multiple is
   * the useful reading.
   */
  const shortfall = values.clearsMinimum ? 0n : minimum - values.standardRobuxValue;
  const multipleOfMinimum = Rational.fromInt(values.standardRobuxValue)
    .div(Rational.fromInt(minimumEarnedRobux))
    .toFixed(1, "half-up");
  const smallestPayout = formatCurrency(
    t.locale,
    Rational.fromInt(minimumEarnedRobux).mul(Rational.fromDecimalString(standardRateString)),
    "USD",
  );

  return (
    <>
      <JsonLd locale={locale} route={route} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={route} />
        <PageHeader
          locale={locale}
          record={localized}
          intro={t("rates.usdPage.intro", { display: values.display })}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer
            locale={locale}
            jumpTo="rate-comparison"
            jumpLabel={t("rates.amountPage.jumpLabel")}
          >
            {localized.quickAnswer}
          </QuickAnswer>

          <Section
            id="requirement"
            heading={t("rates.usdPage.headlineHeading", { display: values.display })}
            description={t("rates.usdPage.headlineDescription")}
          >
            <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-subtle) p-5">
              <p className="text-sm font-medium text-(--color-text-muted)">
                {t("rates.usdPage.neededLabel", { display: values.display })}
              </p>
              <p className="numeric-display mt-1 text-4xl font-bold text-(--color-text)">
                {values.standardRobux}
              </p>
              <p className="mt-2 text-sm text-(--color-text-muted)">
                {values.clearsMinimum
                  ? t("rates.usdPage.clearsMinimum", {
                      multiple: multipleOfMinimum,
                      minimum: minimumDisplay,
                    })
                  : t("rates.usdPage.belowMinimum", {
                      minimum: minimumDisplay,
                      shortfall: formatRobux(t.locale, shortfall),
                    })}
              </p>
              <p className="mt-4">
                <InlineLink href={`${localizedPath(locale, "/")}?target=${amount}`}>
                  {t("rates.usdPage.body.requirement.p1")}
                </InlineLink>
              </p>
            </div>
          </Section>

          <Section
            id="rate-comparison"
            heading={t("rates.amountPage.allThreeHeading")}
            description={t("rates.usdPage.allThreeDescription")}
          >
            <TableWrapper label={t("rates.usdPage.rateTableLabel", { display: values.display })}>
              <Table caption={t("rates.usdPage.rateTableCaption", { display: values.display })}>
                <thead>
                  <tr>
                    <Th>{t("common.columns.rate")}</Th>
                    <Th numeric>{t("common.columns.perRobux")}</Th>
                    <Th numeric>{t("rates.usdPage.columnRobuxNeeded")}</Th>
                    <Th numeric>{t("common.columns.vsStandard")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {allRates.map((rate) => {
                    const rateValue = Rational.fromDecimalString(rate.usdPerRobux);
                    const required = usd.div(rateValue).ceilToBigInt();
                    const difference = required - values.standardRobuxValue;
                    const isStandard = rate.id === standardRateId;
                    return (
                      <tr key={rate.id}>
                        <Th scope="row">{rate.label}</Th>
                        <Td numeric>${rate.usdPerRobux}</Td>
                        <Td numeric className="font-semibold">
                          {formatRobux(t.locale, required)}
                        </Td>
                        <Td numeric>
                          {isStandard ? (
                            <span className="text-(--color-text-muted)">
                              {t("common.units.baseline")}
                            </span>
                          ) : (
                            /*
                             * Fewer Robux for the same payout is the good
                             * direction here, which is the opposite of the
                             * value page, where a bigger number is better.
                             */
                            <span
                              className={
                                difference < 0n
                                  ? "text-(--color-success)"
                                  : "text-(--color-text-muted)"
                              }
                            >
                              {difference > 0n ? "+" : ""}
                              {formatRobux(t.locale, difference)}
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
              {t("rates.usdPage.body.rateComparison.p1", {
                legacyExtra: values.legacyExtraRobux,
                us18Saved: values.us18SavedRobux,
              })}{" "}
              <InlineLink href={localizedPath(locale, "/devex-rates/")}>
                {t("rates.usdPage.body.rateComparison.p2")}
              </InlineLink>
              .
            </p>
          </Section>

          <Section id="context" heading={t("rates.usdPage.contextHeading")}>
            <p className="text-(--color-text-muted)">
              {t(`rates.usdPage.context.usd${definition.amount}`)}
            </p>
          </Section>

          <Section
            id="minimum"
            heading={t("rates.usdPage.minimumHeading")}
            description={t("rates.usdPage.minimumDescription", { minimum: minimumDisplay })}
          >
            <div className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-5">
              <p className="text-(--color-text-muted)">
                {values.clearsMinimum
                  ? t("rates.usdPage.aboveMinimumBody", {
                      display: values.display,
                      needed: values.standardRobux,
                      minimum: minimumDisplay,
                      multiple: multipleOfMinimum,
                    })
                  : t("rates.usdPage.belowMinimumBody", {
                      display: values.display,
                      needed: values.standardRobux,
                      minimum: minimumDisplay,
                      shortfall: formatRobux(t.locale, shortfall),
                      smallest: smallestPayout,
                    })}
              </p>
              <p className="mt-4 text-sm">
                <InlineLink href={localizedPath(locale, "/devex-requirements/")}>
                  {t("rates.usdPage.body.minimum.p1")}
                </InlineLink>
              </p>
            </div>
          </Section>

          <Section
            id="nearby"
            heading={t("rates.usdPage.nearbyHeading")}
            description={t("rates.usdPage.nearbyDescription")}
          >
            <ul className="grid gap-3 sm:grid-cols-2">
              {definition.relatedAmounts.map((related) => {
                const relatedValues = computeUsdValues(related);
                return (
                  <li key={related}>
                    <Link
                      href={localizedPath(locale, usdPageRoute(related))}
                      className="flex items-baseline justify-between gap-3 rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4 hover:border-(--color-primary)"
                    >
                      <span className="font-semibold text-(--color-text)">
                        {relatedValues.display}
                      </span>
                      <span className="tabular font-bold text-(--color-primary)">
                        {relatedValues.standardRobux}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-sm text-(--color-text-muted)">
              <InlineLink href={localizedPath(locale, "/conversions/")}>
                {t("rates.usdPage.body.nearby.p1")}
              </InlineLink>{" "}
              ·{" "}
              <InlineLink href={localizedPath(locale, "/usd-to-robux/")}>
                {t("rates.usdPage.body.nearby.p2")}
              </InlineLink>{" "}
              ·{" "}
              <InlineLink href={localizedPath(locale, "/devex-rates/")}>
                {t("rates.amountPage.ratesUsedHeading")}
              </InlineLink>
            </p>
          </Section>

          <FAQAccordion
            locale={locale}
            faqs={localized.faqs}
            heading={t("rates.usdPage.faqHeading", { display: values.display })}
          />

          <EstimateDisclaimer locale={locale} />
          <SourceNote locale={locale} sourceIds={localized.sourceIds} />
        </div>
      </Container>
    </>
  );
}
