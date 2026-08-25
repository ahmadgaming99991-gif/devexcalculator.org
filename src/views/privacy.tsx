import { getTranslator } from "@/i18n/get-dictionary";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
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


/**
 * Privacy policy.
 *
 * Describes only what is actually configured on this deployment. The analytics
 * and contact sections read from the same configuration the rest of the site
 * uses, so the policy cannot claim something is switched off while it is
 * running — or the reverse.
 */
export async function PrivacyView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["legal"]);
  const record = await localizedRoute(locale, ROUTE);
  const contactMode = getContactMode();
  const contactEnabled = contactMode !== "disabled";

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("legal.privacy.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale}>{record.quickAnswer}</QuickAnswer>

          <p className="text-sm text-(--color-text-muted)">
            Last reviewed {formatDate(record.lastReviewedAt)}.
          </p>

          <Section id="calculations" heading={t("legal.privacy.calculationsHeading")}>
            <p className="text-(--color-text-muted)">{t("legal.privacy.body.calculations.p1")}</p>
            <p className="mt-3 text-(--color-text-muted)">{t("legal.privacy.body.calculations.p2")}</p>
          </Section>

          <Section id="local-storage" heading={t("legal.privacy.localStorageHeading")}>
            <p className="text-(--color-text-muted)">{" "}{t("legal.privacy.prose.localStorageIntro")}{" "}</p>
            <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
              <li>{t("legal.privacy.stored.currency")}</li>
              <li>{t("legal.privacy.stored.theme")}</li>
              <li>{t("legal.privacy.stored.feeControls")}</li>
              <li>{t("legal.privacy.stored.savedCalculations")}</li>
            </ul>
            <p className="mt-3 text-(--color-text-muted)">{t("legal.privacy.body.localStorage.p1")}<strong>{t("legal.privacy.clearHistory")}</strong>{t("legal.privacy.body.localStorage.p2")}</p>
          </Section>

          <Section id="analytics" heading={t("legal.privacy.analyticsHeading")}>
            {isAnalyticsEnabled ? (
              <>
                <p className="text-(--color-text-muted)">{t("legal.privacy.body.analytics.p1")}</p>
                <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
                  {analyticsConfig.cloudflareToken ? (
                    <li>
                      <strong className="text-(--color-text)">Cloudflare Web Analytics</strong>{t("legal.privacy.body.analytics.p2")}</li>
                  ) : null}
                  {analyticsConfig.ga4Id ? (
                    <li>
                      <strong className="text-(--color-text)">Google Analytics 4</strong>{t("legal.privacy.body.analytics.p3")}</li>
                  ) : null}
                </ul>
                <p className="mt-3 text-(--color-text-muted)">
                  Calculator values are never sent to analytics. Which pages are
                  visited is useful; how much Robux you hold is not our business.
                </p>
              </>
            ) : (
              <Callout tone="info" title={t("legal.privacy.noAnalyticsTitle")}>{" "}{t("legal.privacy.prose.noAnalytics")}{" "}</Callout>
            )}
          </Section>

          <Section id="contact" heading={t("legal.privacy.contactHeading")}>
            {contactEnabled ? (
              <>
                <p className="text-(--color-text-muted)">{" "}{t("legal.privacy.prose.contactForm")}{" "}</p>
                {isTurnstileEnabled ? (
                  <p className="mt-3 text-(--color-text-muted)">{t("legal.privacy.body.contact.p1")}</p>
                ) : null}
              </>
            ) : (
              <Callout tone="info" title={t("legal.privacy.noContactFormTitle")}>{t("legal.privacy.body.contact.p2")}</Callout>
            )}
          </Section>

          <Section id="infrastructure" heading={t("legal.privacy.infrastructureHeading")}>
            <p className="text-(--color-text-muted)">{" "}{t("legal.privacy.prose.infrastructure")}{" "}</p>
            <p className="mt-3 text-(--color-text-muted)">{t("legal.privacy.body.infrastructure.p1")}</p>
          </Section>

          <Section id="external" heading={t("legal.privacy.externalHeading")}>
            <p className="text-(--color-text-muted)">
              Pages here link to official Roblox documentation, to the European
              Central Bank, and to other sources listed in the{" "}
              <InlineLink href="/sources/">source registry</InlineLink>. Following
              one of those links takes you to a site with its own privacy
              practices, which this policy does not cover.
            </p>
          </Section>

          <Section id="rights" heading={t("legal.privacy.rightsHeading")}>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
              <li>{t("legal.privacy.body.rights.p1")}</li>
              <li>
                Clear every preference by clearing site data for{" "}
                {siteConfig.host} in your browser settings.
              </li>
              <li>{t("legal.privacy.body.rights.p4")}</li>
              {analyticsConfig.ga4Id ? (
                <li>{t("legal.privacy.declineNote")}</li>
              ) : null}
              <li>
                Contact us about anything in this policy through the{" "}
                <InlineLink href="/contact/">{t("legal.privacy.contactPageLink")}</InlineLink>.
              </li>
            </ul>
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
