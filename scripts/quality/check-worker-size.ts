/**
 * Cloudflare deployment limits and prerender coverage.
 *
 * Cloudflare enforces a compressed size limit on a Worker script, and
 * exceeding it fails the deploy rather than degrading gracefully.
 *
 * The size is taken from `wrangler deploy --dry-run`, which is the only
 * accurate measure: `.open-next/worker.js` is a thin entry point, and the real
 * script is what Wrangler produces after bundling every imported module. An
 * earlier version of this check measured the entry file and cheerfully
 * reported 0.00 MB.
 *
 * Run with `npm run validate:worker` after `npm run cf-build`.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { indexableRoutes } from "../../src/lib/content/route-registry";
import { REPO_ROOT } from "../seo/paths";

/**
 * The free plan allows 3 MB compressed and paid plans allow 10 MB. The lower
 * figure is the budget so the build stays deployable on either.
 */
const LIMIT_MB = 3;
/** Warn once a measurement passes this share of its limit. */
const WARN_RATIO = 0.8;
/** Cloudflare serves at most this many static asset files. */
const ASSET_COUNT_LIMIT = 20_000;
/** No single static asset may exceed this size. */
const ASSET_FILE_LIMIT_MB = 25;

/**
 * Routes that render per request, and why.
 *
 * Each reads `searchParams` on the server so a shared link such as
 * `/conversions/?robux=100000` renders its result in the HTML, without
 * JavaScript. That is a requirement, and the cost is a full render in the
 * Worker on every request.
 *
 * The list is here so the cost stays visible and deliberate. A route arriving
 * in it by accident is a regression: the first deployment of this site ran
 * every page through a full render and Cloudflare answered `error code: 1102`,
 * CPU limit exceeded, on all of them.
 *
 * `/` and `/devex-fees-and-taxes/` were in this list and came out of it on
 * 2026-09-02, because the cost stopped being affordable. Publishing five more
 * locales took the site to seven, every render builds the hreflang cluster and
 * language selector across all of them, and the homepage crossed the 10 ms CPU
 * limit: `wrangler tail` recorded `outcome: exceededCpu` on
 * `https://devexcalculator.org/` and readers whose request missed the edge
 * cache were served `error 1102` again. The calculator island reads its own
 * shared link in the browser now and both routes are prerendered in all seven
 * locales. See docs/decision-log.md D-048; the fourteen documents are asserted
 * by `npm run validate:static-routes`.
 *
 * The three below still render per request for the original reason. They are
 * far lower traffic, and if one of them ever reaches the limit the fix is the
 * one already applied to these two.
 */
const DYNAMIC_ROUTES = new Set([
  "/conversions/",
  "/robux-to-usd/",
  "/usd-to-robux/",
  /*
   * `/platform/stock/` renders a market quote from a provider behind a
   * server-side API key, which cannot move to a public data plane.
   *
   * `/platform/` used to sit here for the same-sounding reason - it reports
   * figures that change, and prerendering it would have meant serving a player
   * count from build time as though it were current. It is prerendered now
   * because none of those figures are in the document: they are fetched by the
   * browser from the platform data plane after load, so the file is identical
   * for every reader and carries no reading at all. See
   * docs/platform-data-plane.md.
   */
  "/platform/stock/",
]);

/** `/devex-rates/` → `devex-rates.cache`, `/` → `index.cache`. */
function cacheEntryFor(route: string): string {
  const trimmed = route.replace(/^\/|\/$/g, "");
  return `${trimmed === "" ? "index" : trimmed}.cache`;
}

/** Windows paths in a message about a Cloudflare path help nobody. */
function toPosix(path: string): string {
  return path.split("\\").join("/");
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function main(): void {
  const workerEntry = join(REPO_ROOT, ".open-next", "worker.js");
  if (!existsSync(workerEntry)) {
    console.error(
      `No Worker bundle at ${workerEntry}. Run \`npm run cf-build\` first.\n` +
        "See docs/cloudflare-deployment.md for the Windows and WSL paths.",
    );
    process.exit(1);
  }

  console.log("Measuring the Worker bundle with wrangler --dry-run…");

  let output: string;
  try {
    output = execFileSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["wrangler", "deploy", "--dry-run", "--outdir", ".wrangler/size-check"],
      { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`wrangler dry run failed:\n${message}`);
    process.exit(1);
  }

  // "Total Upload: 8469.95 KiB / gzip: 2041.53 KiB"
  const match = output.match(/Total Upload:\s*([\d.]+)\s*KiB\s*\/\s*gzip:\s*([\d.]+)\s*KiB/);
  if (!match?.[1] || !match[2]) {
    console.error("Could not read the bundle size from the wrangler output.");
    console.error(output);
    process.exit(1);
  }

  const uncompressedMb = Number(match[1]) / 1024;
  const compressedMb = Number(match[2]) / 1024;
  const ratio = compressedMb / LIMIT_MB;

  console.log("\nWorker bundle");
  console.log(`  uncompressed: ${uncompressedMb.toFixed(2)} MB`);
  console.log(
    `  compressed:   ${compressedMb.toFixed(2)} MB (${(ratio * 100).toFixed(0)}% of the ${LIMIT_MB} MB limit)`,
  );

  if (compressedMb > LIMIT_MB) {
    console.error(
      `\nERROR  Worker script is ${compressedMb.toFixed(2)} MB compressed, over the ${LIMIT_MB} MB limit.`,
    );
    process.exit(1);
  }

  if (ratio > WARN_RATIO) {
    console.warn(
      `\n  warning  Worker script is at ${(ratio * 100).toFixed(0)}% of the ${LIMIT_MB} MB limit. ` +
        "Adding a large dependency may push it over.",
    );
  }

  checkAssets();
  console.log("\nCloudflare limit checks passed.");
}

/**
 * Static assets, and whether the prerendered pages are actually among them.
 *
 * The coverage half is the important one. Cache interception only helps if the
 * prerendered HTML ships as an asset for the Worker to return; without it every
 * page falls back to a full render, which is what exhausted the CPU limit in
 * production. Counting the entries here surfaces that at build time instead of
 * as a 503.
 */
function checkAssets(): void {
  const assetsDir = join(REPO_ROOT, ".open-next", "assets");
  if (!existsSync(assetsDir)) {
    console.error(`No assets directory at ${assetsDir}. Run \`npm run cf-build\` first.`);
    process.exit(1);
  }

  const files = walk(assetsDir);
  const sizes = files.map((file) => ({ file, bytes: statSync(file).size }));
  const largest = sizes.reduce((a, b) => (b.bytes > a.bytes ? b : a));
  const totalMb = sizes.reduce((sum, entry) => sum + entry.bytes, 0) / 1_048_576;
  const largestMb = largest.bytes / 1_048_576;
  const failures: string[] = [];

  console.log("\nStatic assets");
  console.log(
    `  files:   ${files.length} of ${ASSET_COUNT_LIMIT.toLocaleString("en-US")} ` +
      `(${((files.length / ASSET_COUNT_LIMIT) * 100).toFixed(1)}%)`,
  );
  console.log(`  total:   ${totalMb.toFixed(1)} MB`);
  console.log(
    `  largest: ${largestMb.toFixed(2)} MB of ${ASSET_FILE_LIMIT_MB} MB — ` +
      toPosix(relative(assetsDir, largest.file)),
  );

  if (files.length > ASSET_COUNT_LIMIT) {
    failures.push(`${files.length} asset files exceeds the ${ASSET_COUNT_LIMIT} limit.`);
  } else if (files.length > ASSET_COUNT_LIMIT * WARN_RATIO) {
    console.warn(
      `  warning  asset count is at ${((files.length / ASSET_COUNT_LIMIT) * 100).toFixed(0)}% of the limit.`,
    );
  }

  if (largestMb > ASSET_FILE_LIMIT_MB) {
    failures.push(
      `${toPosix(relative(assetsDir, largest.file))} is ${largestMb.toFixed(1)} MB, over the ` +
        `${ASSET_FILE_LIMIT_MB} MB per-file limit.`,
    );
  }

  const cacheRoot = join(assetsDir, "cdn-cgi", "_next_cache");
  const prerendered = new Set(
    existsSync(cacheRoot)
      ? walk(cacheRoot)
          .filter((file) => file.endsWith(".cache"))
          // Drop the build-id segment so the key is the route path.
          .map((file) => toPosix(relative(cacheRoot, file)).split("/").slice(1).join("/"))
      : [],
  );

  const missing = indexableRoutes
    .map((record) => record.route)
    .filter((route) => !DYNAMIC_ROUTES.has(route) && !prerendered.has(cacheEntryFor(route)));

  const unexpectedlyStatic = [...DYNAMIC_ROUTES].filter((route) =>
    prerendered.has(cacheEntryFor(route)),
  );

  console.log(
    `  prerendered: ${indexableRoutes.length - DYNAMIC_ROUTES.size} of ${indexableRoutes.length} ` +
      `indexable routes; ${DYNAMIC_ROUTES.size} render per request by design`,
  );

  if (missing.length > 0) {
    failures.push(
      `${missing.length} route(s) are neither prerendered nor declared dynamic, so each one costs ` +
        `a full render in the Worker: ${missing.join(", ")}.\n` +
        (prerendered.size === 0
          ? "         No cache entries exist at all, so the likely cause is a missing step " +
            "rather than a code change: `opennextjs-cloudflare build` does not copy the " +
            "prerendered pages into the asset bundle. Run `npm run cf-populate`, or deploy " +
            "with `npm run deploy`, which does it for you. Deploying with bare " +
            "`wrangler deploy` skips it and ships a Worker that re-renders every page."
          : "         If that is intended, add them to DYNAMIC_ROUTES with the reason."),
    );
  }

  if (unexpectedlyStatic.length > 0) {
    console.warn(
      `  warning  ${unexpectedlyStatic.join(", ")} is prerendered but listed as dynamic; ` +
        "remove it from DYNAMIC_ROUTES.",
    );
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} limit failure(s):`);
    for (const failure of failures) console.error(`  ERROR  ${failure}`);
    process.exit(1);
  }
}

main();
