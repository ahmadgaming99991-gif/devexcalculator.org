import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { apiEndpoints, openApiDocument } from "../../../src/lib/api/contract";

/**
 * The contract has to describe the service, not a memory of it.
 *
 * An OpenAPI document maintained by hand drifts until it is worse than having
 * none, and nothing about publishing one makes that visible. These assertions
 * are what makes it visible: an endpoint that exists and is not described, or
 * is described and does not exist, fails here.
 */

const API_ROOT = join(process.cwd(), "src", "app", "api");

/** Every directory under `src/app/api` holding a `route.ts`. */
function handlerDirectories(root: string, prefix = ""): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    if (!statSync(full).isDirectory()) continue;
    const name = prefix ? `${prefix}/${entry}` : entry;
    if (readdirSync(full).includes("route.ts")) found.push(name);
    found.push(...handlerDirectories(full, name));
  }
  return found;
}

describe("public API contract", () => {
  const handlers = handlerDirectories(API_ROOT);

  it("finds the route handlers it is asserting about", () => {
    // Without this, a path mistake makes every assertion below pass on an
    // empty list — the failure mode this project keeps finding.
    expect(handlers.length).toBeGreaterThan(3);
    expect(relative(process.cwd(), API_ROOT).split(sep)).toEqual(["src", "app", "api"]);
  });

  it("describes every endpoint that exists", () => {
    const described = new Set(apiEndpoints.map((endpoint) => endpoint.handler));
    for (const handler of handlers) {
      // `openapi.json` describes the contract; it is not part of it.
      if (handler === "openapi.json") continue;
      expect(described.has(handler), `/api/${handler}/ exists but is not in the contract`).toBe(
        true,
      );
    }
  });

  it("describes no endpoint that does not exist", () => {
    const existing = new Set(handlers);
    for (const endpoint of apiEndpoints) {
      expect(
        existing.has(endpoint.handler),
        `the contract describes /api/${endpoint.handler}/, which has no route handler`,
      ).toBe(true);
    }
  });

  it("gives every endpoint a cache policy and a response", () => {
    for (const endpoint of apiEndpoints) {
      expect(endpoint.cacheControl, `${endpoint.path} states no cache policy`).not.toBe("");
      expect(endpoint.responses.length, `${endpoint.path} documents no response`).toBeGreaterThan(0);
      expect(endpoint.path.endsWith("/"), `${endpoint.path} breaks the trailing-slash policy`).toBe(
        true,
      );
    }
  });

  it("keeps the two endpoints that must not be CORS-enabled closed", () => {
    // Health is infrastructure for an operator; contact accepts submissions and
    // is origin-checked on purpose. Neither is reference data.
    const byPath = new Map(apiEndpoints.map((endpoint) => [endpoint.path, endpoint]));
    expect(byPath.get("/api/health/")?.cors).toBe(false);
    expect(byPath.get("/api/contact/")?.cors).toBe(false);
  });

  it("names the provenance fields on every endpoint that publishes figures", () => {
    for (const endpoint of apiEndpoints) {
      if (endpoint.path === "/api/contact/") continue; // Accepts data, publishes none.
      expect(
        endpoint.provenanceFields.length,
        `${endpoint.path} publishes figures with no field saying where they came from`,
      ).toBeGreaterThan(0);
    }
  });
});

describe("the generated OpenAPI document", () => {
  const document = openApiDocument() as {
    openapi: string;
    info: Record<string, unknown>;
    servers: { url: string }[];
    paths: Record<string, Record<string, unknown>>;
  };

  it("is OpenAPI 3.1 with a real server and version", () => {
    expect(document.openapi).toBe("3.1.0");
    expect(document.servers[0]?.url).toMatch(/^https:\/\//);
    expect(document.info.version).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("has one path per described endpoint", () => {
    expect(Object.keys(document.paths).sort()).toEqual(
      apiEndpoints.map((endpoint) => endpoint.path).sort(),
    );
  });

  it("omits the CORS preflight, which is not an operation", () => {
    for (const operations of Object.values(document.paths)) {
      expect(Object.keys(operations)).not.toContain("options");
      expect(Object.keys(operations).length).toBeGreaterThan(0);
    }
  });

  it("documents the 503 the platform export can return", () => {
    const platform = document.paths["/api/platform/"] as {
      get: { responses: Record<string, unknown> };
    };
    // A consumer that does not know this can happen will read an outage as
    // an empty dataset.
    expect(Object.keys(platform.get.responses)).toContain("503");
  });

  it("states the cache policy each endpoint actually sends", () => {
    for (const endpoint of apiEndpoints) {
      const operations = document.paths[endpoint.path] as Record<
        string,
        { responses: Record<string, { headers: Record<string, { schema: { const?: string } }> }> }
      >;
      for (const operation of Object.values(operations)) {
        for (const response of Object.values(operation.responses)) {
          expect(response.headers["Cache-Control"]?.schema.const).toBe(endpoint.cacheControl);
        }
      }
    }
  });

  it("serialises to valid JSON", () => {
    expect(() => JSON.parse(JSON.stringify(document))).not.toThrow();
  });
});
