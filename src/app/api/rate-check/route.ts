import { NextResponse } from "next/server";
import { rateRegistry } from "@/lib/calculations/rate-registry";
import { corsPreflight, publicApiCors } from "@/lib/api/public-headers";
import { getHistoryStore } from "@/lib/platform/store";
import {
  compareToRegistry,
  readObservation,
  SOURCE_DOCUMENT_URL,
  SOURCE_PAGE_URL,
  type ExpectedFigures,
} from "@/lib/rates/source-check";

/**
 * The result of the automatic check against Roblox's own document.
 *
 * Two dates live on this site and they are different kinds of fact, which is
 * the reason this endpoint is separate from `/api/rates/`:
 *
 *   `lastVerifiedAt`  a person read Roblox's documentation and confirmed every
 *                     figure. A fact about the past. It never moves on its own.
 *   `checkedAt`       a scheduled job re-read that document and compared the
 *                     figures. A fact about today, and it moves every day.
 *
 * Publishing the second does not weaken the first — it is the only honest way
 * to answer "is this still current?" on a page that was built last week. The
 * comparison happens here rather than in the scheduled job so that a registry
 * edit re-evaluates the stored observation on the next read.
 *
 * `unknown` is a real answer. Before the first scheduled run, or with storage
 * unavailable, this says so rather than implying a check that did not happen.
 */
export const dynamic = "force-dynamic";

function publishedFigures(): ExpectedFigures {
  return {
    rates: rateRegistry.rates.map((rate) => rate.usdPerRobux),
    minimum: rateRegistry.minimum.eligibleEarnedRobux,
  };
}

export async function GET(): Promise<NextResponse> {
  const store = await getHistoryStore();
  const observation = store ? await readObservation(store) : null;
  const comparison = compareToRegistry(observation, publishedFigures());

  return NextResponse.json(
    {
      ok: comparison.status !== "changed",
      data: {
        status: comparison.status,
        checkedAt: comparison.checkedAt,
        sourceUpdatedAt: comparison.sourceUpdatedAt,
        lastVerifiedAt: rateRegistry.lastVerifiedAt,
        registryVersion: rateRegistry.registryVersion,
        published: publishedFigures(),
        missingRates: comparison.missingRates,
        unexpectedRates: comparison.unexpectedRates,
        minimumFound: comparison.minimumFound,
        detail: comparison.detail,
        source: { document: SOURCE_DOCUMENT_URL, page: SOURCE_PAGE_URL },
      },
      meta: {
        disclaimer:
          "An automatic check confirms that Roblox's page still states the figures this site publishes. It never edits them: a change raises a flag for a person to read, because a rate needs to be understood, not copied.",
      },
    },
    {
      headers: {
        /*
         * Short, and shorter than the check interval. A reader loading a page
         * an hour after the check should see the check, not a cached answer
         * from before it — that is the entire point of the line this feeds.
         */
        "cache-control": "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
        "x-robots-tag": "noindex",
        ...publicApiCors,
      },
    },
  );
}

/** Answers the preflight a browser sends before a cross-origin read. */
export function OPTIONS(): Response {
  return corsPreflight();
}
