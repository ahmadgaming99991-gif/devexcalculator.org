import { supportedCurrencies } from "@/lib/calculations/format";
import { fxConfig } from "@/config/site";
import fallbackSnapshot from "@/data/fx-fallback.json";
import type { FxRates } from "./types";

/**
 * European Central Bank reference-rate provider.
 *
 * The ECB publishes euro-based reference rates once each working day at around
 * 16:00 CET. This site needs USD-based rates, so every value is converted
 * through a cross rate:
 *
 *     USD -> X  =  (EUR -> X) / (EUR -> USD)
 *
 * Getting that division the wrong way round is the classic FX bug — it looks
 * plausible and is off by the square of the rate — so the direction is pinned
 * by fixtures in tests/unit/fx/.
 *
 * These are reference rates, not tradable quotes. A bank or payment provider
 * will apply its own rate and a margin, and the UI says so wherever a
 * converted figure appears.
 */

const ECB_ENDPOINT =
  "https://data-api.ecb.europa.eu/service/data/EXR/D..EUR.SP00.A?lastNObservations=1&format=jsondata&detail=dataonly";

const PROVIDER_NAME = "European Central Bank";
const PROVIDER_URL = "https://data-api.ecb.europa.eu/";

/** Reference rates older than this are reported as stale. */
const STALE_AFTER_DAYS = 5;

interface EcbPayload {
  dataSets?: Array<{
    series?: Record<string, { observations?: Record<string, Array<number | null>> }>;
  }>;
  structure?: {
    dimensions?: {
      series?: Array<{ id: string; values: Array<{ id: string }> }>;
      observation?: Array<{ values: Array<{ id: string }> }>;
    };
  };
}

export class FxProviderError extends Error {
  constructor(
    message: string,
    readonly code: "FX_UNAVAILABLE" | "FX_TIMEOUT" | "FX_INVALID_RESPONSE",
  ) {
    super(message);
    this.name = "FxProviderError";
  }
}

/**
 * The English sentence the /api/fx/latest/ payload carries for a snapshot.
 *
 * One constant on one line. Written as a concatenation across two lines it
 * read to the string extractor as two separate sentence fragments.
 */
const STORED_SNAPSHOT_REASON =
  "Live reference rates are unavailable, so a stored snapshot is being shown. Treat these figures as indicative only.";

/**
 * Converts the ECB's SDMX-JSON payload into USD-based rates.
 *
 * Exported separately from the fetch so it can be tested against a captured
 * fixture without touching the network.
 */
export function parseEcbPayload(payload: EcbPayload, fetchedAt: string): FxRates {
  const seriesDimensions = payload.structure?.dimensions?.series;
  const observationValues = payload.structure?.dimensions?.observation?.[0]?.values;
  const series = payload.dataSets?.[0]?.series;

  if (!seriesDimensions || !observationValues || !series) {
    throw new FxProviderError("ECB response is missing its structure block", "FX_INVALID_RESPONSE");
  }

  const currencyDimensionIndex = seriesDimensions.findIndex((d) => d.id === "CURRENCY");
  const currencyValues = seriesDimensions[currencyDimensionIndex]?.values;
  if (currencyDimensionIndex === -1 || !currencyValues) {
    throw new FxProviderError("ECB response has no CURRENCY dimension", "FX_INVALID_RESPONSE");
  }

  // Collect EUR-based rates with the date each one was actually observed.
  const eurRates = new Map<string, { value: number; date: string }>();

  for (const [key, entry] of Object.entries(series)) {
    const keyParts = key.split(":");
    const currencyIndexRaw = keyParts[currencyDimensionIndex];
    if (currencyIndexRaw === undefined) continue;
    const currency = currencyValues[Number(currencyIndexRaw)]?.id;
    if (!currency) continue;

    const observations = entry.observations ?? {};
    for (const [observationIndex, values] of Object.entries(observations)) {
      const value = values?.[0];
      const date = observationValues[Number(observationIndex)]?.id;
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || !date) continue;
      eurRates.set(currency, { value, date });
    }
  }

  const eurToUsd = eurRates.get("USD");
  if (!eurToUsd) {
    throw new FxProviderError("ECB response contains no USD series", "FX_INVALID_RESPONSE");
  }

  const observationDate = eurToUsd.date;
  const supported = new Set(supportedCurrencies.map((c) => c.code));
  const rates: Record<string, number> = { USD: 1 };

  // EUR itself is the provider's base, so USD -> EUR is simply the reciprocal.
  if (supported.has("EUR")) {
    rates.EUR = 1 / eurToUsd.value;
  }

  for (const [currency, entry] of eurRates) {
    if (currency === "USD" || currency === "EUR") continue;
    if (!supported.has(currency)) continue;
    // Skip a discontinued series whose last observation predates the USD one;
    // several currencies in the ECB set stopped publishing years ago.
    if (entry.date !== observationDate) continue;
    rates[currency] = entry.value / eurToUsd.value;
  }

  const ageDays = Math.floor(
    (Date.parse(fetchedAt) - Date.parse(`${observationDate}T00:00:00Z`)) / 86_400_000,
  );
  const stale = ageDays > STALE_AFTER_DAYS;

  return {
    base: "USD",
    rates,
    provider: PROVIDER_NAME,
    providerUrl: PROVIDER_URL,
    observationDate,
    fetchedAt,
    stale,
    staleReason: stale
      ? `The most recent published reference rates are ${ageDays} days old.`
      : null,
    staleCode: stale ? "aged" : null,
    staleAgeDays: stale ? ageDays : null,
  };
}

/**
 * Fetches current reference rates.
 *
 * Bounded by an abort timeout so a slow upstream can never hold a request
 * open: the USD calculator does not depend on this call and must not wait for
 * it. Caching is delegated to the platform `fetch` cache so a Worker isolate
 * serves repeat requests without a second upstream call.
 */
export async function fetchEcbRates(): Promise<FxRates> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fxConfig.timeoutMs);

  try {
    const response = await fetch(ECB_ENDPOINT, {
      signal: controller.signal,
      headers: { accept: "application/json" },
      next: { revalidate: fxConfig.cacheTtlSeconds },
    });

    if (!response.ok) {
      throw new FxProviderError(
        `ECB responded with HTTP ${response.status}`,
        "FX_UNAVAILABLE",
      );
    }

    const payload = (await response.json()) as EcbPayload;
    return parseEcbPayload(payload, new Date().toISOString());
  } catch (error) {
    if (error instanceof FxProviderError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new FxProviderError("The exchange-rate provider timed out", "FX_TIMEOUT");
    }
    throw new FxProviderError("The exchange-rate provider is unreachable", "FX_UNAVAILABLE");
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * The bundled fallback snapshot.
 *
 * Exists so that local-currency estimates degrade to "here is an old figure,
 * clearly labelled" rather than disappearing. It is always returned with
 * `stale: true` and a reason, and the UI never presents it as current.
 */
export function getFallbackRates(): FxRates {
  const snapshot = fallbackSnapshot as {
    base: string;
    rates: Record<string, number>;
    observationDate: string;
  };

  return {
    base: snapshot.base,
    rates: snapshot.rates,
    provider: PROVIDER_NAME,
    providerUrl: PROVIDER_URL,
    observationDate: snapshot.observationDate,
    fetchedAt: new Date().toISOString(),
    stale: true,
    staleReason: STORED_SNAPSHOT_REASON,
    staleCode: "snapshot",
    staleAgeDays: null,
  };
}
