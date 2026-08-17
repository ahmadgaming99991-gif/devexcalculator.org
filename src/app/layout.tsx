import type { Metadata, Viewport } from "next";
import "./globals.css";
import { requiresAnalyticsConsent, siteConfig } from "@/config/site";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { themeInitScript } from "@/components/layout/theme-toggle";
import { Analytics } from "@/components/seo/analytics";
import { AnalyticsConsent } from "@/components/seo/analytics-consent";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name}: Convert Earned Robux to USD`,
    template: `%s`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  referrer: "strict-origin-when-cross-origin",
  formatDetection: { telephone: false, address: false, email: false },
  // No `keywords` field: the meta keywords tag has been ignored for two
  // decades and the specification forbids it explicitly.
};

export const viewport: Viewport = {
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={siteConfig.htmlLang} suppressHydrationWarning>
      <head>
        {/*
          Applies the stored theme before first paint. Anything later — an
          effect, a deferred script — paints the wrong theme and then corrects
          it, which readers see as a flash.
        */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="skip-link absolute left-3 top-3 z-50 rounded-(--radius-control) bg-(--color-primary) px-4 py-2.5 font-semibold text-white">
          Skip to main content
        </a>

        <SiteHeader />

        <main id="main" className="flex-1 pb-12 pt-6 sm:pt-8">
          {children}
        </main>

        <SiteFooter />

        <Analytics />
        {requiresAnalyticsConsent ? <AnalyticsConsent /> : null}
      </body>
    </html>
  );
}
