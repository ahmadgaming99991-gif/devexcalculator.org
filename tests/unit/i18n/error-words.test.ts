import { describe, expect, it } from "vitest";
import { EN_ERROR_WORDS } from "../../../src/app/(en)/error-words";
import { ERROR_WORDS } from "../../../src/features/errors/error-view.words";
import errors from "../../../src/i18n/locales/en/errors.json";

/**
 * The one place a sentence is compiled into a component rather than looked up.
 *
 * An error boundary is a Client Component that Next can render before any
 * server work has happened, so it cannot await a dictionary — its words have to
 * be in the bundle. That copy can go stale silently: the dictionary is edited,
 * the boundary keeps rendering last month's sentence, and nothing fails.
 *
 * So it fails here.
 */

function read(key: string): unknown {
  let node: unknown = errors;
  for (const part of key.replace(/^errors\./, "").split(".")) {
    node = (node as Record<string, unknown> | undefined)?.[part];
  }
  return node;
}

describe("the error boundary's compiled words", () => {
  it("holds exactly the keys the boundary renders", () => {
    expect(Object.keys(EN_ERROR_WORDS).sort()).toEqual([...ERROR_WORDS].sort());
  });

  it("still says what the dictionary says", () => {
    for (const key of ERROR_WORDS) {
      expect(EN_ERROR_WORDS[key], key).toBe(read(key));
    }
  });

  it("carries the token the boundary fills in", () => {
    // `rich()` puts the digest inside a <code> element. A translation that
    // drops the token loses the reference number entirely.
    expect(EN_ERROR_WORDS["errors.boundary.reference"]).toContain("{digest}");
  });
});
