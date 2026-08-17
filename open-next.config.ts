import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext / Cloudflare Workers adapter configuration.
 *
 * No incremental-cache override is configured: every route on this site is
 * either statically prerendered at build time or a short-lived Route Handler
 * that manages its own `Cache-Control`. Adding an R2 or KV incremental cache
 * would introduce a binding, a cost, and a failure mode with no benefit
 * (see docs/architecture.md § Caching and src/lib/cloudflare/README rationale
 * recorded in docs/decision-log.md, decision D-011).
 */
export default defineCloudflareConfig();
