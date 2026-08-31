import { edgeCachePolicy, staticCachePolicy } from "./edge-policy";
import {
  EDGE_CACHE_CONTROL_HEADER,
  isStorablePlatformResponse,
  platformCachePolicy,
  platformEdgePolicy,
  RENDERED_AT_HEADER,
  resolveCachePolicy,
} from "./platform-cache";

/**
 * The one exit every response leaves this Worker through.
 *
 * `resolveCachePolicy` decides what a response should say; this applies it.
 * They were one block inside `worker/index.ts`, and the wiring is where the
 * hole was: the HTTPS upgrade returned its 301 *before* that block, so one
 * response class left the Worker with no `Cache-Control` at all.
 *
 * That mattered only after `cache.enabled` was turned on. Before, an
 * unlabelled response was simply not cached by this site's own rules; with the
 * cache in front of the Worker it is a response whose caching something other
 * than this repository decides — which is the exact thing the audit was
 * supposed to have ruled out, and had not.
 *
 * The reason the audit missed it is worth keeping: it was run against a local
 * preview, which serves over plain HTTP and therefore runs with
 * `DISABLE_HTTPS_UPGRADE`. The upgrade path cannot execute there, so no amount
 * of fetching the running Worker would have produced the response. It is only
 * visible by reading the code.
 *
 * So the wiring lives here rather than in the Worker: the Worker imports the
 * generated OpenNext bundle, which only resolves inside wrangler, and a rule
 * this consequential should not be reachable only through a build artefact.
 * Now the Worker has one `return`, and this function is what a test can hold.
 */
export function applyCachePolicy(request: Request, response: Response): Response {
  const platform = platformCachePolicy(request);
  const storable = isStorablePlatformResponse(response);
  const existing = response.headers.get("cache-control");

  const policy = resolveCachePolicy({
    platform,
    storablePlatformResponse: storable,
    others: [edgeCachePolicy(request, response), staticCachePolicy(request, response)],
    existing,
  });

  const edge = platformEdgePolicy(request, response);

  /*
   * Nothing to change: the response already says exactly this, there is no edge
   * override to add, and there is none present to strip.
   *
   * The last clause matters. Without it a response arriving with an edge header
   * would keep it here purely because its `Cache-Control` happened to need no
   * change — a short-circuit that skipped the strip below it.
   */
  const carriesEdgeHeader = response.headers.has(EDGE_CACHE_CONTROL_HEADER);
  if (policy === existing && platform === null && edge === null && !carriesEdgeHeader) {
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set("cache-control", policy);

  /*
   * The edge override, set only where `platformEdgePolicy` allows one.
   *
   * Deleted rather than left alone otherwise: this header outranks
   * `Cache-Control` at Cloudflare, so one arriving from anywhere else would
   * quietly outrank every decision made above it. Nothing upstream sets it
   * today, which is the reason to make sure that stays true here rather than
   * to assume it.
   */
  if (edge !== null) {
    headers.set(EDGE_CACHE_CONTROL_HEADER, edge);
  } else {
    headers.delete(EDGE_CACHE_CONTROL_HEADER);
  }

  if (platform !== null && storable) {
    headers.set(RENDERED_AT_HEADER, new Date().toISOString());
  }

  // Headers on a returned Response are immutable, so this is a copy.
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
