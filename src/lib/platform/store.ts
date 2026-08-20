import type { HistoryStore } from "./history";

/**
 * The KV binding, when there is one.
 *
 * Reached through the adapter's context rather than a global, and returns null
 * anywhere it is absent — local `next dev`, `next start`, and the build itself
 * — so a caller renders or reports a stated absence instead of throwing.
 *
 * Lives here rather than beside its first caller because there are now two:
 * the platform page draws its charts from it, and the health endpoint reads
 * the collector's pulse out of it. Two copies of a `try`/`catch` around a
 * dynamic import is two places for the fallback to drift apart.
 *
 * `/platform/stock/` deliberately keeps its own copy. It needs the Cloudflare
 * environment for the provider configuration as well as the binding, and
 * calling into the adapter's context twice to avoid one duplicated `catch`
 * would cost more than it saved.
 */
export async function getHistoryStore(): Promise<HistoryStore | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true });
    const binding = (context.env as Record<string, unknown>).PLATFORM_HISTORY;
    return binding ? (binding as HistoryStore) : null;
  } catch {
    return null;
  }
}
