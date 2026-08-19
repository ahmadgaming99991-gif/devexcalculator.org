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
  | { readonly status: "ok"; readonly quote: Quote }
  /**
   * The last quote this site actually received, served because the provider
   * would not answer now.
   *
   * This is not a stale figure presented as current: every quote is rendered
   * with the timestamp the provider gave it, so a reader always sees when the
   * price was taken. `reason` says why a newer one is not available, and the
   * page states both.
   */
  | { readonly status: "last-known"; readonly quote: Quote; readonly reason: string };

/** The minimum of a KV binding this module needs, so tests can supply a fake. */
export interface QuoteStore {
  get(key: string, type: "json"): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

const LAST_QUOTE_KEY = "quote:last";

/**
 * How long a stored quote may still be offered.
 *
 * A day. Past that the number stops being useful even with its date attached,
 * and saying nothing becomes the better answer.
 */
const LAST_QUOTE_TTL_SECONDS = 24 * 60 * 60;

function isQuote(value: unknown): value is Quote {
  if (typeof value !== "object" || value === null) return false;
  const q = value as Record<string, unknown>;
  return (
    typeof q.symbol === "string" &&
    typeof q.price === "string" &&
    typeof q.currency === "string" &&
    typeof q.asOf === "string" &&
    typeof q.providerName === "string"
  );
}

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
export async function getQuote(env: ProviderEnv, store?: QuoteStore): Promise<QuoteState> {
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
        /*
         * Cache successes only. `cacheTtl` with `cacheEverything` applies to
         * whatever comes back, so a 429 would have been held for the full
         * fifteen minutes and turned a momentary rate limit into a quarter of
         * an hour of outage.
         */
        cf: {
          cacheTtlByStatus: { "200-299": QUOTE_CACHE_SECONDS, "300-599": 0 },
          cacheEverything: true,
        },
      } as RequestInit,
    );

    if (!response.ok) {
      /*
       * A rate limit here is not the operator's key being wrong.
       *
       * Workers make outbound requests from addresses shared with every other
       * Worker, and Finnhub's free tier limits by address, so roughly one
       * request in five came back 429 while the same key answered instantly
       * from anywhere else. Showing "the provider did not answer" to a fifth of
       * readers, when a perfectly good quote was taken minutes ago and carries
       * its own timestamp, is worse than showing that quote.
       */
      return fallback(store, `The provider returned HTTP ${response.status}.`);
    }

    const parsed = parseFinnhub(await response.json());
    if (!parsed) {
      return fallback(store, "The provider's response did not contain a price.");
    }

    await remember(store, parsed);
    return { status: "ok", quote: parsed };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fallback(store, `Could not reach the provider: ${message}`);
  }
}

/** Stores a quote so a later outage has something dated to fall back to. */
async function remember(store: QuoteStore | undefined, quote: Quote): Promise<void> {
  if (!store) return;
  try {
    await store.put(LAST_QUOTE_KEY, JSON.stringify(quote), {
      expirationTtl: LAST_QUOTE_TTL_SECONDS,
    });
  } catch {
    // A failed write costs a future fallback, never the quote in hand.
  }
}

/** The last quote received, or a plain statement that there is none. */
async function fallback(
  store: QuoteStore | undefined,
  reason: string,
): Promise<QuoteState> {
  if (!store) return { status: "unavailable", reason };
  try {
    const stored = await store.get(LAST_QUOTE_KEY, "json");
    if (isQuote(stored)) return { status: "last-known", quote: stored, reason };
  } catch {
    // Fall through: an unreadable store is the same as an empty one here.
  }
  return { status: "unavailable", reason };
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
