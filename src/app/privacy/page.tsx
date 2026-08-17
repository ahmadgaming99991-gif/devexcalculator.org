import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { requireRoute } from "@/lib/content/route-registry";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Callout, Container, InlineLink, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";
import {
  analyticsConfig,
  getContactMode,
  isAnalyticsEnabled,
  isTurnstileEnabled,
  siteConfig,
} from "@/config/site";
import { formatDate } from "@/lib/calculations/format";

const ROUTE = "/privacy/";

export const metadata: Metadata = buildMetadata(ROUTE);

/**
 * Privacy policy.
 *
 * Describes only what is actually configured on this deployment. The analytics
 * and contact sections read from the same configuration the rest of the site
 * uses, so the policy cannot claim something is switched off while it is
 * running — or the reverse.
 */
export default function PrivacyPage() {
  const record = requireRoute(ROUTE);
  const contactMode = getContactMode();
  const contactEnabled = contactMode !== "disabled";

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs route={ROUTE} />
        <PageHeader
          record={record}
          intro="What this site stores, what it does not, and which third parties are involved — describing this deployment specifically rather than a generic template."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer>{record.quickAnswer}</QuickAnswer>

          <p className="text-sm text-[--color-text-muted]">
            Last reviewed {formatDate(record.lastReviewedAt)}.
          </p>

          <Section id="calculations" heading="Your calculations">
            <p className="text-[--color-text-muted]">
              Every calculation runs in your browser. The amounts you type, the
              rate you select and the results are never transmitted to a server,
              because the arithmetic does not need a server to happen.
            </p>
            <p className="mt-3 text-[--color-text-muted]">
              One consequence worth understanding: when you use the share button,
              your figures are placed in the URL. That link is safe to share —
              it contains an amount and a rate, nothing about you — but it is
              still a link containing your numbers, so treat it the way you would
              treat any link you send someone.
            </p>
          </Section>

          <Section id="local-storage" heading="Local storage">
            <p className="text-[--color-text-muted]">
              With your action, this site stores a few things in your own
              browser&rsquo;s local storage:
            </p>
            <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-[--color-text-muted]">
              <li>Your preferred display currency</li>
              <li>Your colour theme choice, if you change it</li>
              <li>Whether you had the fee and tax controls open</li>
              <li>Calculations you explicitly chose to save, up to ten</li>
            </ul>
            <p className="mt-3 text-[--color-text-muted]">
              None of it leaves your device. There is no account, nothing is
              synced, and clearing your browser data removes all of it. The
              calculator also has a <strong>Clear history</strong> button that
              removes saved calculations immediately. If local storage is
              unavailable — private browsing, or storage blocked — everything
              still works, it simply forgets between visits.
            </p>
          </Section>

          <Section id="analytics" heading="Analytics">
            {isAnalyticsEnabled ? (
              <>
                <p className="text-[--color-text-muted]">
                  This deployment has analytics enabled:
                </p>
                <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-[--color-text-muted]">
                  {analyticsConfig.cloudflareToken ? (
                    <li>
                      <strong className="text-[--color-text]">Cloudflare Web Analytics</strong> —
                      cookieless, and records page views rather than individuals.
                      No consent prompt is shown because no cookie is set.
                    </li>
                  ) : null}
                  {analyticsConfig.ga4Id ? (
                    <li>
                      <strong className="text-[--color-text]">Google Analytics 4</strong> — sets
                      cookies, so it loads only after you accept the prompt. It
                      starts in a denied state and stays there unless you choose
                      otherwise.
                    </li>
                  ) : null}
                </ul>
                <p className="mt-3 text-[--color-text-muted]">
                  Calculator values are never sent to analytics. Which pages are
                  visited is useful; how much Robux you hold is not our business.
                </p>
              </>
            ) : (
              <Callout tone="info" title="No analytics are running on this deployment">
                No analytics provider is configured, so no tracking script is
                loaded and no analytics cookie is set. If that changes, this
                section changes with it — it reads from the same configuration
                the site uses, so it cannot fall out of step.
              </Callout>
            )}
          </Section>

          <Section id="contact" heading="Contact submissions">
            {contactEnabled ? (
              <>
                <p className="text-[--color-text-muted]">
                  If you send a message through the contact form, the name, email
                  address, subject and message you enter are transmitted to this
                  site&rsquo;s server and forwarded to the configured destination so it
                  can be read and replied to. They are used for nothing else, and
                  message content is not written to server logs.
                </p>
                {isTurnstileEnabled ? (
                  <p className="mt-3 text-[--color-text-muted]">
                    The form is protected by Cloudflare Turnstile, which checks
                    that a submission comes from a person rather than a script.
                    Turnstile is provided by Cloudflare and processes a token
                    along with your IP address for that check.
                  </p>
                ) : null}
              </>
            ) : (
              <Callout tone="info" title="No contact form is active on this deployment">
                No submission provider is configured, so there is no form to
                submit and no message data is collected or stored.
              </Callout>
            )}
          </Section>

          <Section id="infrastructure" heading="Hosting and server logs">
            <p className="text-[--color-text-muted]">
              This site runs on Cloudflare Workers. As with any web host,
              Cloudflare processes the requests needed to serve pages, which
              involves your IP address and browser user agent, and it applies its
              own network-level security handling. That processing is governed by
              Cloudflare&rsquo;s own privacy terms rather than by this site.
            </p>
            <p className="mt-3 text-[--color-text-muted]">
              This site does not operate a database. There is nowhere for personal
              data to accumulate because no such store exists.
            </p>
          </Section>

          <Section id="external" heading="External links">
            <p className="text-[--color-text-muted]">
              Pages here link to official Roblox documentation, to the European
              Central Bank, and to other sources listed in the{" "}
              <InlineLink href="/sources/">source registry</InlineLink>. Following
              one of those links takes you to a site with its own privacy
              practices, which this policy does not cover.
            </p>
          </Section>

          <Section id="rights" heading="Your choices">
            <ul className="flex list-disc flex-col gap-2 pl-5 text-[--color-text-muted]">
              <li>
                Clear saved calculations at any time with the Clear history button
                in the calculator.
              </li>
              <li>
                Clear every preference by clearing site data for{" "}
                {siteConfig.host} in your browser settings.
              </li>
              <li>
                Use the site with local storage blocked entirely — everything
                works, nothing is remembered.
              </li>
              {analyticsConfig.ga4Id ? (
                <li>Decline analytics cookies when prompted, or clear site data to be asked again.</li>
              ) : null}
              <li>
                Contact us about anything in this policy through the{" "}
                <InlineLink href="/contact/">contact page</InlineLink>.
              </li>
            </ul>
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
