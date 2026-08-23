import { siteConfig } from "@/config/site";

/**
 * One description of the public API, read by everything that describes it.
 *
 * The risk with an OpenAPI document is not that it is wrong on the day it is
 * written; it is that it becomes a second contract, maintained by hand, that
 * drifts from the endpoints until it is worse than nothing. So the document is
 * generated from this file, and a test asserts that every route handler under
 * `src/app/api` appears here — a new endpoint that nobody documented fails the
 * build rather than existing quietly.
 *
 * What this file is not: a schema validator. The endpoints already return
 * exactly what their route handlers construct, and adding a runtime validation
 * layer to prove it would be a second implementation of the same shapes. This
 * describes them.
 */

export type HttpMethod = "GET" | "POST" | "OPTIONS";

export interface ApiParameter {
  readonly name: string;
  readonly description: string;
  readonly values?: readonly string[];
}

export interface ApiResponse {
  readonly status: number;
  readonly description: string;
  readonly contentType: string;
}

export interface ApiEndpoint {
  /** Path as served, with the site's trailing-slash policy applied. */
  readonly path: string;
  /** Directory under `src/app/api`, used to prove nothing is undocumented. */
  readonly handler: string;
  readonly methods: readonly HttpMethod[];
  readonly summary: string;
  readonly description: string;
  readonly parameters: readonly ApiParameter[];
  readonly responses: readonly ApiResponse[];
  /** `Cache-Control` as sent. Stated because callers plan around it. */
  readonly cacheControl: string;
  /** Whether a browser on another origin may read it. */
  readonly cors: boolean;
  /** Fields carrying provenance, which is what makes the data checkable. */
  readonly provenanceFields: readonly string[];
}

const REFERENCE_CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400";

export const apiEndpoints: readonly ApiEndpoint[] = [
  {
    path: "/api/rates/",
    handler: "rates",
    methods: ["GET", "OPTIONS"],
    summary: "Current DevEx rates and the submission minimum",
    description:
      "The rates Roblox currently documents, the Earned Robux minimum, the marketplace fee, and the sources each was verified against. Read the registryVersion and lastVerifiedAt: a rate on its own is a number that may already be out of date.",
    parameters: [],
    responses: [{ status: 200, description: "The rate registry.", contentType: "application/json" }],
    cacheControl: REFERENCE_CACHE,
    cors: true,
    provenanceFields: ["data.registryVersion", "data.lastVerifiedAt", "data.sources[].url"],
  },
  {
    path: "/api/rate-check/",
    handler: "rate-check",
    methods: ["GET", "OPTIONS"],
    summary: "Whether Roblox's page still states the published rates",
    description:
      "Four times a day a scheduled job re-reads the markdown Roblox publishes for its DevEx page and compares the figures to the ones this site shows. `status` is `unchanged`, `changed`, `unreadable` or `unknown`; `checkedAt` is when that comparison last ran, which is a different fact from `lastVerifiedAt` — the day a person read the documentation. The check never edits a rate: a change raises a flag rather than copying a number.",
    parameters: [],
    responses: [
      { status: 200, description: "The result of the last automatic check.", contentType: "application/json" },
    ],
    cacheControl: "public, max-age=300, s-maxage=900, stale-while-revalidate=3600",
    cors: true,
    provenanceFields: ["data.checkedAt", "data.sourceUpdatedAt", "data.source.document"],
  },
  {
    path: "/api/fx/latest/",
    handler: "fx/latest",
    methods: ["GET", "OPTIONS"],
    summary: "European Central Bank reference rates",
    description:
      "Reference rates for showing a payout in a currency other than US dollars. These are not dealing rates — nobody converts money at them. When the provider cannot be reached a bundled snapshot is returned and marked FALLBACK rather than passed off as current.",
    parameters: [],
    responses: [
      { status: 200, description: "Reference rates, live or explicitly marked as a fallback.", contentType: "application/json" },
    ],
    cacheControl: "public, max-age=3600, s-maxage=43200, stale-while-revalidate=86400",
    cors: true,
    provenanceFields: ["data.observedOn", "meta.cache", "meta.source"],
  },
  {
    path: "/api/stats/",
    handler: "stats",
    methods: ["GET", "OPTIONS"],
    summary: "Roblox creator payout and engagement figures",
    description:
      "The rows behind /roblox-stats/. Every row states whether Roblox reported the figure or this site derived it, and links to the filing. Metrics Roblox does not publish are included as absences with reasons, so the file cannot be mistaken for the complete picture. Money is an exact decimal string, never a floating-point number.",
    parameters: [
      {
        name: "format",
        description:
          "Omit for JSON. `csv` returns the figures as a spreadsheet; `csv-unpublished` returns the absences.",
        values: ["csv", "csv-unpublished"],
      },
    ],
    responses: [
      { status: 200, description: "The figures, as JSON.", contentType: "application/json" },
      { status: 200, description: "The figures, as CSV.", contentType: "text/csv" },
    ],
    cacheControl: REFERENCE_CACHE,
    cors: true,
    provenanceFields: ["data.rows[].origin", "data.rows[].source_id", "data.rows[].source_url"],
  },
  {
    path: "/api/platform/",
    handler: "platform",
    methods: ["GET", "OPTIONS"],
    summary: "Observed Roblox player counts",
    description:
      "The observations behind /platform/, exactly as collected. Nothing is interpolated and no missing observation is filled in — a gap means the collector did not run. Covers only the experiences Roblox was ranking at each observation, so no share of the platform can be computed from it. Reads storage only and makes no request to Roblox.",
    parameters: [
      {
        name: "series",
        description: "`totals` (default) for platform-wide counts, `experiences` for per-experience rows.",
        values: ["totals", "experiences"],
      },
      { name: "format", description: "Omit for JSON, or `csv` for a spreadsheet.", values: ["csv"] },
    ],
    responses: [
      { status: 200, description: "The collected observations.", contentType: "application/json" },
      { status: 200, description: "The collected observations, as CSV.", contentType: "text/csv" },
      {
        status: 503,
        description:
          "No observations could be read. Returned rather than an empty list, which would be indistinguishable from a period with no players.",
        contentType: "application/json",
      },
    ],
    cacheControl: "public, max-age=450, s-maxage=450",
    cors: true,
    provenanceFields: ["data.rows[].observed_at", "data.rows[].origin", "meta.notes"],
  },
  {
    path: "/api/health/",
    handler: "health",
    methods: ["GET"],
    summary: "Service and data freshness",
    description:
      "Whether the rate registry and the collector are fresh, and which build is serving. Returns 503 when the collector is critically stale. Infrastructure for an operator rather than reference data, which is why it is the one endpoint without CORS.",
    parameters: [],
    responses: [
      { status: 200, description: "Healthy, or stale but not critical.", contentType: "application/json" },
      { status: 503, description: "A critical staleness that needs action.", contentType: "application/json" },
    ],
    cacheControl: "no-store",
    cors: false,
    provenanceFields: ["rateRegistry.lastVerifiedAt", "collector.lastRecordedAt", "build.commit"],
  },
  {
    path: "/api/contact/",
    handler: "contact",
    methods: ["POST"],
    summary: "Contact submission",
    description:
      "Accepts a contact message when a provider is configured. Disabled by default, in which case the contact page says so rather than showing a form that pretends to submit. Origin-checked on purpose, and therefore not CORS-enabled.",
    parameters: [],
    responses: [
      { status: 200, description: "Accepted.", contentType: "application/json" },
      { status: 400, description: "The submission was rejected by validation.", contentType: "application/json" },
      { status: 503, description: "No contact provider is configured.", contentType: "application/json" },
    ],
    cacheControl: "no-store",
    cors: false,
    provenanceFields: [],
  },
];

/**
 * The OpenAPI 3.1 document.
 *
 * Built from the list above, so it cannot describe an endpoint that does not
 * exist or omit one that does.
 */
export function openApiDocument(): Record<string, unknown> {
  const paths: Record<string, unknown> = {};

  for (const endpoint of apiEndpoints) {
    const operations: Record<string, unknown> = {};

    for (const method of endpoint.methods) {
      if (method === "OPTIONS") continue; // The CORS preflight, not an operation.

      operations[method.toLowerCase()] = {
        summary: endpoint.summary,
        description: endpoint.description,
        parameters: endpoint.parameters.map((parameter) => ({
          name: parameter.name,
          in: "query",
          required: false,
          description: parameter.description,
          schema: parameter.values ? { type: "string", enum: [...parameter.values] } : { type: "string" },
        })),
        responses: Object.fromEntries(
          groupByStatus(endpoint.responses).map(([status, responses]) => [
            String(status),
            {
              description: responses.map((response) => response.description).join(" "),
              content: Object.fromEntries(
                responses.map((response) => [response.contentType, { schema: { type: "object" } }]),
              ),
              headers: {
                "Cache-Control": {
                  description: "As sent by this endpoint.",
                  schema: { type: "string", const: endpoint.cacheControl },
                },
                ...(endpoint.cors
                  ? {
                      "Access-Control-Allow-Origin": {
                        description: "Readable from any origin; these responses carry no credentials.",
                        schema: { type: "string", const: "*" },
                      },
                    }
                  : {}),
              },
            },
          ]),
        ),
      };
    }

    paths[endpoint.path] = operations;
  }

  return {
    openapi: "3.1.0",
    info: {
      title: `${siteConfig.name} public API`,
      version: siteConfig.rateRegistryVersion,
      summary: "Reference data for Roblox DevEx payouts, published so it can be checked.",
      description:
        "Every figure this site publishes is readable here with its source and the date it was verified. No key and no sign-up. Nothing here is investment or tax advice, and no endpoint says whether a DevEx request will be approved — Roblox decides that.",
      license: { name: "Free to use with attribution", identifier: "CC-BY-4.0" },
    },
    servers: [{ url: siteConfig.url }],
    paths,
    "x-provenance": Object.fromEntries(
      apiEndpoints.map((endpoint) => [endpoint.path, endpoint.provenanceFields]),
    ),
  };
}

function groupByStatus(
  responses: readonly ApiResponse[],
): [number, ApiResponse[]][] {
  const map = new Map<number, ApiResponse[]>();
  for (const response of responses) {
    const existing = map.get(response.status);
    if (existing) existing.push(response);
    else map.set(response.status, [response]);
  }
  return [...map.entries()];
}
