import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Canonical URL policy: every route is served with a trailing slash
  // (see docs/seo/indexation-policy.md). Next.js issues a single 308 from the
  // non-slash form, which keeps redirects single-hop.
  trailingSlash: true,

  // Fail the production build on type or lint errors instead of shipping them.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  // The site ships no remote images; all art is local SVG.
  images: {
    remotePatterns: [],
    formats: ["image/avif", "image/webp"],
  },

  // `x-powered-by` leaks framework version information for no benefit.
  poweredByHeader: false,
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
