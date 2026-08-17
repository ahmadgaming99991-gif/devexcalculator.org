import { NextResponse, type NextRequest } from "next/server";
import { siteConfig } from "@/config/site";

/**
 * Security headers and host normalisation.
 *
 * Uses the `proxy` file convention, which replaced `middleware` in Next.js 16.3.
 *
 * Runs on dynamic responses; static assets get their headers from
 * `public/_headers` instead, since the assets binding serves those without
 * invoking the Worker.
 *
 * The `www` redirect is implemented here as well as at the DNS layer, so the
 * canonical host holds even if a Cloudflare redirect rule is ever removed. It
 * preserves the path and the query string and is a single permanent hop.
 */

const CSP_DIRECTIVES: readonly string[] = [
  "default-src 'self'",
  // Next.js inlines a small bootstrap script and the theme script must run
  // before paint, so 'unsafe-inline' is required for scripts. Removing it
  // would need a nonce threaded through every streamed chunk, which the
  // adapter does not currently support; this is documented in
  // docs/security-model.md rather than left as an unexplained relaxation.
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://www.googletagmanager.com https://challenges.cloudflare.com",
  // Tailwind emits a stylesheet, but React inline styles are used for the
  // progress meters' widths.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // The FX endpoint is same-origin; analytics beacons post cross-origin.
  "connect-src 'self' https://cloudflareinsights.com https://www.google-analytics.com",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
];

export default function proxy(request: NextRequest): NextResponse {
  const url = new URL(request.url);

  // Redirect the alternate host to the canonical one, preserving path + query.
  if (url.hostname === siteConfig.alternateHost) {
    url.hostname = siteConfig.host;
    url.protocol = "https:";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  // Collapse duplicate slashes so `//devex-rates//` cannot become a second URL
  // for the same page.
  if (url.pathname.includes("//")) {
    url.pathname = url.pathname.replace(/\/{2,}/g, "/");
    return NextResponse.redirect(url, 308);
  }

  const response = NextResponse.next();
  const headers = response.headers;

  headers.set("Content-Security-Policy", CSP_DIRECTIVES.join("; "));
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  );
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("X-Frame-Options", "DENY");

  // HSTS is only meaningful over HTTPS, and asserting it on a plain-HTTP
  // local development response would be wrong.
  if (url.protocol === "https:") {
    headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimisation, which are
    // covered by public/_headers.
    "/((?!_next/static|_next/image|favicon.ico|icons/|images/).*)",
  ],
};
