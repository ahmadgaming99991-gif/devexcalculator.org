import { getTranslator } from "@/i18n/get-dictionary";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Container, InlineLink, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";
import { rateRegistry } from "@/lib/calculations/rate-registry";

const ROUTE = "/editorial-policy/";


const LABELS: readonly { label: string; meaning: string }[] = [
  {
    label: "Verified through official source",
    meaning:
      "Read directly from Roblox, Cloudflare, Google or ECB documentation, with the URL and date recorded in the source registry.",
  },
  {
    label: "Derived from supplied CSV",
    meaning:
      "Computed from the keyword exports this site was built against. Third-party estimates, not measured traffic.",
  },
  {
    label: "Observed on public competitor page",
    meaning: "Seen on a publicly accessible page. Recorded as an observation, never republished as fact.",
  },
  {
    label: "Reasonable inference",
    meaning:
      "A conclusion drawn from evidence rather than stated by a source. Labelled as inference wherever it appears.",
  },
  {
    label: "New implementation decision",
    meaning: "A choice made by this site, with the reasoning recorded rather than presented as an external requirement.",
  },
];

export async function EditorialPolicyView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["trust"]);
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro="The rules this site writes under, stated so you can hold it to them."
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
            description="Every research conclusion in this project's documentation carries one of these labels. An inference is never quietly promoted to a fact."
          >
            <dl className="flex flex-col gap-3">
              {LABELS.map((entry) => (
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
