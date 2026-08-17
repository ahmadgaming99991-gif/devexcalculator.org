# Route ownership

Generated from `seo/generated/keyword-route-map.json`. Regenerate with
`npm run seo:analyze`.

**One keyword has exactly one canonical owner.** A route may own many variants;
a variant may not have two owners. `scripts/seo/generate-seo-report.ts` fails
the build if that invariant breaks.

## Ownership table

| Route | Canonical keywords | Non-overlapping volume | Primary keyword |
|---|---:|---:|---|
| `/robux-to-usd/` | 87 | 29,660 | robux to usd |
| `/conversions/` | 180 | 24,450 | how much is 1000 robux |
| `/` | 52 | 22,980 | devex calculator |
| `/devex-rates/` | 38 | 3,600 | devex rates |
| `/usd-to-robux/` | 11 | 1,590 | usd to robux |
| `/robux-tax-calculator/` | 2 | 670 | roblox tax |
| `/how-to-cash-out-robux/` | 4 | 110 | how to convert robux to usd |
| `/devex-rate-history/` | 1 | 0 | roblox devex rates 2023 |

Volume figures are third-party estimates from the supplied exports, counted once
per normalised keyword. They are not a traffic forecast.

## What each route owns, and why

### `/` — DevEx calculator

Owns every DevEx spelling variant: `devex calculator`, `roblox devex
calculator`, `devex calc`, `dev ex calculator`, `dev x calculator`, `devx
calculator`, `devex converter`, `devex to usd`, `developer exchange roblox
calculator`.

These are one search task written six ways. A page per spelling would be six
near-identical pages competing with each other. The classifier folds spelling
variants before routing, so all of them land here by construction — and a test
asserts that the set of routes for those variants has size one.

### `/robux-to-usd/` — generic conversion

Owns `robux to usd` (the largest single term in the data at 16,470), `robux
calculator`, `robux converter`, `robux to money converter`, `roblox to usd`, and
the misspellings `robus`, `rubux`, `robix`, `robucks`, `robux to $`.

**Why this is separate from the homepage.** The homepage owns *DevEx* intent —
someone who already knows what DevEx is. This route owns someone who just wants
to know what Robux are worth and may mean either direction. The page leads with
that ambiguity and resolves it, which is a different job from calculating a
payout. The two share no primary keyword and the cannibalisation validator
confirms their keyword sets do not overlap past the 60% threshold.

### `/conversions/` — numeric amounts

Owns all 180 amount queries. This is the largest keyword group in the data and
the biggest trap in the project: publishing a page per amount would be textbook
scaled content abuse.

Every amount routes here. Eight amounts additionally have their own page, each
approved manually after clearing automated gates. Every other amount is served
by the hub's server-rendered table and by calculator query state — the fallback
route recorded on each keyword record.

### `/usd-to-robux/` — reverse direction

Owns `usd to robux`, `money to robux`, `dollars to robux calculator`.

Kept apart from `/robux-to-usd/` because reversing the direction reverses the
task: one asks what a balance is worth, the other asks what it takes to reach a
figure. A test asserts the two directions never resolve to the same route.

### `/devex-rates/` — rate lookup

Owns `devex rates`, `devex rate`, `roblox devex rate`, `devex exchange rate`,
`robux conversion rate`, `devex prices`.

### `/devex-rate-history/` — dated rate queries

Owns only `roblox devex rates 2023`. **This route is not justified by keyword
volume**, and pretending otherwise would be dishonest. It exists because the
September 2025 rate change means a single balance can span two rates, and a
creator holding a legacy balance needs somewhere that explains it. It is a
topical child of `/devex-rates/`.

The year rule that routes it here required a fix: a four-digit number is only a
year when it is not the amount being asked about, or `how much is 2000 robux in
dollars` gets read as a query about the year 2000 (decision recorded in the
classifier).

### `/robux-tax-calculator/` — marketplace fee

Owns `roblox tax` and `tax roblox`. Deliberately **not** `rbx tax` or `rbxtax`,
which are competitor brand navigation and are excluded.

The brand check runs on the literal query before spelling folding, because
folding `rbx` to `robux` turned the competitor brand into an ordinary product
query and routed it here (decision D-010).

### `/how-to-cash-out-robux/` — process

Owns `how to convert robux to usd`, `cash out robux`, `sell robux to usd`, `turn
robux into money` — phrased as process questions rather than arithmetic.

Assigned by manual override in `seo/overrides/route-overrides.json`, each with a
recorded reason. The spelling folder was also adjusted so "cash out" is not
folded into "money", which had been turning a cash-out query into a conversion
query.

## Routes with no keyword ownership

`/calculators/`, `/guides/`, `/earned-robux/`, `/devex-requirements/`,
`/devex-fees-and-taxes/`, the eight amount pages, and every trust and legal
page.

These exist for product, topical or trust reasons, not because a keyword
demanded them. `/devex-requirements/` in particular carries the eligibility
content the whole site depends on, and `/earned-robux/` carries the distinction
that decides whether a payout is possible at all. Neither shows much isolated
search volume; both are load-bearing.

The reverse case is the one to guard against — a route existing *only* because a
keyword variant exists — and the publish queue blocks it.

## Excluded

| Keyword | Reason |
|---|---|
| `rbx tax`, `rbxtax` | Competitor brand navigation |
| `visits to robux calculator` | A different tool this site does not build |
| `robux to` | Truncated, no resolvable task |
| `roblox幣值` | Needs native localisation, not a machine translation |

Five rows of 444. Everything else is `included` (376) or `duplicate-variant`
(63). Zero rows are left ambiguous.
