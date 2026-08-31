/**
 * KV access for the staged shapes.
 *
 * Same rule as the v2 store: every read is guarded and returns null on failure,
 * so a missing or malformed value degrades to "no data" rather than taking a
 * stage down. Writes carry the retention window as a TTL.
 */

import {
  K,
  RETENTION_DAYS,
  type Details,
  type Highlights,
  type HistoryBucket,
  type Live,
  type Totals,
} from "./contracts";
import type { Env } from "../storage";

const TTL = RETENTION_DAYS * 24 * 60 * 60;

async function get<T>(env: Env, key: string, guard: (v: unknown) => v is T): Promise<T | null> {
  try {
    const value = await env.PLATFORM_V2.get(key, "json");
    return guard(value) ? value : null;
  } catch {
    return null;
  }
}

const obj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const isLive = (v: unknown): v is Live => obj(v) && v.v === 3 && obj(v.experiences);
const isDetails = (v: unknown): v is Details => obj(v) && v.v === 3 && obj(v.rows);
const isTotals = (v: unknown): v is Totals => obj(v) && Array.isArray(v.points);
const isBucket = (v: unknown): v is HistoryBucket => obj(v) && Array.isArray(v.at) && obj(v.p);
const isHighlights = (v: unknown): v is Highlights => obj(v) && Array.isArray(v.series);

export const readLive = (env: Env) => get(env, K.live, isLive);
export const readDetails = (env: Env) => get(env, K.details, isDetails);
export const readTotals = (env: Env) => get(env, K.totals, isTotals);
export const readHighlights = (env: Env) => get(env, K.highlights, isHighlights);
export const readBucket = (env: Env, shard: number, day: string) =>
  get(env, K.bucket(shard, day), isBucket);
/** One shard of the enrichment map, so a refresh rewrites a quarter of it. */
export const readDetailShard = (env: Env, shard: number) =>
  get(env, `p3:d:${shard}`, isDetails);

async function put(env: Env, key: string, value: unknown): Promise<void> {
  await env.PLATFORM_V2.put(key, JSON.stringify(value), { expirationTtl: TTL });
}

export const writeLive = (env: Env, v: Live) => put(env, K.live, v);
export const writeDetails = (env: Env, v: Details) => put(env, K.details, v);
export const writeTotals = (env: Env, v: Totals) => put(env, K.totals, v);
export const writeHighlights = (env: Env, v: Highlights) => put(env, K.highlights, v);
export const writeBucket = (env: Env, shard: number, day: string, v: HistoryBucket) =>
  put(env, K.bucket(shard, day), v);
export const writeDetailShard = (env: Env, shard: number, v: Details) =>
  put(env, `p3:d:${shard}`, v);
