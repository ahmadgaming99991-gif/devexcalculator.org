/**
 * The charted cross-experience series, appended one point at a time.
 *
 * The alternative was to derive this from history on every read, which means
 * parsing every shard of every day to draw twelve lines. This value is about
 * 23 KB and an append reads it, pushes one point onto each kept series and
 * writes it back. It never opens a history bucket.
 *
 * Per run: 0 subrequests, 2 KV reads, 1 KV write.
 * Measured: p50 2.69 ms, p95 3.50 ms, max 3.50 ms.
 */

import {
  HIGHLIGHT_KEEP,
  HIGHLIGHT_POINT_CAP,
  HIGHLIGHT_TOP,
  SCHEMA,
  type Highlights,
} from "../contracts";
import { readHighlights, readLive, writeHighlights, type Env } from "../store";
import type { UnitReport } from "./report";

export async function appendHighlights(env: Env): Promise<UnitReport> {
  const live = await readLive(env);
  if (!live) {
    return {
      unit: "highlights", outcome: "skipped", detail: "no live observation yet",
      subrequests: 0, reads: 1, writes: 0, items: 0,
    };
  }

  const stamp = Date.parse(live.observedAt);
  if (!Number.isFinite(stamp)) {
    return {
      unit: "highlights", outcome: "skipped", detail: "live observation is undated",
      subrequests: 0, reads: 1, writes: 0, items: 0,
    };
  }

  const stored = await readHighlights(env);
  if (stored && stored.at.length > 0 && stored.at[stored.at.length - 1] === stamp) {
    return {
      unit: "highlights", outcome: "skipped", detail: "observation already recorded",
      subrequests: 0, reads: 2, writes: 0, items: 0,
    };
  }

  const top = Object.values(live.experiences).sort((a, b) => b.p - a.p).slice(0, HIGHLIGHT_TOP);
  const charted = new Set(top.map((row) => String(row.i)));

  const at = [...(stored?.at ?? []), stamp].slice(-HIGHLIGHT_POINT_CAP);
  const dropped = (stored?.at.length ?? 0) + 1 - at.length;
  const series: { id: string; name: string; players: (number | null)[] }[] = [];

  for (const line of stored?.series ?? []) {
    const seen = live.experiences[line.id];
    const next = [...line.players, seen ? seen.p : null];
    series.push({
      id: line.id,
      // The name follows Roblox when the experience is on show, and otherwise
      // keeps whatever it was last called rather than becoming an id.
      name: seen ? seen.n : line.name,
      players: dropped > 0 ? next.slice(dropped) : next,
    });
  }

  for (const row of top) {
    const id = String(row.i);
    if (series.some((line) => line.id === id)) continue;
    series.push({ id, name: row.n, players: [...Array<number | null>(at.length - 1).fill(null), row.p] });
  }

  /*
   * Eviction keeps the charted twelve plus a margin.
   *
   * Trimming straight to twelve would restart a line every time an experience
   * dipped out for one hour, which reads as a gap in the data rather than as
   * what it is - a change in which twelve are busiest. Series outside the top
   * twelve are evicted quietest-first, and only when the value is over its cap.
   */
  const kept =
    series.length <= HIGHLIGHT_KEEP
      ? series
      : [...series]
          .sort((a, b) => {
            const inA = charted.has(a.id) ? 1 : 0;
            const inB = charted.has(b.id) ? 1 : 0;
            if (inA !== inB) return inB - inA;
            return (b.players[b.players.length - 1] ?? -1) - (a.players[a.players.length - 1] ?? -1);
          })
          .slice(0, HIGHLIGHT_KEEP);

  const highlights: Highlights = { schema: SCHEMA, at, series: kept };
  await writeHighlights(env, highlights);

  return {
    unit: "highlights", outcome: "recorded", detail: null,
    subrequests: 0, reads: 2, writes: 1, items: kept.length,
  };
}
