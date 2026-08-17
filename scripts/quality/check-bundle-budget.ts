/**
 * Client JavaScript budget.
 *
 * The calculator is the only substantial client island on the site, so the
 * shared bundle should stay small. This reads the build manifest rather than
 * guessing, and fails when the first-load JavaScript exceeds the budget.
 *
 * Budgets are deliberately generous enough not to fail on noise and tight
 * enough to catch a heavy dependency being added without anyone noticing.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { REPO_ROOT } from "../seo/paths";

/** Gzipped kilobytes of shared JavaScript loaded on every page. */
const SHARED_BUDGET_KB = 130;
/** Gzipped kilobytes for any single route's own chunks. */
const ROUTE_BUDGET_KB = 60;

const NEXT_DIR = join(REPO_ROOT, ".next");

interface BuildManifest {
  rootMainFiles?: string[];
  pages?: Record<string, string[]>;
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
  const sharedKb = sharedFiles.reduce((sum, file) => sum + gzippedKb(file), 0);

  console.log("Client JavaScript budget");
  console.log(`  shared: ${sharedKb.toFixed(1)} kB gzipped (budget ${SHARED_BUDGET_KB} kB)`);

  if (sharedKb > SHARED_BUDGET_KB) {
    failures.push(
      `Shared JavaScript is ${sharedKb.toFixed(1)} kB gzipped, over the ${SHARED_BUDGET_KB} kB budget.`,
    );
  }

  for (const [route, files] of Object.entries(manifest.pages ?? {})) {
    const routeOnly = files.filter((file) => !sharedFiles.includes(file));
    const routeKb = routeOnly.reduce((sum, file) => sum + gzippedKb(file), 0);
    if (routeKb > 0) {
      console.log(`  ${route}: ${routeKb.toFixed(1)} kB gzipped`);
    }
    if (routeKb > ROUTE_BUDGET_KB) {
      failures.push(
        `Route ${route} ships ${routeKb.toFixed(1)} kB gzipped of its own JavaScript, over the ${ROUTE_BUDGET_KB} kB budget.`,
      );
    }
  }

  // Disabled integrations must not appear in the client bundle at all. A
  // tree-shaking regression that ships an analytics beacon nobody configured
  // is exactly the kind of thing that goes unnoticed.
  const staticChunks = join(NEXT_DIR, "static", "chunks");
  if (existsSync(staticChunks)) {
    const forbidden = ["googletagmanager.com", "cloudflareinsights.com"];
    const { readdirSync } = require("node:fs") as typeof import("node:fs");
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        return entry.isDirectory() ? walk(path) : path.endsWith(".js") ? [path] : [];
      });

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
