import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/**
 * OpenNext / Cloudflare Workers adapter configuration.
 *
 * Every route here is prerendered at build time and nothing revalidates, which
 * is the exact case the static-assets incremental cache is built for: it reads
 * prerendered pages back out of the Workers Assets binding. No KV, R2 or
 * Durable Object binding is introduced, so decision D-011 — no paid storage
 * binding for a stateless calculator — still holds.
 *
 * `enableCacheInterception` is what makes it matter. Without it every request,
 * including one for a page whose HTML was fixed at build time, ran a full
 * Next.js server render inside the Worker. Production answered `error code:
 * 1102` — CPU limit exceeded — on every page while the trivial
 * `/api/health/` route kept working. Interception returns the prerendered
 * entry before the render path is reached.
 */
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
