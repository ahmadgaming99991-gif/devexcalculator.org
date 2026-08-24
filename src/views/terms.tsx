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
      <JsonLd route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro="The terms covering use of this site. Short, because there is not much to it — you use a calculator, and it gives you an estimate."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale}>{record.quickAnswer}</QuickAnswer>

          <p className="text-sm text-(--color-text-muted)">
            Last reviewed {formatDate(record.lastReviewedAt)}.
          </p>

          <Section id="use" heading={t("legal.terms.useHeading")}>
            <p className="text-(--color-text-muted)">
              You are welcome to use {siteConfig.host} freely to estimate DevEx
              payouts, for yourself or as part of your work as a creator. No
              account is needed and nothing is charged.
            </p>
            <p className="mt-3 text-(--color-text-muted)">{t("legal.terms.body.use.p3")}</p>
          </Section>

          <Section id="estimates" heading={t("legal.terms.estimatesHeading")}>
            <p className="text-(--color-text-muted)">{t("legal.terms.body.estimates.p1")}</p>
            <p className="mt-3 text-(--color-text-muted)">
              Considerable care goes into accuracy — every rate is sourced, dated
              and covered by tests — but rates change, documentation moves, and
              errors are possible. Check anything you are relying on against the
              official Roblox documentation linked from the{" "}
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
              These terms may be updated. The review date at the top of this page
              reflects the most recent change, and material changes are recorded
              in the{" "}
              <InlineLink href="/changelog/">changelog</InlineLink>{t("legal.terms.body.changes.p2")}</p>
          </Section>

          <RelatedLinks locale={locale}
            record={record}
            relationships={["sibling", "parent"]}
            heading="Related pages"
            id="related"
          />
        </div>
      </Container>
    </>
  );
}
