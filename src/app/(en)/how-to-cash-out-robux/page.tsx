import type { Metadata } from "next";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { buildLocalizedMetadata } from "@/lib/seo/localized-metadata";
import { CashOutView } from "@/views/how-to-cash-out-robux";

const ROUTE = "/how-to-cash-out-robux/";

export function generateMetadata(): Promise<Metadata> {
  return buildLocalizedMetadata(DEFAULT_LOCALE, ROUTE, { inheritImage: true });
}

export default function Page() {
  return <CashOutView locale={DEFAULT_LOCALE} />;
}
