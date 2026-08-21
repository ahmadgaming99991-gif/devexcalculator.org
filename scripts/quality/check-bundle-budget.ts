/**
 * Client JavaScript budget.
 *
 * This used to watch the wrong thing, in both directions.
 *
 * The shared bundle it measured and failed on contains no application code at
 * all — checked by searching the chunks for this project's own symbols, and
 * they are absent. It is React and the Next.js client runtime, so a Next patch
 * release could fail the build for a change nobody here made, and no amount of
 * work on this site could bring it down. It sat at 127.7 kB against a 130 kB
 * budget: two kilobytes from failing on something outside our control.
 *
 * Meanwhile the per-route budget iterated `manifest.pages`, which under the App
 * Router holds exactly one entry — `/_app`. Every route loop body was
 * unreachable, so the 60 kB route budget had never once examined a route, and
 * the 108 kB of application JavaScript this site actually ships was measured by
 * nothing. A check that cannot fail is not a check.
 *
 * So the two are now separated. The framework floor is reported with a ceiling
 * loose enough to absorb an upgrade and tight enough to catch a genuine jump.
 * Application chunks — every chunk that is not part of that floor — get the
 * real budget, because they are the only part anyone here can do something
 * about.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { gzipSync } from "node:zlib";
import { REPO_ROOT } from "../seo/paths";

/**
 * Ceiling on the framework floor: React plus the Next.js client runtime.
 *
 * Informational rather than a target. Nothing in this repository moves it, so
 * it is set to catch a step change — a major upgrade, or a dependency that
 * somehow lands in the root bundle — instead of tracking it kilobyte by
 * kilobyte and failing on someone else's release.
 */
const FRAMEWORK_CEILING_KB = 145;

/**
 * Gzipped kilobytes of application JavaScript across the whole site.
 *
 * An upper bound on the site, not a per-page cost: these chunks are loaded by
 * the routes that need them, and a reader on a content page downloads none of
 * the calculator. Budgeted as a total anyway, because the thing worth catching
 * is a heavy dependency arriving, and that shows up here whichever route pulls
 * it in.
 */
const APP_BUDGET_KB = 125;

/** No single client island should be this large on its own. */
const CHUNK_BUDGET_KB = 60;

const NEXT_DIR = join(REPO_ROOT, ".next");

interface BuildManifest {
  rootMainFiles?: string[];
  pages?: Record<string, string[]>;
}

/** Every `.js` file under a directory, recursively. */
function walkJs(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walkJs(path) : path.endsWith(".js") ? [path] : [];
  });
}

function gzippedKb(relativePath: string): number {
  const absolute = join(NEXT_DIR, relativePath);
  if (!existsSync(absolute)) return 0;
  const contents = readFileSync(absolute);
  return gzipSync(contents).byteLength / 1024;
}

function main(): void {
  const manifestPath = join(NEXT_DIR, "build-manifest.json");
  if (!existsSync(manifestPath)) {
    console.error("No .next/build-manifest.json found. Run `npm run build` first.");
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as BuildManifest;
  const failures: string[] = [];

  const sharedFiles = manifest.rootMainFiles ?? [];
  const frameworkKb = sharedFiles.reduce((sum, file) => sum + gzippedKb(file), 0);

  /*
   * Application chunks are every emitted chunk that is not part of the
   * framework floor. Derived by subtraction rather than read from a manifest
   * because the App Router does not publish a route-to-chunk map here — which
   * is precisely how the old per-route loop came to iterate nothing.
   */
  const chunkRoot = join(NEXT_DIR, "static", "chunks");
  // Compared by base name through `basename`, not by splitting on "/". The
  // manifest uses forward slashes and the walked paths use whatever the
  // platform does, so a hand-rolled split matched nothing on Windows and every
  // framework chunk was counted as application code.
  const frameworkNames = new Set(sharedFiles.map((file) => basename(file)));
  const appChunks = existsSync(chunkRoot)
    ? walkJs(chunkRoot)
        .filter((file) => !frameworkNames.has(basename(file)))
        .map((file) => ({
          name: basename(file),
          kb: gzipSync(readFileSync(file)).byteLength / 1024,
        }))
        .sort((a, b) => b.kb - a.kb)
    : [];

  const appKb = appChunks.reduce((sum, chunk) => sum + chunk.kb, 0);

  console.log("Client JavaScript budget");
  console.log(
    `  framework: ${frameworkKb.toFixed(1)} kB gzipped (React and the Next.js runtime; ceiling ${FRAMEWORK_CEILING_KB} kB)`,
  );
  console.log(
    `  application: ${appKb.toFixed(1)} kB gzipped across ${appChunks.length} chunks (budget ${APP_BUDGET_KB} kB)`,
  );
  for (const chunk of appChunks.slice(0, 5)) {
    console.log(`    ${chunk.kb.toFixed(1).padStart(6)} kB  ${chunk.name}`);
  }

  if (frameworkKb > FRAMEWORK_CEILING_KB) {
    failures.push(
      `The framework floor is ${frameworkKb.toFixed(1)} kB gzipped, over the ${FRAMEWORK_CEILING_KB} kB ceiling. Nothing in this repository moves this, so check what changed in the dependencies.`,
    );
  }

  if (appKb > APP_BUDGET_KB) {
    failures.push(
      `Application JavaScript is ${appKb.toFixed(1)} kB gzipped, over the ${APP_BUDGET_KB} kB budget.`,
    );
  }

  for (const chunk of appChunks) {
    if (chunk.kb > CHUNK_BUDGET_KB) {
      failures.push(
        `Chunk ${chunk.name} is ${chunk.kb.toFixed(1)} kB gzipped on its own, over the ${CHUNK_BUDGET_KB} kB limit.`,
      );
    }
  }

  // The measurement itself has to be able to fail. An empty chunk list would
  // report a comfortable zero and pass, which is the failure mode this whole
  // rewrite exists to remove.
  if (appChunks.length === 0) {
    failures.push(
      "No application chunks were found, so nothing was measured. The build output has moved.",
    );
  }

  // Disabled integrations must not appear in the client bundle at all. A
  // tree-shaking regression that ships an analytics beacon nobody configured
  // is exactly the kind of thing that goes unnoticed.
  const staticChunks = join(NEXT_DIR, "static", "chunks");
  if (existsSync(staticChunks)) {
    const forbidden = ["googletagmanager.com", "cloudflareinsights.com"];
    const walk = walkJs;

    const analyticsConfigured =
      Boolean(process.env.NEXT_PUBLIC_GA4_ID) || Boolean(process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN);

    if (!analyticsConfigured) {
      for (const file of walk(staticChunks)) {
        const contents = readFileSync(file, "utf8");
        for (const needle of forbidden) {
          if (contents.includes(needle)) {
            failures.push(
              `${file.replace(REPO_ROOT, ".")} references ${needle} even though no analytics provider is configured.`,
            );
          }
        }
      }
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} budget failure(s):`);
    for (const failure of failures) console.error(`  ERROR  ${failure}`);
    process.exit(1);
  }

  console.log("\nBundle budget passed.");
}

/** Total size of the static asset directory, reported for the record. */
export function staticAssetBytes(): number {
  const dir = join(NEXT_DIR, "static");
  if (!existsSync(dir)) return 0;
  return statSync(dir).size;
}

main();
