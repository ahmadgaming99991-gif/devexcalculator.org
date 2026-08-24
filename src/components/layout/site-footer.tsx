import Link from "next/link";
import { getNavigation } from "@/config/navigation";
import { getTranslator } from "@/i18n/get-dictionary";
import { getLocaleMeta } from "@/i18n/config";
import { localizedPath } from "@/i18n/locale-path";
import { rich } from "@/i18n/rich";
import type { Locale } from "@/i18n/types";
import { siteConfig } from "@/config/site";
import {
  getRateValue,
  minimumEarnedRobux,
  rateRegistry,
} from "@/lib/calculations/rate-registry";
import { standardRateId } from "@/lib/calculations/devex";
import { formatDate, formatRate, formatRobux } from "@/lib/calculations/format";
import { Container } from "@/components/ui";
import { Logo, Wordmark } from "./logo";
import { SocialLinks } from "./social-links";
import { FooterStatus } from "./footer-status";
import { RateSourceCheck } from "./rate-source-check";
import { sourceCheckWords } from "./source-check-words";

/**
 * One fact from the rate registry, shown on every page.
 *
 * The footer was five columns of links and a legal notice — navigation and
 * disclaimer, nothing a reader could use. These three are the figures the whole
 * site turns on, and putting them here means the answer to "what is the rate"
 * is on the page whatever the reader came for, with the date it was checked
 * beside it rather than a paragraph away.
 *
 * Read from the registry, never written down: a rate change moves this strip
 * the same way it moves the calculator.
 */
function Fact({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col items-center rounded-(--radius-control) px-4 py-3 motion-safe:transition-colors hover:bg-(--color-surface-subtle)"
    >
      <span className="text-xs font-medium tracking-wide text-(--color-text-muted) uppercase">
        {label}
      </span>
      <span className="tabular mt-1 text-lg font-bold text-(--color-text) group-hover:text-(--color-primary)">
        {value}
      </span>
    </Link>
  );
}

/*
 * The clock read once, at module scope rather than during render.
 *
 * These are the values a reader without JavaScript sees, and the ones shown
 * for the instant before hydration — deliberately real numbers rather than
 * placeholders. Reading a clock inside a component body is a render that is
 * not idempotent, which React's own lint rejects and which would make this
 * component produce a different tree on every re-render.
 *
 * For a prerendered page this is the build. For the few routes rendered per
 * request it is whenever the isolate started, which can drift a little — and
 * does not matter, because the browser replaces both during hydration.
 */
const BUILT_AT = Date.now();
const BUILT_YEAR = new Date(BUILT_AT).getUTCFullYear();

function ageAtBuild(iso: string): number {
  return Math.max(0, Math.floor((BUILT_AT - Date.parse(iso)) / 86_400_000));
}

export async function SiteFooter({ locale }: { readonly locale: Locale }) {
  const standardRate = getRateValue(standardRateId);
  const { footerGroups } = await getNavigation(locale);
  const t = await getTranslator(locale, ["common"]);
  const at = (route: string) => localizedPath(locale, route);
  const { bcp47 } = getLocaleMeta(locale);
  const sourceCheck = sourceCheckWords(locale, t);

  return (
    <footer className="mt-16 border-t border-(--color-border) bg-(--color-surface)">
      <Container width="wide">
        {/*
          Centred at every width, including desktop. The columns previously
          switched to left alignment above the small breakpoint, which left the
          brand block, the link columns and the social row each anchored to a
          different edge of a wide page.
        */}
        <div className="grid gap-8 py-10 text-center sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col items-center lg:col-span-1">
            <Link href={at("/")} className="group inline-flex items-center justify-center gap-2.5">
              <Logo interactive className="h-9" />
              <Wordmark className="text-sm" />
            </Link>
            <p className="mt-3 text-sm text-balance text-(--color-text-muted)">
              {t("common.brand.tagline")}
            </p>
          </div>

          {footerGroups.map((group) => (
            <nav key={group.id} aria-label={group.heading}>
              <h2 className="text-xs font-semibold tracking-wide text-(--color-text) uppercase">
                {group.heading}
              </h2>
              <ul className="mt-3 flex list-none flex-col items-center gap-2 p-0">
                {group.items.map((entry) => (
                  <li key={entry.href}>
                    <Link
                      href={entry.href}
                      className="text-sm text-(--color-text-muted) hover:text-(--color-primary) hover:underline"
                    >
                      {entry.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/*
          The figures the site exists to publish, on every page. Each one links
          to the page that explains it, so this is a way in rather than a
          decoration.
        */}
        <div className="border-t border-(--color-border) py-6">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Fact
              label={t("common.footer.facts.standardRate")}
              value={`$${formatRate(standardRate)}`}
              href={at("/devex-rates/")}
            />
            <Fact
              label={t("common.footer.facts.minimumToCashOut")}
              value={`${formatRobux(minimumEarnedRobux)} R$`}
              href={at("/devex-requirements/")}
            />
            <Fact
              label={t("common.footer.facts.ratesVerified")}
              value={formatDate(rateRegistry.lastVerifiedAt)}
              href={at("/sources/")}
            />
          </div>
          <p className="mt-2 text-center text-xs text-(--color-text-muted)">
            {t("common.footer.perEligibleNote")}{" "}
            <Link href={at("/changelog/")} className="underline hover:text-(--color-primary)">
              {t("common.footer.changelogLink")}
            </Link>{" "}
            ·{" "}
            {/*
              One sentence with two links in it, rather than "Atom", "or",
              "JSON", "feed" as four strings glued together in English word
              order. German puts "Feed" at the end and Turkish puts it first.
            */}
            {rich(t("common.footer.feedLine"), {
              atom: (
                <a href="/feed.xml" className="underline hover:text-(--color-primary)">
                  {t("common.footer.feedAtom")}
                </a>
              ),
              json: (
                <a href="/feed.json" className="underline hover:text-(--color-primary)">
                  {t("common.footer.feedJson")}
                </a>
              ),
            })}
          </p>
          {/*
            The other date. "Rates verified" above is the day a person read
            Roblox's documentation and it does not move on its own; this is the
            day the scheduled job last re-read that same document and found the
            figures unchanged. Renders nothing until a check has run.
          */}
          <RateSourceCheck
            words={sourceCheck}
            className="mt-1 text-center text-xs text-balance text-(--color-text-muted)"
          />
        </div>

        {/*
          Trademark and affiliation notice. Required on every page, kept
          readable rather than shrunk into unreadable legal small print.
        */}
        <div className="border-t border-(--color-border) py-6">
          <p className="mx-auto max-w-3xl text-center text-sm text-balance text-(--color-text-muted)">
            <strong className="font-semibold text-(--color-text)">
              {t("common.footer.notAffiliatedHeading")}
            </strong>{" "}
            {t("common.footer.trademarkNotice")}
          </p>

          <SocialLinks locale={locale} className="mt-6 flex flex-col items-center" />

          <FooterStatus
            siteName={siteConfig.name}
            verifiedAt={rateRegistry.lastVerifiedAt}
            registryVersion={rateRegistry.registryVersion}
            reviewCadenceDays={rateRegistry.reviewCadenceDays}
            builtAgeDays={ageAtBuild(rateRegistry.lastVerifiedAt)}
            builtYear={BUILT_YEAR}
            dateLocale={bcp47}
            sourcesHref={at("/sources/")}
            sourceCheck={sourceCheck}
            words={{
              copyright: t("common.footer.copyright"),
              rateDataLabel: t("common.footer.rateDataLabel"),
              verifiedOn: t("common.footer.verifiedOn"),
              dueForReview: t("common.footer.dueForReview"),
              registryVersion: t("common.footer.registryVersion"),
              relativeDay: {
                today: t("common.relativeDay.today"),
                yesterday: t("common.relativeDay.yesterday"),
                daysAgo: t("common.relativeDay.daysAgo"),
              },
            }}
          />
        </div>
      </Container>
    </footer>
  );
}
