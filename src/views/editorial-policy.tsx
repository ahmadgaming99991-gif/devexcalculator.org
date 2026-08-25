import { getTranslator, type Translate } from "@/i18n/get-dictionary";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Container, InlineLink, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";
import { rateRegistry } from "@/lib/calculations/rate-registry";

const ROUTE = "/editorial-policy/";


const LABELS = (t: Translate): readonly { label: string; meaning: string }[] => [
  {
    label: t("trust.editorialPolicy.labels.verified"),
    meaning: t("trust.editorialPolicy.meanings.verified"),
  },
  {
    label: t("trust.editorialPolicy.labels.derived"),
    meaning: t("trust.editorialPolicy.meanings.derived"),
  },
  {
    label: t("trust.editorialPolicy.labels.observed"),
    meaning: t("trust.editorialPolicy.meanings.observed"),
  },
  {
    label: t("trust.editorialPolicy.labels.inference"),
    meaning: t("trust.editorialPolicy.meanings.inference"),
  },
  {
    label: t("trust.editorialPolicy.labels.decision"),
    meaning: t("trust.editorialPolicy.meanings.decision"),
  },
];

export async function EditorialPolicyView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["trust"]);
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("trust.editorialPolicy.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale}>{record.quickAnswer}</QuickAnswer>

          <Section id="sourcing" heading={t("trust.editorialPolicy.sourcingHeading")}>
            <ul className="flex flex-col gap-3 text-(--color-text-muted)">
              <li>{t("trust.editorialPolicy.body.sourcing.p1")}</li>
              <li>{t("trust.editorialPolicy.body.sourcing.p2")}</li>
              <li>{t("trust.editorialPolicy.body.sourcing.p3")}</li>
              <li>{t("trust.editorialPolicy.body.sourcing.p4")}</li>
            </ul>
          </Section>

          <Section
            id="labels"
            heading={t("trust.editorialPolicy.labellingHeading")}
            description={t("trust.editorialPolicy.labellingDescription")}
          >
            <dl className="flex flex-col gap-3">
              {LABELS(t).map((entry) => (
                <div
                  key={entry.label}
                  className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4"
                >
                  <dt className="text-sm font-semibold text-(--color-text)">{entry.label}</dt>
                  <dd className="mt-1 text-sm text-(--color-text-muted)">{entry.meaning}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section id="never" heading={t("trust.editorialPolicy.neverHeading")}>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
              <li>{t("trust.editorialPolicy.never.testimonials")}</li>
              <li>{t("trust.editorialPolicy.never.fakeAuthor")}</li>
              <li>{t("trust.editorialPolicy.never.unsourcedRate")}</li>
              <li>{t("trust.editorialPolicy.never.snapshotAsLive")}</li>
              <li>{t("trust.editorialPolicy.never.countryTax")}</li>
              <li>{t("trust.editorialPolicy.never.approvalClaim")}</li>
              <li>{t("trust.editorialPolicy.body.never.p1")}</li>
              <li>{t("trust.editorialPolicy.body.never.p2")}</li>
            </ul>
          </Section>

          <Section id="review" heading={t("trust.editorialPolicy.reviewHeading")}>
            <p className="text-(--color-text-muted)">
              Rate-sensitive content is reviewed every{" "}
              {rateRegistry.reviewCadenceDays} days, and escalates to a required
              manual review after {rateRegistry.criticalReviewAgeDays}. The build
              tracks the age of the rate registry and surfaces it on every
              rate-sensitive page, so a stale figure is visible to readers rather
              than only to whoever maintains the site.
            </p>
            <p className="mt-3 text-(--color-text-muted)">
              A figure is never left online because it performs well in search
              after it stops being accurate. If it is wrong, it changes, and the
              change is recorded.{" "}
              <InlineLink href="/corrections/">{t("trust.editorialPolicy.body.review.p4")}</InlineLink>{" "}
              ·{" "}
              <InlineLink href="/changelog/">{t("trust.editorialPolicy.changedSoFar")}</InlineLink>
            </p>
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
