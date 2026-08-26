import { getTranslator } from "@/i18n/get-dictionary";
import { rich } from "@/i18n/rich";
import { localizedPath } from "@/i18n/locale-path";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Callout, Container, InlineLink, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";

const ROUTE = "/about/";


export async function AboutView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["trust"]);
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("trust.about.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale}>{record.quickAnswer}</QuickAnswer>

          <Section id="purpose" heading={t("trust.about.purposeHeading")}>
            <div className="flex flex-col gap-3 text-(--color-text-muted)">
              <p>{t("trust.about.body.purpose.p1")}</p>
              <p>{t("trust.about.body.purpose.p2")}</p>
              <p>{t("trust.about.body.purpose.p3")}</p>
            </div>
          </Section>

          <Section id="principles" heading={t("trust.about.principlesHeading")}>
            <ul className="flex flex-col gap-3 text-(--color-text-muted)">
              <li>
                <strong className="text-(--color-text)">{t("trust.about.principles.rateHasSource")}</strong>
                  {t("trust.about.principles.rateHasSourceBody")}
                </li>
              <li>
                <strong className="text-(--color-text)">{t("trust.about.principles.exactArithmetic")}</strong>
                  {t("trust.about.body.principles.p1")}
                <InlineLink href={localizedPath(locale, "/methodology/")}>{t("trust.about.principles.methodologyExplains")}</InlineLink>.
                          </li>
                          <li>
                            <strong className="text-(--color-text)">{t("trust.about.principles.worksWithoutJs")}</strong>
                  {t("trust.about.body.principles.p2")}
                </li>
              <li>
                <strong className="text-(--color-text)">{t("trust.about.principles.nothingCollected")}</strong>
                  {t("trust.about.body.principles.p3")}
                <InlineLink href={localizedPath(locale, "/privacy/")}>{t("trust.about.principles.privacyIsSpecific")}{" "}</InlineLink>.
                          </li>
                          <li>
                            <strong className="text-(--color-text)">
                              {t("trust.about.principles.correctionsPublished")}
                            </strong>{" "}
                            {rich(t("trust.about.principles.correctionsPublishedBody"), {
                              changelog: (
                                <InlineLink href={localizedPath(locale, "/changelog/")}>
                                  {t("trust.api.changelogLink")}
                                </InlineLink>
                              ),
                            })}
                          </li>
                        </ul>
                      </Section>
            
                      <Section id="limits" heading={t("trust.about.limitsHeading")}>
                        <ul className="flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
                          <li>{t("trust.about.body.limits.p1")}</li>
                          <li>{" "}{t("trust.about.limits.noUniversalPrice")}{" "}</li>
                          <li>{t("trust.about.body.limits.p2")}</li>
                          <li>{t("trust.about.body.limits.p3")}</li>
                          <li>{t("trust.about.body.limits.p4")}</li>
                          <li>{t("trust.about.body.limits.p5")}</li>
                        </ul>
                      </Section>
            
                      <Section id="affiliation" heading={t("trust.about.affiliationHeading")}>
                        <Callout tone="warning" title={t("trust.about.independentTitle")}>{t("trust.about.body.affiliation.p1")}</Callout>
                      </Section>
            
                      <RelatedLinks locale={locale}
                        record={record}
                        relationships={["next-step", "sibling", "parent"]}
                        id="related"
                      />
                    </div>
                  </Container>
                </>
  );
}
