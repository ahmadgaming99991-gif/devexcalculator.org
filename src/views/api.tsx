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
  const record = await localizedRoute(locale, ROUTE);
  const base = `https://${siteConfig.host}`;

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro="The rate registry this site calculates from, published as JSON with every source and verification date attached."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale} jumpTo="rates" jumpLabel="See the endpoint">
            {record.quickAnswer}
          </QuickAnswer>

          <Section
            id="rates"
            heading="GET /api/rates"
            description="The current DevEx rates, the minimum, the marketplace fee, and the sources each was verified against."
          >
            <Endpoint url={`${base}/api/rates`} />

            <p className="mt-4 text-(--color-text-muted)">
              The response carries a <Code>registryVersion</Code> and a{" "}
              <Code>lastVerifiedAt</Code>. Those two fields are the point: a rate
              on its own is a number that may already be wrong, and this site
              changed rate once already — the September 2025 move from $0.0035 to
              $0.0038 per Robux, which is why{" "}
              <Code>{rateRegistry.rates.length}</Code> rates are published rather
              than one. Read the version, and you can tell whether what you
              cached is still what this site is serving.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field name="rates[]" note="id, label, value per Robux, status and the source it came from" />
              <Field name="minimum" note="The Earned Robux balance Roblox requires before a request can be submitted" />
              <Field name="marketplace" note="The marketplace fee percentage, for sale-side calculations" />
              <Field name="sources[]" note="Publisher, title, URL and the date each was last checked" />
            </div>
          </Section>

          <Section
            id="fx"
            heading="GET /api/fx/latest"
            description="European Central Bank reference rates, for showing a payout in a currency other than US dollars."
          >
            <Endpoint url={`${base}/api/fx/latest`} />

            <p className="mt-4 text-(--color-text-muted)">
              These are reference rates, not a dealing rate: nobody converts
              money at them. They are published by the ECB once per working day,
              and the response says which day it is reporting. If the provider
              cannot be reached, a bundled snapshot is returned and marked{" "}
              <Code>FALLBACK</Code> rather than passed off as current — so check{" "}
              <Code>meta.cache</Code> before treating a figure as today&rsquo;s.
            </p>
          </Section>

          <Section
            id="stats"
            heading="GET /api/stats"
            description="Roblox's reported creator payouts and engagement, as rows, with every figure labelled reported or derived."
          >
            <Endpoint url={`${base}/api/stats`} />

            <p className="mt-4 text-(--color-text-muted)">
              The figures charted on{" "}
              <InlineLink href="/roblox-stats/">the statistics page</InlineLink>,
              published as data so a chart can be checked rather than believed.
              Add <Code>?format=csv</Code> for a spreadsheet. Every row names its
              filing and links to it, and every row says whether Roblox reported
              the figure or this site derived it — a distinction that disappears
              the moment two numbers sit in the same column without it.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field name="rows[]" note="metric, period, value, unit, origin, source and the URL of the filing" />
              <Field name="notPublished[]" note="Metrics Roblox does not publish, with the reason each is absent" />
              <Field name="?format=csv" note="The same rows as a downloadable CSV" />
              <Field name="?format=csv-unpublished" note="The absences as their own CSV" />
            </div>

            <p className="mt-4 text-(--color-text-muted)">
              Money is an exact decimal string, never a floating-point number.
              A figure read from a filing is reproduced as written.
            </p>
          </Section>

          <Section
            id="platform"
            heading="GET /api/platform"
            description="The player-count observations this site has collected, exactly as collected."
          >
            <Endpoint url={`${base}/api/platform`} />

            <p className="mt-4 text-(--color-text-muted)">
              What{" "}
              <InlineLink href="/platform/">the platform page</InlineLink> charts.
              Add <Code>?format=csv</Code> for a spreadsheet, or{" "}
              <Code>?series=experiences</Code> for per-experience rows rather than
              totals. Reading it makes no request to Roblox: the collector does
              that on its own schedule, and an export that triggered an upstream
              fetch would let anyone raise this site&rsquo;s request rate against
              Roblox by reloading a URL.
            </p>

            <p className="mt-4 text-(--color-text-muted)">
              <strong className="font-semibold text-(--color-text)">
                Nothing is filled in.
              </strong>{" "}
              A gap means the collector did not run at that moment, and the gap
              is left in — no interpolation, no carry-forward, no back-fill. When
              no observations can be read at all the endpoint answers{" "}
              <Code>503</Code> rather than an empty list, because an empty file
              is indistinguishable from a period with no players.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field name="rows[]" note="observed_at, the count, and the origin and source of each observation" />
              <Field name="meta.notes[]" note="Retention, resolution and coverage limits, in the response itself" />
              <Field name="?series=experiences" note="Per-experience rows, sampled hourly and kept seven days" />
              <Field name="?format=csv" note="Either series as a downloadable CSV" />
            </div>
          </Section>

          <Section id="using" heading="Using it">
            <Callout tone="info" title="A machine-readable description">
              <p>
                <a href="/api/openapi.json">
                  <Code>/api/openapi.json</Code>
                </a>{" "}
                describes every endpoint here as OpenAPI 3.1 — parameters,
                status codes, content types and the exact{" "}
                <Code>Cache-Control</Code> each one sends. It is generated from
                the same declaration this page reads, and a test compares that
                declaration against the route handlers that actually exist, so
                an endpoint cannot be added without appearing in it or described
                after it has gone.
              </p>
            </Callout>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Card tone="subtle">
                <h3 className="font-semibold text-(--color-text)">No key, no sign-up</h3>
                <p className="mt-2 text-sm text-(--color-text-muted)">
                  There is nothing to register for and no token to keep secret.
                  Every reference endpoint is a plain GET, sets no cookie, and
                  answers identically for every caller.
                </p>
              </Card>
              <Card tone="subtle">
                <h3 className="font-semibold text-(--color-text)">Callable from a browser</h3>
                <p className="mt-2 text-sm text-(--color-text-muted)">
                  Every reference endpoint sends{" "}
                  <Code>Access-Control-Allow-Origin: *</Code>, so a page on any
                  origin can <Code>fetch</Code> it directly. That was not true
                  until recently, and it made the endpoints useless to exactly
                  the people they were published for. The two that do not are
                  deliberate: health is infrastructure for an operator, and
                  contact accepts submissions and is origin-checked.
                </p>
              </Card>
              <Card tone="subtle">
                <h3 className="font-semibold text-(--color-text)">Cache it</h3>
                <p className="mt-2 text-sm text-(--color-text-muted)">
                  Rates change rarely — twice in the programme&rsquo;s history at
                  the time of writing. The responses carry{" "}
                  <Code>Cache-Control</Code> and are safe to hold for an hour or
                  a day. Please do not poll them every second; there is no rate
                  limit and it would be a waste of both our bandwidth.
                </p>
              </Card>
              <Card tone="subtle">
                <h3 className="font-semibold text-(--color-text)">Attribution</h3>
                <p className="mt-2 text-sm text-(--color-text-muted)">
                  Not required, and appreciated. If you cite a figure, cite the
                  source in <Code>sources[]</Code> alongside it — that is
                  Roblox&rsquo;s own documentation, and it is what makes the
                  number checkable rather than borrowed.
                </p>
              </Card>
            </div>

            <div className="mt-6">
              <Example base={base} />
            </div>
          </Section>

          <Section id="terms" heading="What is promised, and what is not">
            <p className="text-(--color-text-muted)">
              <strong className="text-(--color-text)">Promised:</strong> the
              shape of the response will not change without the{" "}
              <Code>registryVersion</Code> changing, every figure will carry the
              source it was verified against, and a rate will never be updated
              from a scraped page without a person checking it first. Changes are
              recorded in{" "}
              <InlineLink href="/changelog/">the changelog</InlineLink>.
            </p>
            <p className="mt-3 text-(--color-text-muted)">
              <strong className="text-(--color-text)">Not promised:</strong> an
              uptime figure, a support commitment, or that this endpoint exists
              forever. It is a free convenience served from the same deployment
              as the site, not a product with a contract behind it. If you are
              building something that must not break, cache the response and fail
              back to your own copy.
            </p>

            <Callout tone="info" title="These are Roblox's figures, not this site's">
              Every rate here is what Roblox currently documents, recorded on the
              verification date shown. Roblox decides which rate applies to which
              balance and whether any DevEx request is approved. Read{" "}
              <InlineLink href="/methodology/">the methodology</InlineLink> for
              how each figure gets from their documentation into this response.
            </Callout>
          </Section>

          <RelatedLinks locale={locale}
            record={record}
            relationships={["sibling", "next-step", "parent"]}
            heading="Related pages"
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
function Endpoint({ url }: { url: string }) {
  return (
    <Card>
      <p className="text-sm font-semibold text-(--color-text-muted)">Endpoint</p>
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
function Example({ base }: { base: string }) {
  const snippet = `const response = await fetch("${base}/api/rates");
const { data } = await response.json();

const standard = data.rates.find((rate) => rate.id === "standard-current");
console.log(standard.value, data.registryVersion, data.lastVerifiedAt);`;

  return (
    <figure className="m-0">
      <figcaption className="mb-2 text-sm font-semibold text-(--color-text)">
        Reading the standard rate
      </figcaption>
      <pre className="overflow-x-auto rounded-(--radius-control) border border-(--color-border) bg-(--color-surface-subtle) p-4 text-sm">
        <code>{snippet}</code>
      </pre>
    </figure>
  );
}
