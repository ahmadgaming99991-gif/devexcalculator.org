import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * These live here rather than in a `proxy.ts` because `@opennextjs/cloudflare`
 * does not support Node-runtime proxy/middleware, and the specification rules
 * out moving to the edge runtime. Declaring them in the config is also cheaper:
 * headers are applied by the framework's own response handling instead of
 * invoking a proxy function on every request.
 *
 * Static assets get the same headers from `public/_headers`, since the Workers
 * assets binding serves those without invoking the Worker at all.
 */
const CSP_DIRECTIVES: readonly string[] = [
  "default-src 'self'",
  // Next.js inlines a bootstrap script, and the theme script must run before
  // paint to avoid a flash of the wrong theme. Both require 'unsafe-inline'.
  // A nonce would need threading through every streamed chunk, which the
  // adapter does not currently support; recorded in docs/security-model.md
  // rather than left as an unexplained relaxation.
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://www.googletagmanager.com https://challenges.cloudflare.com",
  // Tailwind emits a stylesheet; inline styles are used for progress-meter widths.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://cloudflareinsights.com https://www.google-analytics.com",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
];

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP_DIRECTIVES.join("; ") },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  // Browsers ignore HSTS over plain HTTP, so sending it unconditionally is
  // safe and avoids the header going missing behind a proxy.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Canonical URL policy: every route is served with a trailing slash
  // (see docs/seo/indexation-policy.md). Next.js issues a single 308 from the
  // non-slash form, which keeps redirects single-hop.
  trailingSlash: true,

  // Fail the production build on type errors instead of shipping them.
  // Linting runs as its own gate (`npm run lint`) and in CI; Next 16 no longer
  // accepts an `eslint` key here.
  typescript: { ignoreBuildErrors: false },

  // The site ships no remote images; all art is local SVG.
  images: {
    remotePatterns: [],
    formats: ["image/avif", "image/webp"],
  },

  // `x-powered-by` leaks framework version information for no benefit.
  poweredByHeader: false,

  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },

  async redirects() {
    return [
      // Canonical host. Also configured as a Cloudflare redirect rule, so the
      // apex wins even if one layer is ever removed. Path and query are
      // preserved and it is a single permanent hop.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.devexcalculator.org" }],
        destination: "https://devexcalculator.org/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

// Enables Cloudflare bindings (env, caches) inside `next dev`.
// Guarded so that a missing adapter never breaks plain `next build`.
if (process.env.NODE_ENV === "development") {
  void (async () => {
    try {
      const { initOpenNextCloudflareForDev } = await import(
        "@opennextjs/cloudflare"
      );
      await initOpenNextCloudflareForDev();
    } catch {
      // Adapter unavailable locally; `next dev` still works without bindings.
    }
  })();
}
