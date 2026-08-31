/**
 * KV access for the data plane, and nothing else.
 *
 * Every read is typed and every failure returns null rather than throwing, so a
 * missing or malformed value degrades to "no data" instead of taking down a
 * collection run or a read request.
 */

import {
  KEYS,
  RETENTION_DAYS,
  type CurrentSnapshot,
  type Highlights,
  type HistoryShard,
  type TotalsSeries,
} from "./contracts";

/**
 * The minimum of the KV binding this Worker uses.
 *
 * Declared here rather than pulled from `@cloudflare/workers-types`, which this
 * repository does not install — and which would be a dependency added for two
 * method signatures. It also lets a test supply a plain object, the same way
 * `HistoryStore` does for the v1 collector.
 */
export interface PlatformStore {
  get(key: string, type: "json"): Promise<unknown>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface Env {
  PLATFORM_V2: PlatformStore;
  /** Present only on the isolated proof deployment. Never set in production. */
  PROOF_SECRET?: string;
}

const RETENTION_SECONDS = RETENTION_DAYS * 24 * 60 * 60;

async function read<T>(env: Env, key: string, guard: (v: unknown) => v is T): Promise<T | null> {
  try {
    const value = await env.PLATFORM_V2.get(key, "json");
    return guard(value) ? value : null;
  } catch {
    return null;
  }
}

const isCurrent = (v: unknown): v is CurrentSnapshot =>
  typeof v === "object" && v !== null && (v as CurrentSnapshot).v === 2 &&
  typeof (v as CurrentSnapshot).experiences === "object";

const isTotals = (v: unknown): v is TotalsSeries =>
  typeof v === "object" && v !== null && Array.isArray((v as TotalsSeries).points);

const isShard = (v: unknown): v is HistoryShard =>
  typeof v === "object" && v !== null && Array.isArray((v as HistoryShard).at) &&
  typeof (v as HistoryShard).players === "object";

const isHighlights = (v: unknown): v is Highlights =>
  typeof v === "object" && v !== null && Array.isArray((v as Highlights).series);

export const readCurrent = (env: Env) => read(env, KEYS.current, isCurrent);
export const readTotals = (env: Env) => read(env, KEYS.totals, isTotals);
export const readShard = (env: Env, n: number) => read(env, KEYS.shard(n), isShard);
export const readHighlights = (env: Env) => read(env, KEYS.highlights, isHighlights);

/**
 * Writes carry the retention window as a TTL, so nothing needs a cleanup job
 * and an abandoned deployment expires on its own rather than holding storage.
 */
async function write(env: Env, key: string, value: unknown): Promise<void> {
  await env.PLATFORM_V2.put(key, JSON.stringify(value), { expirationTtl: RETENTION_SECONDS });
}

export const writeCurrent = (env: Env, v: CurrentSnapshot) => write(env, KEYS.current, v);
export const writeTotals = (env: Env, v: TotalsSeries) => write(env, KEYS.totals, v);
export const writeShard = (env: Env, n: number, v: HistoryShard) => write(env, KEYS.shard(n), v);
export const writeHighlights = (env: Env, v: Highlights) => write(env, KEYS.highlights, v);
