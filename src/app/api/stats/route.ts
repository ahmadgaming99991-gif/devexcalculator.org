import { NextResponse } from "next/server";
import { corsPreflight, publicApiCors } from "@/lib/api/public-headers";
import { csvHeaders, toCsv } from "@/lib/api/csv";
import {
  STATS_COLUMNS,
  UNPUBLISHED_COLUMNS,
  statsRows,
  unpublishedRows,
} from "@/lib/api/exports";
import { engagement, platformMetrics } from "@/lib/platform/metrics";
import { sources } from "@/lib/calculations/rate-registry";

/**
 * Roblox creator payout statistics, as data.
 *
 * `/roblox-stats/` charts these figures. A chart is an argument; this is the
 * evidence, and publishing it is the difference between "trust this graph" and
 * "check it against the filing".
 *
 * Every row carries whether Roblox reported the figure or this site derived
 * it, and the source it came from — including the metrics Roblox does not
 * publish, which are exported as absences with reasons. Leaving those out
 * would make the file look complete, and someone would fill the gap with an
 * estimate.
 *
 * The figures themselves change only when a filing is read and the data file
 * is edited — that is, at build time. The route is nonetheless rendered per
 * request, because it reads a `format` query parameter, and a statically
 * rendered route has no request to read it from. The cost is answered by the
 * edge cache rather than by the Worker: the response is identical for every
 * caller and is held for a day.
 */
export const dynamic = "force-dynamic";

const CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400";

export async function GET(request: Request): Promise<Response> {
  const format = new URL(request.url).searchParams.get("format");

  if (format === "csv") {
    // Two tables in one file would need two header rows, which is not CSV.
    // The unpublished metrics are a separate concern and get their own
    // request; the JSON carries both at once.
    const body = toCsv([...STATS_COLUMNS], [...statsRows()]);
    return new Response(body, {
      headers: { ...csvHeaders("roblox-creator-payouts.csv", CACHE), ...publicApiCors },
    });
  }

  if (format === "csv-unpublished") {
    const body = toCsv([...UNPUBLISHED_COLUMNS], [...unpublishedRows()]);
    return new Response(body, {
      headers: { ...csvHeaders("roblox-metrics-not-published.csv", CACHE), ...publicApiCors },
    });
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        registryVersion: platformMetrics.registryVersion,
        retrievedAt: platformMetrics.retrievedAt,
        rows: statsRows(),
        notPublished: unpublishedRows(),
        sources: sources.sources
          .filter((source) => platformMetrics.sourceIds.includes(source.id))
          .map((source) => ({
            id: source.id,
            publisher: source.publisher,
            title: source.title,
            url: source.url,
            lastCheckedAt: source.lastCheckedAt,
          })),
      },
      meta: {
        formats: {
          json: "/api/stats/",
          csv: "/api/stats/?format=csv",
          csvNotPublished: "/api/stats/?format=csv-unpublished",
        },
        engagementPeriod: engagement.period,
        notes: [
          "Every row states whether Roblox reported the figure or this site derived it. A derived figure is computed in code from reported ones; the derivation is described on /methodology/.",
          "Money is carried as an exact decimal string, never as a floating-point number.",
          "Metrics Roblox does not publish are included as absences with reasons rather than omitted, so the file cannot be mistaken for the complete picture.",
        ],
      },
    },
    {
      headers: {
        "cache-control": CACHE,
        "x-robots-tag": "noindex",
        ...publicApiCors,
      },
    },
  );
}

export function OPTIONS(): Response {
  return corsPreflight();
}
