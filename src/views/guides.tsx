import { getTranslator, type Translate } from "@/i18n/get-dictionary";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import Link from "next/link";
import { getRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Container, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, SourceNote } from "@/components/content";
import { formatDate } from "@/lib/calculations/format";

const ROUTE = "/guides/";


/**
 * The guides, arranged as a reading order.
 *
 * This directory exists because the order matters: a creator who reads about
 * rates before understanding Earned Robux will calculate a payout on a balance
 * that does not qualify. Each entry states what it answers and what it assumes
 * you already know, which is the value a bare list of links would not add.
 *
 * No separate `/guides/[slug]/` articles are published. The explanatory pages
 * already exist as pillars in their own right, and duplicating them under a
 * second URL prefix would be cannibalisation dressed up as information
 * architecture.
 */
const READING_ORDER = (t: Translate): readonly { route: string; answers: string; assumes: string }[] => [
  {
    route: "/earned-robux/",
    answers: t("guides.index.readingOrder.earnedRobux.answers"),
    assumes: t("guides.index.readingOrder.earnedRobux.assumes"),
  },
  {
    route: "/devex-requirements/",
    answers: t("guides.index.readingOrder.requirements.answers"),
    assumes: t("guides.index.readingOrder.requirements.assumes"),
  },
  {
    route: "/devex-rates/",
    answers: t("guides.index.readingOrder.rates.answers"),
    assumes: t("guides.index.readingOrder.rates.assumes"),
  },
  {
    route: "/devex-rate-history/",
    answers: t("guides.index.readingOrder.rateHistory.answers"),
    assumes: t("guides.index.readingOrder.rateHistory.assumes"),
  },
  {
    route: "/how-to-cash-out-robux/",
    answers: t("guides.index.readingOrder.cashOut.answers"),
    assumes: t("guides.index.readingOrder.cashOut.assumes"),
  },
  {
    route: "/devex-fees-and-taxes/",
    answers: t("guides.index.readingOrder.feesAndTaxes.answers"),
    assumes: t("guides.index.readingOrder.feesAndTaxes.assumes"),
  },
];

export async function GuidesView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["guides"]);
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("guides.index.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale}>{record.quickAnswer}</QuickAnswer>

          <Section
            id="reading-order"
            heading={t("guides.index.readingOrderHeading")}
            description={t("guides.index.readingOrderDescription")}
          >
            <ol className="flex flex-col gap-3">
              {READING_ORDER(t).map((entry, index) => {
                const target = getRoute(entry.route);
                if (!target) return null;
                return (
                  <li key={entry.route}>
                    <Link
                      href={entry.route}
                      className="flex gap-4 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-5 hover:border-(--color-primary) hover:bg-(--color-surface-subtle)"
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-(--color-primary-soft) text-sm font-bold text-(--color-primary)"
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-lg font-semibold text-(--color-text)">
                          {target.navLabel}
                        </span>
                        <span className="mt-1 block text-sm font-medium text-(--color-primary)">
                          {entry.answers}
                        </span>
                        <span className="mt-1.5 block text-sm text-(--color-text-muted)">
                          Assumes: {entry.assumes}
                        </span>
                        <span className="mt-1.5 block text-xs text-(--color-text-muted)">
                          {t("guides.index.body.readingOrder.p1", {
                            lastReviewedAt: formatDate(t.locale, target.lastReviewedAt),
                          })}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </Section>

          <Section
            id="calculators"
            heading={t("guides.index.preferCalculateHeading")}
            description={t("guides.index.preferCalculateDescription")}
          >
            <Link
              href="/calculators/"
              className="inline-flex rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-5 hover:border-(--color-primary)"
            >
              <span>
                <span className="block text-lg font-semibold text-(--color-text)">
                  All calculators
                </span>
                <span className="mt-1 block text-sm text-(--color-text-muted)">{t("guides.index.body.calculators.p1")}</span>
              </span>
            </Link>
          </Section>

          <SourceNote locale={locale} sourceIds={record.sourceIds} />
        </div>
      </Container>
    </>
  );
}
