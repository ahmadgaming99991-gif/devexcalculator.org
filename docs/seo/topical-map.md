# Topical map

A graph, not a list. Every indexable route has a parent, siblings and a
next step, and those relationships are declared in the content manifest — which
is what the breadcrumbs, the JSON-LD and the internal-link validator all read.

```
/  DevEx Calculator  ── pillar
│
├── /robux-to-usd/            Robux to USD  ── pillar
│   └── /conversions/         Amount hub
│       ├── /conversions/30000-robux-to-usd/
│       ├── /conversions/50000-robux-to-usd/
│       ├── /conversions/100000-robux-to-usd/
│       ├── /conversions/200000-robux-to-usd/
│       ├── /conversions/300000-robux-to-usd/
│       ├── /conversions/500000-robux-to-usd/
│       ├── /conversions/1000000-robux-to-usd/
│       └── /conversions/10000000-robux-to-usd/
│
├── /usd-to-robux/            Payout targets
│
├── /devex-rates/             DevEx Rates  ── pillar
│   └── /devex-rate-history/  Rate change history
│
├── /devex-requirements/      Eligibility and Process  ── pillar
├── /earned-robux/            What qualifies
├── /how-to-cash-out-robux/   The process
├── /devex-fees-and-taxes/    After the payout
│
├── /calculators/             Creator Finance Calculators  ── pillar
│   └── /robux-tax-calculator/
│
├── /guides/                  Guide directory
│
└── Trust cluster
    ├── /about/
    │   ├── /editorial-policy/
    │   ├── /corrections/
    │   ├── /changelog/
    │   └── /contact/
    ├── /methodology/
    ├── /sources/
    ├── /privacy/
    ├── /terms/
    ├── /disclaimer/
    └── /accessibility/
```

## Pillars and what they cover

### DevEx Calculator — `/`

The canonical owner of DevEx intent. Supporting topics live on the page itself
rather than as separate routes: the payout calculation, the rate comparison, the
minimum threshold, the Earned Robux distinction, the formula, popular amounts,
local currencies and the fees caveat.

Split and target modes are modes of the same tool, not separate URLs — they
answer variations of one question about one balance.

### Robux to USD — `/robux-to-usd/`

Owns the generic conversion question and, more importantly, owns resolving its
ambiguity: creator payout versus purchase price. That distinction is the page's
reason to exist and what keeps it from cannibalising the homepage.

`/conversions/` is its child: specific amounts are a narrower form of the same
question.

### DevEx Rates — `/devex-rates/`

Owns rate lookup across all three documented rates, with effective dates and
worked examples. `/devex-rate-history/` is its child — the same subject on a
time axis, which matters because one balance can span the September 2025 change.

### Eligibility and Process — `/devex-requirements/`

Owns the minimum and the requirements. `/earned-robux/` and
`/how-to-cash-out-robux/` sit alongside it: what qualifies, and what to do once
it does. `/devex-fees-and-taxes/` follows, covering what happens after.

These three carry little isolated search volume and are load-bearing anyway. A
creator who calculates a payout on a balance that is not Earned Robux has been
given a wrong answer confidently.

### Creator Finance Calculators — `/calculators/`

A directory of working tools only. `/robux-tax-calculator/` is its child — a
genuinely separate product, since the marketplace fee applies when Robux are
earned and DevEx applies when they are converted. Chaining them would
double-count the 30%.

### Trust cluster

Methodology, sources, editorial policy, corrections, changelog, privacy, terms,
disclaimer, accessibility, contact.

These link back into the product rather than forming an isolated legal silo:
`/methodology/` links to the calculator whose formulas it documents,
`/sources/` links to the rates its registry supports, `/corrections/` links to
the changelog where fixes are recorded.

## Reading order

`/guides/` publishes the sequence explicitly, because the order matters: a
creator who reads about rates before understanding Earned Robux will calculate a
payout on a balance that does not qualify.

1. `/earned-robux/` — which of my Robux count
2. `/devex-requirements/` — what I need before applying
3. `/devex-rates/` — what Roblox pays
4. `/devex-rate-history/` — why part of my balance differs
5. `/how-to-cash-out-robux/` — the process
6. `/devex-fees-and-taxes/` — what comes off

## Deliberate gaps

**No `/guides/[slug]/` articles.** The pillars already cover these topics.
Republishing under a second prefix would be cannibalisation.

**No page per currency.** Local currency is a selector on the calculator. Thirty
near-identical pages would add nothing a dropdown does not.

**No page per spelling.** Folded into the owning route.

**No country-specific tax pages.** They would need qualified review and ongoing
maintenance this project cannot commit to, so the fees page models the reader's
own figure instead of asserting one.
