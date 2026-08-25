import { getTranslator } from "@/i18n/get-dictionary";
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
                <strong className="text-(--color-text)">{t("trust.about.principles.rateHasSource")}</strong>{" "}
                Not &ldquo;current as of recently&rdquo; — a link to the official Roblox
                documentation and the date it was last checked, shown on the page.
              </li>
              <li>
                <strong className="text-(--color-text)">{t("trust.about.principles.exactArithmetic")}</strong>{" "}
                Money is calculated as exact fractions rather than floating-point
                numbers, and rounded once, at the moment it is displayed.{" "}
                <InlineLink href="/methodology/">{t("trust.about.principles.methodologyExplains")}</InlineLink>.
              </li>
              <li>
                <strong className="text-(--color-text)">{t("trust.about.principles.worksWithoutJs")}</strong>{" "}
                Rates, formulas, examples and explanations are all server
                rendered. Only live recalculation needs scripts.
              </li>
              <li>
                <strong className="text-(--color-text)">{t("trust.about.principles.nothingCollected")}</strong>{" "}
                Calculations run in your browser and are never sent anywhere.{" "}
                <InlineLink href="/privacy/">{t("trust.about.principles.privacyIsSpecific")}{" "}</InlineLink>.
              </li>
              <li>
                <strong className="text-(--color-text)">{t("trust.about.principles.correctionsPublished")}</strong>{" "}
                When a figure here turns out to be wrong, the fix is recorded with
                a date in the{" "}
                <InlineLink href="/changelog/">changelog</InlineLink>{t("trust.about.body.principles.p5")}</li>
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
