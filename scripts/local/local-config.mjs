/**
 * Where this machine keeps the credentials, and nothing about what they are.
 *
 * The repository must never carry a token. It can safely carry the *shape* of
 * the setup — which account owns the Worker, which GitHub account owns the
 * repository, which file on disk holds the Cloudflare token — because none of
 * that is secret and all of it is already public in `docs/`. What stays out of
 * git is the one thing that matters: the token value, and any path that only
 * makes sense on one person's computer.
 *
 * So there are two layers. The defaults below are committed and describe the
 * project. `.claude/local.json` is git-ignored, describes this machine, and
 * wins where the two disagree. A fresh clone works with no local file at all
 * as long as the token turns up in one of the search paths or in the
 * environment; the local file exists to make that explicit rather than lucky.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const REPO_ROOT = resolve(import.meta.dirname, "..", "..");
const LOCAL_FILE = join(REPO_ROOT, ".claude", "local.json");

/**
 * Project facts. Public — every value here is already in the repository or in
 * a DNS record, and none of it authenticates anything on its own.
 */
const DEFAULTS = {
  cloudflare: {
    accountId: "262ead2fbb850b9e7dcca04b21ed0fec",
    accountName: "Ahmadgaming99991@gmail.com's Account",
    siteWorker: "devexcalculator-org",
    zone: "devexcalculator.org",
    dataWorkerHealth: "https://api.devexcalculator.org/health",
    /*
     * Searched in order when `.claude/local.json` names no file and
     * CLOUDFLARE_API_TOKEN is not already set. `~` is this user's home.
     */
    tokenFileCandidates: ["~/devex-cf-token.txt", "~/.cloudflare/devex-token.txt"],
  },
  github: {
    owner: "ahmadgaming99991-gif",
    repo: "devexcalculator.org",
    /*
     * The remote URL embeds this username, which is the whole reason pushes
     * keep working: Git asks the credential manager for a credential scoped to
     * *this* account rather than whichever GitHub account happens to be the
     * active one in `gh`. See docs/local-credentials.md.
     */
    credentialUser: "ahmadgaming99991-gif",
  },
  env: {
    /** Loaded into the child environment by the deploy wrapper when present. */
    files: [".env.local"],
    /**
     * Keys whose absence changes what production ships rather than failing
     * loudly — GA4 stops measuring, three verification tags stop being
     * emitted. Every one of them is optional to the *build*, which is exactly
     * why a deploy has to check them: nothing else will.
     */
    requiredKeys: [
      "NEXT_PUBLIC_GA4_ID",
      "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION",
      "NEXT_PUBLIC_BING_SITE_VERIFICATION",
      "NEXT_PUBLIC_YANDEX_SITE_VERIFICATION",
    ],
  },
};

function expandHome(path) {
  return path.startsWith("~") ? join(homedir(), path.slice(1)) : path;
}

/** Shallow-merges one level deep, which is as deep as this config goes. */
function merge(base, over) {
  const out = { ...base };
  for (const [key, value] of Object.entries(over ?? {})) {
    out[key] =
      value && typeof value === "object" && !Array.isArray(value)
        ? { ...(base[key] ?? {}), ...value }
        : value;
  }
  return out;
}

export function localConfig() {
  let local = {};
  let localFilePresent = false;
  if (existsSync(LOCAL_FILE)) {
    localFilePresent = true;
    try {
      local = JSON.parse(readFileSync(LOCAL_FILE, "utf8"));
    } catch (error) {
      throw new Error(
        `.claude/local.json is not valid JSON (${error instanceof Error ? error.message : "unknown"})`,
      );
    }
  }
  return { ...merge(DEFAULTS, local), localFilePresent, localFilePath: LOCAL_FILE };
}

/**
 * Finds the file holding the Cloudflare API token. Returns the path only —
 * reading it is a separate, deliberate step.
 */
export function findTokenFile(config = localConfig()) {
  const named = process.env.CLOUDFLARE_API_TOKEN_FILE ?? config.cloudflare.tokenFile;
  const candidates = named
    ? [named]
    : (config.cloudflare.tokenFileCandidates ?? []);

  for (const candidate of candidates) {
    const path = expandHome(candidate);
    if (existsSync(path) && statSync(path).isFile()) return path;
  }
  return null;
}

/**
 * The token itself.
 *
 * Returned, never logged. Every caller in this repository puts it into a child
 * process environment and nowhere else. `CLOUDFLARE_API_TOKEN` already in the
 * environment wins, so CI or a shell that has been bootstrapped already is not
 * second-guessed.
 */
export function resolveCloudflareToken(config = localConfig()) {
  const fromEnv = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (fromEnv) return { token: fromEnv, source: "environment", file: null };

  const file = findTokenFile(config);
  if (!file) return { token: null, source: "none", file: null };

  const token = readFileSync(file, "utf8").trim();
  if (!token) return { token: null, source: "empty-file", file };
  return { token, source: "file", file };
}

/** Parses a dotenv file into a plain object. Values are never logged. */
export function readEnvFile(path) {
  if (!existsSync(path)) return null;
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match || line.trimStart().startsWith("#")) continue;
    out[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

/*
 * A tiny CLI so the PowerShell bootstrap does not have to build a file:// URL
 * to import this module. One Windows path escaped into a JavaScript string
 * inside a PowerShell here-string was two escaping layers too many, and it
 * broke on the first backslash.
 *
 *   node scripts/local/local-config.mjs --print-token-file
 *   node scripts/local/local-config.mjs --print-account-id
 *
 * Prints the token file's PATH. Never its contents.
 */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes("--print-token-file")) {
    const file = findTokenFile();
    if (file) process.stdout.write(file);
  } else if (process.argv.includes("--print-account-id")) {
    process.stdout.write(localConfig().cloudflare.accountId);
  }
}
