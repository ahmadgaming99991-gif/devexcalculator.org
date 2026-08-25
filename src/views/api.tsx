import { getTranslator, type Translate } from "@/i18n/get-dictionary";
import { rich } from "@/i18n/rich";
import { localizedPath } from "@/i18n/locale-path";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Callout, Card, Container, InlineLink, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";
import { rateRegistry } from "@/lib/calculations/rate-registry";
import { siteConfig } from "@/config/site";

const ROUTE = "/api/";


/**
 * Documentation for the public endpoints.
 *
 * The rate registry has been served as JSON since launch, with its sources and
 * verification dates attached, and nothing pointed at it: no page mentioned it,
 * it was absent from the sitemap, and it sent no CORS header, so a browser on
 * any other origin could not read it at all. Published, and unusable.
 *
 * This page is the human half. It exists so the endpoint can be found, and so
 * the promises about it — no key, no cookie, versioned, sourced — are written
 * down somewhere a caller can hold the site to.
 *
 * It lives at `src/app/api/page.tsx`, beside the route handlers it documents.
 * A rewrite from a separate `api-docs` directory read more tidily and cost a
 * full Worker render on every request: the prerendered file sat at the other
 * path, so nothing could serve `/api/` from static assets. A page segment and a
 * route segment only collide when they are the same folder, which these are
 * not.
 */
export async function ApiView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["platform", "trust"]);
  const record = await localizedRoute(locale, ROUTE);
  const base = `https://${siteConfig.host}`;

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("trust.api.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="rates" jumpLabel={t("trust.api.jumpLabel")}>
            {record.quickAnswer}
          </QuickAnswer>

          <Section
            id="rates"
            heading={t("trust.api.ratesHeading")}
            description={t("trust.api.ratesDescription")}
          >
            <Endpoint t={t} url={`${base}/api/rates`} />

            <p className="mt-4 text-(--color-text-muted)">
              {rich(t("trust.api.prose.ratesVersion"), {
                registryVersion: <Code>registryVersion</Code>,
                lastVerifiedAt: <Code>lastVerifiedAt</Code>,
                rateCount: <Code>{rateRegistry.rates.length}</Code>,
              })}
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field name="rates[]" note={t("trust.api.fields.rates")} />
              <Field name="minimum" note={t("trust.api.fields.minimum")} />
              <Field name="marketplace" note={t("trust.api.fields.marketplaceFee")} />
              <Field name="sources[]" note={t("trust.api.fields.sources")} />
            </div>
          </Section>

          <Section
            id="fx"
            heading={t("trust.api.fxHeading")}
            description={t("trust.api.fxDescription")}
          >
            <Endpoint t={t} url={`${base}/api/fx/latest`} />

            <p className="mt-4 text-(--color-text-muted)">
              {rich(t("trust.api.prose.fxReference"), {
                fallback: <Code>FALLBACK</Code>,
                metaCache: <Code>meta.cache</Code>,
              })}
            </p>
          </Section>

          <Section
            id="stats"
            heading={t("trust.api.statsHeading")}
            description={t("trust.api.statsDescription")}
          >
            <Endpoint t={t} url={`${base}/api/stats`} />

            <p className="mt-4 text-(--color-text-muted)">
              {rich(t("trust.api.prose.stats"), {
                statisticsPage: (
                  <InlineLink href={localizedPath(locale, "/roblox-stats/")}>
                    {t("trust.api.statisticsPageLink")}
                  </InlineLink>
                ),
                formatCsv: <Code>?format=csv</Code>,
              })}
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field name="rows[]" note={t("trust.api.fields.statsRows")} />
              <Field name="notPublished[]" note={t("trust.api.fields.statsAbsences")} />
              <Field name="?format=csv" note={t("trust.api.fields.statsCsv")} />
              <Field name="?format=csv-unpublished" note={t("trust.api.fields.absencesCsv")} />
            </div>

            <p className="mt-4 text-(--color-text-muted)">{t("trust.api.body.stats.p2")}</p>
          </Section>

          <Section
            id="platform"
            heading={t("trust.api.platformHeading")}
            description={t("trust.api.platformDescription")}
          >
            <Endpoint t={t} url={`${base}/api/platform`} />

            <p className="mt-4 text-(--color-text-muted)">
              {rich(t("trust.api.prose.platform"), {
                platformPage: (
                  <InlineLink href={localizedPath(locale, "/platform/")}>
                    {t("trust.api.platformPageLink")}
                  </InlineLink>
                ),
                formatCsv: <Code>?format=csv</Code>,
                seriesExperiences: <Code>?series=experiences</Code>,
              })}
            </p>

            <p className="mt-4 text-(--color-text-muted)">
              <strong className="font-semibold text-(--color-text)">
                {t("trust.api.body.platform.p1")}
              </strong>{" "}
              {rich(t("trust.api.prose.platformGaps"), {
                status503: <Code>503</Code>,
              })}
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field name="rows[]" note={t("trust.api.fields.platformRows")} />
              <Field name="meta.notes[]" note={t("trust.api.fields.platformLimits")} />
              <Field name="?series=experiences" note={t("trust.api.fields.platformExperiences")} />
              <Field name="?format=csv" note={t("trust.api.fields.platformCsv")} />
            </div>
          </Section>

          <Section id="using" heading={t("trust.api.usingHeading")}>
            <Callout tone="info" title={t("trust.api.machineReadableTitle")}>
              <p>
                {rich(t("trust.api.prose.openapi"), {
                  openapiLink: (
                    <a href="/api/openapi.json">
                      <Code>/api/openapi.json</Code>
                    </a>
                  ),
                  cacheControl: <Code>Cache-Control</Code>,
                })}
              </p>
            </Callout>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Card tone="subtle">
                <h3 className="font-semibold text-(--color-text)">
                  {t("trust.api.terms.noKeyHeading")}
                </h3>
                <p className="mt-2 text-sm text-(--color-text-muted)">{t("trust.api.body.using.p2")}</p>
              </Card>
              <Card tone="subtle">
                <h3 className="font-semibold text-(--color-text)">{t("trust.api.terms.callableFromBrowser")}</h3>
                <p className="mt-2 text-sm text-(--color-text-muted)">
                  {rich(t("trust.api.prose.cors"), {
                    allowOrigin: <Code>Access-Control-Allow-Origin: *</Code>,
                    fetch: <Code>fetch</Code>,
                  })}
                </p>
              </Card>
              <Card tone="subtle">
                <h3 className="font-semibold text-(--color-text)">{t("trust.api.terms.cacheIt")}</h3>
                <p className="mt-2 text-sm text-(--color-text-muted)">
                  {rich(t("trust.api.prose.cacheIt"), {
                    cacheControl: <Code>Cache-Control</Code>,
                  })}
                </p>
              </Card>
              <Card tone="subtle">
                <h3 className="font-semibold text-(--color-text)">
                  {t("trust.api.terms.attributionHeading")}
                </h3>
                <p className="mt-2 text-sm text-(--color-text-muted)">
                  {rich(t("trust.api.prose.attribution"), {
                    sources: <Code>sources[]</Code>,
                  })}
                </p>
              </Card>
            </div>

            <div className="mt-6">
              <Example t={t} base={base} />
            </div>
          </Section>

          <Section id="terms" heading={t("trust.api.termsHeading")}>
            <p className="text-(--color-text-muted)">
              <strong className="text-(--color-text)">
                {t("trust.api.terms.promisedLabel")}
              </strong>{" "}
              {rich(t("trust.api.prose.promised"), {
                registryVersion: <Code>registryVersion</Code>,
                changelog: (
                  <InlineLink href={localizedPath(locale, "/changelog/")}>
                    {t("trust.api.changelogLink")}
                  </InlineLink>
                ),
              })}
            </p>
            <p className="mt-3 text-(--color-text-muted)">
              <strong className="text-(--color-text)">
                {t("trust.api.terms.notPromisedLabel")}
              </strong>{" "}
              {t("trust.api.body.terms.p2")}
            </p>

            <Callout tone="info" title={t("trust.api.robloxFiguresTitle")}>
              {rich(t("trust.api.prose.robloxFigures"), {
                methodology: (
                  <InlineLink href={localizedPath(locale, "/methodology/")}>
                    {t("platform.stats.methodologyLink")}
                  </InlineLink>
                ),
              })}
            </Callout>
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

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-(--color-surface-subtle) px-1.5 py-0.5 text-sm">
      {children}
    </code>
  );
}

/**
 * The endpoint itself, as a link.
 *
 * A URL a reader can click and immediately see the JSON is worth more than a
 * styled box they have to copy out by hand.
 */
function Endpoint({ url, t }: { url: string; readonly t: Translate }) {
  return (
    <Card>
      <p className="text-sm font-semibold text-(--color-text-muted)">
        {t("trust.api.endpointLabel")}
      </p>
      <p className="mt-1 break-all">
        <a
          href={url}
          className="font-mono text-sm font-semibold text-(--color-primary) underline underline-offset-2 hover:text-(--color-primary-strong)"
        >
          {url}
        </a>
      </p>
    </Card>
  );
}

function Field({ name, note }: { name: string; note: string }) {
  return (
    <Card tone="subtle">
      <p className="font-mono text-sm font-semibold text-(--color-text)">{name}</p>
      <p className="mt-1 text-sm text-(--color-text-muted)">{note}</p>
    </Card>
  );
}

/**
 * A worked example.
 *
 * Rendered as static text rather than a copy button: this page ships no client
 * JavaScript, and a reader can select four lines perfectly well themselves.
 */
function Example({ base,
  t,
}: { base: string;
  readonly t: Translate;
}) {
  const snippet = `const response = await fetch("${base}/api/rates");
const { data } = await response.json();

const standard = data.rates.find((rate) => rate.id === "standard-current");
console.log(standard.value, data.registryVersion, data.lastVerifiedAt);`;

  return (
    <figure className="m-0">
      <figcaption className="mb-2 text-sm font-semibold text-(--color-text)">{t("trust.api.body.related.p1")}</figcaption>
      <pre className="overflow-x-auto rounded-(--radius-control) border border-(--color-border) bg-(--color-surface-subtle) p-4 text-sm">
        <code>{snippet}</code>
      </pre>
    </figure>
  );
}
