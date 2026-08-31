/**
 * The control arm: Stage A's work against a folded snapshot.
 *
 * This exists only to answer one question with a measurement rather than an
 * argument — how much of Stage A's CPU is the split, and how much is the sorts
 * response it has to parse either way. It performs exactly Stage A's fifteen
 * minute work, except that the value it reads and rewrites carries the detail
 * fields too, as the single-stage v2 snapshot did.
 *
 * Nothing reads what it writes. It is a benchmark, not a data path.
 */

import { K, type DetailRow, type LiveRow, type Ranking } from "./contracts";
import { SORTS_URL, getJson } from "./upstream";
import type { Env } from "../storage";

interface FoldedRow extends LiveRow {
  readonly x: DetailRow | null;
}

interface FoldedSnapshot {
  readonly v: 3;
  readonly observedAt: string;
  readonly rankings: readonly Ranking[];
  readonly byRanking: Readonly<Record<string, readonly number[]>>;
  readonly experiences: Readonly<Record<string, FoldedRow>>;
  readonly cursor: number;
}

export interface FoldedReport {
  readonly stage: "FOLD";
  readonly outcome: "recorded" | "skipped";
  readonly detail: string | null;
  readonly subrequests: number;
  readonly kvReads: number;
  readonly kvWrites: number;
  readonly experiences: number;
  readonly enriched: number;
}

export async function foldedCycle(env: Env): Promise<FoldedReport> {
  let subrequests = 0;
  let kvReads = 0;
  let kvWrites = 0;

  const sorts = await getJson(SORTS_URL);
  subrequests += 1;
  if (!sorts.ok) {
    return {
      stage: "FOLD", outcome: "skipped", detail: sorts.detail ?? "upstream unavailable",
      subrequests, kvReads, kvWrites, experiences: 0, enriched: 0,
    };
  }

  const payload = (sorts.data as { sorts?: unknown[] })?.sorts;
  const rankings: Ranking[] = [];
  const byRanking: Record<string, number[]> = {};
  const rows = new Map<number, LiveRow>();
  if (Array.isArray(payload)) {
    for (const sort of payload) {
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
            i: universeId,
            r: typeof g.rootPlaceId === "number" ? g.rootPlaceId : null,
            n: typeof g.name === "string" ? g.name : String(universeId),
            p: playing,
            s: g.isSponsored === true,
          });
        }
      }
      if (ids.length === 0) continue;
      const layout = s.topicLayoutData;
      rankings.push({
        id,
        name:
          typeof layout === "object" && layout !== null
            ? String((layout as Record<string, unknown>).topicTitle ?? id)
            : typeof s.topic === "string"
              ? s.topic
              : id,
        subtitle: typeof s.subtitle === "string" ? s.subtitle : null,
        size: ids.length,
      });
      byRanking[id] = ids;
    }
  }

  if (rankings.length === 0 || rows.size === 0) {
    return {
      stage: "FOLD", outcome: "skipped", detail: "no usable rankings",
      subrequests, kvReads, kvWrites, experiences: 0, enriched: 0,
    };
  }

  // The read the split shape does not do: the whole snapshot, detail included.
  let previous: FoldedSnapshot | null = null;
  try {
    const value = await env.PLATFORM_V2.get(K.folded, "json");
    if (typeof value === "object" && value !== null) previous = value as FoldedSnapshot;
  } catch {
    previous = null;
  }
  kvReads += 1;

  const experiences: Record<string, FoldedRow> = {};
  let enriched = 0;
  for (const [universeId, row] of rows) {
    const key = String(universeId);
    const before = previous?.experiences?.[key];
    if (before?.x) enriched += 1;
    experiences[key] = { ...row, x: before?.x ?? null };
  }

  const snapshot: FoldedSnapshot = {
    v: 3,
    observedAt: sorts.observedAt ?? new Date().toISOString(),
    rankings,
    byRanking,
    experiences,
    cursor: (previous?.cursor ?? 0) + 50,
  };

  await env.PLATFORM_V2.put(K.folded, JSON.stringify(snapshot), { expirationTtl: 1_209_600 });
  kvWrites += 1;

  return {
    stage: "FOLD",
    outcome: "recorded",
    detail: null,
    subrequests,
    kvReads,
    kvWrites,
    experiences: rows.size,
    enriched,
  };
}
