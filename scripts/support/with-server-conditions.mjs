/**
 * Runs a `tsx` script with Node resolving the `react-server` export condition.
 *
 * `src/i18n/get-dictionary.ts` imports `server-only`, which is a package whose
 * `exports` map resolves to an empty module under `react-server` and to a
 * module that throws under everything else. That is the point: a client module
 * importing the dictionary loader fails `next build`, naming the chain.
 *
 * Two build scripts legitimately load dictionaries outside Next — the content
 * validator and the localized Open Graph card builder — and under plain `tsx`
 * they got the throwing entry point and died on import. They are doing exactly
 * what a Server Component does, so they should resolve the way one does.
 *
 * Why a wrapper rather than an env prefix in `package.json`: `NODE_OPTIONS=…
 * tsx script.ts` is POSIX shell syntax, and npm runs scripts through `cmd.exe`
 * on Windows, where it is a syntax error. Why not `node --conditions=… tsx`:
 * tsx re-spawns a child process, and the flag does not survive the hop —
 * `NODE_OPTIONS` does, because it is inherited through the environment.
 *
 * Dependency-free on purpose. The alternative was `cross-env`, and this file is
 * shorter than the argument for adding a package.
 *
 *   node scripts/support/with-server-conditions.mjs <script.ts> [args…]
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/support/with-server-conditions.mjs <script.ts> [args…]");
  process.exit(1);
}

const require = createRequire(import.meta.url);
/*
 * Resolved rather than hardcoded as a path, so a tsx upgrade that moves the
 * CLI is a clear resolution error here instead of a "file not found" further
 * down. `tsx/cli` is the package's own documented entry point.
 */
let cli;
try {
  cli = require.resolve("tsx/cli");
} catch {
  console.error("Cannot resolve `tsx/cli`. Is tsx installed?");
  process.exit(1);
}
if (cli.startsWith("file://")) cli = fileURLToPath(cli);

const existing = process.env.NODE_OPTIONS ?? "";
const result = spawnSync(process.execPath, [cli, ...args], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_OPTIONS: `${existing} --conditions=react-server`.trim(),
  },
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
// A signalled child has a null status; treat that as a failure rather than a
// pass, which is what `?? 0` would have quietly produced.
process.exit(result.status ?? 1);
