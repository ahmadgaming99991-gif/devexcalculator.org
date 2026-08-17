/**
 * Worker bundle size check.
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
import { existsSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../seo/paths";

/**
 * The free plan allows 3 MB compressed and paid plans allow 10 MB. The lower
 * figure is the budget so the build stays deployable on either.
 */
const LIMIT_MB = 3;
/** Warn once the bundle passes this share of the limit. */
const WARN_RATIO = 0.8;

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

  console.log("\nWorker size check passed.");
}

main();
