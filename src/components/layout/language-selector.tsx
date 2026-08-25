"use client";

import { usePathname } from "next/navigation";
import { switchLocalePath } from "@/i18n/locale-path";
import { translatorFor, type LocaleWords } from "@/i18n/client-words";
import type { Locale } from "@/i18n/types";

/**
 * Switching language without losing the page you were on.
 *
 * A Client Component for exactly one reason: it needs the path the reader is
 * currently on, and a layout in the App Router is not given one. `usePathname`
 * is resolved during server rendering as well as in the browser, so every
 * `href` below is a real, correct URL in the delivered HTML — this does not
 * degrade to a homepage link, and it does not need JavaScript to work.
 *
 * Built on `<details>` for the same reasons the header menus are: the native
 * element opens on click, Enter and Space, reports its expanded state to
 * assistive technology, and works with scripting off. Nothing here upgrades
 * it, because nothing needs to.
 *
 * Deliberately **not** a `<select>` with an `onChange` that navigates. A
 * select that changes the page as you arrow through it navigates on the first
 * keypress, before a keyboard reader has heard the other options — and with
 * scripting off it does nothing at all.
 *
 * **What it never shows.** The list comes from `publicLocales()`, resolved by
 * the server and passed in, so a locale awaiting native review cannot appear
 * here even in a build that renders it. That is the same gate the sitemap and
 * hreflang use, asked once. With one public language the whole control renders
 * nothing: an empty language menu invites a reader to look for a language that
 * is not there.
 *
 * The query string travels with the switch, because a shared calculation lives
 * in it. The hash does not, because an anchor is a translated slug on the
 * destination and a fragment that resolves to nothing looks broken.
 */

export interface SelectableLocale {
  readonly locale: Locale;
  /** The language's own name for itself: "Português (Brasil)", not "Portuguese". */
  readonly nativeName: string;
  readonly bcp47: string;
}

export function LanguageSelector({
  current,
  locales,
  words,
}: {
  readonly current: Locale;
  readonly locales: readonly SelectableLocale[];
  readonly words: LocaleWords;
}) {
  const pathname = usePathname();
  const t = translatorFor(words);

  // One language is not a choice.
  if (locales.length < 2) return null;

  const currentMeta = locales.find((meta) => meta.locale === current);

  return (
    <details className="relative">
      <summary
        className="flex min-h-[44px] cursor-pointer list-none items-center gap-1.5 rounded-(--radius-control) border border-(--color-border) px-3 text-sm font-medium text-(--color-text-muted) hover:text-(--color-text)"
        aria-label={t("navigation.language.label")}
      >
        {/*
          A globe rather than a flag. A flag is a country and this is a
          language: Spanish is not Spain, Portuguese here is Brazil, and
          picking a flag for either tells some readers the site is not for
          them.
        */}
        <svg
          viewBox="0 0 16 16"
          className="size-4 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          aria-hidden="true"
        >
          <circle cx="8" cy="8" r="6.25" />
          <path d="M1.75 8h12.5M8 1.75c1.6 1.7 2.5 3.9 2.5 6.25S9.6 12.55 8 14.25c-1.6-1.7-2.5-3.9-2.5-6.25S6.4 3.45 8 1.75Z" />
        </svg>
        <span>{currentMeta?.nativeName ?? t("navigation.language.label")}</span>
      </summary>

      <div className="absolute end-0 z-40 mt-1 min-w-[12rem] rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-1.5 shadow-lg">
        <ul className="flex list-none flex-col p-0">
          {locales.map((meta) => {
            const isCurrent = meta.locale === current;
            return (
              <li key={meta.locale}>
                <a
                  href={switchLocalePath(meta.locale, pathname)}
                  lang={meta.bcp47}
                  hrefLang={meta.bcp47}
                  aria-current={isCurrent ? "true" : undefined}
                  className={
                    "flex min-h-[44px] items-center rounded-(--radius-control) px-3 text-sm " +
                    (isCurrent
                      ? "font-semibold text-(--color-text)"
                      : "text-(--color-text-muted) hover:bg-(--color-surface-subtle) hover:text-(--color-text)")
                  }
                >
                  {meta.nativeName}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}
