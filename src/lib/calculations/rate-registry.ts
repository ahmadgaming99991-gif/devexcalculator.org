import ratesJson from "@/data/rates.json";
import sourcesJson from "@/data/source-registry.json";
import type {
  MarketplaceScheme,
  RateRecord,
  RateRegistry,
  SourceRecord,
  SourceRegistry,
} from "@/types/rates";
import { Rational } from "./rational";

/**
 * Loads and validates the rate and source registries.
 *
 * Validation runs at module load, which means it runs during `next build`.
 * A registry that violates any invariant below fails the build rather than
 * publishing an unsourced or internally inconsistent rate.
 */

const registry = ratesJson as RateRegistry;
const sourceRegistry = sourcesJson as unknown as SourceRegistry;

export class RateRegistryError extends Error {
  constructor(message: string) {
    super(`Rate registry invalid: ${message}`);
    this.name = "RateRegistryError";
  }
}

const DECIMAL_STRING = /^\d+(\.\d+)?$/;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new RateRegistryError(message);
}

function isIsoInstant(value: string): boolean {
  return !Number.isNaN(Date.parse(value));
}

function validate(): void {
  assert(registry.schemaVersion === 1, `unsupported schemaVersion ${registry.schemaVersion}`);
  assert(isIsoInstant(registry.lastVerifiedAt), "registry lastVerifiedAt is not a valid date");
  assert(registry.rates.length > 0, "no rates defined");

  const sourceIds = new Set(sourceRegistry.sources.map((s) => s.id));
  const seenRateIds = new Set<string>();

  for (const rate of registry.rates) {
    const where = `rate "${rate.id}"`;

    assert(!seenRateIds.has(rate.id), `${where} is defined more than once`);
    seenRateIds.add(rate.id);

    // A rate value must be an exact positive decimal string, never a float.
    assert(DECIMAL_STRING.test(rate.usdPerRobux), `${where} usdPerRobux is not a decimal string`);
    const perRobux = Rational.fromDecimalString(rate.usdPerRobux);
    assert(perRobux.gt(Rational.ZERO), `${where} usdPerRobux must be positive`);

    // usdPerThousandRobux must equal usdPerRobux x 1000 exactly.
    assert(
      DECIMAL_STRING.test(rate.usdPerThousandRobux),
      `${where} usdPerThousandRobux is not a decimal string`,
    );
    const perThousand = Rational.fromDecimalString(rate.usdPerThousandRobux);
    assert(
      perRobux.mul(Rational.fromInt(1000)).eq(perThousand),
      `${where} usdPerThousandRobux (${rate.usdPerThousandRobux}) does not equal usdPerRobux x 1000`,
    );

    // Every publicly displayed rate needs at least one resolvable official source.
    assert(rate.sourceIds.length > 0, `${where} has no sourceIds`);
    for (const id of rate.sourceIds) {
      assert(sourceIds.has(id), `${where} references unknown source "${id}"`);
    }

    assert(isIsoInstant(rate.lastVerifiedAt), `${where} lastVerifiedAt is not a valid date`);

    if (rate.effectiveFrom !== null) {
      assert(isIsoInstant(rate.effectiveFrom), `${where} effectiveFrom is not a valid date`);
    }
    if (rate.effectiveTo !== null) {
      assert(isIsoInstant(rate.effectiveTo), `${where} effectiveTo is not a valid date`);
    }
    if (rate.effectiveFrom !== null && rate.effectiveTo !== null) {
      assert(
        Date.parse(rate.effectiveFrom) < Date.parse(rate.effectiveTo),
        `${where} effectiveFrom is not before effectiveTo`,
      );
    }
  }

  assert(
    registry.rates.some((r) => r.status === "active"),
    "no active rate is defined",
  );

  // Minimum threshold.
  assert(
    Number.isInteger(registry.minimum.eligibleEarnedRobux) &&
      registry.minimum.eligibleEarnedRobux > 0,
    "minimum eligibleEarnedRobux must be a positive integer",
  );
  assert(registry.minimum.sourceIds.length > 0, "minimum has no sourceIds");
  for (const id of registry.minimum.sourceIds) {
    assert(sourceIds.has(id), `minimum references unknown source "${id}"`);
  }

  // Marketplace schemes.
  const seenSchemeIds = new Set<string>();
  for (const scheme of registry.marketplace.schemes) {
    const where = `marketplace scheme "${scheme.id}"`;
    assert(!seenSchemeIds.has(scheme.id), `${where} is defined more than once`);
    seenSchemeIds.add(scheme.id);
    assert(scheme.sourceIds.length > 0, `${where} has no sourceIds`);
    for (const id of scheme.sourceIds) {
      assert(sourceIds.has(id), `${where} references unknown source "${id}"`);
    }
    assert(
      DECIMAL_STRING.test(scheme.creatorSharePercent),
      `${where} creatorSharePercent is not a decimal string`,
    );
    if (scheme.progressive) {
      assert(
        Array.isArray(scheme.progressiveTiers) && scheme.progressiveTiers.length > 0,
        `${where} is progressive but declares no tiers`,
      );
      let previous = Rational.ZERO;
      for (const tier of scheme.progressiveTiers ?? []) {
        const multiple = Rational.fromDecimalString(tier.priceFloorMultiple);
        assert(
          multiple.gt(previous),
          `${where} progressive tiers must be sorted by increasing priceFloorMultiple`,
        );
        previous = multiple;
      }
    }
  }

  // Limits.
  assert(registry.limits.maxRobuxInput > 0, "limits.maxRobuxInput must be positive");
  assert(registry.limits.maxUsdTargetInput > 0, "limits.maxUsdTargetInput must be positive");

  // Source registry integrity.
  const seenSourceIds = new Set<string>();
  for (const source of sourceRegistry.sources) {
    assert(!seenSourceIds.has(source.id), `source "${source.id}" is defined more than once`);
    seenSourceIds.add(source.id);
    assert(
      source.url.startsWith("https://"),
      `source "${source.id}" url must be absolute HTTPS`,
    );
    assert(
      isIsoInstant(source.lastCheckedAt),
      `source "${source.id}" lastCheckedAt is not a valid date`,
    );
    assert(
      source.factsSupported.length > 0,
      `source "${source.id}" supports no facts and should be removed`,
    );
  }
}

validate();

export const rateRegistry: RateRegistry = registry;
export const sources: SourceRegistry = sourceRegistry;

export const allRates: readonly RateRecord[] = registry.rates;

/** Rates a user may explicitly select in quick and comparison modes. */
export const selectableRates: readonly RateRecord[] = registry.rates.filter(
  (rate) => rate.status !== "retired",
);

export const defaultRateId = "standard-current";

export function getRate(id: string): RateRecord {
  const rate = registry.rates.find((r) => r.id === id);
  if (!rate) throw new RateRegistryError(`unknown rate id "${id}"`);
  return rate;
}

export function findRate(id: string | null | undefined): RateRecord | null {
  if (!id) return null;
  return registry.rates.find((r) => r.id === id) ?? null;
}

export function getRateValue(id: string): Rational {
  return Rational.fromDecimalString(getRate(id).usdPerRobux);
}

export function getSource(id: string): SourceRecord {
  const source = sourceRegistry.sources.find((s) => s.id === id);
  if (!source) throw new RateRegistryError(`unknown source id "${id}"`);
  return source;
}

export function getSources(ids: readonly string[]): SourceRecord[] {
  return ids.map(getSource);
}

/** Every marketplace scheme, in registry order. */
export const marketplaceSchemes: readonly MarketplaceScheme[] = registry.marketplace.schemes;

export function getMarketplaceScheme(id: string): MarketplaceScheme {
  const scheme = registry.marketplace.schemes.find((s) => s.id === id);
  if (!scheme) throw new RateRegistryError(`unknown marketplace scheme "${id}"`);
  return scheme;
}

export const minimumEarnedRobux = registry.minimum.eligibleEarnedRobux;
export const maxRobuxInput = registry.limits.maxRobuxInput;
export const maxUsdTargetInput = registry.limits.maxUsdTargetInput;

/**
 * Days since the registry was last verified against official documentation.
 * Surfaced in the build warning and on rate-sensitive pages.
 */
export function registryAgeInDays(now: Date = new Date()): number {
  const verified = Date.parse(registry.lastVerifiedAt);
  return Math.floor((now.getTime() - verified) / 86_400_000);
}

export function registryFreshness(now: Date = new Date()): {
  ageDays: number;
  state: "fresh" | "review-due" | "critical";
} {
  const ageDays = registryAgeInDays(now);
  if (ageDays >= registry.criticalReviewAgeDays) return { ageDays, state: "critical" };
  if (ageDays >= registry.reviewCadenceDays) return { ageDays, state: "review-due" };
  return { ageDays, state: "fresh" };
}
