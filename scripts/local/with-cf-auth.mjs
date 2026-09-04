/**
 * Runs a command with Cloudflare credentials already in its environment.
 *
 * Wrangler has two ways to authenticate: an OAuth session it stores under
 * `~/.wrangler/config`, and `CLOUDFLARE_API_TOKEN`. This machine has no OAuth
 * session at all — so without a token in the environment, every `wrangler` and
 * every `opennextjs-cloudflare deploy` opens a browser and waits for a Google
 * sign-in. That is the thing this file exists to prevent: it reads the token
 * from the file this machine already keeps it in, puts it in the child
 * process, and never writes it anywhere else.
 *
 *   node scripts/local/with-cf-auth.mjs [--require-env] <command> [args...]
 *
 * `--require-env` refuses to run when a key listed in `env.requiredKeys` is
 * missing from `.env.local`. Those keys are all optional to the build — GA4
 * and three verification tags simply stop being emitted — so a deploy is the
 * only place their absence can be caught before it reaches production.
 *
 * The token is never printed, never passed as an argument, and never written
 * to disk. The banner says where it came from, not what it is.
 */

import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  localConfig,
  readEnvFile,
  resolveCloudflareToken,
  verifyCloudflareAccount,
  REPO_ROOT,
} from "./local-config.mjs";

const argv = process.argv.slice(2);
const requireEnv = argv[0] === "--require-env";
const command = requireEnv ? argv.slice(1) : argv;

if (command.length === 0) {
  console.error("with-cf-auth: no command given.");
  process.exit(2);
}

const config = localConfig();
const { token, source, file } = resolveCloudflareToken(config);

if (!token) {
  console.error("\nCloudflare authentication is not available.\n");
  console.error("  Looked for CLOUDFLARE_API_TOKEN in the environment, then for a token file at:");
  for (const candidate of config.cloudflare.tokenFileCandidates ?? []) {
    console.error(`    ${candidate}`);
  }
  if (config.cloudflare.tokenFile) console.error(`    ${config.cloudflare.tokenFile}  (from .claude/local.json)`);
  console.error(
    "\n  Do NOT run `wrangler login`. Point `.claude/local.json` at the existing token file",
  );
  console.error("  instead — see docs/local-credentials.md. Run `npm run doctor` for a full report.\n");
  process.exit(1);
}

/*
 * The credential is checked against the account before anything runs.
 *
 * Skipping this is how an empty `devexcalculator-org` Worker ended up in
 * `Cmppunjab@gmail.com's Account`: the shell had another project's
 * `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` exported, the wrapper
 * trusted them, and the deploy uploaded 322 assets into a stranger's account
 * before failing on a KV namespace that only exists in the right one. One
 * request, three seconds, and none of that happens.
 */
const account = await verifyCloudflareAccount(token, config);
if (!account.ok) {
  console.error("\nRefusing to run: this token does not belong to the account that owns this site.\n");
  console.error(`  expected  ${config.cloudflare.accountName} (${config.cloudflare.accountId})`);
  console.error(`  got       ${account.reason}`);
  console.error(`  token     ${source === "file" ? `read from ${file}` : "inherited from the environment"}`);
  console.error(
    "\n  Deploying anyway creates a duplicate Worker in the wrong account rather than\n" +
      "  failing, which is why this stops here. Do NOT run `wrangler login`.\n" +
      "  Run `npm run doctor`, and see docs/local-credentials.md.\n",
  );
  process.exit(1);
}

const childEnv = { ...process.env };
childEnv.CLOUDFLARE_API_TOKEN = token;
/*
 * Overwritten, not defaulted.
 *
 * `??=` left an inherited CLOUDFLARE_ACCOUNT_ID in place, and on a machine
 * running several Cloudflare projects the inherited one belonged to a
 * different site. Wrangler would otherwise infer the account from whatever it
 * cached under `node_modules/.cache`, which a clean install wipes. This value
 * is the project's own and is not a secret — it is in
 * docs/qa/workers-caching-verification.md already.
 */
childEnv.CLOUDFLARE_ACCOUNT_ID = config.cloudflare.accountId;

/*
 * `.env.local` is loaded for the whole chain, not just for `next build` which
 * would have found it by itself. Anything already set wins, so this can only
 * add variables, never quietly change one.
 */
const missing = [];
for (const relative of config.env.files ?? []) {
  const values = readEnvFile(join(REPO_ROOT, relative));
  if (!values) continue;
  for (const [key, value] of Object.entries(values)) {
    if (childEnv[key] === undefined) childEnv[key] = value;
  }
}
for (const key of config.env.requiredKeys ?? []) {
  if (!childEnv[key]) missing.push(key);
}

if (missing.length > 0) {
  const headline = requireEnv ? "Refusing to run" : "Warning";
  console.error(`\n${headline}: ${missing.length} expected local variable(s) missing or empty:\n`);
  for (const key of missing) console.error(`    ${key}`);
  console.error(
    `\n  These live in .env.local, which is git-ignored and exists only on this machine.`,
  );
  console.error(`  They are optional to the build, so nothing else would have told you:`);
  console.error(`  deploying without them silently drops GA4 and the search-engine`);
  console.error(`  verification tags from every page.\n`);
  if (requireEnv) {
    console.error("  Restore .env.local, or run the underlying script directly to override.\n");
    process.exit(1);
  }
}

const where = source === "environment" ? "the environment" : `${file}`;
console.log(`Cloudflare auth: token from ${where}`);
console.log(`Cloudflare auth: verified account ${account.reason}`);

/*
 * `shell: true` because the wrapped commands are npm scripts and `.cmd`
 * shims, which Windows cannot spawn directly. Every argument here comes from
 * package.json, never from user input.
 */
const result = spawnSync(command[0], command.slice(1), {
  stdio: "inherit",
  env: childEnv,
  cwd: REPO_ROOT,
  shell: true,
});

if (result.error) {
  console.error(`with-cf-auth: could not run ${command[0]}: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
