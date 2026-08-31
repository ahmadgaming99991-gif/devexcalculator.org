/**
 * What one Roblox sorts read costs before any of this project's work begins.
 *
 * Stage A and the folded control arm measured within a millisecond of each
 * other despite writing values four times apart in size, which says the CPU is
 * going somewhere neither of them chose. This measures that floor directly, in
 * three levels, so the answer is a number rather than an inference:
 *
 *   text - fetch and decode the body, parse nothing
 *   json - fetch and decode and JSON.parse
 *   full - the above plus this project's own validation pass
 *
 * No KV. No writes. Whatever this costs is what every fifteen-minute collection
 * pays before it has stored anything at all.
 */

import { SORTS_URL } from "./upstream";

export interface FloorReport {
  readonly stage: "FLOOR";
  readonly mode: string;
  readonly ok: boolean;
  readonly bytes: number;
  readonly sorts: number;
  readonly games: number;
}

export async function floor(mode: string): Promise<FloorReport> {
  const response = await fetch(SORTS_URL, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(6_000),
  });
  if (!response.ok) {
    return { stage: "FLOOR", mode, ok: false, bytes: 0, sorts: 0, games: 0 };
  }

  const text = await response.text();
  if (mode === "text") {
    return { stage: "FLOOR", mode, ok: true, bytes: text.length, sorts: 0, games: 0 };
  }

  const payload = JSON.parse(text) as { sorts?: unknown[] };
  if (mode === "json") {
    return {
      stage: "FLOOR", mode, ok: true, bytes: text.length,
      sorts: Array.isArray(payload.sorts) ? payload.sorts.length : 0, games: 0,
    };
  }

  let sorts = 0;
  const ids = new Set<number>();
  if (Array.isArray(payload.sorts)) {
    for (const sort of payload.sorts) {
      const s = sort as Record<string, unknown>;
      if (typeof s.sortId !== "string" || !Array.isArray(s.games)) continue;
      sorts += 1;
      for (const game of s.games) {
        const g = game as Record<string, unknown>;
        if (typeof g.universeId !== "number" || typeof g.playerCount !== "number") continue;
        ids.add(g.universeId);
      }
    }
  }

  return { stage: "FLOOR", mode, ok: true, bytes: text.length, sorts, games: ids.size };
}
