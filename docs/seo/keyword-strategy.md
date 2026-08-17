# Keyword strategy

Derived from the two supplied exports. Regenerate every figure here with
`npm run seo:analyze`. All metrics are third-party estimates, not measured
traffic.

## Dataset

| File | Rows | Volume | Organic traffic | Checkpoint |
|---|---:|---:|---:|---|
| `rbxtax.com-devex.html-organic-keywords-path_2026-08-17_14-15-54.csv` | 82 | 14,270 | 1,564 | matches |
| `romonitorstats.com-devex-calculator-organic_2026-08-17_14-15-10.csv` | 362 | 81,220 | 13,534 | matches |
| **Total** | **444** | **95,490** | **15,098** | |

Both files reconcile exactly against the checkpoints in the specification,
recomputed from the files rather than asserted.

## Every row accounted for

| Status | Rows |
|---|---:|
| Included | 376 |
| Duplicate variant | 63 |
| Excluded | 5 |
| Ambiguous, needs review | 0 |
| **Total** | **444** |

Unique normalised keywords: 196 canonical owners across 8 routes.

Zero rows sit unresolved. The first pipeline run left 10 ambiguous; each turned
out to be a classifier gap rather than a genuinely undecidable query —
misspellings (`robus to usd`, `rubux to usd`), a bare dollar sign (`robux to $`)
and tool queries with no named currency (`roblox calculator`, `robux exchange`).
Fixing the rules was the right response; leaving them in a review bucket would
have been a filing cabinet, not a decision.

## Clusters

| Cluster | Keywords | Volume | Traffic evidence | Route | Priority |
|---|---:|---:|---:|---|---|
| Robux to USD | 88 | 29,680 | 6,416 | `/robux-to-usd/` | P0 |
| Specific amount conversions | 172 | 23,900 | 1,786 | `/conversions/` | P1 |
| DevEx calculator | 45 | 16,850 | 4,157 | `/` | P0 |
| What DevEx is | 7 | 6,130 | 129 | `/` | P2 |
| DevEx rates | 38 | 3,600 | 921 | `/devex-rates/` | P0 |
| USD to Robux and payout goals | 11 | 1,590 | 109 | `/usd-to-robux/` | P1 |
| Roblox marketplace fee | 2 | 670 | 10 | `/robux-tax-calculator/` | P1 |
| Local-currency conversions | 8 | 550 | 0 | `/conversions/` | P2 |
| Cashing out Robux | 4 | 110 | 10 | `/how-to-cash-out-robux/` | P1 |
| DevEx rate history | 1 | 0 | 0 | `/devex-rate-history/` | P2 |

Volume counts each normalised keyword once. The raw sum over all rows is larger
because variants overlap; it is recorded in the generated JSON with a warning
attached, and neither figure is a traffic forecast.

## Priority bands

| Band | Keywords |
|---|---:|
| P0 | 171 |
| P1 | 84 |
| P2 | 115 |
| P3 | 69 |
| Excluded | 5 |

## What the data actually says

**Three findings shaped the architecture.**

**1. Numeric amounts are the largest group and the biggest trap.** 172 keywords
at 23,900 combined volume, spread across dozens of specific numbers. The obvious
move is a page per amount. That is scaled content abuse, and it is what the
publish gate exists to prevent: every amount routes to the hub, eight earn a
page, and the rest are served by the hub table and calculator query state.

**2. Spelling variants are demand, not separate pages.** `devex`, `dev ex`,
`dev x`, `devx`, `devexchange`, `developer exchange` all appear, plus Robux
misspellings across five forms. Folding them before classification means the
homepage owns the whole family by construction rather than by hand-maintained
redirects.

**3. Two intents hide behind "robux to usd".** At 16,470 it is the single
largest term, and it is genuinely ambiguous — a creator asking what a payout is
worth and a player asking what a purchase costs type the same words. The
competitors either pick one silently or blend them. `/robux-to-usd/` leads with
the distinction, which is the honest answer and also the differentiated one.

**A finding that argued against a route.** `/devex-rate-history/` owns one
keyword at zero volume. It ships anyway, because the September 2025 change means
a real balance can span two rates and a creator holding legacy Robux needs
somewhere that explains it. This is recorded as a product decision rather than
dressed up as a keyword opportunity.

## Where the opportunity is

From the competitor audit: ToolBLX publishes the pre-2025 rate and a 100,000
minimum; RBXTax states two different minimums on one page; RoMonitor serves
nothing without JavaScript. Those three hold visible positions for terms in
this dataset.

The strategy is not to out-publish them. It is to be correct, dated, sourced,
and readable without JavaScript — and to cover the three rates and the reverse
direction that none of them model.

## Excluded, with reasons

| Keyword | Reason |
|---|---|
| `rbx tax`, `rbxtax` | Competitor brand navigation |
| `visits to robux calculator` | A different tool this site does not build |
| `robux to` | Truncated, no resolvable task |
| `roblox幣值` | Needs native localisation, not a machine translation |

Nothing is excluded for being low volume. Low-volume terms with a real task are
served; off-topic terms are not, however much volume they carry.

## Questions

127 mapped in `seo/generated/paa-map.json`, 55 answered directly in a published
FAQ block. Each maps to exactly one canonical route and section. The remainder
are question-form queries from the exports, mapped to the route that owns them
and answered by that page's content rather than by a bolted-on FAQ.

## Entities

14 mapped in `seo/generated/entity-map.json`, each with aliases, the routes that
reference it, its source ids and its relationship to the programme. The three
rate entities — standard, legacy and conditional U.S. 18+ — carry their values
and effective dates so terminology stays consistent across every page.

## Maintenance

Rerun `npm run seo:analyze` when an export is replaced. The generated directory
is committed and CI fails if it drifts from what the pipeline produces, so a
change to the rules or the overrides cannot land without the outputs being
regenerated alongside.
