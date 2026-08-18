/**
 * Market data for RBLX.
 *
 * Deliberately unwired. No provider is configured, so this module reports that
 * and stops. It exists now so that connecting a provider later is a matter of
 * setting two environment variables and writing one `parse` function, rather
 * than redesigning a page.
 *
 * Three rules it enforces, which are the reason it is not simply left to a
 * future change:
 *
 * 1. No price is ever fabricated or hardcoded. There is no placeholder figure
 *    anywhere in this file, so none can leak into a render by accident.
 * 2. No third-party script. A quote is fetched server-side and rendered as
 *    HTML; nothing from a market data vendor runs in a reader's browser, which
 *    is what an embedded widget would do.
 * 3. Nothing about the page depends on it. Unconfigured is a first-class state
 *    with its own explanation, not an error.
 */

export const STOCK_SYMBOL = "RBLX";

/** How long a quote may be reused. Long enough to stay well inside a free tier. */
export const QUOTE_CACHE_SECONDS = 900;

export interface Quote {
  readonly symbol: string;
  readonly price: string;
  readonly currency: string;
  /** When the provider says the quote was taken. */
  readonly asOf: string;
  readonly providerName: string;
}

export type QuoteState =
  | { readonly status: "unconfigured"; readonly missing: readonly string[] }
  | { readonly status: "unavailable"; readonly reason: string }
  | { readonly status: "ok"; readonly quote: Quote };

/** Set to a provider key — currently only "finnhub" is implemented. */
const PROVIDER_VAR = "STOCK_PROVIDER";
/** The provider's API key. Server-only: never prefixed NEXT_PUBLIC_. */
const KEY_VAR = "STOCK_API_KEY";

export const REQUIRED_ENVIRONMENT = [PROVIDER_VAR, KEY_VAR] as const;

interface ProviderEnv {
  readonly [key: string]: string | undefined;
}

/**
 * Reads a quote, or explains why it cannot.
 *
 * The environment is passed in rather than read from a global so the Worker,
 * a local run and a test all supply it the same way.
 */
export async function getQuote(env: ProviderEnv): Promise<QuoteState> {
  const provider = env[PROVIDER_VAR]?.trim();
  const key = env[KEY_VAR]?.trim();

  const missing = REQUIRED_ENVIRONMENT.filter((name) => !env[name]?.trim());
  if (missing.length > 0 || !provider || !key) {
    return { status: "unconfigured", missing };
  }

  if (provider !== "finnhub") {
    return {
      status: "unavailable",
      reason: `${PROVIDER_VAR} is set to "${provider}", which this site has no adapter for.`,
    };
  }

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${STOCK_SYMBOL}&token=${encodeURIComponent(key)}`,
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(6_000),
        cf: { cacheTtl: QUOTE_CACHE_SECONDS, cacheEverything: true },
      } as RequestInit,
    );

    if (!response.ok) {
      return { status: "unavailable", reason: `The provider returned HTTP ${response.status}.` };
    }

    const parsed = parseFinnhub(await response.json());
    return parsed
      ? { status: "ok", quote: parsed }
      : { status: "unavailable", reason: "The provider's response did not contain a price." };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { status: "unavailable", reason: `Could not reach the provider: ${message}` };
  }
}

/**
 * Finnhub's quote shape: `c` is the current price, `t` a UNIX timestamp.
 *
 * A price of zero is treated as absent, because that is what the endpoint
 * returns for an unknown symbol rather than an error.
 */
export function parseFinnhub(payload: unknown): Quote | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;
  const price = record.c;
  const at = record.t;

  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return null;

  return {
    symbol: STOCK_SYMBOL,
    // Two decimals, formatted once, so no downstream code re-rounds a price.
    price: price.toFixed(2),
    currency: "USD",
    asOf:
      typeof at === "number" && Number.isFinite(at) && at > 0
        ? new Date(at * 1000).toISOString()
        : new Date().toISOString(),
    providerName: "Finnhub",
  };
}
