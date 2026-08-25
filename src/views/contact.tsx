import { loadWords } from "@/i18n/client-words";
import { getTranslator } from "@/i18n/get-dictionary";
import Link from "next/link";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Callout, Container, InlineLink, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";
import { ContactForm } from "@/features/contact/contact-form";
import { CONTACT_WORDS } from "@/features/contact/contact-form.words";
import { getContactMode, siteConfig, turnstileConfig } from "@/config/site";

const ROUTE = "/contact/";


export async function ContactView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["contact"]);
  const record = await localizedRoute(locale, ROUTE);
  const mode = getContactMode();
  const email = siteConfig.contactEmail;

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("contact.page.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale}>{record.quickAnswer}</QuickAnswer>

          <Section id="form" heading={t("contact.page.formHeading")}>
            {mode === "disabled" ? (
              // No provider is configured, so no form is shown. Accepting a
              // message that would go nowhere is the one thing this page must
              // not do.
              email ? (
                <Callout tone="info" title={t("contact.page.emailIsTheWayTitle")}>
                  Messages go to{" "}
                  <a href={`mailto:${email}`} className="font-semibold">
                    {email}
                  </a>
                  . Please include the page you were on and, for a correction, a
                  link to the official source.
                </Callout>
              ) : (
                <Callout tone="warning" title={t("contact.page.notConfiguredTitle")}>
                  No message form or published address is available here, and
                  showing one that quietly discarded your message would be worse
                  than saying so. If you have found a factual error, the fastest
                  route is to check the{" "}
                  <Link href="/sources/">source registry</Link>{t("contact.page.body.form.p3")}</Callout>
              )
            ) : (
              <>
                <ContactForm words={await loadWords(locale, CONTACT_WORDS)} turnstileSiteKey={turnstileConfig.siteKey} />
                <p className="mt-4 text-xs text-(--color-text-muted)">
                  Your message and email address are used only to read and reply
                  to what you sent.{" "}
                  <InlineLink href="/privacy/">{t("contact.page.body.form.p5")}</InlineLink>
                  .
                </p>
              </>
            )}
          </Section>

          <Section
            id="cannot-help"
            heading={t("contact.page.cannotHelpHeading")}
            description={t("contact.page.cannotHelpDescription")}
          >
            <ul className="flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
              <li>{t("contact.page.body.cannotHelp.p1")}</li>
              <li>{t("contact.page.body.cannotHelp.p2")}</li>
              <li>{t("contact.page.body.cannotHelp.p3")}</li>
              <li>{t("contact.page.body.cannotHelp.p4")}</li>
              <li>{t("contact.page.body.cannotHelp.p5")}</li>
            </ul>

            <Callout tone="danger" title={t("contact.page.neverSendCredentialsTitle")} className="mt-4">{t("contact.page.body.cannotHelp.p6")}</Callout>
          </Section>

          <RelatedLinks locale={locale}
            record={record}
            relationships={["prerequisite", "next-step", "parent"]}
            id="related"
          />
        </div>
      </Container>
    </>
  );
}
