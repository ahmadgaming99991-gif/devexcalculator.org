import { getTranslator } from "@/i18n/get-dictionary";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ButtonLink, Callout, Container, InlineLink, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";

const ROUTE = "/corrections/";


export async function CorrectionsView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["trust"]);
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro="Rates change and documentation moves. If something here is out of date, telling us is genuinely the most useful thing you can do."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale}>{record.quickAnswer}</QuickAnswer>

          <Section id="report" heading={t("trust.corrections.reportHeading")}>
            <p className="text-(--color-text-muted)">{t("trust.corrections.body.report.p1")}</p>
            <div className="mt-4">
              <ButtonLink href="/contact/">Report a correction</ButtonLink>
            </div>

            <Callout tone="info" title={t("trust.corrections.cannotHelpTitle")} className="mt-6">{t("trust.corrections.body.report.p2")}</Callout>
          </Section>

          <Section
            id="process"
            heading={t("trust.corrections.nextHeading")}
            description="A correction to a rate, minimum or fee follows a fixed sequence. It is deliberately not a quick edit."
          >
            <ol className="flex list-decimal flex-col gap-3 pl-5 text-(--color-text-muted)">
              <li>
                <strong className="text-(--color-text)">{t("trust.corrections.steps.verify")}</strong>{" "}
                The claim is checked directly against Roblox&rsquo;s own documentation,
                not against another site that repeated it.
              </li>
              <li>
                <strong className="text-(--color-text)">{t("trust.corrections.steps.updateRegistry")}</strong>{" "}
                Rates live in one validated data file. Changing them there changes
                every page, table and calculator at once — there is no second copy
                to forget.
              </li>
              <li>
                <strong className="text-(--color-text)">{t("trust.corrections.steps.updateTests")}</strong>{t("trust.corrections.body.process.p2")}</li>
              <li>
                <strong className="text-(--color-text)">{t("trust.corrections.steps.reviewPages")}</strong>{" "}
                Any prose that states the old figure in words is rewritten, not
                just the tables.
              </li>
              <li>
                <strong className="text-(--color-text)">{t("trust.corrections.steps.recordChangelog")}</strong>{" "}
                With the date, what changed, and the source that justified it.
              </li>
              <li>
                <strong className="text-(--color-text)">{t("trust.corrections.steps.updateDate")}</strong>{" "}
                The badge shown on every rate-sensitive page reflects the new
                check.
              </li>
              <li>
                <strong className="text-(--color-text)">Deploy.</strong>{t("trust.corrections.body.process.p6")}</li>
            </ol>
          </Section>

          <Section id="record" heading={t("trust.corrections.recordHeading")}>
            <p className="text-(--color-text-muted)">
              Publicly, in the{" "}
              <InlineLink href="/changelog/">changelog</InlineLink>. A correction
              is not silently applied — if a figure on this site was wrong, the
              record of it being wrong stays visible. That matters more for a
              site people plan finances around than a tidy history does.
            </p>
            <p className="mt-3 text-(--color-text-muted)">
              Rate changes made by Roblox are also reflected in the{" "}
              <InlineLink href="/devex-rate-history/">rate history</InlineLink>,
              which is a separate record: the changelog tracks what this site did,
              the rate history tracks what Roblox did.
            </p>
          </Section>

          <RelatedLinks locale={locale}
            record={record}
            relationships={["next-step", "sibling", "parent"]}
            heading="Related pages"
            id="related"
          />
        </div>
      </Container>
    </>
  );
}
