import { getTranslator } from "@/i18n/get-dictionary";
import { rich } from "@/i18n/rich";
import { localizedPath } from "@/i18n/locale-path";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Callout, Container, InlineLink, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";
import { formatDate } from "@/lib/calculations/format";
import { rateRegistry } from "@/lib/calculations/rate-registry";

const ROUTE = "/disclaimer/";


export async function DisclaimerView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["legal", "trust"]);
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("legal.disclaimer.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale}>{record.quickAnswer}</QuickAnswer>

          <Section id="estimates" heading={t("legal.disclaimer.estimatesHeading")}>
            <p className="text-(--color-text-muted)">{" "}{t("legal.disclaimer.prose.exactButEstimate")}{" "}</p>
            <p className="mt-3 text-(--color-text-muted)">{t("legal.disclaimer.body.estimates.p1")}</p>
          </Section>

          <Section id="cannot-determine" heading={t("legal.disclaimer.cannotDetermineHeading")}>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
              <li>{" "}{t("legal.disclaimer.cannot.eligibility")}{" "}</li>
              <li>{t("legal.disclaimer.body.cannotDetermine.p1")}</li>
              <li>{t("legal.disclaimer.cannot.approval")}</li>
              <li>{t("legal.disclaimer.cannot.timing")}</li>
              <li>{t("legal.disclaimer.cannot.providerCharges")}</li>
              <li>{t("legal.disclaimer.cannot.tax")}</li>
              <li>{t("legal.disclaimer.cannot.futureRate")}</li>
            </ul>

            <Callout tone="warning" title={t("legal.disclaimer.noCalculatorTitle")} className="mt-4">{t("legal.disclaimer.body.cannotDetermine.p2")}</Callout>
          </Section>

          <Section id="trademarks" heading={t("legal.disclaimer.trademarksHeading")}>
            <p className="text-(--color-text-muted)">{t("legal.disclaimer.body.trademarks.p1")}</p>
          </Section>

          <Section id="accuracy" heading={t("legal.disclaimer.accuracyHeading")}>
            <p className="text-(--color-text-muted)">
              {t("legal.disclaimer.body.accuracy.p1", {
                lastVerifiedAt: formatDate(t.locale, rateRegistry.lastVerifiedAt),
              })}
            </p>
            <p className="mt-3 text-(--color-text-muted)">
              {rich(t("legal.disclaimer.prose.fallenBehind"), {
                sourceRegistry: (
                  <InlineLink href={localizedPath(locale, "/sources/")}>
                    {t("trust.sources.registryHeading")}
                  </InlineLink>
                ),
                correctionsProcess: (
                  <InlineLink href={localizedPath(locale, "/corrections/")}>
                    {t("legal.disclaimer.correctionsProcessLink")}
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
