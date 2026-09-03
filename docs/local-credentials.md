# Local credentials on the owner's machine

**The short version, for an agent in a hurry.** GitHub and Cloudflare are
already authenticated on this computer and stay authenticated across project
switches. Use what is there. Run `npm run doctor` before concluding anything is
broken, and never run `wrangler login`, `gh auth login`, or `git config
credential.*` to "fix" a command that asked for a browser.

---

## Why this file exists

The credentials here are fine. What kept going wrong was the recovery.

Wrangler on this machine has **no OAuth session at all** — `~/.wrangler/config`
does not exist. That is deliberate. Wrangler's other credential is
`CLOUDFLARE_API_TOKEN`, and when it is absent wrangler does not say "no token";
it opens a browser and waits for a Google sign-in. A session that meets that
prompt and completes it produces a *second* credential, often for a different
Google account — and the account that signs in most easily here
(`ahmadseo8688@gmail.com`, account `5492212f…`) is **not** the account that owns
the Worker (`262ead2f…`). Deploying from the wrong account does not fail
loudly. It creates a duplicate Worker in the wrong place.

So the rule is not "be careful with credentials". It is: **a browser prompt is
a symptom, never a fix**. Find out why the existing credential was not loaded.

## What exists, and where

| | |
|---|---|
| **GitHub** | Git Credential Manager (`credential.helper=manager`), Windows credential store |
| Which account | `ahmadgaming99991-gif` — and the remote URL embeds it: `https://ahmadgaming99991-gif@github.com/...` |
| **Cloudflare** | An API token in a file **outside the repository** |
| Which account | `262ead2fbb850b9e7dcca04b21ed0fec`, "Ahmadgaming99991@gmail.com's Account" |
| **Local env** | `.env.local` — git-ignored, four `NEXT_PUBLIC_*` values |
| **Where the paths are written down** | `.claude/local.json` — git-ignored, **paths only, never values** |

The token file's path is not in this document on purpose. It is in
`.claude/local.json`, which git never sees, and `npm run doctor` prints it.

### The username in the remote URL is load-bearing

`gh` is signed in to two GitHub accounts on this machine and the **active** one
is usually not the one that owns this repository. That does not affect `git
push`, because the remote URL names `ahmadgaming99991-gif`, so Git asks the
credential manager for a credential scoped to *that* account and gets the right
one. It does affect `gh`. Anything using `gh` here must pass `--repo
ahmadgaming99991-gif/devexcalculator.org` explicitly. `npm run doctor` warns
when the active account differs.

Do not "tidy" the username out of the remote URL. It is what makes the push
work without asking anyone anything.

## How commands get the token

Nothing exports the token into a shell profile, and nothing writes it into the
repository. Two entry points load it on demand:

**npm scripts** go through `scripts/local/with-cf-auth.mjs`, which reads the
token file, puts the value in the child process environment, and pins
`CLOUDFLARE_ACCOUNT_ID` so wrangler cannot resolve to a different account.
`deploy`, `upload`, `preview`, `purge:cache` and `cf-typegen` are already
wrapped — run them normally:

```
npm run deploy
```

**An interactive PowerShell terminal**, when you want to run wrangler by hand,
dot-sources the bootstrap once:

```powershell
. .\scripts\local\cf-env.ps1
npx wrangler deployments list
```

Both read the same file through `scripts/local/local-config.mjs`, so there is
one place that knows where the token lives.

## The environment check on deploy

Every variable in `.env.local` is optional to the *build*. That is the problem:
if the file goes missing, nothing fails — the site just quietly ships without
GA4 and without three search-engine verification tags, and the first sign is a
verification that has silently lapsed weeks later.

So `npm run deploy` and `npm run upload` pass `--require-env` and refuse to run
when a key listed in `env.requiredKeys` is missing or empty. `npm run preview`
warns instead of blocking, because a preview that renders without GA4 is not a
problem.

To change what counts as required, edit `env.requiredKeys` in
`.claude/local.json`.

## `npm run doctor`

Verifies, without writing anything and without printing any secret:

- the `origin` remote points at the right repository
- a persistent credential store is configured and holds a credential for the
  repo-owning account
- that credential still has **push** permission (asked of the GitHub API; the
  repository is public, so `git ls-remote` would prove nothing)
- `.env.local` exists and every expected key is set
- wrangler is available, and no competing OAuth session has appeared
- the Cloudflare token file is present, and the token is active
- the token reaches the **correct account**, by id *and* name
- the site Worker and the data Worker are both reachable
- no credential file and no token-shaped string is tracked by git

Exit code 0 means ready. It prints `PROJECT SWITCH READY` and a summary block.

## When something genuinely fails

| Symptom | What it means | What to do |
|---|---|---|
| `doctor`: token file FAIL | The file moved or the machine changed | Point `.claude/local.json` at it. Do **not** run `wrangler login`. |
| `doctor`: token active FAIL | The token was revoked or expired | The owner issues a new one in the Cloudflare dashboard and replaces the **file contents**. The path stays the same and nothing in the repo changes. |
| `doctor`: correct account FAIL | The token belongs to a different account | Stop. Deploying anyway creates a duplicate Worker. Ask the owner. |
| `wrangler` error `code: 10000` | Usually the wrong account, not an expired session | Compare the account id in the failing URL against `npx wrangler whoami`. |
| `wrangler` error `code: 10007` | The Worker does not exist *on the account you are using* | Confirms a wrong-account credential. |
| A browser opens | The token was not loaded | Cancel it. Run `npm run doctor`. |

## Rules

1. Never commit a token, a key, or a password. `.env.local`, `.dev.vars` and
   `.claude/local.json` are git-ignored and `doctor` asserts it every run.
2. Never print a credential value — not into a log, a commit message, a
   comment, or a terminal. Paths and PASS/FAIL only.
3. Never rotate or replace a working credential to get past an error.
4. Deploying and pushing still need the owner's explicit go-ahead each time.
   Authentication being ready is not permission.
