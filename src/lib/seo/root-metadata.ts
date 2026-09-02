import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/config/site";
import { buildVerification } from "@/lib/seo/verification";

/**
 * The document-level metadata and viewport, shared by both root layouts.
 *
 * English and the localized tree are two separate `<html>` documents, which is
 * what lets each one declare its own `lang`. It is also two places for a
 * `themeColor` or a `referrer` policy to be set differently by accident, and
 * the difference would show up as one language behaving unlike the rest with
 * nothing in either file to suggest why. Neither layout declares these; both
 * import them.
 */

export const rootViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Not capped. Blocking zoom would fail WCAG 2.2 and make the calculator
  // unusable for anyone who needs to magnify a number.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#080d17" },
  ],
};

/**
 * @param title       the fallback `<title>` for a page that sets none.
 * @param description the fallback meta description, likewise.
 *
 * Both are per-language: a Spanish page falling back to an English title is
 * the "translated content, English chrome" failure in the one place a search
 * engine reads first.
 */
export function rootMetadata(title: string, description: string): Metadata {
  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: title,
      // Pages supply their own complete title; nothing is appended to it.
      template: `%s`,
    },
    description,
    applicationName: siteConfig.name,
    /*
     * The icons, named rather than left to the file convention.
     *
     * `apple-icon.tsx` used to generate the touch icon, and the URL the
     * convention produced — `/apple-icon`, no extension — was answered with a
     * 308 to `/apple-icon/`, because `trailingSlash: true` exempts only URLs
     * that have an extension. Every iOS device adding the site to a home
     * screen paid for a redirect. The same reasoning as the Open Graph cards
     * in `src/lib/og/english-cards.ts`, and the same fix: a real file at a
     * real path.
     *
     * `icon.svg` keeps the convention. It already has an extension, so it was
     * never redirected.
     */
    icons: {
      icon: [{ url: "/icon.svg", type: "image/svg+xml", sizes: "any" }],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
    referrer: "strict-origin-when-cross-origin",
    formatDetection: { telephone: false, address: false, email: false },
    // Emitted only for a token that could plausibly be real; a placeholder or a
    // blank produces no tag at all rather than one that verifies nothing.
    verification: buildVerification(),
    // No `keywords` field: the meta keywords tag has been ignored for two
    // decades and the specification forbids it explicitly.
  };
}
