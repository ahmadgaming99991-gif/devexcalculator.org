import type { Metadata } from "next";
import { getTranslator } from "@/i18n/get-dictionary";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { NotFoundBody } from "@/views/not-found-body";

/**
 * The 404 for a `notFound()` thrown by a page in the English tree.
 *
 * Distinct from `src/app/not-found.tsx`, which answers URLs that match no
 * route at all. This one is reached only from inside this group, so it keeps
 * the English root layout around it — which is why it does not render a
 * document of its own.
 *
 * Both render the same body. Neither is told which locale it is standing in:
 * a `not-found.tsx` receives no params, so the body reads the path itself.
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
  return <NotFoundBody />;
}
