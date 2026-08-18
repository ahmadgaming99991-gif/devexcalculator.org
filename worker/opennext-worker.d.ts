/**
 * The Worker that `opennextjs-cloudflare build` generates.
 *
 * Declared rather than imported by path because the file does not exist until
 * that build has run, and `npm run typecheck` runs before it in CI. Wrangler
 * resolves the specifier through the `alias` entry in wrangler.jsonc, so the
 * two agree without either needing the other to have happened first.
 */
declare module "opennext-worker" {
  const worker: {
    fetch(request: Request, env: unknown, ctx: ExecutionContext): Promise<Response>;
  };
  export default worker;

  // Durable Object classes the adapter exports. They are re-exported unchanged;
  // dropping one would break a deployment that has the binding configured.
  export const DOQueueHandler: unknown;
  export const DOShardedTagCache: unknown;
  export const BucketCachePurge: unknown;
}
