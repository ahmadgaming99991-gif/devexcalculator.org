import { getTranslator } from "@/i18n/get-dictionary";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Container, InlineLink, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";
import { formatDate } from "@/lib/calculations/format";
import { siteConfig } from "@/config/site";

const ROUTE = "/terms/";


export async function TermsView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["legal"]);
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("legal.terms.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale}>{record.quickAnswer}</QuickAnswer>

          <p className="text-sm text-(--color-text-muted)">
            {t("legal.terms.body.intro.p1", {
              lastReviewedAt: formatDate(record.lastReviewedAt),
            })}
          </p>

          <Section id="use" heading={t("legal.terms.useHeading")}>
            <p className="text-(--color-text-muted)">
              {t("legal.terms.body.use.p1", {
                host: siteConfig.host,
              })}
            </p>
            <p className="mt-3 text-(--color-text-muted)">{t("legal.terms.body.use.p3")}</p>
          </Section>

          <Section id="estimates" heading={t("legal.terms.estimatesHeading")}>
            <p className="text-(--color-text-muted)">{t("legal.terms.body.estimates.p1")}</p>
            <p className="mt-3 text-(--color-text-muted)">
              {t("legal.terms.body.estimates.p2")}
            <InlineLink href="/sources/">source registry</InlineLink>{t("legal.terms.body.estimates.p3")}</p>
                  </Section>
        
                  <Section id="affiliation" heading={t("legal.terms.affiliationHeading")}>
                    <p className="text-(--color-text-muted)">{t("legal.terms.body.affiliation.p1")}</p>
                    <p className="mt-3 text-(--color-text-muted)">{t("legal.terms.body.affiliation.p2")}</p>
                  </Section>
        
                  <Section id="liability" heading={t("legal.terms.liabilityHeading")}>
                    <p className="text-(--color-text-muted)">{t("legal.terms.body.liability.p1")}</p>
                    <p className="mt-3 text-(--color-text-muted)">{t("legal.terms.body.liability.p2")}</p>
                  </Section>
        
                  <Section id="changes" heading={t("legal.terms.changesHeading")}>
                    <p className="text-(--color-text-muted)">
              {t("legal.terms.body.changes.p1")}
            <InlineLink href="/changelog/">changelog</InlineLink>{t("legal.terms.body.changes.p2")}</p>
                  </Section>
        
                  <RelatedLinks locale={locale}
                    record={record}
                    relationships={["sibling", "parent"]}
                    id="related"
                  />
                </div>
              </Container>
            </>
  );
}
