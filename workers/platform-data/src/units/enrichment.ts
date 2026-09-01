/**
 * The rotating enrichment pass: slow fields, on a slow clock.
 *
 * Visits, favourites, votes, creator, genre and maturity change on the order of
 * days, so they are refreshed hourly in batches of fifty rather than every
 * fifteen minutes with the player counts. One run touches one enrichment shard,
 * which is what took this unit from 9.93 ms to 4.94: a fifty-row refresh
 * rewrites about 20 KB instead of the whole 79 KB map.
 *
 * Per run: 2 subrequests, 2 KV reads, 1 KV write.
 * Measured: p50 4.94 ms, p95 6.00 ms, max 6.00 ms.
 *
 * The rule that governs failure: a refresh that does not happen must leave no
 * trace. Previously known values keep their values, and - just as importantly -
 * keep their original `o` timestamp, so the UI can say how old they really are.
 */

import {
  DETAIL_BATCH,
  DETAIL_MAX_AGE_MS,
  SCHEMA,
  shardOf,
  type DetailRow,
  type Details,
} from "../contracts";
import { readDetails, readLive, writeDetails, type Env } from "../store";
import { getDetails, getVotes } from "../upstream";
import type { UnitReport } from "./report";

/**
 * Which ids to refresh, in priority order.
 *
 * 1. Rows in the live roster that have never been enriched - a visible gap.
 * 2. Rows whose stored values are missing the fields the table shows.
 * 3. Everything else, least-recently-refreshed first.
 *
 * The cursor rotates the tail of (3), so a set of rows that all carry the same
 * timestamp - which is what a batch refresh produces - cannot starve the rest.
 */
export function pick(
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
    const parsed = Date.parse(row.o);
    const entry = { id, at: Number.isFinite(parsed) ? parsed : 0 };
    if (row.v === null || row.f === null || row.c === null) incomplete.push(entry);
    else known.push(entry);
  }

  if (never.length >= batch) return never.slice(0, batch);

  incomplete.sort((a, b) => a.at - b.at);
  const head = [...never, ...incomplete.map((entry) => entry.id)].slice(0, batch);
  if (head.length >= batch) return head;

  known.sort((a, b) => a.at - b.at);
  const start = known.length === 0 ? 0 : cursor % known.length;
  const rotated = [...known.slice(start), ...known.slice(0, start)];
  return [...head, ...rotated.slice(0, batch - head.length).map((entry) => entry.id)];
}

function parseDetails(payload: unknown): Map<number, Omit<DetailRow, "o" | "u" | "d">> {
  const out = new Map<number, Omit<DetailRow, "o" | "u" | "d">>();
  const data = (payload as { data?: unknown })?.data;
  if (!Array.isArray(data)) return out;
  for (const entry of data) {
    if (typeof entry !== "object" || entry === null) continue;
    const g = entry as Record<string, unknown>;
    const id = typeof g.id === "number" && Number.isFinite(g.id) ? g.id : null;
    if (id === null) continue;
    const creator = (typeof g.creator === "object" && g.creator !== null ? g.creator : {}) as Record<string, unknown>;
    out.set(id, {
      v: typeof g.visits === "number" ? g.visits : null,
      m: typeof g.maxPlayers === "number" ? g.maxPlayers : null,
      c: typeof creator.name === "string" && creator.name !== "" ? creator.name : null,
      cv: creator.hasVerifiedBadge === true,
      f: typeof g.favoritedCount === "number" ? g.favoritedCount : null,
      g: typeof g.genre === "string" && g.genre !== "" ? g.genre : null,
      a: typeof g.ageRecommendationDisplayName === "string" && g.ageRecommendationDisplayName !== ""
        ? g.ageRecommendationDisplayName
        : null,
    });
  }
  return out;
}

function parseVotes(payload: unknown): Map<number, { u: number | null; d: number | null }> {
  const out = new Map<number, { u: number | null; d: number | null }>();
  const data = (payload as { data?: unknown })?.data;
  if (!Array.isArray(data)) return out;
  for (const entry of data) {
    if (typeof entry !== "object" || entry === null) continue;
    const g = entry as Record<string, unknown>;
    const id = typeof g.id === "number" && Number.isFinite(g.id) ? g.id : null;
    if (id === null) continue;
    out.set(id, {
      u: typeof g.upVotes === "number" ? g.upVotes : null,
      d: typeof g.downVotes === "number" ? g.downVotes : null,
    });
  }
  return out;
}

export async function refreshDetails(
  env: Env,
  shard: number,
  options: { batch?: number; now?: number } = {},
): Promise<UnitReport> {
  const batch = options.batch ?? DETAIL_BATCH;
  const now = options.now ?? Date.now();
  const unit = `enrichment:${shard}`;

  const live = await readLive(env);
  if (!live) {
    return { unit, outcome: "skipped", detail: "no live observation yet", subrequests: 0, reads: 1, writes: 0, items: 0 };
  }

  const stored = await readDetails(env, shard);
  const rows: Record<string, DetailRow> = { ...(stored?.rows ?? {}) };
  const roster = Object.keys(live.experiences).filter((id) => shardOf(id) === shard);

  const wanted = pick(roster, rows, stored?.cursor ?? 0, batch);
  if (wanted.length === 0) {
    return { unit, outcome: "skipped", detail: "no rows in this shard", subrequests: 0, reads: 2, writes: 0, items: 0 };
  }

  const ids = wanted.map(Number);
  const details = await getDetails(ids);
  if (!details.ok) {
    // Nothing is written. Every known row keeps its values and its own stamp.
    return {
      unit, outcome: "skipped", detail: details.detail ?? "details unavailable",
      subrequests: 1, reads: 2, writes: 0, items: 0,
    };
  }

  // Votes are a second endpoint and a second failure mode. Losing them must not
  // lose the rest, so a failed votes call leaves the previous vote counts alone
  // and the detail refresh still lands.
  const voteResponse = await getVotes(ids);
  const votes = voteResponse.ok ? parseVotes(voteResponse.data) : new Map<number, { u: number | null; d: number | null }>();

  const parsed = parseDetails(details.data);
  if (parsed.size === 0) {
    return {
      unit, outcome: "skipped", detail: "details response contained no rows",
      subrequests: 2, reads: 2, writes: 0, items: 0,
    };
  }

  const at = details.observedAt ?? new Date(now).toISOString();
  for (const [id, value] of parsed) {
    const key = String(id);
    const vote = votes.get(id);
    const before = rows[key];
    rows[key] = {
      ...value,
      u: vote ? vote.u : (before?.u ?? null),
      d: vote ? vote.d : (before?.d ?? null),
      o: at,
    };
  }

  /*
   * What keeps this value bounded as experiences enter and leave the rankings.
   * A row still in the live roster is never dropped, however old it is; a row
   * that left the rankings and has not been refreshed within the retention
   * window goes, because nothing will ever display it again.
   */
  const cutoff = now - DETAIL_MAX_AGE_MS;
  const inRoster = new Set(roster);
  const kept: Record<string, DetailRow> = {};
  for (const key of Object.keys(rows)) {
    const row = rows[key]!;
    const stamp = Date.parse(row.o);
    if (inRoster.has(key) || (Number.isFinite(stamp) && stamp >= cutoff)) kept[key] = row;
  }

  const next: Details = { schema: SCHEMA, shard, cursor: (stored?.cursor ?? 0) + batch, rows: kept };
  await writeDetails(env, shard, next);

  return {
    unit, outcome: "recorded", detail: voteResponse.ok ? null : "votes unavailable, previous values kept",
    subrequests: 2, reads: 2, writes: 1, items: parsed.size,
  };
}
