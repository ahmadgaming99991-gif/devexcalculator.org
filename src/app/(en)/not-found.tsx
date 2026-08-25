import type { Metadata } from "next";
import { getTranslator } from "@/i18n/get-dictionary";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { NotFoundView } from "@/views/not-found";

/**
 * The 404 for the unprefixed English tree.
 *
 * A `not-found.tsx` is rendered without params, so it cannot be told which
 * language it is standing in. There is therefore one of these rather than
 * seven, and it answers in English. That is a real gap while a localized tree
 * exists — written down in `docs/i18n/publish-checklist.md` as a blocker on
 * making any locale public, rather than left for someone to discover.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslator(DEFAULT_LOCALE, ["errors"]);
  return {
    title: t("errors.notFound.metaTitle"),
    description: t("errors.notFound.metaDescription"),
    robots: { index: false, follow: true },
  };
}

export default function NotFound() {
  return <NotFoundView locale={DEFAULT_LOCALE} />;
}
