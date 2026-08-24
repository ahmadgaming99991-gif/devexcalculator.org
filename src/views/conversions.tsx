import { loadWords } from "@/i18n/client-words";
import { getTranslator } from "@/i18n/get-dictionary";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Calculator } from "@/features/devex/calculator";
import { CALCULATOR_WORDS } from "@/features/devex/calculator.words";
import { parseCalculatorState } from "@/features/devex/url-state";
import { Container, InlineLink, Section } from "@/components/ui";
import {
  EstimateDisclaimer,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
  SourceNote,
} from "@/components/content";
import { AmountTable } from "@/components/content/tables";
import { APPROVED_AMOUNTS, amountPageRoute, computeAmountValues } from "@/lib/content/amount-pages";

const ROUTE = "/conversions/";


export async function ConversionsView({
  locale,
  searchParams,
}: {
  readonly locale: Locale;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslator(locale, ["rates"]);
  const record = await localizedRoute(locale, ROUTE);
  const initialState = parseCalculatorState(await searchParams);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro="A server-rendered table of common amounts across all three documented rates, plus an input for anything not listed."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="table" jumpLabel="Jump to the table">
            {record.quickAnswer}
          </QuickAnswer>

          <Section
            id="converter"
            heading={t("rates.conversions.convertAnyHeading")}
            description="Not every amount needs its own page. Enter yours here and share the resulting link."
          >
            <Calculator words={await loadWords(locale, CALCULATOR_WORDS)}
              initialState={initialState}
              pathname={ROUTE}
              lockedMode="quick"
              showHistory={false}
            />
          </Section>

          <Section
            id="table"
            heading={t("rates.conversions.everyAmountHeading")}
            description="Sixty-eight amounts at all three documented rates, including the ones below the DevEx minimum — those are asked about most often, and the honest answer includes the fact that they cannot be cashed out. Every figure is rendered on the server, so it is here whether or not JavaScript runs."
          >
            <AmountTable t={t} />
            <p className="mt-4 text-sm text-(--color-text-muted)">
              The list is not a selection of round numbers: it is the amounts
              that are actually searched for. Anything not here — including
              figures larger than the table&rsquo;s last row — goes into the
              converter above, which uses the same rates and the same
              arithmetic.
            </p>
          </Section>

          <Section
            id="detailed"
            heading={t("rates.conversions.fullBreakdownHeading")}
            description="These amounts have enough demand and enough to say about them to justify a page of their own. The rest are served by the table above and by the calculator."
          >
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {APPROVED_AMOUNTS.map((definition) => {
                const values = computeAmountValues(definition.amount);
                return (
                  <li key={definition.amount}>
                    <Link
                      href={amountPageRoute(definition.amount)}
                      className="flex h-full flex-col rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4 hover:border-(--color-primary) hover:bg-(--color-surface-subtle)"
                    >
                      <span className="font-semibold text-(--color-text)">
                        {values.display} Robux
                      </span>
                      <span className="tabular mt-1 text-lg font-bold text-(--color-primary)">
                        {values.standardUsd}
                      </span>
                      <span className="mt-1 text-xs text-(--color-text-muted)">
                        {values.meetsMinimum
                          ? `${values.multipleOfMinimum}× the DevEx minimum`
                          : "Below the DevEx minimum"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-sm text-(--color-text-muted)">
              This list is deliberately short. A page for every number would be a
              page that says nothing new, which is both unhelpful and against
              search-quality guidance. Amounts are added only when they clear a
              demand threshold and there is something specific to say about them.{" "}
              <InlineLink href="/editorial-policy/">{t("rates.conversions.body.detailed.p2")}</InlineLink>
              .
            </p>
          </Section>

          <Section
            id="rounding"
            heading={t("rates.conversions.roundingHeading")}
            description="Displayed to the cent, calculated with more precision than that."
          >
            <p className="text-(--color-text-muted)">
              Each figure is Robux multiplied by an exact decimal rate, held as a
              fraction throughout and rounded to the cent only when it is
              printed. Nothing is rounded partway through, so a total never
              disagrees with the sum of its parts.{" "}
              <InlineLink href="/methodology/">{t("rates.conversions.fullMethodologyLink")}</InlineLink>.
            </p>
          </Section>

          <RelatedLinks locale={locale}
            record={record}
            relationships={["parent", "tool", "prerequisite"]}
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
