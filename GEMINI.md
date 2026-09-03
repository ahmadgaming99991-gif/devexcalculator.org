# Project instructions

Read [`AGENTS.md`](AGENTS.md) if it is present. It is the single set of
instructions for every agent working here — but it is excluded locally through
`.git/info/exclude`, so a fresh clone will not have it. The credential guidance
below is committed for exactly that reason.

**GitHub and Cloudflare are already authenticated on the owner's machine, and
stay authenticated across project switches.** Before concluding otherwise:

```
npm run doctor
```

Exit 0 means you can build, deploy and push. It prints PASS / FAIL / PRESENT
and never prints a secret.

**Never run `wrangler login`, `gh auth login`, or `git config credential.*`.**
Wrangler here has no OAuth session by design; the credential is an API token in
a file outside the repository, loaded on demand by
`scripts/local/with-cf-auth.mjs`. A command that opens a browser means the
token was not loaded — completing that sign-in creates a second credential for
a different Cloudflare account, which deploys a duplicate Worker instead of
failing.

Full detail: [`docs/local-credentials.md`](docs/local-credentials.md).

Authentication being ready is not permission. Deploying and pushing still need
the owner's explicit go-ahead each time.
