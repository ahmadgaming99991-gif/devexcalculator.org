import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Callout, Card, Container, InlineLink, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";
import { rateRegistry } from "@/lib/calculations/rate-registry";
import { siteConfig } from "@/config/site";

const ROUTE = "/api/";

export const metadata: Metadata = buildMetadata(ROUTE);

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
 * The route is `/api/` and the file is `api-docs` because `/api` is already a
 * directory of route handlers; a `page.tsx` beside them would be ambiguous at
 * best. A rewrite in `next.config.ts` maps one to the other.
 */
export default function ApiPage() {
  const record = requireRoute(ROUTE);
  const base = `https://${siteConfig.host}`;

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs route={ROUTE} />
        <PageHeader
          record={record}
          intro="The rate registry this site calculates from, published as JSON with every source and verification date attached."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer jumpTo="rates" jumpLabel="See the endpoint">
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

          <Section id="using" heading="Using it">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card tone="subtle">
                <h3 className="font-semibold text-(--color-text)">No key, no sign-up</h3>
                <p className="mt-2 text-sm text-(--color-text-muted)">
                  There is nothing to register for and no token to keep secret.
                  Both endpoints are plain GETs, set no cookie, and answer
                  identically for every caller.
                </p>
              </Card>
              <Card tone="subtle">
                <h3 className="font-semibold text-(--color-text)">Callable from a browser</h3>
                <p className="mt-2 text-sm text-(--color-text-muted)">
                  Both send{" "}
                  <Code>Access-Control-Allow-Origin: *</Code>, so a page on any
                  origin can <Code>fetch</Code> them directly. That was not true
                  until recently, and it made the endpoints useless to exactly
                  the people they were published for.
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

          <RelatedLinks
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
