import { execFileSync } from "node:child_process";
import type { NextConfig } from "next";

/**
 * Which commit is being built.
 *
 * The health endpoint has always had a `commit` field and it has always been
 * null, because nothing set the variable it read. Deployments were therefore
 * unidentifiable: nothing served by the Worker said which source it came from.
 *
 * CI's own variable is preferred where there is one, and a local deploy falls
 * back to asking git. `execFileSync` rather than `execSync` so there is no
 * shell to quote into, and a failure is swallowed — a build from a source
 * archive with no `.git` is a legitimate build, and it should produce a null
 * commit rather than no site.
 */
function resolveCommit(): string | undefined {
  const fromEnv =
    process.env.BUILD_COMMIT ?? process.env.GITHUB_SHA ?? process.env.CF_PAGES_COMMIT_SHA;
  if (fromEnv?.trim()) return fromEnv.trim();

  try {
    const head = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    /*
     * A build from a tree with uncommitted changes says so.
     *
     * This is not cosmetic. A deployment built before its commit reported the
     * previous SHA while serving code that was not in it — which makes the
     * one field whose entire purpose is "which build is running" answer with
     * something that was never deployed. It happened once; the marker means
     * it cannot happen silently again.
     */
    const dirty = execFileSync("git", ["status", "--porcelain"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    return dirty === "" ? head : `${head}-dirty`;
  } catch {
    return undefined;
  }
}

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
/**
 * Whether an optional integration is configured.
 *
 * Mirrors `readEnv` in `src/config/site.ts` — including its placeholder guard —
 * because this file cannot import from `src`: it is evaluated before the path
 * aliases exist. The two must agree, and the contract is narrow enough that
 * duplicating four lines is safer than moving configuration out of the module
 * every component reads.
 */
function isConfigured(name: string): boolean {
  const value = process.env[name]?.trim();
  if (!value) return false;
  return !/^(your_|example|changeme|placeholder|xxx)/i.test(value);
}

/**
 * Third-party origins, each present only while the integration that needs it is
 * actually configured.
 *
 * These used to be listed unconditionally, which left the policy permitting
 * Google Tag Manager and the Cloudflare beacon on a deployment that loads
 * neither. That is not a theoretical looseness: `script-src` already carries
 * 'unsafe-inline', and `googletagmanager.com` will serve an attacker-authored
 * container, so an allowlisted origin nobody uses is a standing bypass of the
 * one directive doing the most work here. It also contradicted the privacy
 * page, which states that no tracking script loads.
 */
const ANALYTICS_SCRIPT_ORIGINS = [
  isConfigured("NEXT_PUBLIC_CF_ANALYTICS_TOKEN") ? "https://static.cloudflareinsights.com" : null,
  isConfigured("NEXT_PUBLIC_GA4_ID") ? "https://www.googletagmanager.com" : null,
].filter((origin): origin is string => origin !== null);

/**
 * Where GA4 actually delivers a hit.
 *
 * Not `connect-src`. The tag sends its measurement pings as **images** —
 * `GET https://www.googletagmanager.com/a?id=…` — and falls back to
 * `google-analytics.com` for some of them. With `img-src 'self' data: blob:`
 * the browser blocked every one, so the tag loaded, initialised, and reported
 * nothing: a working script sending hits into a wall, which looks exactly like
 * a healthy install from the page's side.
 *
 * Caught by the localized-layout suite, which fails on any console error, and
 * only after GA4 had already been deployed once in that state.
 */
const ANALYTICS_IMG_ORIGINS = isConfigured("NEXT_PUBLIC_GA4_ID")
  ? ["https://www.googletagmanager.com", "https://www.google-analytics.com"]
  : [];

const ANALYTICS_CONNECT_ORIGINS = [
  isConfigured("NEXT_PUBLIC_CF_ANALYTICS_TOKEN") ? "https://cloudflareinsights.com" : null,
  isConfigured("NEXT_PUBLIC_GA4_ID") ? "https://www.google-analytics.com" : null,
].filter((origin): origin is string => origin !== null);

const TURNSTILE_ORIGIN = isConfigured("NEXT_PUBLIC_TURNSTILE_SITE_KEY")
  ? "https://challenges.cloudflare.com"
  : null;

/**
 * The platform data plane, which `/platform/` reads from the browser.
 *
 * `/platform/` is a static document and its figures are fetched after load from
 * a separate Worker on `api.devexcalculator.org` - the page is prerendered
 * precisely so that no Worker renders it per request. `connect-src 'self'`
 * blocks that fetch, and a blocked request is indistinguishable to the page
 * from an outage, so the dashboard would have reported the data plane as
 * unreachable while it was working perfectly.
 *
 * Derived from the same variable the client is built against rather than
 * written out, so the policy cannot permit an origin the page never calls, and
 * cannot omit the one it does. Only the origin is taken: a path in a CSP source
 * is ignored for `connect-src` matching and would only mislead a reader of the
 * header.
 */
const PLATFORM_DATA_ORIGIN = (() => {
  const configured = process.env.NEXT_PUBLIC_PLATFORM_DATA_API ?? "https://api.devexcalculator.org";
  try {
    return new URL(configured).origin;
  } catch {
    return null;
  }
})();

const directive = (...parts: readonly (string | null)[]): string =>
  parts.filter((part) => part !== null).join(" ");

const CSP_DIRECTIVES: readonly string[] = [
  "default-src 'self'",
  // Next.js inlines a bootstrap script, and the theme script must run before
  // paint to avoid a flash of the wrong theme. Both require 'unsafe-inline'.
  // A nonce would need threading through every streamed chunk, which the
  // adapter does not currently support; recorded in docs/security-model.md
  // rather than left as an unexplained relaxation.
  directive("script-src 'self' 'unsafe-inline'", ...ANALYTICS_SCRIPT_ORIGINS, TURNSTILE_ORIGIN),
  // Tailwind emits a stylesheet; inline styles are used for progress-meter widths.
  "style-src 'self' 'unsafe-inline'",
  directive("img-src 'self' data: blob:", ...ANALYTICS_IMG_ORIGINS),
  "font-src 'self' data:",
  directive("connect-src 'self'", PLATFORM_DATA_ORIGIN, ...ANALYTICS_CONNECT_ORIGINS),
  // With no Turnstile widget there is nothing legitimate to frame, so the
  // directive becomes 'none' rather than disappearing — an absent `frame-src`
  // would fall back to `default-src 'self'` and permit same-origin frames.
  directive("frame-src", TURNSTILE_ORIGIN ?? "'none'"),
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

/** Resolved once: this runs a subprocess, and the config is evaluated per build. */
const BUILD_COMMIT = resolveCommit();

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /*
   * Build provenance, inlined at build time.
   *
   * Not named `NEXT_PUBLIC_*` on purpose. Only `src/lib/build-info.ts` reads
   * them and only the health endpoint imports that, so these values reach the
   * server bundle and never the browser's — which is what keeps a timestamp
   * that changes every build from rewriting the hash of an unchanged client
   * chunk.
   */
  env: {
    ...(BUILD_COMMIT ? { BUILD_COMMIT } : {}),
    BUILD_TIME: new Date().toISOString(),
  },

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
    const fromWww = [{ type: "host", value: "www.devexcalculator.org" }] as const;

    return [
      // The root needs its own rule. With `/:path*` the capture is empty here,
      // and Next emits the unsubstituted token — production served
      // `Location: https://devexcalculator.org/:path*` for the www homepage,
      // the single most likely www entry point. Verified in production, not
      // locally: a host condition cannot be exercised against 127.0.0.1.
      {
        source: "/",
        has: [...fromWww],
        destination: "https://devexcalculator.org/",
        permanent: true,
      },
      // Files keep their exact path. Appending a slash to /sitemap.xml or
      // /robots.txt would send a crawler to a URL that does not exist, so
      // anything with an extension is matched before the page rule below.
      {
        source: "/:file(.*\\.[A-Za-z0-9]+)",
        has: [...fromWww],
        destination: "https://devexcalculator.org/:file",
        permanent: true,
      },
      // Pages arrive with the trailing slash `trailingSlash: true` requires,
      // and the destination has to carry it too. Without it the apex answers
      // with a second redirect to add it, turning every www page request into
      // a two-hop chain.
      {
        source: "/:path*",
        has: [...fromWww],
        destination: "https://devexcalculator.org/:path*/",
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
