import { localizedRoute } from "@/i18n/localized-route";
import type { Locale } from "@/i18n/types";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ButtonLink, Container, InlineLink, Section } from "@/components/ui";
import { PageHeader, QuickAnswer, RelatedLinks } from "@/components/content";
import { formatDate } from "@/lib/calculations/format";

const ROUTE = "/accessibility/";


const TESTED: readonly string[] = [
  "Automated axe checks on every representative route, at desktop and mobile widths",
  "Keyboard-only walkthrough of the calculator, navigation and every form",
  "Layout at 320px wide with no horizontal scrolling",
  "Layout at 200% text zoom with no loss of content or function",
  "Colour contrast for every text and interface colour pair in both light and dark themes",
  "Reduced-motion preference honoured across the site",
  "Windows High Contrast Mode, where borders keep structure visible",
];

const FEATURES: readonly { title: string; detail: string }[] = [
  {
    title: "Keyboard operable throughout",
    detail:
      "Every control is a real button, link, input or select. There are no clickable divs, so keyboard behaviour comes from the browser rather than from scripts imitating it.",
  },
  {
    title: "Visible focus everywhere",
    detail:
      "A three-pixel amber outline with a two-pixel offset, chosen because it measures about 5:1 against every surface on the site — comfortably above the 3:1 the standard requires.",
  },
  {
    title: "Results are announced",
    detail:
      "Calculation results, copy confirmations and error messages are announced through a polite live region, summarised rather than read digit by digit as you type.",
  },
  {
    title: "Errors are tied to their fields",
    detail:
      "Validation messages are linked with aria-describedby and the field is marked invalid, so a screen reader reports the problem with the field rather than as loose text nearby.",
  },
  {
    title: "Nothing depends on colour alone",
    detail:
      "The threshold meter, rate comparisons and stale-rate warnings each carry a text label saying what the colour says.",
  },
  {
    title: "Targets are at least 44 pixels",
    detail: "Buttons, preset chips, links in navigation and form controls all meet that minimum.",
  },
  {
    title: "The mobile menu behaves",
    detail:
      "Escape closes it and returns focus to the button that opened it, focus is trapped while it is open, and background scrolling is locked without the page shifting.",
  },
  {
    title: "Wide tables scroll accessibly",
    detail:
      "Each table sits in a focusable, labelled scroll container, so a keyboard user can reach and scroll it without a mouse.",
  },
  {
    title: "Zoom is never blocked",
    detail: "The viewport sets no maximum scale, so pinch-zoom works everywhere.",
  },
  {
    title: "Works without JavaScript",
    detail:
      "Rates, formulas, worked examples, tables, navigation and every explanation are server rendered. Only live recalculation needs scripts.",
  },
];

export async function AccessibilityView({ locale }: { readonly locale: Locale }) {
  const record = await localizedRoute(locale, ROUTE);

  return (
    <>
      <JsonLd route={ROUTE} />
      <Container width="prose">
        <Breadcrumbs locale={locale} route={ROUTE} />
        <PageHeader locale={locale}
          record={record}
          intro="What this site targets, what has actually been tested, and what is still imperfect."
        />

        <div className="flex flex-col gap-10">
          <QuickAnswer locale={locale}>{record.quickAnswer}</QuickAnswer>

          <p className="text-sm text-(--color-text-muted)">
            Last reviewed {formatDate(record.lastReviewedAt)}.
          </p>

          <Section id="standard" heading="The standard targeted">
            <p className="text-(--color-text-muted)">
              This site aims to meet{" "}
              <a
                href="https://www.w3.org/TR/WCAG22/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-(--color-primary) underline"
              >
                WCAG 2.2 level AA
              </a>
              . That is a target rather than a certification — no external audit
              has been carried out, and this page says so rather than implying
              otherwise.
            </p>
          </Section>

          <Section id="tested" heading="What has been tested">
            <ul className="flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
              {TESTED.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-3 text-(--color-text-muted)">
              Automated checks catch a minority of real accessibility problems, so
              the keyboard walkthrough and the manual layout checks matter more
              than the axe results do.
            </p>
          </Section>

          <Section id="features" heading="Accessibility features">
            <dl className="flex flex-col gap-3">
              {FEATURES.map((feature) => (
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

          <Section id="limitations" heading="Known limitations">
            <ul className="flex list-disc flex-col gap-2 pl-5 text-(--color-text-muted)">
              <li>
                No testing has been done with a live screen reader by someone who
                uses one daily. Semantics have been built and inspected carefully,
                but that is not the same thing, and reports from actual users are
                genuinely wanted.
              </li>
              <li>
                Very long numbers in a result wrap rather than shrink. At 320
                pixels with 200% zoom a ten-figure payout can occupy three lines.
                Wrapping was chosen over truncating, since a truncated money
                figure is worse than a tall one.
              </li>
              <li>
                The rate comparison and breakdown tables scroll horizontally on
                narrow screens. The scroll container is keyboard reachable and
                labelled, but a table is still harder to read that way than a
                wider viewport allows.
              </li>
              <li>
                Cloudflare Turnstile, where a deployment enables it on the
                contact form, is a third-party widget whose internal
                accessibility is outside this site&rsquo;s control.
              </li>
            </ul>
          </Section>

          <Section id="feedback" heading="Reporting a problem">
            <p className="text-(--color-text-muted)">
              If something here blocks you, telling us is the fastest way to get
              it fixed. Include the page, what you were trying to do, and the
              browser and assistive technology you were using if that is
              relevant. Accessibility reports are treated with the same priority
              as a wrong rate — both make the site fail at its job.
            </p>
            <div className="mt-4">
              <ButtonLink href="/contact/">Report an accessibility problem</ButtonLink>
            </div>
            <p className="mt-4 text-sm text-(--color-text-muted)">
              For how the site is built more generally, see the{" "}
              <InlineLink href="/about/">about page</InlineLink>.
            </p>
          </Section>

          <RelatedLinks locale={locale}
            record={record}
            relationships={["next-step", "parent"]}
            heading="Related pages"
            id="related"
          />
        </div>
      </Container>
    </>
  );
}
