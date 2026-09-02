/**
 * The single typed configuration source for the site.
 *
 * Every optional integration reads from here and every one of them is disabled
 * when its value is absent. The application must build and serve correctly with
 * no analytics, no advertising, no contact provider, no Turnstile, no database
 * and no FX provider — so each accessor returns `null` rather than a
 * placeholder string, and nothing here ever renders `YOUR_GA_ID` into HTML.
 */

function readEnv(name: string): string | null {
  const value = process.env[name];
  if (value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  // Guard against a placeholder being copied out of `.env.example` verbatim.
  if (/^(your_|example|changeme|placeholder|xxx)/i.test(trimmed)) return null;
  return trimmed;
}

function normaliseOrigin(value: string | null, fallback: string): string {
  const candidate = value ?? fallback;
  try {
    const url = new URL(candidate);
    return `${url.protocol}//${url.host}`;
  } catch {
    return fallback;
  }
}

const DEFAULT_ORIGIN = "https://devexcalculator.org";

export const siteConfig = {
  /** Public display name. */
  name: "DevEx Calculator",
  /** Compact brand used in title suffixes and the header lockup. */
  brand: "DevExCalculator",
  /** Absolute canonical origin, never with a trailing slash. */
  url: normaliseOrigin(readEnv("NEXT_PUBLIC_SITE_URL"), DEFAULT_ORIGIN),
  host: "devexcalculator.org",
  alternateHost: "www.devexcalculator.org",
  locale: "en",
  htmlLang: "en",
  ogLocale: "en_US",

  description:
    "Estimate a Roblox DevEx payout from eligible Earned Robux using the currently verified rates, with source links, effective dates and honest local-currency estimates.",

  /**
   * Publisher identity. `organizationName` stays null until a real registered
   * name is confirmed; while it is null the site emits no Organization node
   * rather than inventing a legal entity.
   */
  organizationName: readEnv("NEXT_PUBLIC_ORGANIZATION_NAME"),
  contactEmail: readEnv("NEXT_PUBLIC_CONTACT_EMAIL"),

  /**
   * Social profiles this site actually operates.
   *
   * Listed here rather than in the footer markup because they are also the
   * `sameAs` claims in the structured data, and a profile asserted in one place
   * and not the other is worse than one asserted nowhere. Anything not run by
   * this site stays null.
   */
  social: {
    youtube: "https://www.youtube.com/@DevExCalculator" as string | null,
    x: "https://x.com/DevExCalculator" as string | null,
    instagram: "https://www.instagram.com/devexcalculator/" as string | null,
    pinterest: "https://www.pinterest.com/devexcalculator/" as string | null,
    github: null as string | null,
  },

  /*
   * Build metadata used to live here and is now in `src/lib/build-info.ts`.
   * Everything in this object is inlined into the browser bundle, and a value
   * that changes on every build would expire every visitor's cached JavaScript
   * for a chunk whose code had not changed.
   */

  /**
   * Search Console and Bing Webmaster ownership tokens.
   *
   * Public identifiers rather than secrets — every site that verifies this way
   * publishes them in its HTML — but still read from the environment, because
   * they belong to whoever owns the console property. Absent by default, and a
   * placeholder is treated as absent: see `src/lib/seo/verification.ts`.
   */
  verification: {
    google: readEnv("NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION"),
    bing: readEnv("NEXT_PUBLIC_BING_SITE_VERIFICATION"),
    yandex: readEnv("NEXT_PUBLIC_YANDEX_SITE_VERIFICATION"),
  },

  /** Rate registry version surfaced in the footer and methodology page. */
  rateRegistryVersion: "2026-08-17.1",
  contentReviewedAt: "2026-08-17T00:00:00Z",
  sourceReviewCadenceDays: 30,
} as const;

/** Analytics providers. Both disabled unless a real ID is configured. */
export const analyticsConfig = {
  ga4Id: readEnv("NEXT_PUBLIC_GA4_ID"),
  cloudflareToken: readEnv("NEXT_PUBLIC_CF_ANALYTICS_TOKEN"),
} as const;

export const isAnalyticsEnabled =
  analyticsConfig.ga4Id !== null || analyticsConfig.cloudflareToken !== null;

/**
 * Google Analytics sets cookies, so it requires consent before loading.
 * Cloudflare Web Analytics is cookieless and does not.
 */
export const requiresAnalyticsConsent = analyticsConfig.ga4Id !== null;

/** Advertising. No slot renders and no script loads without a real publisher ID. */
export const adsConfig = {
  publisherId: readEnv("NEXT_PUBLIC_AD_PUBLISHER_ID"),
} as const;

export const isAdsEnabled = adsConfig.publisherId !== null;

/** Turnstile. The public site key is safe to expose; the secret never is. */
export const turnstileConfig = {
  siteKey: readEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY"),
} as const;

export const isTurnstileEnabled = turnstileConfig.siteKey !== null;

export type ContactMode = "disabled" | "mailto" | "webhook" | "resend";

/**
 * Contact mode is read from a server-only variable. The client never learns
 * which provider is configured, only whether a form should be shown.
 */
export function getContactMode(): ContactMode {
  const raw = process.env.CONTACT_MODE?.trim().toLowerCase();
  if (raw === "mailto" || raw === "webhook" || raw === "resend") return raw;
  return "disabled";
}

/** Feature flags. Each one gates a complete feature, never a half-built one. */
export const features = {
  /** Dark mode ships only when every component has passed contrast QA. */
  darkMode: true,
  /** Local calculation history in localStorage. */
  calculationHistory: true,
  /** Local-currency estimates via the FX layer. */
  localCurrency: true,
  /** Advanced split calculator. */
  advancedSplitMode: true,
  /** Reverse target calculator. */
  targetMode: true,
  /** Web Share API with a copy-link fallback. */
  shareLinks: true,
} as const;

export const fxConfig = {
  provider: process.env.FX_PROVIDER?.trim().toLowerCase() || "ecb",
  cacheTtlSeconds: Number(process.env.FX_CACHE_TTL_SECONDS ?? "43200") || 43_200,
  /** Upstream request timeout. The USD calculator never waits on this. */
  timeoutMs: 4_000,
} as const;

/** Builds an absolute URL for canonicals, sitemaps and structured data. */
export function absoluteUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalised = path.startsWith("/") ? path : `/${path}`;
  return `${siteConfig.url}${normalised}`;
}
