/**
 * KV access, with the schema check in one place.
 *
 * Every read is guarded and returns `null` on any failure - a missing key, an
 * unparseable value, a value from an incompatible schema, or a store that
 * throws. A unit then records "nothing was there", which is true, instead of
 * failing an invocation that a Cron Trigger would retry into the same problem.
 *
 * Every write carries the retention window as a TTL, so old data removes itself
 * and retention needs no cleanup job.
 */

import {
  KEYS,
  RETENTION_DAYS,
  SCHEMA,
  type Details,
  type Highlights,
  type HistoryDay,
  type Live,
  type TotalsDay,
} from "./contracts";

/**
 * The minimum of the KV binding this Worker uses.
 *
 * Declared here rather than pulled from `@cloudflare/workers-types`, which this
 * repository does not install. It also lets a test supply a plain object.
 */
export interface PlatformStore {
  get(key: string, type: "json"): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface Env {
  readonly PLATFORM_DATA: PlatformStore;
}

const TTL_SECONDS = RETENTION_DAYS * 24 * 60 * 60;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** A value only counts as data when it declares the schema this build reads. */
const matchesSchema = (v: unknown): v is Record<string, unknown> =>
  isObject(v) && v.schema === SCHEMA;

async function read<T>(
  store: PlatformStore,
  key: string,
  guard: (v: Record<string, unknown>) => boolean,
): Promise<T | null> {
  try {
    const value = await store.get(key, "json");
    if (!matchesSchema(value)) return null;
    return guard(value) ? (value as T) : null;
  } catch {
    return null;
  }
}

async function write(store: PlatformStore, key: string, value: unknown): Promise<void> {
  await store.put(key, JSON.stringify(value), { expirationTtl: TTL_SECONDS });
}

export const readLive = (env: Env) =>
  read<Live>(env.PLATFORM_DATA, KEYS.live, (v) => isObject(v.experiences) && Array.isArray(v.rankings));

export const readDetails = (env: Env, shard: number) =>
  read<Details>(env.PLATFORM_DATA, KEYS.details(shard), (v) => isObject(v.rows));

export const readTotals = (env: Env, day: string) =>
  read<TotalsDay>(env.PLATFORM_DATA, KEYS.totals(day), (v) => Array.isArray(v.points));

export const readHistory = (env: Env, shard: number, day: string) =>
  read<HistoryDay>(env.PLATFORM_DATA, KEYS.history(shard, day), (v) => Array.isArray(v.at) && isObject(v.p));

export const readHighlights = (env: Env) =>
  read<Highlights>(env.PLATFORM_DATA, KEYS.highlights, (v) => Array.isArray(v.series));

export const writeLive = (env: Env, value: Live) => write(env.PLATFORM_DATA, KEYS.live, value);
export const writeDetails = (env: Env, shard: number, value: Details) =>
  write(env.PLATFORM_DATA, KEYS.details(shard), value);
export const writeTotals = (env: Env, day: string, value: TotalsDay) =>
  write(env.PLATFORM_DATA, KEYS.totals(day), value);
export const writeHistory = (env: Env, shard: number, day: string, value: HistoryDay) =>
  write(env.PLATFORM_DATA, KEYS.history(shard, day), value);
export const writeHighlights = (env: Env, value: Highlights) =>
  write(env.PLATFORM_DATA, KEYS.highlights, value);
