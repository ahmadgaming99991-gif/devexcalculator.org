# Competitor audit

Audited 2026-08-17 by fetching each public page. Every observation below is
labelled **Observed on public competitor page** unless stated otherwise, and
every factual claim about DevEx itself was independently checked against the
Roblox Creator Hub rather than taken from a competitor.

No competitor code, CSS, copy, imagery or metadata was copied. This audit
records information architecture, product behaviour and accuracy only.

## Summary of the opportunity

The single clearest finding: **two of the six supplied competitors publish
figures that current official Roblox documentation contradicts**, and a third
contradicts itself on the same page. A creator planning around those numbers
would be wrong by a wide margin — ToolBLX's worked examples understate a
1,000,000 Robux payout by 300 US dollars.

Only one competitor (RBXCalc) shows a verification date and a link to the
official source. That is the bar to clear, and the gap to everyone else is
large.

## Per-competitor findings

### ToolBLX — `https://toolblx.com/tools/devex-calculator`

| Field | Observation |
|---|---|
| Access | Public, fetched successfully |
| Inputs | Robux amount, preset or custom rate |
| Outputs | Estimated USD |
| Rate stated | 100,000 Robux → 350 USD, and a 300 USD preset |
| Minimum stated | "at least 100,000 Robux in your eligible DevEx balance" |
| Sources | None |
| Last verified | None; "© 2025 ToolBLX Tools" |
| Earned vs purchased | Not distinguished |
| Content | How DevEx works, formula, use cases, requirements, tips, FAQ |

**Accuracy problems.** The 350-per-100,000 figure is the pre-September-2025
rate of 0.0035. Current documentation states 0.0038, which is 380 per 100,000.
Its worked example table is therefore wrong throughout — it states 1,000,000
Robux = 3,500 USD where the current answer is 3,800 USD.

The stated 100,000 Robux minimum does not match the documented 30,000. A
creator with 50,000 Earned Robux reading this page would conclude, incorrectly,
that they cannot cash out.

### RBXTax — `https://rbxtax.com/devex.html`

| Field | Observation |
|---|---|
| Access | Public, fetched successfully |
| Inputs | An "Amount in USD" field |
| Outputs | Not determinable from the served markup |
| Rate stated | None |
| Minimum stated | "a minimum of 10,000 earned Robux" *and* "30,000 Robux or more" |
| Sources | Links to the official DevEx Terms |
| Last verified | None; "© 2024" |
| Earned vs purchased | Not explained |
| Content | Programme overview, five eligibility requirements, disclaimer |

**Accuracy problems.** The page states two different minimums. The 10,000
figure is not supported by current documentation. This confirms the
specification's checkpoint note about internally inconsistent minimums —
verified rather than assumed.

### DevExConverter — `https://www.devexconverter.com/`

| Field | Observation |
|---|---|
| Access | Public, fetched successfully |
| Inputs | Robux amount; reverse currency input |
| Outputs | USD, EUR, GBP, CAD, AUD, JPY |
| Rate stated | 1,000 Robux = 3.80 USD |
| Minimum stated | None |
| Sources | None |
| Last verified | None |
| Earned vs purchased | Not distinguished |
| Content | Creator attribution only |

The rate is correct at the time of audit. Multi-currency support is a genuine
strength and validates building the same. But with no source, no date and no
Earned Robux distinction, a reader has no way to tell whether the figure is
current — and no warning that a purchased balance cannot be converted at all.

### RBXCalc — `https://rbxcalc.com/robux-devex-calculator`

| Field | Observation |
|---|---|
| Access | Public, fetched successfully |
| Inputs | Earned Robux amount |
| Outputs | Estimated USD |
| Rate stated | 0.0038 USD per eligible Earned Robux |
| Minimum stated | 30,000 Earned Robux |
| Sources | Links to official Roblox DevEx Terms |
| Last verified | Shown, dated 11 May 2026 |
| Earned vs purchased | Clearly distinguished, with a dedicated FAQ |
| Presets | 1K, 10K, 100K, 1M |
| Content | Six-question FAQ, three related calculators, explanatory content |

**The strongest competitor by a distance.** Accurate rate, accurate minimum,
cited source, visible verification date, and an honest Earned-versus-purchased
explanation. Any claim to be better than the field has to beat this page, not
the weak ones.

Gaps that remain: no legacy or conditional U.S. 18+ rate, so a creator with a
mixed balance cannot model it; no reverse target calculator; no local
currencies; no split calculation; and no rate history.

### RoMonitor Stats — `https://romonitorstats.com/devex-calculator/`

| Field | Observation |
|---|---|
| Access | Public, but the fetched document contained only the title |
| Rendering | Content requires JavaScript |

The served HTML carries no calculator, no rate and no supporting content — only
the page title. This confirms the specification's note that the page is
JavaScript-dependent. A crawler or a reader without JavaScript gets nothing.

This is the clearest architectural opportunity, and it is why this site
server-renders every rate, formula, table and explanation.

### DevExCalc — `https://devexcalc.com/`

| Field | Observation |
|---|---|
| Access | **HTTP 403 Forbidden** to an automated request |

Not audited. No attempt was made to bypass the restriction. The specification's
checkpoint describes it as a minimal two-way interface with little supporting
content; that remains **unverified** and is not relied on anywhere.

## What this site does differently

Each item below addresses a specific gap found above, not a generic claim.

| Gap observed | Response |
|---|---|
| Stale rates published with no date (ToolBLX) | Every rate carries a source link and a verification date, shown on the page |
| Contradictory minimums (RBXTax) | One validated registry is the only source of the minimum; the build fails if content references a rate that does not exist |
| Content invisible without JavaScript (RoMonitor) | Rates, formulas, tables, examples and every explanation are server rendered |
| No Earned-versus-purchased warning (DevExConverter, ToolBLX) | Stated next to every result and given its own page |
| Only one rate modelled (all six) | Standard, legacy and conditional U.S. 18+, with a split calculator for a mixed balance |
| No reverse calculation (all six) | Target mode, rounding up, with the minimum applied |
| No currency provenance (DevExConverter) | Provider, observation date and a "reference rates, not bank quotes" note on every converted figure |
| No rate history (all six) | A dated timeline with effective dates and sources |
| Threshold presented as eligibility | The meter says "meets the stated minimum", never "eligible" |

## Boundaries observed

- No competitor markup, styling, script or asset was copied or inspected for reuse.
- No competitor wording appears on this site; all copy is original.
- No competitor numerical example was reused. Every figure here is recomputed
  from the rate registry by the calculation engine.
- Where a competitor's figure conflicts with official documentation, the
  official documentation wins and the competitor's figure is not repeated.
- Competitor brand terms are excluded from keyword targeting; see
  `seo/overrides/exclusions.json`.
