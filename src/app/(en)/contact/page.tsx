import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Callout, Container, InlineLink, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";
import { ContactForm } from "@/features/contact/contact-form";
import { getContactMode, siteConfig, turnstileConfig } from "@/config/site";

const ROUTE = "/contact/";

export const metadata: Metadata = buildMetadata(ROUTE);

export default function ContactPage() {
  const record = requireRoute(ROUTE);
  const mode = getContactMode();
  const email = siteConfig.contactEmail;

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs route={ROUTE} />
        <PageHeader
          record={record}
          intro="Corrections are the most valuable thing you can send, especially with a link to the official page that contradicts what is published here."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer>{record.quickAnswer}</QuickAnswer>

          <Section id="form" heading="Get in touch">
            {mode === "disabled" ? (
              // No provider is configured, so no form is shown. Accepting a
              // message that would go nowhere is the one thing this page must
              // not do.
              email ? (
                <Callout tone="info" title="Email is the way to reach us">
                  Messages go to{" "}
                  <a href={`mailto:${email}`} className="font-semibold">
                    {email}
                  </a>
                  . Please include the page you were on and, for a correction, a
                  link to the official source.
                </Callout>
              ) : (
                <Callout tone="warning" title="Contact is not configured on this deployment">
                  No message form or published address is available here, and
                  showing one that quietly discarded your message would be worse
                  than saying so. If you have found a factual error, the fastest
                  route is to check the{" "}
                  <a href="/sources/">source registry</a> — it links every
                  official page these figures come from, so you can confirm the
                  current value directly.
                </Callout>
              )
            ) : (
              <>
                <ContactForm turnstileSiteKey={turnstileConfig.siteKey} />
                <p className="mt-4 text-xs text-(--color-text-muted)">
                  Your message and email address are used only to read and reply
                  to what you sent.{" "}
                  <InlineLink href="/privacy/">
                    How submissions are handled
                  </InlineLink>
                  .
                </p>
              </>
            )}
          </Section>

          <Section
            id="cannot-help"
            heading="What this site cannot help with"
            description="Not a brush-off — these are genuinely outside what an independent calculator can reach."
          >
            <ul className="flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
              <li>
                Your Roblox account, in any respect. This site has no connection
                to Roblox and no access to any account.
              </li>
              <li>
                A DevEx request that has been submitted, delayed, or declined.
                Only Roblox support can look at it.
              </li>
              <li>
                Recovering Robux, reversing a purchase, or anything involving your
                balance.
              </li>
              <li>
                Tax advice. Nobody here is qualified to give it, and the answer
                depends on your country and circumstances.
              </li>
              <li>
                Predicting whether a request will be approved or what a future
                rate will be.
              </li>
            </ul>

            <Callout tone="danger" title="Never send credentials" className="mt-4">
              This site will never ask for your Roblox password, a login code, or
              access to your account — and neither will any legitimate tool.
              Please do not include them in a message.
            </Callout>
          </Section>

          <RelatedLinks
            record={record}
            relationships={["prerequisite", "next-step", "parent"]}
            heading="Related pages"
            id="related"
          />
        </div>
      </Container>
    </>
  );
}
