# Progress ledger

Chronological record of the build, 2026-08-17.

## Phase 0 — Repository, environment and safety audit

Detected an empty directory holding only the specification and two CSV exports.
No `.git`, no `package.json`, nothing to preserve or migrate.

Recorded the environment: Windows 11, Node 24.16.0, npm 11.13.0, Git 2.54,
`gh` 2.95 authenticated, Wrangler 4.123 authenticated, WSL available. Hashed both
CSVs before touching them.

**Outcome:** scaffolding, not migrating. Git initialised on `main`.

## Phase 1 — Official research and competitor audit

Verified every checkpoint fact against the Roblox Creator Hub rather than
accepting the specification's values: standard 0.0038 (114 USD per 30,000),
legacy 0.0035, conditional U.S. 18+ 0.0054, minimum 30,000, and the full
eligibility list. All matched.

Verified marketplace commissions and the ECB API contract, then audited all six
supplied competitors.

**Findings that shaped the build:** ToolBLX publishes the pre-2025 rate and a
100,000 minimum — its worked examples understate a 1,000,000 Robux payout by 300
USD. RBXTax states two different minimums on one page. RoMonitor serves only a
title without JavaScript. RBXCalc is accurate, dated and sourced, and is the
real benchmark. DevExCalc returned 403 and was not audited.

## Phase 2 — CSV intelligence and route ownership

Built the pipeline: RFC 4180 parser, normalisation, spelling families, amount
extraction, rule-based intent classification, dual scoring, clustering, route
assignment and publish gating.

Both checkpoints reconciled exactly — 82 rows / 14,270 / 1,564 and 362 rows /
81,220 / 13,534.

**Auditing the first run found four defects**, each fixed rather than accepted:

- Duplicate rows resolved by file order, so `robux to usd` at 16,470 volume lost
  to a 30-volume duplicate and appeared to belong to no route.
- Spelling variants were not folded before classification, leaving ten
  misspellings in a review bucket.
- A four-digit amount was read as a year, routing `how much is 2000 robux in
  dollars` to the rate history page.
- Brand detection ran after folding, turning `rbx tax` into `robux tax`.

**Outcome:** 444 of 444 rows accounted for, 0 ambiguous, 196 canonical owners,
0 conflicts.

## Phase 3 — Architecture and Cloudflare foundation

Pinned exact versions after checking the registry — four of the assumed versions
did not exist or were stale. Chose TypeScript 5.9.3 over the newer 7.0.2 and
recorded why.

Wrote the rate and source registries with build-time validation, and the
`Rational` arithmetic layer.

**Wrote the engine tests before the UI.** 164 tests passing before a single
component existed, which is what made every later UI change safe.

## Phase 4 — Design system

Measured every colour pair before use. The specification's candidate focus amber
measures 2.15:1 against white, below the 3:1 WCAG 2.2 requires, so it was
darkened to 4.96:1. The accent cyan was darkened for the same reason.

Built the dark palette by measurement rather than inversion.

## Phase 5 — Calculation engine and calculator

Quick, split and target modes; presets; threshold meter; comparison; copy,
share and reset; URL state; local history.

## Phase 6 — FX, APIs and security

ECB provider with correct cross-rate derivation, timeout, stale detection and a
bundled fallback snapshot. Health, rates, FX and contact endpoints. Turnstile
verification failing closed, rate limiting, honeypot, origin checks.

**Removed BGN** on discovering the ECB stopped publishing it after 2025-12-31,
and made the parser reject any discontinued series generally.

## Phase 7 — Content

32 routes written around the working tools. Every rate-sensitive page carries a
source and a verification date.

## Phase 8 — Technical SEO

Metadata, canonicals, JSON-LD, breadcrumbs, robots, sitemap, `llms.txt`, and the
five validators.

**The validators immediately found real problems**: 20 meta descriptions over
160 characters, a rate-sensitive page with no sources, an orphan, eight amount
pages sharing identical anchor text, and a drift between the pipeline's approved
amount set and the published one. All fixed.

## Phase 9 — QA

**This phase found the most serious bug in the project.** axe reported white text
on a white background at 1.06:1 — every `[--color-*]` utility was emitting
invalid CSS, because Tailwind v4 replaced that shorthand with `(--color-*)`.
608 utilities across 43 files had been silently doing nothing.

Also found: a 227px horizontal overflow at 320px from grid items refusing to
shrink; the back button skipping past mode changes; and no header navigation at
all on a phone with JavaScript disabled.

Testing against the Workers runtime found two more that passed under
`next start`: unsupported Node-runtime proxy, and `NoFallbackError` on every
prerendered amount page.

**Reviewing screenshots found one an assertion could not**: the rate comparison
table clipped a money value mid-digit at 1024px. Moved full-width.

**Outcome:** 363 unit, 248 E2E across three browsers, 83 against the Workers
runtime, 134 screenshots, Lighthouse 100/100/100/100 desktop.

## Phase 10 — Delivery

CI, Lighthouse, security and Dependabot workflows committed. Documentation
written.

**Blocked at deployment.** `wrangler deploy` was refused by this environment's
permission policy — a sandbox restriction on outward-facing actions, not a
technical failure. No GitHub remote exists because the specification forbids
inventing an owner.

Both blockers are documented with exact commands in `docs/blockers.md`.

## Defects found and fixed

Thirteen, listed in `CHANGELOG.md`. The pattern worth noting: **most were found
by a layer of testing that did not exist yet when the code was written.** Unit
tests caught arithmetic; the pipeline audit caught data loss; validators caught
SEO problems; axe caught the CSS; the Workers runtime caught adapter
incompatibilities; and looking at screenshots caught a clipped money value that
every assertion had passed.
