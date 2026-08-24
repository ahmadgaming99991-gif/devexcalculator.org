import { loadWords } from "@/i18n/client-words";
import { getTranslator } from "@/i18n/get-dictionary";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import Link from "next/link";
import { JsonLd } from "@/components/seo/json-ld";
import { Calculator } from "@/features/devex/calculator";
import { CALCULATOR_WORDS } from "@/features/devex/calculator.words";
import { parseCalculatorState } from "@/features/devex/url-state";
import { Container, InlineLink, Section } from "@/components/ui";
import {
  EarnedRobuxNote,
  EstimateDisclaimer,
  FAQAccordion,
  LimitationsNote,
  MethodologyNote,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
  SourceNote,
} from "@/components/content";
import {
  AmountTable,
  FormulaBlock,
  RateTable,
  RequirementsList,
} from "@/components/content/tables";

const ROUTE = "/";


export async function HomeView({
  locale,
  searchParams,
}: {
  readonly locale: Locale;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslator(locale, ["calculator", "routes"]);
  const record = await localizedRoute(locale, ROUTE);
  // Parsed and validated on the server so a shared link renders its state into
  // the initial HTML instead of flashing defaults and then correcting itself.
  const initialState = parseCalculatorState(await searchParams);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="wide">
        <PageHeader locale={locale}
          record={record}
          intro="Convert eligible Earned Robux into an estimated US dollar payout using the rates Roblox currently documents, with the source and verification date shown alongside every figure."
        />

        <div className="flex flex-col gap-10">
          <Calculator words={await loadWords(locale, CALCULATOR_WORDS)} initialState={initialState} pathname={ROUTE} />

          <QuickAnswer locale={locale} jumpTo="how-it-works" jumpLabel="See how the calculation works">
            {record.quickAnswer}
          </QuickAnswer>

          <EarnedRobuxNote locale={locale} />

          <Section
            id="how-it-works"
            heading={t("routes.home.sections.how-it-works")}
            description="Nothing here is hidden. The formula is one multiplication, and you can check it."
          >
            <div className="grid gap-4 lg:grid-cols-2">
              <FormulaBlock />
              <div className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4">
                <p className="text-sm font-semibold text-(--color-text)">{t("calculator.home.body.howItWorks.p1")}</p>
                <p className="mt-2 text-sm text-(--color-text-muted)">{t("calculator.home.body.howItWorks.p2")}</p>
                <MethodologyNote locale={locale} className="mt-3" />
              </div>
            </div>
          </Section>

          <Section
            id="current-rates"
            heading={t("routes.home.sections.current-rates")}
            description="Three rates are documented. Roblox decides which applies to which part of a balance."
          >
            <RateTable t={t} />
            <p className="mt-3 text-sm text-(--color-text-muted)">
              <InlineLink href="/devex-rates/">{t("calculator.home.body.currentRates.p1")}</InlineLink>
              , or{" "}
              <InlineLink href="/devex-rate-history/">{t("calculator.home.body.currentRates.p2")}</InlineLink>
              .
            </p>
          </Section>

          <Section
            id="earned-robux"
            heading={t("routes.home.sections.earned-robux")}
            description="This is the single most common misunderstanding about DevEx, and it decides whether a payout is possible at all."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4">
                <p className="font-semibold text-(--color-success)">{t("calculator.home.generallyQualifies")}{" "}</p>
                <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-(--color-text-muted)">
                  <li>{t("calculator.home.qualifies.developerProducts")}</li>
                  <li>{t("calculator.home.qualifies.passesAndServers")}{" "}</li>
                  <li>{t("calculator.home.qualifies.avatarItems")}</li>
                </ul>
              </div>
              <div className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4">
                <p className="font-semibold text-(--color-warning)">{t("calculator.home.generallyDoesNot")}</p>
                <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-(--color-text-muted)">
                  <li>{t("calculator.home.doesNot.purchased")}</li>
                  <li>{t("calculator.home.doesNot.giftCards")}{" "}</li>
                  <li>{t("calculator.home.doesNot.trades")}{" "}</li>
                </ul>
              </div>
            </div>
            <p className="mt-3 text-sm text-(--color-text-muted)">
              Roblox makes the final determination for any specific balance.{" "}
              <InlineLink href="/earned-robux/">{t("calculator.home.body.earnedRobux.p2")}</InlineLink>
              .
            </p>
          </Section>

          <Section
            id="popular-amounts"
            heading={t("calculator.home.commonAmountsHeading")}
            description="Every figure below is calculated at the three documented rates. Amounts under the minimum are shown for reference and marked as such."
          >
            <AmountTable t={t} />
            <p className="mt-3 text-sm text-(--color-text-muted)">
              <InlineLink href="/conversions/">{t("calculator.home.body.popularAmounts.p1")}</InlineLink>
              .
            </p>
          </Section>

          <Section
            id="requirements"
            heading="What Roblox requires"
            description="Meeting all of these lets you submit a request. It does not guarantee one will be approved."
          >
            <RequirementsList />
            <p className="mt-3 text-sm text-(--color-text-muted)">
              <InlineLink href="/devex-requirements/">{t("calculator.home.body.requirements.p1")}</InlineLink>{" "}
              ·{" "}
              <InlineLink href="/how-to-cash-out-robux/">{t("routes.home.links.howToCashOutRobux")}</InlineLink>
            </p>
          </Section>

          <RelatedLinks locale={locale}
            record={record}
            relationships={["tool"]}
            heading={t("calculator.home.relatedCalculators")}
            id="related-tools"
          />

          <RelatedLinks locale={locale}
            record={record}
            relationships={["child", "next-step"]}
            heading={t("calculator.home.relatedGuides")}
            id="related-guides"
          />

          <FAQAccordion locale={locale} faqs={record.faqs} />

          <LimitationsNote locale={locale}
            items={[
              "Whether your Robux count as Earned Robux — Roblox decides that, not this calculator.",
              "Whether a DevEx request will be approved, and how long it will take.",
              "Payment-provider fees and currency spreads, unless you enter your own figures.",
              "Tax owed in your country. Nothing here is tax advice.",
              "The retail price of buying Robux, which is a separate transaction with its own pricing.",
            ]}
          />

          <EstimateDisclaimer locale={locale} />

          <SourceNote locale={locale} sourceIds={record.sourceIds} />

          <p className="text-sm text-(--color-text-muted)">
            Something out of date?{" "}
            <Link href="/corrections/" className="text-(--color-primary) underline">{t("calculator.home.body.relatedGuides.p2")}</Link>
            .
          </p>
        </div>
      </Container>
    </>
  );
}
