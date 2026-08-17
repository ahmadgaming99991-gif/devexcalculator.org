import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Validates the shipped data files against their JSON Schemas.
 *
 * The registries are also validated at load time by rate-registry.ts, which
 * enforces relationships JSON Schema cannot express — that
 * `usdPerThousandRobux` equals the rate times 1000, that every `sourceId`
 * resolves. These tests cover the shape; that code covers the semantics.
 */

const root = join(__dirname, "..", "..");

function loadJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8"));
}

function makeValidator(schemaPath: string) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(loadJson(schemaPath) as object);
}

describe("rate registry schema", () => {
  const validate = makeValidator("schemas/rate-registry.schema.json");

  it("validates src/data/rates.json", () => {
    const valid = validate(loadJson("src/data/rates.json"));
    if (!valid) console.error(validate.errors);
    expect(valid).toBe(true);
  });

  it("rejects a rate value stored as a JSON number", () => {
    const data = loadJson("src/data/rates.json") as { rates: Record<string, unknown>[] };
    // A number here would be parsed as a double and lose exactness.
    const broken = { ...data, rates: [{ ...data.rates[0], usdPerRobux: 0.0038 }] };
    expect(validate(broken)).toBe(false);
  });

  it("rejects a rate with no source", () => {
    const data = loadJson("src/data/rates.json") as { rates: Record<string, unknown>[] };
    const broken = { ...data, rates: [{ ...data.rates[0], sourceIds: [] }] };
    expect(validate(broken)).toBe(false);
  });

  it("rejects an unknown rate status", () => {
    const data = loadJson("src/data/rates.json") as { rates: Record<string, unknown>[] };
    const broken = { ...data, rates: [{ ...data.rates[0], status: "provisional" }] };
    expect(validate(broken)).toBe(false);
  });
});

describe("source registry schema", () => {
  const validate = makeValidator("schemas/source-registry.schema.json");

  it("validates src/data/source-registry.json", () => {
    const valid = validate(loadJson("src/data/source-registry.json"));
    if (!valid) console.error(validate.errors);
    expect(valid).toBe(true);
  });

  it("rejects a non-HTTPS source URL", () => {
    const data = loadJson("src/data/source-registry.json") as {
      sources: Record<string, unknown>[];
    };
    const broken = {
      ...data,
      sources: [{ ...data.sources[0], url: "http://example.com" }],
    };
    expect(validate(broken)).toBe(false);
  });

  it("rejects an evidence label outside the allowed set", () => {
    const data = loadJson("src/data/source-registry.json") as {
      sources: Record<string, unknown>[];
    };
    const broken = {
      ...data,
      sources: [{ ...data.sources[0], evidenceLabel: "Probably true" }],
    };
    expect(validate(broken)).toBe(false);
  });
});

describe("currencies schema", () => {
  const validate = makeValidator("schemas/currencies.schema.json");

  it("validates src/data/currencies.json", () => {
    const valid = validate(loadJson("src/data/currencies.json"));
    if (!valid) console.error(validate.errors);
    expect(valid).toBe(true);
  });

  it("rejects a malformed currency code", () => {
    const data = loadJson("src/data/currencies.json") as {
      currencies: Record<string, unknown>[];
    };
    const broken = { ...data, currencies: [{ ...data.currencies[0], code: "usd" }] };
    expect(validate(broken)).toBe(false);
  });
});
