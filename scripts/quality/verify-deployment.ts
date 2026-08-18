/**
 * Post-deploy verification against the live site.
 *
 * The local gates cannot see a whole class of defect, because the thing being
 * checked only exists once Cloudflare is in front of it. Every one of these was
 * found this way and none of them by a local run:
 *
 *   - Worker CPU limit exceeded, `error code: 1102`, on every rendered page
 *   - the www redirect emitting a literal `:path*` in its Location header
 *   - an analytics beacon injected into responses after the Worker replied
 *
 * So this exists as one command to run after every deploy, rather than as a
 * checklist someone is trusted to remember.
 *
 *   npm run verify:deployment
 *   npm run verify:deployment -- https://staging.example.com
 */
import { execFileSync } from "node:child_process";
import { REPO_ROOT } from "../seo/paths";

const DEFAULT_TARGET = "https://devexcalculator.org";

/** The checks that accept a BASE_URL and are meaningful against a real host. */
const CHECKS = [
  { script: "validate:routes", label: "routes, metadata and structured data" },
  { script: "validate:links", label: "internal link crawl and the www redirect" },
  { script: "validate:duplicates", label: "near-duplicate content" },
] as const;

function run(script: string, baseUrl: string): boolean {
  try {
    execFileSync(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["run", script],
      {
        cwd: REPO_ROOT,
        encoding: "utf8",
        stdio: "inherit",
        env: { ...process.env, BASE_URL: baseUrl },
        shell: process.platform === "win32",
      },
    );
    return true;
  } catch {
    return false;
  }
}

function main(): void {
  const target = (process.argv[2] ?? DEFAULT_TARGET).replace(/\/$/, "");
  if (!target.startsWith("https://")) {
    console.error(`Refusing to verify ${target}: this checks a deployment, so it must be HTTPS.`);
    process.exit(1);
  }

  console.log(`\nVerifying the deployment at ${target}\n`);

  const failed: string[] = [];
  for (const check of CHECKS) {
    console.log(`\n── ${check.label} ${"─".repeat(Math.max(0, 56 - check.label.length))}`);
    if (!run(check.script, target)) failed.push(check.label);
  }

  console.log("\n" + "═".repeat(64));

  if (failed.length > 0) {
    console.error(`\n${failed.length} deployment check(s) failed:`);
    for (const label of failed) console.error(`  ERROR  ${label}`);
    console.error(
      "\nThe browser suite is deliberately not included here — it needs Playwright " +
        "browsers installed. Run it separately:\n" +
        `  BASE_URL=${target} npx playwright test`,
    );
    process.exit(1);
  }

  console.log(`\nDeployment verified: ${target}`);
  console.log(
    "\nThe browser suite is not part of this command; it needs Playwright browsers.\n" +
      `Run it too before calling a deploy done:\n  BASE_URL=${target} npx playwright test`,
  );
}

main();
