import { NextResponse } from "next/server";
import { corsPreflight, publicApiCors } from "@/lib/api/public-headers";
import { getQuote, type QuoteState, type QuoteStore } from "@/lib/platform/market-data";

/**
 * The RBLX quote, read here rather than while rendering the page.
 *
 * `/platform/stock/` used to fetch this during its own server render, which
 * made the whole document a request-time render. Measured on the deployed
 * Worker, that render cost 884 ms of CPU on a cold request — against a page
 * whose other 99% is a fixed document about how the figures are sourced.
 *
 * This is the same shape `/platform/` already uses: a static document, and a
 * small island that asks this site's own endpoint for the moving number. A
 * route handler is not a page render; it does the fetch and serialises four
 * fields.
 *
 * The provider key stays on this side. It is read from the Worker environment
 * and never reaches the browser — which is the other reason the browser cannot
 * simply call the provider itself.
 *
 * Every state the page can show is a state this returns: configured or not,
 * answered or not, current or last-known. Nothing is invented when the
 * provider is silent, and `status` says which case it is.
 */
export const dynamic = "force-dynamic";

async function readQuote(): Promise<QuoteState> {
  let env: Record<string, string | undefined> = process.env;
  let store: QuoteStore | undefined;

  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true });
    const cloudflareEnv = context.env as Record<string, unknown>;
    env = { ...process.env, ...(cloudflareEnv as Record<string, string | undefined>) };
    // The same namespace the platform history uses. A quote is one small key
    // beside it rather than a second namespace to provision and forget.
    const binding = cloudflareEnv.PLATFORM_HISTORY;
    if (binding) store = binding as QuoteStore;
  } catch {
    // No Cloudflare context: a local run. process.env is the whole story, and
    // without a store there is no fallback — which the page states.
  }

  return getQuote(env, store);
}

export async function GET(): Promise<NextResponse> {
  const state = await readQuote();

  return NextResponse.json(
    {
      ok: state.status === "ok" || state.status === "last-known",
      data: state,
      meta: {
        disclaimer:
          "A share price from a market-data provider, shown with the timestamp the provider gave it. It is not investment advice, it is not a live tick, and it is not connected to any figure this site calculates.",
      },
    },
    {
      headers: {
        /*
         * A minute at the edge. Long enough that a burst of readers is one
         * provider call rather than hundreds — the free tier this runs on
         * rate-limits a shared address — and short enough that the page is
         * never showing a price a reader would call stale. The timestamp is on
         * the page either way.
         */
        "cache-control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
        "x-robots-tag": "noindex",
        ...publicApiCors,
      },
    },
  );
}

/** Answers the preflight a browser sends before a cross-origin read. */
export function OPTIONS(): Response {
  return corsPreflight();
}
