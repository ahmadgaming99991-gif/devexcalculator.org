import { getTranslator } from "@/i18n/get-dictionary";
import { rich } from "@/i18n/rich";
import { localizedPath } from "@/i18n/locale-path";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ButtonLink, Callout, Container, InlineLink, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";

const ROUTE = "/corrections/";


export async function CorrectionsView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["navigation", "trust"]);
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("trust.corrections.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale}>{record.quickAnswer}</QuickAnswer>

          <Section id="report" heading={t("trust.corrections.reportHeading")}>
            <p className="text-(--color-text-muted)">{t("trust.corrections.body.report.p1")}</p>
            <div className="mt-4">
              <ButtonLink href={localizedPath(locale, "/contact/")}>{t("trust.corrections.reportButton")}</ButtonLink>
            </div>

            <Callout tone="info" title={t("trust.corrections.cannotHelpTitle")} className="mt-6">{t("trust.corrections.body.report.p2")}</Callout>
          </Section>

          <Section
            id="process"
            heading={t("trust.corrections.nextHeading")}
            description={t("trust.corrections.nextDescription")}
          >
            <ol className="flex list-decimal flex-col gap-3 pl-5 text-(--color-text-muted)">
              <li>
                <strong className="text-(--color-text)">{t("trust.corrections.steps.verify")}</strong>
                  {t("trust.corrections.steps.verifyBody")}
                </li>
              <li>
                <strong className="text-(--color-text)">{t("trust.corrections.steps.updateRegistry")}</strong>
                  {t("trust.corrections.body.process.p1")}
                </li>
              <li>
                <strong className="text-(--color-text)">{t("trust.corrections.steps.updateTests")}</strong>{t("trust.corrections.body.process.p2")}</li>
              <li>
                <strong className="text-(--color-text)">{t("trust.corrections.steps.reviewPages")}</strong>
                  {t("trust.corrections.body.process.p3")}
                </li>
              <li>
                <strong className="text-(--color-text)">{t("trust.corrections.steps.recordChangelog")}</strong>
                  {t("trust.corrections.body.process.p4")}
                </li>
              <li>
                <strong className="text-(--color-text)">{t("trust.corrections.steps.updateDate")}</strong>
                  {t("trust.corrections.body.process.p5")}
                </li>
              <li>
                <strong className="text-(--color-text)">{t("trust.corrections.steps.deploy")}</strong>{t("trust.corrections.body.process.p6")}</li>
            </ol>
          </Section>

          <Section id="record" heading={t("trust.corrections.recordHeading")}>
            <p className="text-(--color-text-muted)">
              {rich(t("trust.corrections.prose.publiclyIn"), {
                changelog: (
                  <InlineLink href={localizedPath(locale, "/changelog/")}>
                    {t("trust.corrections.prose.changelogWhere")}
                  </InlineLink>
                ),
              })}{" "}
              {t("trust.corrections.prose.notSilent")}
            </p>
            <p className="mt-3 text-(--color-text-muted)">
              {rich(t("trust.corrections.prose.rateHistory"), {
                rateHistory: (
                  <InlineLink href={localizedPath(locale, "/devex-rate-history/")}>
                    {t("navigation.routes.devexRateHistory")}
                  </InlineLink>
                ),
              })}
            </p>
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
