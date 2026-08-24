import { loadWords } from "@/i18n/client-words";
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
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro="Work out what you keep after the Roblox platform commission, or what to charge to clear a target amount."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="schemes" jumpLabel="See which commission applies">
            {record.quickAnswer}
          </QuickAnswer>

          <MarketplaceCalculator words={await loadWords(locale, MARKETPLACE_WORDS)} />

          <TableOfContents locale={locale} sections={record.sections} />

          <Section
            id="schemes"
            heading={t("rates.robuxTax.schemesHeading")}
            description="Roblox uses different splits depending on what was sold and where it was bought."
          >
            <TableWrapper label={t("rates.robuxTax.schemesLabel")}>
              <Table caption={t("rates.robuxTax.schemesCaption")}>
                <thead>
                  <tr>
                    <Th>{t("rates.robuxTax.columnSaleType")}</Th>
                    <Th numeric>Creator</Th>
                    <Th numeric>{t("marketplace.results.experienceOwner")}</Th>
                    <Th numeric>Roblox</Th>
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
            description="For avatar items sold through the Marketplace, the creator share rises with the item's price relative to its category price floor."
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
                        {tier.priceFloorMultiple}×
                        {tier.priceFloorMultiple === "6" ? " and above" : ""}
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

            <Callout tone="info" title={t("rates.robuxTax.multipleTitle")} className="mt-4">
              Price floors differ by item category and Roblox has adjusted them
              over time, so hardcoding one universal floor would produce wrong
              answers for most items. Entering the multiple keeps the result
              correct whatever your category&rsquo;s floor happens to be.
            </Callout>
          </Section>

          <Section
            id="scope"
            heading={t("rates.robuxTax.scopeHeading")}
            description="What this calculator does and does not cover."
          >
            <LimitationsNote locale={locale}
              items={[
                "Regional pricing adjustments, which change what a player pays without changing your share percentage.",
                "Limited or resale items, where the resale fee structure differs from a first sale.",
                "Group revenue splits agreed between collaborators, which happen after Roblox's commission.",
                "Any promotional or programme-specific rate Roblox may apply to a particular category.",
                "The DevEx conversion, which is a separate step handled by the main calculator.",
              ]}
            />
          </Section>

          <Section
            id="not-devex"
            heading={t("rates.robuxTax.notDevExHeading")}
            description="The two calculations happen at different times and must not be chained."
          >
            <p className="text-(--color-text-muted)">{t("rates.robuxTax.body.notDevex.p1")}</p>
            <p className="mt-3 text-(--color-text-muted)">
              <InlineLink href="/">{t("rates.robuxTax.body.notDevex.p2")}</InlineLink>{" "}
              ·{" "}
              <InlineLink href="/devex-fees-and-taxes/">{t("rates.robuxTax.body.notDevex.p3")}</InlineLink>
            </p>
          </Section>

          <FAQAccordion locale={locale} faqs={record.faqs} heading={t("rates.robuxTax.faqsHeading")} />

          <RelatedLinks locale={locale}
            record={record}
            relationships={["tool", "sibling", "next-step"]}
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
