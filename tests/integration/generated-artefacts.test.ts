/**
 * The generated SEO artefacts must be reproducible.
 *
 * These files are committed, and CI fails when regenerating them produces a
 * diff — that check is what catches a pipeline change made without
 * regenerating. It only works if the output is a pure function of the inputs.
 * An earlier version stamped each file with `new Date()`, which made every run
 * a diff and would have left the drift check permanently red, so the guard is
 * kept here rather than relying on noticing it in CI output.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateAll } from "../../scripts/seo/analyze-keywords";
import { SEO_GENERATED } from "../../scripts/seo/paths";

/** Written by `npm run seo:analyze`, in the order the script writes them. */
const artefacts = [
  "dataset-summary.json",
  "keyword-intelligence.json",
  "keyword-route-map.json",
  "content-priority-map.json",
  "keyword-exclusions.json",
  "entity-map.json",
  "paa-map.json",
  "internal-link-map.json",
  "cannibalization-map.json",
  "publish-queue.json",
  "amount-entities.json",
];

/**
 * Hand-maintained rather than derived: it encodes judgements about competitor
 * accuracy that no script can make. It lives here because that is the path the
 * specification names, so it is excluded from the reproducibility checks by
 * name rather than by guessing from the directory listing.
 */
const HAND_MAINTAINED = ["competitor-gap-map.json"];

function read(fileName: string): string {
  return readFileSync(join(SEO_GENERATED, fileName), "utf8");
}

describe("generated SEO artefacts", () => {
  it("accounts for every file in the generated directory", () => {
    const onDisk = readdirSync(SEO_GENERATED)
      .filter((name) => name.endsWith(".json"))
      .sort();

    expect(onDisk).toEqual([...artefacts, ...HAND_MAINTAINED].sort());
  });

  it.each(artefacts)("%s is stamped from the dataset, not the clock", (fileName) => {
    const parsed = JSON.parse(read(fileName)) as Record<string, unknown>;

    expect(parsed.datasetExportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(parsed.datasetDigest).toMatch(/^[0-9A-F]{32}$/);
    // A wall-clock field would reintroduce the drift that made this test exist.
    expect(parsed).not.toHaveProperty("generatedAt");
  });

  it("stamps every artefact with the same dataset", () => {
    const stamps = new Set(
      artefacts.map((fileName) => {
        const parsed = JSON.parse(read(fileName)) as Record<string, unknown>;
        return `${String(parsed.datasetExportedAt)}|${String(parsed.datasetDigest)}`;
      }),
    );

    expect([...stamps]).toHaveLength(1);
  });

  it("regenerates byte-for-byte from the committed source exports", () => {
    const before = new Map(artefacts.map((fileName) => [fileName, read(fileName)]));

    generateAll();

    try {
      for (const [fileName, original] of before) {
        expect(read(fileName), `${fileName} changed when regenerated`).toBe(original);
      }
    } finally {
      // If the run was not reproducible the files now differ from the commit;
      // restore them so a failure reports itself without also dirtying the tree.
      for (const [fileName, original] of before) {
        writeFileSync(join(SEO_GENERATED, fileName), original, "utf8");
      }
    }
  });
});
