# Visual reference audit

Conducted 2026-08-17. Observations of publicly accessible competitor pages,
used to inform layout and information hierarchy decisions.

**Method and its limits.** Pages were fetched and their rendered content
described. This yields reliable information architecture, content order and
product behaviour, but not pixel-level styling. Nothing below is a claim about
visual design detail, and no competitor asset, stylesheet or markup was copied
or inspected for reuse.

| Competitor | Access |
|---|---|
| RBXCalc | Fetched |
| DevExConverter | Fetched |
| ToolBLX | Fetched |
| RBXTax | Fetched |
| RoMonitor Stats | Fetched, but content requires JavaScript |
| DevExCalc | **HTTP 403** — not audited |

## Layout patterns worth adopting

**Calculator first, content below.** Every competitor that works at all puts the
tool above the fold and supporting content beneath it. Confirmed as the right
order and used throughout.

**Quick preset amounts.** RBXCalc offers 1K, 10K, 100K, 1M. Genuinely useful —
most readers want a round number. Adopted and extended to eight, chosen from
demand in the keyword data rather than by intuition.

**A source and verification block near the result.** RBXCalc places its rate
source and last-verified date close to the calculator rather than in a footer.
This is the single best pattern in the competitor set, and it is adopted and
extended: a trust strip under the H1, a badge that changes tone as the registry
ages, and a source block on every rate-sensitive page.

**FAQ accordions.** Used by RBXCalc and ToolBLX. Adopted, built on native
`<details>` so answers remain in the DOM and work without JavaScript.

**Related calculators.** RBXCalc links three. Adopted, driven by the manifest's
relationship data so the links cannot drift from the graph the validator checks.

**Multi-currency output.** DevExConverter offers six currencies. Confirms real
demand — the keyword data shows GBP, CAD, AUD, PHP and IDR queries. Adopted with
30 currencies, plus the provenance DevExConverter omits.

## Patterns deliberately avoided

**Content that needs JavaScript to exist.** RoMonitor serves only a page title
without scripts. This is the clearest architectural weakness in the set and the
reason every rate, formula, table and explanation here is server-rendered.

**A figure with no date.** ToolBLX and DevExConverter both state rates with no
indication of when they were checked. DevExConverter's happens to be correct;
ToolBLX's is a year out of date. A reader cannot tell which is which — so every
figure here carries its verification date.

**Contradicting yourself on one page.** RBXTax states both a 10,000 and a 30,000
minimum. This is what a single validated registry prevents: there is one place
the minimum comes from, and content referencing a rate that does not exist fails
the build.

**Presenting a threshold as eligibility.** Several pages imply that reaching the
minimum means qualifying. The threshold meter here says "Meets the stated
minimum" and never "eligible", and a test asserts the stronger phrasing appears
nowhere on the site.

**Blending purchase price with payout.** Where competitors present one "Robux
value", `/robux-to-usd/` leads with the distinction and keeps the two apart.

## Density and hierarchy decisions

**One dominant number.** The estimated payout is the largest element on the
page. Everything else — threshold, comparison, provenance — is secondary and
sized accordingly.

**Two columns on wide screens, one below `lg`.** Inputs left, result right, so a
reader sees cause and effect together without scrolling.

**Progressive disclosure for fees and tax.** These matter to some readers and
are noise to most, so they sit in a closed native disclosure. The preference
persists once opened.

**No sticky result bar on mobile.** A common pattern, deliberately not adopted:
on a short viewport it covers the inputs the reader is trying to edit, which
trades a small convenience for a real obstruction.

**Amounts below the minimum shown, not hidden.** A creator with 10,000 Earned
Robux searches for what it is worth. The honest answer includes that it cannot
be cashed out yet, so the row appears and is flagged rather than omitted.

## Originality

The brand mark is a division rule — two dots and a bar — with an upward accent
stroke: arithmetic, not gaming. It resembles no competitor mark and nothing of
Roblox's trade dress.

Colour, typography, spacing, component structure and every word of copy are
original. The audit informed *what to build and in what order*, never *what it
should look like or say*.
