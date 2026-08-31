/**
 * Stage B: the rotating enrichment pass. Slow fields, on a slow clock.
 *
 * Visits, favourites, creator, genre and maturity change on the order of days.
 * Refreshing them in the same invocation that refreshes player counts is what
 * put the single-stage collector over the CPU ceiling, so they get their own
 * invocation, their own key and their own timestamp.
 *
 * Per run:
 *   1-2 subrequests - one batch of game details, optionally one of votes
 *   2 KV reads      - live (for the roster) and details
 *   1 KV write      - details
 *
 * A failed upstream call keeps every previously known row and its original
 * timestamp. Nothing here restamps a row it did not actually refresh.
 */

import {
  DETAIL_BATCH,
  DETAIL_MAX_AGE_MS,
  shardOf,
  type DetailRow,
  type Details,
} from "./contracts";
import { readDetailShard, readDetails, readLive, writeDetailShard, writeDetails } from "./store";
import { getDetails, getVotes } from "./upstream";
import type { Env } from "../storage";

export interface StageBReport {
  readonly stage: "B";
  readonly outcome: "recorded" | "skipped";
  readonly detail: string | null;
  readonly subrequests: number;
  readonly kvReads: number;
  readonly kvWrites: number;
  readonly batch: number;
  readonly refreshed: number;
  readonly rows: number;
  readonly roster: number;
}

/**
 * Which ids to refresh this run, in the order the priority rules require.
 *
 * 1. Ids in the live roster that have never been enriched.
 * 2. Ids whose stored row is missing the fields the table shows.
 * 3. Everything else, least-recently-refreshed first.
 *
 * The cursor rotates the tail of (3) so a stable set of ids cannot starve when
 * every row already carries a timestamp within the same second.
 */
function pick(
  roster: readonly string[],
  rows: Readonly<Record<string, DetailRow>>,
  cursor: number,
  batch: number,
): string[] {
  const never: string[] = [];
  const incomplete: { id: string; at: number }[] = [];
  const known: { id: string; at: number }[] = [];

  for (const id of roster) {
    const row = rows[id];
    if (row === undefined) {
      never.push(id);
      continue;
    }
    const at = Date.parse(row.o);
    const entry = { id, at: Number.isFinite(at) ? at : 0 };
    if (row.v === null || row.f === null || row.c === null) incomplete.push(entry);
    else known.push(entry);
  }

  if (never.length >= batch) return never.slice(0, batch);

  incomplete.sort((a, b) => a.at - b.at);
  const afterIncomplete = [...never, ...incomplete.map((entry) => entry.id)].slice(0, batch);
  if (afterIncomplete.length >= batch) return afterIncomplete;

  known.sort((a, b) => a.at - b.at);
  const wanted = batch - afterIncomplete.length;
  const start = known.length === 0 ? 0 : cursor % known.length;
  const rotated = [...known.slice(start), ...known.slice(0, start)];
  return [...afterIncomplete, ...rotated.slice(0, wanted).map((entry) => entry.id)];
}

function parseDetails(payload: unknown): Map<number, Omit<DetailRow, "o" | "u" | "d">> {
  const out = new Map<number, Omit<DetailRow, "o" | "u" | "d">>();
  const data = (payload as { data?: unknown[] })?.data;
  if (!Array.isArray(data)) return out;
  for (const entry of data) {
    const g = entry as Record<string, unknown>;
    const id = typeof g.id === "number" ? g.id : null;
    if (id === null) continue;
    const creator = (g.creator ?? {}) as Record<string, unknown>;
    out.set(id, {
      v: typeof g.visits === "number" ? g.visits : null,
      m: typeof g.maxPlayers === "number" ? g.maxPlayers : null,
      c: typeof creator.name === "string" ? creator.name : null,
      cv: creator.hasVerifiedBadge === true,
      f: typeof g.favoritedCount === "number" ? g.favoritedCount : null,
      g: typeof g.genre === "string" ? g.genre : null,
      a: typeof g.ageRecommendationDisplayName === "string" ? g.ageRecommendationDisplayName : null,
    });
  }
  return out;
}

function parseVotes(payload: unknown): Map<number, { u: number | null; d: number | null }> {
  const out = new Map<number, { u: number | null; d: number | null }>();
  const data = (payload as { data?: unknown[] })?.data;
  if (!Array.isArray(data)) return out;
  for (const entry of data) {
    const g = entry as Record<string, unknown>;
    const id = typeof g.id === "number" ? g.id : null;
    if (id === null) continue;
    out.set(id, {
      u: typeof g.upVotes === "number" ? g.upVotes : null,
      d: typeof g.downVotes === "number" ? g.downVotes : null,
    });
  }
  return out;
}

export async function stageB(
  env: Env,
  options: { batch?: number; votes?: boolean; now?: number; shard?: number } = {},
): Promise<StageBReport> {
  const batch = options.batch ?? DETAIL_BATCH;
  const now = options.now ?? Date.now();
  let subrequests = 0;
  let kvReads = 0;
  let kvWrites = 0;

  const live = await readLive(env);
  kvReads += 1;
  if (!live) {
    return {
      stage: "B", outcome: "skipped", detail: "no live snapshot yet",
      subrequests, kvReads, kvWrites, batch, refreshed: 0, rows: 0, roster: 0,
    };
  }

  /*
   * Sharded or whole. A whole enrichment map is one value of about 81 KB that a
   * refresh of fifty rows reads and rewrites in full; a shard is a quarter of
   * that, and a run touches exactly one. Both are measured so the choice is not
   * made by argument.
   */
  const shard = options.shard;
  const stored = shard === undefined ? await readDetails(env) : await readDetailShard(env, shard);
  kvReads += 1;
  const rows: Record<string, DetailRow> = { ...(stored?.rows ?? {}) };

  const roster =
    shard === undefined
      ? Object.keys(live.experiences)
      : Object.keys(live.experiences).filter((id) => shardOf(id) === shard);
  const wanted = pick(roster, rows, stored?.cursor ?? 0, batch);
  if (wanted.length === 0) {
    return {
      stage: "B", outcome: "skipped", detail: "nothing to refresh",
      subrequests, kvReads, kvWrites, batch, refreshed: 0,
      rows: Object.keys(rows).length, roster: roster.length,
    };
  }

  const ids = wanted.map(Number);
  const details = await getDetails(ids);
  subrequests += 1;
  if (!details.ok) {
    // Every previously known row keeps its values and its original timestamp.
    return {
      stage: "B", outcome: "skipped", detail: details.detail ?? "details unavailable",
      subrequests, kvReads, kvWrites, batch, refreshed: 0,
      rows: Object.keys(rows).length, roster: roster.length,
    };
  }

  let votes = new Map<number, { u: number | null; d: number | null }>();
  if (options.votes === true) {
    const response = await getVotes(ids);
    subrequests += 1;
    if (response.ok) votes = parseVotes(response.data);
  }

  const parsed = parseDetails(details.data);
  const at = details.observedAt ?? new Date(now).toISOString();
  let refreshed = 0;
  for (const [id, value] of parsed) {
    const key = String(id);
    const vote = votes.get(id);
    const before = rows[key];
    rows[key] = {
      ...value,
      // Votes are only overwritten when a votes response actually carried them.
      u: vote ? vote.u : (before?.u ?? null),
      d: vote ? vote.d : (before?.d ?? null),
      o: at,
    };
    refreshed += 1;
  }

  /*
   * Rows nobody has refreshed within the retention window are dropped, which is
   * what keeps this value bounded as experiences enter and leave the rankings.
   * A row still in the live roster is never dropped, however old it is.
   */
  const cutoff = now - DETAIL_MAX_AGE_MS;
  const inRoster = new Set(roster);
  const kept: Record<string, DetailRow> = {};
  for (const key of Object.keys(rows)) {
    const row = rows[key]!;
    if (inRoster.has(key) || Date.parse(row.o) >= cutoff) kept[key] = row;
  }

  const next: Details = { v: 3, cursor: (stored?.cursor ?? 0) + batch, rows: kept };
  if (shard === undefined) await writeDetails(env, next);
  else await writeDetailShard(env, shard, next);
  kvWrites += 1;

  return {
    stage: "B",
    outcome: "recorded",
    detail: null,
    subrequests,
    kvReads,
    kvWrites,
    batch,
    refreshed,
    rows: Object.keys(kept).length,
    roster: roster.length,
  };
}
