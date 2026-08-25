import { getTranslator } from "@/i18n/get-dictionary";
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
  const t = await getTranslator(locale, ["legal"]);
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
            <p className="text-(--color-text-muted)">
              The calculator multiplies the Robux figure you enter by a rate taken
              from Roblox&rsquo;s published documentation. That arithmetic is exact and
              covered by tests. What it produces is still an estimate, because the
              inputs are assumptions: that the Robux you entered are eligible
              Earned Robux, and that the rate you selected is the one Roblox will
              apply to them.
            </p>
            <p className="mt-3 text-(--color-text-muted)">{t("legal.disclaimer.body.estimates.p1")}</p>
          </Section>

          <Section id="cannot-determine" heading={t("legal.disclaimer.cannotDetermineHeading")}>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
              <li>
                Whether your Robux count as Earned Robux. Roblox tracks where each
                Robux came from; that record is not visible here.
              </li>
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
              Rate data on this site was last verified against official
              documentation on {formatDate(rateRegistry.lastVerifiedAt)}, and that
              date is displayed on every rate-sensitive page rather than hidden
              here. Rates change: the standard rate moved in September 2025, and
              it could move again.
            </p>
            <p className="mt-3 text-(--color-text-muted)">
              If a figure here has fallen behind, the{" "}
              <InlineLink href="/sources/">source registry</InlineLink> links
              directly to the official page it came from, so you can check the
              current value yourself in a few seconds. Reporting it through the{" "}
              <InlineLink href="/corrections/">{t("legal.disclaimer.correctionsProcessLink")}{" "}</InlineLink>{" "}
              gets it fixed for everyone else too.
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
