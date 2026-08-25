import { rich } from "@/i18n/rich";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge, Container, Section, SourceLink } from "@/components/ui";
import { RateSourceCheck } from "@/components/layout/rate-source-check";
import { sourceCheckWords } from "@/components/layout/source-check-words";
import { getTranslator } from "@/i18n/get-dictionary";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";
import { rateRegistry, registryFreshness, sources } from "@/lib/calculations/rate-registry";
import { formatDate } from "@/lib/calculations/format";

const ROUTE = "/sources/";


export async function SourcesView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["trust"]);
  const record = await localizedRoute(locale, ROUTE);
  const freshness = registryFreshness();

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="wide">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("trust.sources.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="registry" jumpLabel={t("trust.sources.jumpLabel")}>
            {record.quickAnswer}
          </QuickAnswer>

          <Section
            id="registry"
            heading={t("trust.sources.registryHeading")}
            description={t("trust.sources.registryDescription")}
          >
            <div className="flex flex-col gap-4">
              {sources.sources.map((source) => (
                <article
                  key={source.id}
                  className="rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold text-(--color-text)">
                      <SourceLink t={t} href={source.url}>{source.title}</SourceLink>
                    </h3>
                    <Badge tone="neutral">{source.evidenceLabel}</Badge>
                  </div>

                  <p className="mt-1 text-sm text-(--color-text-muted)">{source.publisher}</p>

                  <h4 className="mt-3 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">{t("trust.sources.body.registry.p1")}</h4>
                  <ul className="mt-1.5 flex list-disc flex-col gap-1.5 pl-5 text-sm text-(--color-text-muted)">
                    {source.factsSupported.map((fact) => (
                      <li key={fact}>{fact}</li>
                    ))}
                  </ul>

                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-(--color-text-muted)">
                    <div className="flex gap-1.5">
                      <dt className="font-semibold">{t("trust.sources.lastChecked")}</dt>
                      <dd>{formatDate(source.lastCheckedAt)}</dd>
                    </div>
                    {source.effectiveDate ? (
                      <div className="flex gap-1.5">
                        <dt className="font-semibold">{t("trust.sources.effectiveFrom")}</dt>
                        <dd>{formatDate(source.effectiveDate)}</dd>
                      </div>
                    ) : null}
                    <div className="flex gap-1.5">
                      <dt className="font-semibold">{t("trust.sources.reviewCadenceLabel")}</dt>
                      <dd>every {source.reviewCadenceDays} days</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          </Section>

          <Section
            id="cadence"
            heading={t("trust.sources.cadenceHeading")}
            description={t("trust.sources.cadenceDescription")}
          >
            <div className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4">
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-(--color-text-muted)">{t("trust.sources.registryVersionLabel")}</dt>
                  <dd className="font-semibold text-(--color-text)">
                    {rateRegistry.registryVersion}
                  </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-(--color-text-muted)">{t("trust.sources.ratesLastVerified")}</dt>
                  <dd className="font-semibold text-(--color-text)">
                    {t("trust.sources.body.cadence.p2", {
                      lastVerifiedAt: formatDate(rateRegistry.lastVerifiedAt),
                      ageDays: freshness.ageDays,
                    })}
                  </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-(--color-text-muted)">{t("trust.sources.reviewDueAfter")}</dt>
                  <dd className="font-semibold text-(--color-text)">
                    {rateRegistry.reviewCadenceDays} days
                  </dd>
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <dt className="text-(--color-text-muted)">{t("trust.sources.escalatesAfter")}</dt>
                  <dd className="font-semibold text-(--color-text)">
                    {rateRegistry.criticalReviewAgeDays} days
                  </dd>
                </div>
              </dl>
            </div>

            {/*
              The automatic half of the cadence, and the reason the figures
              above can be trusted between reviews. Renders nothing until a
              check has run, so it cannot reassure on the strength of a check
              that did not happen.
            */}
            <RateSourceCheck
              words={sourceCheckWords(locale, t)}
              className="mt-4 rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4 text-sm text-(--color-text-muted)"
            />

            <p className="mt-4 text-(--color-text-muted)">
              {rich(t("trust.sources.prose.scheduledCheck"), {
                rateCheckEndpoint: (
                  /*
                   * An API endpoint, not a page. `next/link` prefetches and
                   * client-navigates, neither of which applies to JSON.
                   */
                  // eslint-disable-next-line @next/next/no-html-link-for-pages
                  <a
                    href="/api/rate-check/"
                    className="underline hover:text-(--color-primary)"
                  >
                    /api/rate-check/
                  </a>
                ),
              })}
            </p>

            <p className="mt-4 text-(--color-text-muted)">{t("trust.sources.body.cadence.p1")}</p>
          </Section>

          <RelatedLinks locale={locale}
            record={record}
            relationships={["sibling", "next-step", "parent"]}
            id="related"
          />
        </div>
      </Container>
    </>
  );
}
