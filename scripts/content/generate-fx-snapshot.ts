/**
 * Regenerates `src/data/fx-fallback.json` from live ECB reference rates.
 *
 * The snapshot exists purely so local-currency estimates degrade to a clearly
 * labelled stale figure instead of vanishing when the provider is unreachable.
 * It is never presented as current. Run with `npm run fx:snapshot` and commit
 * the result alongside a note in the changelog.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { supportedCurrencies } from "../../src/lib/calculations/format";
import { REPO_ROOT } from "../seo/paths";

const ENDPOINT =
  "https://data-api.ecb.europa.eu/service/data/EXR/D..EUR.SP00.A?lastNObservations=1&format=jsondata&detail=dataonly";

interface EcbPayload {
  dataSets: Array<{ series: Record<string, { observations: Record<string, Array<number | null>> }> }>;
  structure: {
    dimensions: {
      series: Array<{ id: string; values: Array<{ id: string }> }>;
      observation: Array<{ values: Array<{ id: string }> }>;
    };
  };
}

async function main(): Promise<void> {
  const response = await fetch(ENDPOINT, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`ECB responded with HTTP ${response.status}`);
  }
  const payload = (await response.json()) as EcbPayload;

  const dimensions = payload.structure.dimensions.series;
  const currencyIndex = dimensions.findIndex((d) => d.id === "CURRENCY");
  const currencyValues = dimensions[currencyIndex]?.values ?? [];
  const observationValues = payload.structure.dimensions.observation[0]?.values ?? [];

  const eurRates = new Map<string, { value: number; date: string }>();
  for (const [key, entry] of Object.entries(payload.dataSets[0]?.series ?? {})) {
    const currency = currencyValues[Number(key.split(":")[currencyIndex])]?.id;
    if (!currency) continue;
    for (const [observationIndex, values] of Object.entries(entry.observations)) {
      const value = values[0];
      const date = observationValues[Number(observationIndex)]?.id;
      if (typeof value !== "number" || !date) continue;
      eurRates.set(currency, { value, date });
    }
  }

  const eurToUsd = eurRates.get("USD");
  if (!eurToUsd) throw new Error("ECB response contains no USD series");

  const supported = new Set(supportedCurrencies.map((c) => c.code));
  const rates: Record<string, number> = { USD: 1, EUR: round(1 / eurToUsd.value) };
  const skipped: string[] = [];

  for (const [currency, entry] of eurRates) {
    if (currency === "USD" || currency === "EUR") continue;
    if (!supported.has(currency)) continue;
    // A currency whose latest observation predates the USD one has been
    // discontinued by the ECB; publishing it would be publishing a dead rate.
    if (entry.date !== eurToUsd.date) {
      skipped.push(`${currency} (last seen ${entry.date})`);
      continue;
    }
    rates[currency] = round(entry.value / eurToUsd.value);
  }

  const snapshot = {
    $comment:
      "Fallback snapshot of USD-based reference rates derived from ECB euro reference rates. Used ONLY when the live provider is unreachable, and always surfaced to the reader as stale. Regenerate with `npm run fx:snapshot`.",
    base: "USD",
    provider: "European Central Bank",
    providerUrl: "https://data-api.ecb.europa.eu/",
    observationDate: eurToUsd.date,
    capturedAt: new Date().toISOString(),
    rates,
  };

  const target = join(REPO_ROOT, "src", "data", "fx-fallback.json");
  writeFileSync(target, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  console.log(`Wrote src/data/fx-fallback.json`);
  console.log(`  observation date: ${eurToUsd.date}`);
  console.log(`  currencies: ${Object.keys(rates).length}`);
  if (skipped.length > 0) {
    console.log(`  skipped discontinued series: ${skipped.join(", ")}`);
  }
}

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
