/**
 * `npm run doctor` — proves this machine can build, deploy and push without
 * anyone signing in to anything.
 *
 * The failure this exists to catch is not a broken credential. It is an agent
 * or a person opening the project after a week on something else, finding a
 * command that wants a browser, and "fixing" it with `wrangler login` or a new
 * GitHub token — which on this machine deploys into the wrong Cloudflare
 * account and leaves two competing credentials behind. So every check below
 * answers one question: is the credential that already exists still good?
 *
 * Nothing here writes, rotates, or creates a credential, and nothing prints
 * one. Secrets are read into memory, used for one request, and dropped; what
 * reaches the terminal is PRESENT / PASS / FAIL / WARN and a path.
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  findTokenFile,
  localConfig,
  readEnvFile,
  resolveCloudflareToken,
  REPO_ROOT,
} from "./local-config.mjs";

const config = localConfig();
/** True when nothing had pre-loaded the token — i.e. this is a cold shell. */
const coldShell = !process.env.CLOUDFLARE_API_TOKEN;

const results = [];
let failures = 0;
let warnings = 0;

function record(section, name, state, detail = "") {
  results.push({ section, name, state, detail });
  if (state === "FAIL") failures += 1;
  if (state === "WARN") warnings += 1;
}

function git(args, { quiet = false } = {}) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" },
    /*
     * `ls-files --error-unmatch` and `grep` both report "nothing found" on
     * stderr with a non-zero exit. Here that is the passing case, so the
     * message must not reach the report it would otherwise sit above.
     */
    stdio: quiet ? ["ignore", "pipe", "ignore"] : ["ignore", "pipe", "pipe"],
  }).trim();
}

/**
 * Asks the credential manager for the stored GitHub credential.
 *
 * Scoped to the username the remote URL carries, because that is what Git
 * itself does — and it is the reason pushes work here while `gh` is signed in
 * as a different account entirely.
 *
 * Returns the secret to the caller and never logs it. Interactive prompting is
 * switched off, so a missing credential returns nothing instead of opening a
 * browser window.
 */
function storedGitHubCredential(user) {
  try {
    const out = execFileSync("git", ["credential", "fill"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      input: `protocol=https\nhost=github.com\nusername=${user}\n\n`,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "never" },
      stdio: ["pipe", "pipe", "ignore"],
    });
    const password = /^password=(.*)$/m.exec(out)?.[1];
    return password && password.length > 0 ? password : null;
  } catch {
    return null;
  }
}

async function cf(path, token) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    /* Some Workers endpoints return a script body rather than JSON. */
  }
  return { status: response.status, body };
}

// ---------------------------------------------------------------- GitHub ---

async function checkGitHub() {
  const section = "GitHub";
  const { owner, repo, credentialUser } = config.github;

  let origin = "";
  try {
    origin = git(["remote", "get-url", "origin"]);
  } catch {
    record(section, "origin remote", "FAIL", "no `origin` remote");
    return;
  }

  const expected = `github.com/${owner}/${repo}`;
  const originOk = origin.toLowerCase().includes(expected.toLowerCase());
  record(section, "origin remote", originOk ? "PASS" : "FAIL", `${owner}/${repo}`);

  const helper = (() => {
    try {
      return git(["config", "--get-all", "credential.helper"]).split("\n").filter(Boolean);
    } catch {
      return [];
    }
  })();
  const persistent = helper.some((h) => /manager|wincred|store|osxkeychain|libsecret/i.test(h));
  record(
    section,
    "persistent credential store",
    persistent ? "PRESENT" : "FAIL",
    helper.join(", ") || "none configured",
  );

  const credential = storedGitHubCredential(credentialUser);
  if (!credential) {
    record(section, "stored credential", "FAIL", `nothing stored for ${credentialUser}`);
    record(section, "write authentication", "FAIL", "no credential to test");
    return;
  }
  record(section, "stored credential", "PRESENT", `${credentialUser} (value never printed)`);

  /*
   * The repository is public, so `git ls-remote` succeeds with no credential
   * at all and proves nothing. Asking the API what this credential may do is
   * the only non-destructive check that distinguishes "can read" from
   * "can push".
   */
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { authorization: `Bearer ${credential}`, "user-agent": "devex-doctor" },
    });
    const body = await response.json();
    const canPush = body?.permissions?.push === true;
    record(
      section,
      "write authentication",
      canPush ? "PASS" : "FAIL",
      canPush ? "push permission confirmed, nothing written" : `HTTP ${response.status}`,
    );
  } catch (error) {
    record(section, "write authentication", "FAIL", error instanceof Error ? error.message : "");
  }

  /*
   * A warning, not a failure. `gh` keeps its own token and its own idea of the
   * active account; `git push` does not use it. But `gh pr create` would, and
   * on this machine the active account is not the one that owns this
   * repository — so anything reaching for `gh` here must pass `--repo`.
   */
  try {
    const status = execFileSync("gh", ["auth", "status"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const active = /Logged in to github\.com account (\S+)[\s\S]*?Active account: true/.exec(status)?.[1];
    if (active && active !== owner) {
      record(section, "gh CLI active account", "WARN", `${active} — not the repo owner; pass --repo to gh`);
    } else if (active) {
      record(section, "gh CLI active account", "PASS", active);
    }
  } catch {
    /* gh is optional; git push does not need it. */
  }
}

// ------------------------------------------------------------ Cloudflare ---

async function checkCloudflare() {
  const section = "Cloudflare";
  const file = findTokenFile(config);
  record(section, "token file", file ? "PRESENT" : "FAIL", file ?? "not found in any configured location");

  const { token, source } = resolveCloudflareToken(config);
  if (!token) {
    record(section, "token readable", "FAIL", "empty or unreadable");
    record(section, "correct account", "FAIL", "no token");
    record(section, "site Worker", "FAIL", "no token");
    return;
  }
  record(section, "token readable", "PRESENT", `resolved from ${source}, value never printed`);

  const verify = await cf("/user/tokens/verify", token);
  const active = verify.body?.result?.status === "active";
  record(section, "token active", active ? "PASS" : "FAIL", active ? "not expired, not revoked" : `HTTP ${verify.status}`);

  const { accountId, accountName, siteWorker } = config.cloudflare;
  const account = await cf(`/accounts/${accountId}`, token);
  const nameMatches = account.body?.result?.name === accountName;
  record(
    section,
    "correct account",
    account.status === 200 && nameMatches ? "PASS" : "FAIL",
    account.status === 200 ? `${account.body?.result?.name} (${accountId})` : `HTTP ${account.status} for ${accountId}`,
  );

  const worker = await cf(`/accounts/${accountId}/workers/scripts/${siteWorker}/deployments`, token);
  const deployments = worker.body?.result?.deployments?.length;
  record(
    section,
    "site Worker",
    worker.status === 200 ? "PASS" : "FAIL",
    worker.status === 200 ? `${siteWorker}, ${deployments} deployment(s)` : `HTTP ${worker.status}`,
  );

  /* Public endpoint — no credential, so this also proves the data plane is up. */
  try {
    const response = await fetch(config.cloudflare.dataWorkerHealth, { cache: "no-store" });
    const body = await response.json();
    record(
      section,
      "data Worker",
      response.status === 200 && body?.ok !== false ? "PASS" : "FAIL",
      `${config.cloudflare.dataWorkerHealth} → HTTP ${response.status}`,
    );
  } catch (error) {
    record(section, "data Worker", "FAIL", error instanceof Error ? error.message : "");
  }
}

function checkWrangler() {
  const section = "Wrangler";
  try {
    const version = execFileSync("npx", ["wrangler", "--version"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      shell: true,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .trim()
      .split("\n")
      .pop();
    record(section, "available", "PRESENT", version ?? "");
  } catch {
    record(section, "available", "FAIL", "npx wrangler did not run");
  }

  /*
   * An OAuth session is expected to be absent. If one appears, somebody ran
   * `wrangler login` — and wrangler prefers it over the API token, which is
   * exactly how a deploy ends up in the wrong account.
   */
  const home = process.env.USERPROFILE ?? process.env.HOME ?? "";
  const oauth = join(home, ".wrangler", "config", "default.toml");
  const present = existsSync(oauth);
  record(
    section,
    "no competing OAuth session",
    present ? "WARN" : "PASS",
    present ? `found ${oauth} — token auth may be bypassed` : "API token is the only credential",
  );
}

// ----------------------------------------------------------- Environment ---

function checkEnvironment() {
  const section = "Environment";

  /*
   * The keys are checked against every file at once, not file by file.
   *
   * There is more than one now: `.env.local` holds build configuration, which
   * Next inlines into the Worker bundle, and `.claude/deploy.env` holds
   * credentials that must not be inlined anywhere. Asking each file for the
   * whole list reported both as broken the moment the split happened — each
   * was missing exactly the keys that belong in the other.
   */
  const merged = {};
  for (const relative of config.env.files ?? []) {
    const values = readEnvFile(join(REPO_ROOT, relative));
    if (!values) {
      record(section, relative, "FAIL", "not found");
      continue;
    }
    record(section, relative, "PRESENT", `${Object.keys(values).length} key(s), values never printed`);
    Object.assign(merged, values);
  }

  const missing = (config.env.requiredKeys ?? []).filter((key) => !merged[key]);
  record(
    section,
    "expected keys",
    missing.length === 0 ? "PASS" : "FAIL",
    missing.length === 0
      ? `all ${(config.env.requiredKeys ?? []).length} present across those files`
      : `missing: ${missing.join(", ")}`,
  );

  /* Optional: only `wrangler dev` reads it, and it holds no build-time value. */
  const devVars = join(REPO_ROOT, ".dev.vars");
  record(
    section,
    ".dev.vars",
    existsSync(devVars) ? "PRESENT" : "PASS",
    existsSync(devVars) ? "local Worker secrets, git-ignored" : "absent — not required for build or deploy",
  );
}

function checkSecretsNotTracked() {
  const section = "Secrets";
  const mustNotBeTracked = [".env.local", ".dev.vars", ".claude/local.json"];
  const tracked = [];
  for (const path of mustNotBeTracked) {
    try {
      if (git(["ls-files", "--error-unmatch", path], { quiet: true })) tracked.push(path);
    } catch {
      /* Not tracked, which is the desired state. */
    }
  }
  record(
    section,
    "credential files untracked",
    tracked.length === 0 ? "PASS" : "FAIL",
    tracked.length === 0 ? "none tracked by git" : `TRACKED: ${tracked.join(", ")}`,
  );

  /*
   * A token that has ever been committed is a token that must be rotated, so
   * this looks for the shapes themselves rather than trusting .gitignore to
   * have been right for the whole history of the file.
   */
  try {
    const hits = git(["grep", "-lIE", "-e", "gh[posu]_[A-Za-z0-9]{36}", "-e", "[A-Za-z0-9_-]{40}\\.[A-Za-z0-9_-]{20,}", "--", "."], { quiet: true });
    record(section, "no token-shaped strings tracked", hits ? "FAIL" : "PASS", hits ? hits.replace(/\n/g, ", ") : "clean");
  } catch {
    /* `git grep` exits non-zero when it finds nothing, which is the pass. */
    record(section, "no token-shaped strings tracked", "PASS", "clean");
  }
}

// ------------------------------------------------------------------ main ---

await checkGitHub();
await checkCloudflare();
checkWrangler();
checkEnvironment();
checkSecretsNotTracked();

const width = Math.max(...results.map((r) => r.name.length));
let current = "";
console.log("");
for (const { section, name, state, detail } of results) {
  if (section !== current) {
    console.log(`\n${section}`);
    current = section;
  }
  console.log(`  ${state.padEnd(7)} ${name.padEnd(width)}  ${detail}`);
}

const ok = (names) =>
  names.every((name) => {
    const row = results.find((r) => r.name === name);
    return row !== undefined && (row.state === "PASS" || row.state === "PRESENT");
  });
const verdict = (value) => (value ? "PASS" : "FAIL");

console.log(`\n${"-".repeat(52)}`);
console.log(failures === 0 ? "PROJECT SWITCH READY" : "PROJECT SWITCH BLOCKED");
console.log(
  `GitHub persistent auth:          ${verdict(ok(["origin remote", "persistent credential store", "stored credential", "write authentication"]))}`,
);
console.log(`Cloudflare non-interactive auth: ${verdict(ok(["token file", "token readable", "token active"]))}`);
console.log(`Wrangler correct account:        ${verdict(ok(["available", "correct account", "site Worker"]))}`);
console.log(`Local env detected:              ${verdict(ok([".env.local", ".claude/deploy.env", "expected keys"]))}`);
console.log(
  `Fresh-shell test:                ${coldShell ? verdict(ok(["token file", "correct account"])) : "SKIPPED — a token was already in this shell"}`,
);
console.log(
  `Secrets tracked:                 ${ok(["credential files untracked", "no token-shaped strings tracked"]) ? "NO" : "YES — FIX NOW"}`,
);
if (warnings > 0) console.log(`\n${warnings} warning(s) above.`);
console.log("");

process.exit(failures === 0 ? 0 : 1);
