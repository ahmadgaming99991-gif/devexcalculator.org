# Competitor feature matrix

Audited 2026-08-17. Sources and reasoning are in `competitor-audit.md`.

Legend: **Y** present · **N** absent · **~** partial or qualified ·
**?** not determinable.

## Accuracy

| | This site | RBXCalc | DevExConverter | ToolBLX | RBXTax | RoMonitor | DevExCalc |
|---|---|---|---|---|---|---|---|
| Current 0.0038 rate | Y | Y | Y | **N** (0.0035) | N (none) | ? | ? |
| Correct 30,000 minimum | Y | Y | N (none) | **N** (100,000) | **~** (10,000 *and* 30,000) | ? | ? |
| Legacy rate modelled | Y | N | N | ~ (as a preset) | N | ? | ? |
| Conditional U.S. 18+ rate | Y | N | N | N | N | ? | ? |
| Source link | Y | Y | N | N | Y | ? | ? |
| Visible verification date | Y | Y | N | N | N | ? | ? |
| Earned vs purchased explained | Y | Y | N | N | N | ? | ? |

## Product

| | This site | RBXCalc | DevExConverter | ToolBLX | RBXTax | RoMonitor | DevExCalc |
|---|---|---|---|---|---|---|---|
| Robux → USD | Y | Y | Y | Y | ~ | ? | ? |
| Reverse target calculator | Y | N | ~ (currency reverse) | N | ~ | ? | ? |
| Mixed-balance split | Y | N | N | N | N | ? | ? |
| Rate comparison table | Y | N | N | N | N | ? | ? |
| Local currencies | Y (30) | N | Y (5) | N | N | ? | ? |
| Currency provenance shown | Y | — | N | — | — | ? | ? |
| Optional fee and tax modelling | Y | N | N | N | N | ? | ? |
| Quick presets | Y (8) | Y (4) | N | N | N | ? | ? |
| Marketplace fee calculator | Y | Y | N | N | ~ | ? | ? |
| Shareable calculation URL | Y | N | N | N | N | ? | ? |
| Local history | Y | N | N | N | N | ? | ? |

## Architecture and trust

| | This site | RBXCalc | DevExConverter | ToolBLX | RBXTax | RoMonitor | DevExCalc |
|---|---|---|---|---|---|---|---|
| Content readable without JS | Y | ? | ? | ? | ? | **N** | ? |
| Rate history page | Y | N | N | N | N | ? | ? |
| Methodology page | Y | N | N | N | N | ? | ? |
| Source registry with dates | Y | ~ | N | N | N | ? | ? |
| Public changelog | Y | N | N | N | N | ? | ? |
| Corrections policy | Y | N | N | N | N | ? | ? |
| Editorial policy | Y | N | N | N | N | ? | ? |
| Accessibility statement | Y | N | N | N | N | ? | ? |
| Trademark disclaimer | Y | ? | N | N | Y | ? | ? |

## Reading the matrix honestly

**RBXCalc is the real benchmark.** It gets the rate, the minimum, the source,
the date and the Earned Robux distinction right — everything that matters most.
The advantage here is depth: three rates rather than one, a split calculator
for a mixed balance, reverse targets, local currencies with provenance, and the
trust infrastructure around them.

**The `?` column for RoMonitor and DevExCalc is not a competitive claim.**
RoMonitor's content requires JavaScript and DevExCalc returned 403 to an
automated request, so most of their rows are genuinely unknown rather than
absent. They are marked unknown rather than scored as zero.

**ToolBLX and RBXTax are the clearest accuracy gaps**, and the reason the whole
rate-registry and verification-date apparatus exists. Publishing a stale rate is
easy; the hard part is noticing it has gone stale, which is why the age of the
registry is tracked in the build and surfaced on the page.
