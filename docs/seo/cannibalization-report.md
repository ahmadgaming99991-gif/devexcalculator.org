# Cannibalisation report

Generated into `seo/generated/cannibalization-map.json`.
**0 errors, 0 warnings** at the current state.

## What is checked

`src/lib/seo/publish.ts` fails the build on any of:

| Check | Meaning |
|---|---|
| `multiple-canonical-owners` | One keyword claimed as canonical by more than one route |
| `duplicate-title` | Two indexable routes with the same title |
| `duplicate-description` | Two indexable routes with the same meta description |
| `duplicate-h1` | Two indexable routes with the same H1 |
| `identical-keyword-sets` | Two routes sharing ≥60% of the smaller keyword set |
| `amount-page-not-approved` | A published amount page outside the approved set, **or** an approved amount with no page |
| `query-state-self-canonical` | A route whose canonical carries a query string |

## The three real risks, and how each is handled

### 1. Homepage versus `/robux-to-usd/`

Both are conversion calculators. The obvious failure mode is two pages competing
for the same query.

They are kept apart by task, not by wording. The homepage owns *DevEx* intent —
a creator who knows what DevEx is and wants a payout figure. `/robux-to-usd/`
owns the ambiguous generic question and exists to resolve it: creator payout
versus purchase price, side by side.

Measured: their keyword sets share nothing above the 60% threshold. Titles,
descriptions and H1s are distinct. The homepage owns `devex calculator` and its
spelling family; `/robux-to-usd/` owns `robux to usd` and the generic converter
family.

### 2. The eight amount pages

They share a template, which is exactly the near-duplicate pattern this check
exists to catch.

Each carries an original context paragraph specific to that amount — 30,000 is
the minimum itself, 100,000 is where the gap between current and legacy rates
becomes noticeable, 500,000 is where fees and tax stop being rounding errors.
Each has its own computed figures, its own reverse-target table, and contextual
anchors carrying the amount.

Titles and descriptions include the amount, so they cannot collide. The eight
were chosen from 63 candidates specifically to avoid adjacency — which is why
40,000 was held back manually despite clearing the automated gates.

### 3. `/conversions/` versus the amount pages

The hub covers every amount; the pages cover eight. The hub's job is comparison
across amounts and an input for anything not listed; an amount page's job is
depth on one. The hub links to all eight; each page links back and to two
neighbours.

## Query states

180 amount keywords route to `/conversions/`. Their fallback is calculator query
state — `/robux-to-usd/?robux=100000` — which renders the answer, is shareable,
and canonicalises to the clean route.

This is the mechanism that serves the largest keyword group without generating
pages for it. A check fails the build if any route's canonical ever carries a
query string.

## The check that caught a real drift

`amount-page-not-approved` runs in both directions. The pipeline approved nine
amounts while eight pages were published — 40,000 had cleared the automated
gates but was not in the curated set. Rather than silently accepting the
mismatch, the check now fails on it, forcing an explicit decision either way.
The decision was to hold 40,000 at review, recorded with a reason in
`seo/overrides/publication-overrides.json`.

Without that bidirectional check the two lists would have drifted apart quietly.

## Spelling variants

`devex calculator`, `dev ex calculator`, `dev x calculator`, `devx calculator`,
`devex calc`, `roblox devex calculator` are one search task. Spelling folding
happens before routing, so they resolve to the homepage by construction, and a
test asserts the set of routes for those variants has size one.

The same applies to Robux misspellings (`robus`, `rubux`, `robix`, `robucks`)
and tool-word variants (`calculater`, `convertor`).

## Guides

No `/guides/[slug]/` articles are published. The six explanatory pages are
pillars in their own right, and republishing them under a second prefix would
create the exact overlap this report exists to prevent. `/guides/` ships as a
directory with original framing — a reading order and what each guide assumes —
rather than as duplicate prose.
