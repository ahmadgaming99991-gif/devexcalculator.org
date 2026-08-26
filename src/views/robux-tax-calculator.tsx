import { loadWords } from "@/i18n/server-words";
import { localizedPath } from "@/i18n/locale-path";
import { getTranslator } from "@/i18n/get-dictionary";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { MarketplaceCalculator } from "@/features/marketplace/calculator";
import { MARKETPLACE_WORDS } from "@/features/marketplace/calculator.words";
import { Callout, Container, InlineLink, Section, Table, TableWrapper, Td, Th } from "@/components/ui";
import {
  EstimateDisclaimer,
  FAQAccordion,
  LimitationsNote,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
  SourceNote,
  TableOfContents,
} from "@/components/content";
import { getMarketplaceScheme } from "@/lib/calculations/rate-registry";

const ROUTE = "/robux-tax-calculator/";


export async function RobuxTaxView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["marketplace", "rates"]);
  const record = await localizedRoute(locale, ROUTE);
  const progressive = getMarketplaceScheme("marketplace-avatar-item");

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("rates.robuxTax.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="schemes" jumpLabel={t("rates.robuxTax.jumpLabel")}>
            {record.quickAnswer}
          </QuickAnswer>

          <MarketplaceCalculator words={await loadWords(locale, MARKETPLACE_WORDS)} />

          <TableOfContents locale={locale} sections={record.sections} />

          <Section
            id="schemes"
            heading={t("rates.robuxTax.schemesHeading")}
            description={t("rates.robuxTax.schemesDescription")}
          >
            <TableWrapper label={t("rates.robuxTax.schemesLabel")}>
              <Table caption={t("rates.robuxTax.schemesCaption")}>
                <thead>
                  <tr>
                    <Th>{t("rates.robuxTax.columnSaleType")}</Th>
                    <Th numeric>{t("rates.robuxTax.columnCreator")}</Th>
                    <Th numeric>{t("marketplace.results.experienceOwner")}</Th>
                    <Th numeric>{t("rates.robuxTax.columnRoblox")}</Th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <Th scope="row">{t("rates.robuxTax.body.schemes.p1")}<span className="mt-1 block text-xs font-normal text-(--color-text-muted)">{t("rates.robuxTax.body.schemes.p2")}</span>
                    </Th>
                    <Td numeric className="font-semibold">
                      70%
                    </Td>
                    <Td numeric>—</Td>
                    <Td numeric>30%</Td>
                  </tr>
                  <tr>
                    <Th scope="row">{t("rates.robuxTax.body.schemes.p3")}<span className="mt-1 block text-xs font-normal text-(--color-text-muted)">{t("rates.robuxTax.body.schemes.p4")}</span>
                    </Th>
                    <Td numeric className="font-semibold">
                      30–70%
                    </Td>
                    <Td numeric>—</Td>
                    <Td numeric>30–70%</Td>
                  </tr>
                  <tr>
                    <Th scope="row">{t("rates.robuxTax.body.schemes.p5")}<span className="mt-1 block text-xs font-normal text-(--color-text-muted)">{t("rates.robuxTax.body.schemes.p6")}</span>
                    </Th>
                    <Td numeric className="font-semibold">
                      30%
                    </Td>
                    <Td numeric>40%</Td>
                    <Td numeric>30%</Td>
                  </tr>
                </tbody>
              </Table>
            </TableWrapper>
            <p className="mt-3 text-sm text-(--color-text-muted)">{t("rates.robuxTax.body.schemes.p7")}</p>
          </Section>

          <Section
            id="progressive"
            heading={t("rates.robuxTax.progressiveHeading")}
            description={t("rates.robuxTax.progressiveDescription")}
          >
            <TableWrapper label={t("rates.robuxTax.progressiveLabel")}>
              <Table caption={t("rates.robuxTax.progressiveCaption")}>
                <thead>
                  <tr>
                    <Th>{t("rates.robuxTax.columnPriceOverFloor")}</Th>
                    <Th numeric>{t("rates.robuxTax.columnCreatorShare")}</Th>
                    <Th numeric>{t("rates.robuxTax.columnRobloxShare")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {(progressive.progressiveTiers ?? []).map((tier) => (
                    <tr key={tier.priceFloorMultiple}>
                      <Th scope="row">
                        {tier.priceFloorMultiple === "6"
                          ? t("rates.robuxTax.tierMultipleAndAbove", {
                              multiple: tier.priceFloorMultiple,
                            })
                          : `${tier.priceFloorMultiple}×`}
                      </Th>
                      <Td numeric className="font-semibold">
                        {tier.creatorSharePercent}%
                      </Td>
                      <Td numeric>{100 - Number(tier.creatorSharePercent)}%</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>

            <Callout tone="info" title={t("rates.robuxTax.multipleTitle")} className="mt-4">{" "}{t("rates.robuxTax.prose.priceFloors")}{" "}</Callout>
          </Section>

          <Section
            id="scope"
            heading={t("rates.robuxTax.scopeHeading")}
            description={t("rates.robuxTax.scopeDescription")}
          >
            <LimitationsNote locale={locale}
              items={[
                t("rates.robuxTax.notCovered.regionalPricing"),
                t("rates.robuxTax.notCovered.resale"),
                t("rates.robuxTax.notCovered.groupSplits"),
                t("rates.robuxTax.notCovered.promotional"),
                t("rates.robuxTax.notCovered.devexConversion"),
              ]}
            />
          </Section>

          <Section
            id="not-devex"
            heading={t("rates.robuxTax.notDevExHeading")}
            description={t("rates.robuxTax.notDevExDescription")}
          >
            <p className="text-(--color-text-muted)">{t("rates.robuxTax.body.notDevex.p1")}</p>
            <p className="mt-3 text-(--color-text-muted)">
              <InlineLink href={localizedPath(locale, "/")}>{t("rates.robuxTax.body.notDevex.p2")}</InlineLink>{" "}
              ·{" "}
              <InlineLink href={localizedPath(locale, "/devex-fees-and-taxes/")}>{t("rates.robuxTax.body.notDevex.p3")}</InlineLink>
            </p>
          </Section>

          <FAQAccordion locale={locale} faqs={record.faqs} heading={t("rates.robuxTax.faqsHeading")} />

          <RelatedLinks locale={locale}
            record={record}
            relationships={["tool", "sibling", "next-step"]}
            id="related"
          />

          <EstimateDisclaimer locale={locale} />
          <SourceNote locale={locale} sourceIds={record.sourceIds} />
        </div>
      </Container>
    </>
  );
}
