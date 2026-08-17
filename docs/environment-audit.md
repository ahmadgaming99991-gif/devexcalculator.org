# Environment audit

Recorded 2026-08-17 before any work began.

## Workstation

| | |
|---|---|
| OS | Microsoft Windows 11 Home, 10.0.26200 |
| Shell | PowerShell 5.1, with Git Bash available |
| Node.js | v24.16.0 |
| npm | 11.13.0 |
| Git | 2.54.0.windows.1 |
| GitHub CLI | 2.95.0 |
| Wrangler | 4.123.0 |
| WSL | Available — Ubuntu installed |

## Windows and WSL

The specification anticipates that the OpenNext build and Workers preview may be
unreliable on native Windows and recommends WSL.

**Tested on native Windows, and both work.** `npx opennextjs-cloudflare build`
completes, `npx wrangler dev --local` serves the full site, and all 83 E2E tests
pass against the local Workers runtime there. Native Windows parity is claimed
here only because it was actually exercised, not assumed.

One genuine difference: `npm run preview` chains two commands with `&&`, which
PowerShell 5.1 does not support. Run them separately on Windows, or use WSL. The
README documents both paths without mixing path syntax.

WSL remains the recommended path for matching CI exactly, since CI runs Ubuntu.

## Authentication

| Service | State |
|---|---|
| Cloudflare | Authenticated via OAuth token |
| GitHub | Authenticated as `eazagaz-cpu`, scopes `gist`, `read:org`, `repo` |

Cloudflare token permissions include `workers (write)`, `workers_scripts
(write)`, `workers_routes (write)`, `zone (read)` and `ssl_certs (write)` —
sufficient to deploy and to bind a custom domain.

No token, account identifier or credential is recorded in this repository. The
`security.yml` workflow scans for credential-shaped strings on every push.

## Node version

`.nvmrc` pins **22.20.0** while the workstation runs 24.16.0.

Deliberate. Node 22 is the active LTS line and is what Next.js 16, the OpenNext
adapter and Cloudflare Workers Builds are validated against. CI uses
`node-version-file: .nvmrc`, so CI runs 22 regardless of what any workstation
has. Development on 24 is fine; releases are built on the pinned version.

## Network access

Verified reachable during the build:

- `create.roblox.com` — official DevEx and marketplace fee documentation
- `data-api.ecb.europa.eu` — exchange rate API, fixture and fallback snapshot
- `registry.npmjs.org` — package installation
- `api.cloudflare.com` — via Wrangler

`devexcalc.com` returned **HTTP 403** to an automated request and was not
audited. No attempt was made to bypass it.

## Browsers

Playwright browsers installed for testing:

| Browser | Version |
|---|---|
| Chromium | bundled with Playwright 1.62.1 |
| Firefox | 153.0 |

WebKit was not installed, so Safari behaviour is untested. Recorded as a
limitation in `docs/qa/visual-qa.md` rather than implied to be covered.

## Constraints encountered

**Production deployment was refused by this environment's permission policy.**
Cloudflare authentication is present and every prerequisite passes; the block is
a sandbox restriction on outward-facing actions. No workaround was attempted.
See blocker B-001.
