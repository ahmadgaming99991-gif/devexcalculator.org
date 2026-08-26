import { getTranslator, type Translate } from "@/i18n/get-dictionary";
import { rich } from "@/i18n/rich";
import { localizedPath } from "@/i18n/locale-path";
import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ButtonLink, Container, InlineLink, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";
import { formatDate } from "@/lib/calculations/format";

const ROUTE = "/accessibility/";


const TESTED = (t: Translate): readonly string[] => [
  t("legal.accessibility.tested.axe"),
  t("legal.accessibility.tested.keyboard"),
  t("legal.accessibility.tested.narrowLayout"),
  t("legal.accessibility.tested.zoom"),
  t("legal.accessibility.tested.contrast"),
  t("legal.accessibility.tested.reducedMotion"),
  t("legal.accessibility.tested.highContrast"),
];

const FEATURES = (t: Translate): readonly { title: string; detail: string }[] => [
  {
    title: t("legal.accessibility.features.keyboard"),
    detail: t("legal.accessibility.features.keyboardDetail"),
  },
  {
    title: t("legal.accessibility.features.focus"),
    detail: t("legal.accessibility.features.focusDetail"),
  },
  {
    title: t("legal.accessibility.features.announced"),
    detail: t("legal.accessibility.features.announcedDetail"),
  },
  {
    title: t("legal.accessibility.features.errorsTied"),
    detail: t("legal.accessibility.features.errorsTiedDetail"),
  },
  {
    title: t("legal.accessibility.features.notColourAlone"),
    detail: t("legal.accessibility.features.notColourAloneDetail"),
  },
  {
    title: t("legal.accessibility.features.targets"),
    detail: t("legal.accessibility.features.targetsDetail"),
  },
  {
    title: t("legal.accessibility.features.mobileMenu"),
    detail: t("legal.accessibility.features.mobileMenuDetail"),
  },
  {
    title: t("legal.accessibility.features.tablesScroll"),
    detail: t("legal.accessibility.features.tablesScrollDetail"),
  },
  {
    title: t("legal.accessibility.features.zoom"),
    detail: t("legal.accessibility.features.zoomDetail"),
  },
  {
    title: t("legal.accessibility.features.noJs"),
    detail: t("legal.accessibility.features.noJsDetail"),
  },
];

export async function AccessibilityView({ locale }: { readonly locale: Locale }) {
  const t = await getTranslator(locale, ["legal", "routes"]);
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd locale={locale} route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro={t("legal.accessibility.intro")}
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale}>{record.quickAnswer}</QuickAnswer>

          <p className="text-sm text-(--color-text-muted)">
            {t("legal.accessibility.body.intro.p1", {
              lastReviewedAt: formatDate(t.locale, record.lastReviewedAt),
            })}
          </p>

          <Section id="standard" heading={t("legal.accessibility.standardHeading")}>
            <p className="text-(--color-text-muted)">
              {rich(t("legal.accessibility.prose.standard"), {
                wcag: (
                  <a
                    href="https://www.w3.org/TR/WCAG22/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-(--color-primary) underline"
                  >
                    WCAG 2.2 level AA
                  </a>
                ),
              })}
            </p>
          </Section>

          <Section id="tested" heading={t("legal.accessibility.testedHeading")}>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
              {TESTED(t).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-3 text-(--color-text-muted)">{t("legal.accessibility.body.tested.p1")}</p>
          </Section>

          <Section id="features" heading={t("legal.accessibility.featuresHeading")}>
            <dl className="flex flex-col gap-3">
              {FEATURES(t).map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-(--radius-control) border border-(--color-border) bg-(--color-surface) p-4"
                >
                  <dt className="text-sm font-semibold text-(--color-text)">{feature.title}</dt>
                  <dd className="mt-1 text-sm text-(--color-text-muted)">{feature.detail}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section id="limitations" heading={t("legal.accessibility.limitationsHeading")}>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
              <li>{t("legal.accessibility.body.limitations.p1")}</li>
              <li>{t("legal.accessibility.body.limitations.p2")}</li>
              <li>{t("legal.accessibility.body.limitations.p3")}</li>
              <li>{" "}{t("legal.accessibility.thirdParty.turnstile")}{" "}</li>
            </ul>
          </Section>

          <Section id="feedback" heading={t("legal.accessibility.feedbackHeading")}>
            <p className="text-(--color-text-muted)">{t("legal.accessibility.body.feedback.p1")}</p>
            <div className="mt-4">
              <ButtonLink href={localizedPath(locale, "/contact/")}>{t("routes.accessibility.links.contact")}</ButtonLink>
            </div>
            <p className="mt-4 text-sm text-(--color-text-muted)">
              {rich(t("legal.accessibility.prose.aboutLink"), {
                aboutPage: (
                  <InlineLink href={localizedPath(locale, "/about/")}>
                    {t("legal.accessibility.aboutPageLink")}
                  </InlineLink>
                ),
              })}
            </p>
          </Section>

          <RelatedLinks locale={locale}
            record={record}
            relationships={["next-step", "parent"]}
            id="related"
          />
        </div>
      </Container>
    </>
  );
}
