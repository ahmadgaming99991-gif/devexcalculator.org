import { NextResponse } from "next/server";
import { corsPreflight, publicApiCors } from "@/lib/api/public-headers";
import { csvHeaders, toCsv } from "@/lib/api/csv";
import {
  PLATFORM_EXPERIENCES_COLUMNS,
  PLATFORM_TOTALS_COLUMNS,
  platformExperienceRows,
  platformExportNotes,
  platformTotalsRows,
} from "@/lib/api/exports";
import { getHistoryStore } from "@/lib/platform/store";
import {
  COLLECTION_INTERVAL_MINUTES,
  GAME_HISTORY_DAYS,
  RETENTION_DAYS,
  readGameHistory,
  readSeries,
} from "@/lib/platform/history";
import { getV2Store, v2GameHistory, v2TotalsSeries } from "@/lib/platform/v2-exports";

/**
 * The platform observations, as data.
 *
 * `/platform/` charts what this site has collected from Roblox's own public
 * endpoints. This publishes the observations themselves, so the chart can be
 * checked rather than believed.
 *
 * **Nothing here is filled in.** A gap means the collector did not run at that
 * moment, and the gap is the honest record of it. No interpolation, no
 * carry-forward, no back-fill — the same rule the chart follows.
 *
 * Reads only Workers KV. It makes no request to Roblox: the collector does
 * that on its own schedule, and an export that triggered an upstream fetch
 * would let anyone raise this site's request rate against Roblox by reloading
 * a URL.
 */
export const dynamic = "force-dynamic";

/**
 * Half a collection interval. Long enough that repeated downloads do not each
 * re-read KV, short enough that an export can never be a full cycle stale.
 */
const CACHE = `public, max-age=${(COLLECTION_INTERVAL_MINUTES / 2) * 60}, s-maxage=${(COLLECTION_INTERVAL_MINUTES / 2) * 60}`;

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const format = params.get("format");
  const series = params.get("series") === "experiences" ? "experiences" : "totals";

  /*
   * v2 first, v1 only if the v2 binding is absent.
   *
   * The two collectors run side by side during the migration, and this route
   * has to pick one. It picks the one that will still be collecting tomorrow:
   * reading v1 here is what would turn the v1 retirement into a download that
   * answers 200 forever with a newest row that never moves.
   *
   * The v1 path stays as a fallback for an environment where the v2 namespace
   * is not bound - a preview build, say - rather than as a second source of
   * truth. When both are absent the answer is 503, never an empty file.
   */
  const v2 = await getV2Store();
  const store = v2 === null ? await getHistoryStore() : null;
  if (v2 === null && !store) {
    // No binding means no observations exist to export — not an empty file
    // that could be mistaken for "nothing was happening".
    return unavailable();
  }

  if (series === "experiences") {
    const history = v2
      ? await v2GameHistory(v2).catch(() => null)
      : await readGameHistory(store!).catch(() => null);
    if (!history) return unavailable();

    const rows = platformExperienceRows(history);
    if (format === "csv") {
      return new Response(toCsv([...PLATFORM_EXPERIENCES_COLUMNS], [...rows]), {
        headers: {
          ...csvHeaders("roblox-experience-players-observed.csv", CACHE),
          ...publicApiCors,
        },
      });
    }
    return json({
      series: "experiences",
      retentionDays: GAME_HISTORY_DAYS,
      rows,
    });
  }

  const observed = v2
    ? await v2TotalsSeries(v2).catch(() => null)
    : await readSeries(store!, RETENTION_DAYS).catch(() => null);
  if (!observed) return unavailable();

  const rows = platformTotalsRows(observed);
  if (format === "csv") {
    return new Response(toCsv([...PLATFORM_TOTALS_COLUMNS], [...rows]), {
      headers: { ...csvHeaders("roblox-players-observed.csv", CACHE), ...publicApiCors },
    });
  }

  return json({
    series: "totals",
    retentionDays: RETENTION_DAYS,
    firstObservedAt: observed.firstObservedAt,
    lastObservedAt: observed.lastObservedAt,
    spanHours: observed.spanHours,
    rows,
  });
}

function json(data: Record<string, unknown>): NextResponse {
  return NextResponse.json(
    {
      ok: true,
      data,
      meta: {
        collectionIntervalMinutes: COLLECTION_INTERVAL_MINUTES,
        formats: {
          json: "/api/platform/",
          csv: "/api/platform/?format=csv",
          experiencesJson: "/api/platform/?series=experiences",
          experiencesCsv: "/api/platform/?series=experiences&format=csv",
        },
        notes: platformExportNotes(),
      },
    },
    {
      headers: { "cache-control": CACHE, "x-robots-tag": "noindex", ...publicApiCors },
    },
  );
}

/**
 * 503 rather than an empty 200.
 *
 * An empty export is indistinguishable from "the platform was empty", and a
 * consumer would have no way to tell a storage failure from a quiet night.
 */
function unavailable(): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: "no-observations",
      message:
        "No collected observations are available to export right now. Nothing is returned in their place, because an empty file would be indistinguishable from a period with no players.",
    },
    {
      status: 503,
      headers: { "cache-control": "no-store", "x-robots-tag": "noindex", ...publicApiCors },
    },
  );
}

export function OPTIONS(): Response {
  return corsPreflight();
}
