import { getTranslator } from "@/i18n/get-dictionary";
import { rich } from "@/i18n/rich";
import { localizedPath } from "@/i18n/locale-path";
import { localizedRoute } from "@/i18n/localized-route";
import { loadWords } from "@/i18n/server-words";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { DataDownload } from "@/components/content/data-download";
import { Callout, Card, Container, InlineLink, Section } from "@/components/ui";
import {
  EstimateDisclaimer,
  FAQAccordion,
  PageHeader,
  QuickAnswer,
  RelatedLinks,
} from "@/components/content";
import { PlatformDashboard } from "@/components/platform/dashboard";
import { PLATFORM_DASHBOARD_WORDS } from "@/components/platform/dashboard.words";
import { COLLECTION_INTERVAL_MINUTES, HISTORY_DAYS, RETENTION_DAYS } from "@/lib/platform/data-api";

const ROUTE = "/platform/";

/**
 * A static document with a live dashboard inside it.
 *
 * ## Why this is no longer rendered per request
 *
 * It used to be. `revalidate = 0` plus a `searchParams` read made every arrival
 * a full React server render that also called Roblox, and that render measured
 * a median of 134 ms of CPU with a p90 of 709 ms. The Workers Free plan
 * terminates an invocation at 10 ms, which is what produced the site's
 * `error code: 1102` responses under load.
 *
 * So the page is prerendered once, for every query string, and everything that
 * changes is fetched by the browser from a separate data Worker that answers in
 * under 3 ms. `?ranking`, `?days` and `?experience` are read in the browser -
 * reading them here is precisely what made the route dynamic.
 *
 * ## What has to survive without that fetch
 *
 * Everything below the dashboard, and it is deliberately a lot. A crawler that
 * runs no JavaScript, and a reader whose request to the data Worker fails, must
 * still be told what this page measures, where the figures come from, how often
 * they are collected, how fresh they are, and what they cannot be used for.
 * None of that depends on today's numbers, so none of it waits for them.
 *
 * ## Canonical
 *
 * Stays the query-free `/platform/` for every ranking and range. The commentary,
 * the sourcing and the method are identical across them and only the table
 * changes, so emitting a canonical per combination would ask search engines to
 * index a dozen near-identical pages. The query string never changes the
 * document, only what the browser draws into it.
 */

interface PageProps {
  readonly locale: Locale;
}

export async function PlatformView({ locale }: PageProps) {
  const t = await getTranslator(locale, ["platform"]);
  const record = await localizedRoute(locale, ROUTE);
  const words = await loadWords(locale, PLATFORM_DASHBOARD_WORDS);

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader
          locale={locale}
          record={record}
          intro={t("platform.live.intro", { interval: String(COLLECTION_INTERVAL_MINUTES) })}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="live" jumpLabel={t("platform.live.jumpLabel")}>
            {record.quickAnswer}
          </QuickAnswer>

          {/*
            The dashboard renders its own four sections, headings included, so
            that those headings and their descriptions are part of the static
            document rather than appearing only once a fetch has succeeded.
          */}
          <PlatformDashboard words={words} />

          <noscript>
            <Callout tone="info" title={t("platform.dashboard.noScriptTitle")}>
              {t("platform.dashboard.noScriptBody")}
            </Callout>
          </noscript>

          <Section id="how" heading={t("platform.method.heading")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card tone="subtle">
                <h3 className="font-semibold text-(--color-text)">{t("platform.method.liveHeading")}</h3>
                <p className="mt-2 text-sm text-(--color-text-muted)">
                  {t("platform.method.liveBody", { interval: String(COLLECTION_INTERVAL_MINUTES) })}
                </p>
              </Card>
              <Card tone="subtle">
                <h3 className="font-semibold text-(--color-text)">{t("platform.method.historyHeading")}</h3>
                <p className="mt-2 text-sm text-(--color-text-muted)">
                  {t("platform.method.historyBody", {
                    interval: String(COLLECTION_INTERVAL_MINUTES),
                    retention: String(RETENTION_DAYS),
                    gameDays: String(HISTORY_DAYS),
                  })}
                </p>
              </Card>
            </div>

            {/*
              The freshness model, stated in the static document.

              Two clocks run on this page and a reader who assumes there is one
              will misread the older figures as current. Saying so here means it
              is said even when the dashboard has nothing to show.
            */}
            <Card tone="subtle" className="mt-4">
              <h3 className="font-semibold text-(--color-text)">{t("platform.method.freshnessHeading")}</h3>
              <p className="mt-2 text-sm text-(--color-text-muted)">
                {t("platform.method.freshnessBody", { interval: String(COLLECTION_INTERVAL_MINUTES) })}
              </p>
            </Card>

            <Callout tone="info" title={t("platform.method.provenanceTitle")} className="mt-4">
              {rich(t("platform.method.provenanceBody"), {
                payoutStatisticsLink: (
                  <InlineLink href={localizedPath(locale, "/roblox-stats/")}>
                    {t("platform.method.payoutStatisticsLink")}
                  </InlineLink>
                ),
              })}
            </Callout>
          </Section>

          {/*
            What the figures are not, without needing any of them to be present.
            This used to sit beside the platform total and therefore disappeared
            whenever the total did - exactly when a reader most needed it.
          */}
          <Section id="limits" heading={t("platform.limits.heading")} description={t("platform.limits.description")}>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
              <li>{t("platform.limits.notPlatformWide")}</li>
              <li>{t("platform.limits.rankedSubset")}</li>
              <li>{t("platform.limits.noBackfill")}</li>
              <li>{t("platform.limits.twoClocks")}</li>
              <li>{t("platform.limits.notPayout")}</li>
            </ul>
          </Section>

          <Section id="data" heading={t("platform.download.heading")} description={t("platform.download.description")}>
            <DataDownload
              heading={t("platform.download.innerHeading")}
              description={t("platform.download.innerDescription")}
              formats={[
                { label: t("platform.download.formats.csvTotals"), href: "/api/platform/?format=csv" },
                { label: t("platform.download.formats.csvPerExperience"), href: "/api/platform/?series=experiences&format=csv" },
                { label: t("platform.download.formats.jsonTotals"), href: "/api/platform/" },
              ]}
              limitations={[
                t("platform.download.limitations.noInterpolation"),
                t("platform.download.limitations.cadence"),
                t("platform.download.limitations.coverage"),
                t("platform.download.limitations.rowProvenance"),
              ]}
            />
          </Section>

          {/*
            Rendered directly rather than inside a `Section`.

            `FAQAccordion` emits its own `<section id="faqs">` with its own
            heading, so wrapping it in one produced two elements carrying the
            same id — which is invalid HTML, and which makes `#faqs` ambiguous
            for anything that targets it. The heading is passed through instead,
            so the page reads exactly as it did.
          */}
          <FAQAccordion locale={locale} faqs={record.faqs} heading={t("platform.faqsHeading")} />

          <EstimateDisclaimer locale={locale} />
          <RelatedLinks
            locale={locale}
            record={record}
            relationships={["sibling", "next-step", "parent"]}
            id="related"
          />
        </div>
      </Container>
    </>
  );
}
