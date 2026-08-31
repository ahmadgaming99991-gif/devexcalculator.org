/**
 * One scheduled collection, designed around a 10 ms CPU ceiling.
 *
 * The rule that shapes every decision here: **append, never rebuild**. The v1
 * collector reads a 353 KB history value, reconstructs it and writes it back;
 * measured on Cloudflare it runs 6.4–23.7 ms, over the Free ceiling in five of
 * nine sampled runs and surviving only on Cloudflare's occasional-over-limit
 * tolerance. Nothing in this file walks fourteen days of anything.
 *
 * Per cycle:
 *   1 subrequest  — Roblox sorts (rankings and player counts)
 *   1 subrequest  — one rotating batch of ~50 game details
 *   2 KV reads    — current, totals
 *   2 KV writes   — current, totals
 *
 * Once an hour it also appends to the four history shards and re-derives the
 * highlights, which is the only part that touches per-experience series.
 */

import {
  COLLECTION_INTERVAL_MINUTES,
  DETAIL_BATCH,
  HIGHLIGHT_SERIES,
  HISTORY_DAYS,
  HISTORY_INTERVAL_MINUTES,
  RETENTION_DAYS,
  SHARD_COUNT,
  shardOf,
  type CurrentSnapshot,
  type ExperienceDetails,
  type ExperienceRecord,
  type Highlights,
  type HistoryShard,
  type Ranking,
} from "./contracts";
import {
  readCurrent,
  readShard,
  readTotals,
  writeCurrent,
  writeHighlights,
  writeShard,
  writeTotals,
  type Env,
} from "./storage";

const SORTS_URL = "https://apis.roblox.com/explore-api/v1/get-sorts?sessionId=devexcalculator";
const GAMES_URL = "https://games.roblox.com/v1/games";
const TIMEOUT_MS = 6_000;
const DETAIL_TIMEOUT_MS = 3_000;
const HISTORY_POINT_CAP = (HISTORY_DAYS * 24 * 60) / HISTORY_INTERVAL_MINUTES;
const TOTALS_POINT_CAP = (RETENTION_DAYS * 24 * 60) / COLLECTION_INTERVAL_MINUTES;

export interface RunReport {
  readonly outcome: "recorded" | "skipped" | "failed";
  readonly detail: string | null;
  readonly subrequests: number;
  readonly kvReads: number;
  readonly kvWrites: number;
  readonly experiences: number;
  readonly enriched: number;
  readonly historyAppended: boolean;
}

interface Fetched<T> {
  readonly ok: boolean;
  readonly data?: T;
  readonly observedAt?: string;
  readonly detail?: string;
}

async function getJson(url: string, timeoutMs = TIMEOUT_MS): Promise<Fetched<unknown>> {
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return { ok: false, detail: `HTTP ${response.status}` };
    // Roblox's own clock, not ours: the observation time belongs to the source.
    const date = response.headers.get("date");
    const observedAt = date ? new Date(date).toISOString() : new Date().toISOString();
    return { ok: true, data: await response.json(), observedAt };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "unreachable" };
  }
}

/** Minimal validation. Anything unrecognised is dropped rather than guessed at. */
function parseSorts(payload: unknown): {
  rankings: Ranking[];
  byRanking: Record<string, number[]>;
  rows: Map<number, { name: string; playing: number; rootPlaceId: number | null; isSponsored: boolean; urlPath: string | null }>;
} {
  const rankings: Ranking[] = [];
  const byRanking: Record<string, number[]> = {};
  const rows = new Map<number, { name: string; playing: number; rootPlaceId: number | null; isSponsored: boolean; urlPath: string | null }>();

  const sorts = (payload as { sorts?: unknown[] })?.sorts;
  if (!Array.isArray(sorts)) return { rankings, byRanking, rows };

  for (const sort of sorts) {
    const s = sort as Record<string, unknown>;
    const id = typeof s.sortId === "string" ? s.sortId : null;
    const games = Array.isArray(s.games) ? s.games : null;
    if (!id || !games || games.length === 0) continue;

    const ids: number[] = [];
    for (const game of games) {
      const g = game as Record<string, unknown>;
      const universeId = typeof g.universeId === "number" ? g.universeId : null;
      const playing = typeof g.playerCount === "number" ? g.playerCount : null;
      if (universeId === null || playing === null) continue;
      ids.push(universeId);
      if (!rows.has(universeId)) {
        rows.set(universeId, {
          name: typeof g.name === "string" ? g.name : String(universeId),
          playing,
          rootPlaceId: typeof g.rootPlaceId === "number" ? g.rootPlaceId : null,
          isSponsored: g.isSponsored === true,
          urlPath: typeof g.universeAvatarType === "string" ? null : null,
        });
      }
    }
    if (ids.length === 0) continue;

    rankings.push({
      id,
      name: typeof s.topicLayoutData === "object" && s.topicLayoutData !== null
        ? String((s.topicLayoutData as Record<string, unknown>).topicTitle ?? id)
        : typeof s.topic === "string" ? s.topic : id,
      subtitle: typeof s.subtitle === "string" ? s.subtitle : null,
      size: ids.length,
    });
    byRanking[id] = ids;
  }

  return { rankings, byRanking, rows };
}

/**
 * Which rows to enrich this cycle, in priority order.
 *
 * 1. Rows that have never been enriched — a visible gap in the table.
 * 2. Rows whose enrichment is oldest.
 *
 * The cursor exists so that step 2 does not re-pick the same rows forever when
 * every row already has details; it advances by the batch size each cycle, so a
 * full sweep of roughly 471 ids completes in about ten cycles — two and a half
 * hours for fields that change on the order of days.
 */
function pickForEnrichment(
  experiences: Record<string, ExperienceRecord>,
  cursor: number,
): number[] {
  const never: number[] = [];
  const known: { id: number; at: number }[] = [];

  for (const key of Object.keys(experiences)) {
    const record = experiences[key]!;
    if (record.detailsObservedAt === null || record.details === null) never.push(record.universeId);
    else known.push({ id: record.universeId, at: Date.parse(record.detailsObservedAt) });
  }

  if (never.length >= DETAIL_BATCH) return never.slice(0, DETAIL_BATCH);

  // Oldest first, then rotate through by cursor so a stable set cannot starve.
  known.sort((a, b) => a.at - b.at);
  const wanted = DETAIL_BATCH - never.length;
  const start = known.length === 0 ? 0 : cursor % known.length;
  const rotated = known.length > 0 ? [...known.slice(start), ...known.slice(0, start)] : [];
  return [...never, ...rotated.slice(0, wanted).map((entry) => entry.id)];
}

function parseDetails(payload: unknown): Map<number, ExperienceDetails> {
  const out = new Map<number, ExperienceDetails>();
  const data = (payload as { data?: unknown[] })?.data;
  if (!Array.isArray(data)) return out;
  for (const entry of data) {
    const g = entry as Record<string, unknown>;
    const id = typeof g.id === "number" ? g.id : null;
    if (id === null) continue;
    const creator = (g.creator ?? {}) as Record<string, unknown>;
    out.set(id, {
      visits: typeof g.visits === "number" ? g.visits : null,
      maxPlayers: typeof g.maxPlayers === "number" ? g.maxPlayers : null,
      creatorName: typeof creator.name === "string" ? creator.name : null,
      creatorVerified: creator.hasVerifiedBadge === true,
      upVotes: null,
      downVotes: null,
      favourites: typeof g.favoritedCount === "number" ? g.favoritedCount : null,
      genre: typeof g.genre === "string" ? g.genre : null,
      maturity: typeof g.ageRecommendationDisplayName === "string" ? g.ageRecommendationDisplayName : null,
    });
  }
  return out;
}

/** Whether an hourly history point is due, from the shard's own newest stamp. */
function historyDue(at: readonly number[], now: number): boolean {
  const last = at.length > 0 ? at[at.length - 1]! : 0;
  return now - last >= (HISTORY_INTERVAL_MINUTES - COLLECTION_INTERVAL_MINUTES / 2) * 60_000;
}

export async function collect(env: Env, now = Date.now()): Promise<RunReport> {
  let subrequests = 0;
  let kvReads = 0;
  let kvWrites = 0;

  const sorts = await getJson(SORTS_URL);
  subrequests += 1;
  if (!sorts.ok) {
    return { outcome: "skipped", detail: sorts.detail ?? "upstream unavailable", subrequests, kvReads, kvWrites, experiences: 0, enriched: 0, historyAppended: false };
  }

  const { rankings, byRanking, rows } = parseSorts(sorts.data);
  if (rankings.length === 0 || rows.size === 0) {
    return { outcome: "skipped", detail: "no usable rankings", subrequests, kvReads, kvWrites, experiences: 0, enriched: 0, historyAppended: false };
  }

  const previous = await readCurrent(env);
  kvReads += 1;

  // Fresh counts overlay the previous snapshot's details. Details are never
  // discarded because a row was re-observed, and never restamped because it was.
  const experiences: Record<string, ExperienceRecord> = {};
  for (const [universeId, row] of rows) {
    const before = previous?.experiences[String(universeId)];
    experiences[String(universeId)] = {
      universeId,
      rootPlaceId: row.rootPlaceId,
      name: row.name,
      playing: row.playing,
      isSponsored: row.isSponsored,
      urlPath: row.urlPath,
      details: before?.details ?? null,
      detailsObservedAt: before?.detailsObservedAt ?? null,
    };
  }

  const cursor = previous?.detailCursor ?? 0;
  const wanted = pickForEnrichment(experiences, cursor);
  let enriched = 0;

  if (wanted.length > 0) {
    const details = await getJson(`${GAMES_URL}?universeIds=${wanted.join(",")}`, DETAIL_TIMEOUT_MS);
    subrequests += 1;
    if (details.ok) {
      const parsed = parseDetails(details.data);
      const at = details.observedAt ?? new Date(now).toISOString();
      for (const [id, value] of parsed) {
        const key = String(id);
        const record = experiences[key];
        if (!record) continue;
        experiences[key] = { ...record, details: value, detailsObservedAt: at };
        enriched += 1;
      }
    }
    // A failed detail request keeps the previous details and their old stamps.
  }

  const observedAt = sorts.observedAt ?? new Date(now).toISOString();
  const players = Object.values(experiences).reduce((sum, r) => sum + r.playing, 0);

  const current: CurrentSnapshot = {
    v: 2,
    observedAt,
    collector: { outcome: "recorded", lastRunAt: new Date(now).toISOString(), consecutiveFailures: 0, detail: null },
    source: { status: "read", detail: null },
    rankings,
    defaultRanking: rankings[0]!.id,
    platform: { players, experiences: Object.keys(experiences).length, rankings: rankings.length },
    byRanking,
    experiences,
    detailCursor: cursor + DETAIL_BATCH,
  };

  await writeCurrent(env, current);
  kvWrites += 1;

  // Totals: append one pair, trim to the retention window. No rebuild.
  const totals = await readTotals(env);
  kvReads += 1;
  const points = [...(totals?.points ?? []), [Date.parse(observedAt), players] as const]
    .slice(-TOTALS_POINT_CAP);
  await writeTotals(env, { v: 2, points });
  kvWrites += 1;

  // Hourly: per-experience history and the derived highlights.
  let historyAppended = false;
  const probe = await readShard(env, 0);
  kvReads += 1;
  if (probe === null || historyDue(probe.at, now)) {
    historyAppended = true;
    const stamp = Date.parse(observedAt);
    const shards: HistoryShard[] = [];

    for (let n = 0; n < SHARD_COUNT; n += 1) {
      const existing = n === 0 ? probe : await readShard(env, n);
      if (n > 0) kvReads += 1;
      const base: HistoryShard = existing ?? { v: 2, shard: n, at: [], names: {}, players: {} };
      const at = [...base.at, stamp].slice(-HISTORY_POINT_CAP);
      const dropped = base.at.length + 1 - at.length;
      const names: Record<string, string> = { ...base.names };
      const players: Record<string, readonly (number | null)[]> = {};

      for (const key of Object.keys(base.players)) {
        const seen = experiences[key];
        const next = [...base.players[key]!, seen ? seen.playing : null];
        players[key] = dropped > 0 ? next.slice(dropped) : next;
      }
      for (const key of Object.keys(experiences)) {
        if (players[key] !== undefined) continue;
        if (shardOf(key) !== n) continue;
        // New experience: pad with nulls so its series aligns with `at` without
        // inventing history it was never observed for.
        players[key] = [...Array<number | null>(at.length - 1).fill(null), experiences[key]!.playing];
        names[key] = experiences[key]!.name;
      }
      for (const key of Object.keys(experiences)) {
        if (shardOf(key) === n) names[key] = experiences[key]!.name;
      }

      const shard: HistoryShard = { v: 2, shard: n, at, names, players };
      shards.push(shard);
      await writeShard(env, n, shard);
      kvWrites += 1;
    }

    // Highlights derived from what was just written, not by rescanning history.
    const ranked = Object.values(experiences)
      .sort((a, b) => b.playing - a.playing)
      .slice(0, HIGHLIGHT_SERIES);
    const series = ranked.map((record) => {
      const shard = shards[shardOf(record.universeId)]!;
      return {
        id: String(record.universeId),
        name: record.name,
        players: shard.players[String(record.universeId)] ?? [],
      };
    });
    const highlights: Highlights = { v: 2, at: shards[0]!.at, series };
    await writeHighlights(env, highlights);
    kvWrites += 1;
  }

  return {
    outcome: "recorded",
    detail: null,
    subrequests,
    kvReads,
    kvWrites,
    experiences: Object.keys(experiences).length,
    enriched,
    historyAppended,
  };
}
