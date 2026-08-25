"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE } from "@/i18n/config";
import type { Locale } from "@/i18n/types";

/**
 * Which language the surrounding document is in, for the few Client
 * Components that are not told.
 *
 * Almost nothing needs this: a Client Component is handed its words by the
 * server parent that renders it, and those words carry their own locale. The
 * exception is `not-found.tsx`, which Next renders with no params and no
 * matched route — it cannot be passed a locale because nothing on the server
 * knows one.
 *
 * The value still comes from the server. The provider is rendered by
 * `SiteDocument`, which does know the locale, so the correct language is in
 * the HTML from the first byte rather than being corrected after hydration.
 * Reading the path in the browser was the alternative and it renders English
 * on the server, which is a flash for everyone and a wrong page for anyone
 * with scripting off.
 *
 * Deliberately not a general mechanism for passing translations around. It
 * carries a locale, not a dictionary: a context holding words would be a
 * second way to reach one, and the whole point of the words-as-props design
 * is that there is exactly one.
 */

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  readonly locale: Locale;
  readonly children: ReactNode;
}) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

/** The document's locale. `en` outside a provider, which is the English tree. */
export function useLocale(): Locale {
  return useContext(LocaleContext);
}
