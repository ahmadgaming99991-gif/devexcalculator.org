# Content roadmap

Nothing here bypasses the publication quality gate. A route ships when it has a
job no existing page does, a source for every time-sensitive claim, and
something to say beyond a substituted number.

## Shipped at launch

32 routes at launch: 4 calculators, 2 directories, 1 conversion hub, 8 amount
pages, 6 guides, 11 trust and legal pages. That covered every P0 and P1 cluster
in the keyword data.

**36 routes now.** `/roblox-stats/`, `/platform/` and `/platform/stock/` were
added after launch as data pages rather than keyword pages, and `/api/` became
an indexable document rather than a bare endpoint. None of them came from the
keyword data, and none of them is an amount page: the held set is still held.

## Days 1–30 — measure before building

The priority is not publishing more; it is finding out whether what shipped
works.

- Submit the sitemap and verify Search Console.
- Watch indexation, crawl errors and query impressions.
- **Re-verify the rates weekly** against the Roblox Creator Hub. The registry is
  30 days from a review warning and 90 from a critical one; a rate change is the
  one event that makes every page wrong at once.
- Improve titles and descriptions from real impression and click-through data
  rather than from guesses.
- Check whether the homepage and `/robux-to-usd/` are competing in practice, not
  only in the keyword sets. If Search Console shows them alternating for the same
  query, one needs sharpening.

No new pages this period unless a correction requires one.

## Days 31–60 — expand where evidence supports it

**Amount pages.** 63 candidates are held at review with their gate results
recorded. Promote only where Search Console shows real impressions this site is
not serving well, and only where there is something amount-specific to say.
Reassess 40,000 here — it cleared the automated gates and was held for
adjacency, which real data can confirm or overturn.

**Local currency coverage.** 30 currencies ship; the keyword data shows demand
for GBP, CAD, AUD, PHP and IDR conversions. If impressions confirm it, the
conversion hub could gain a server-rendered local-currency table. It would need
the stale-rate handling the calculator already has — a static page cannot show a
live observation date, so this needs care rather than enthusiasm.

**One further calculator, at most.** Candidates in demand order: a group revenue
split, and a "what do I need to earn per month to reach X" planner. Either ships
only if it does something the existing four cannot, and only with verified
rules.

**Linkable methodology.** The exact-arithmetic explanation and the rate history
are the most genuinely referenceable assets here. Worth strengthening rather
than adding to.

## Days 61–90 — consolidate

- Expand clusters that are performing; **consolidate or remove** ones that are
  not. A page that has had 90 days and no impressions is not going to start.
- Refresh the competitor audit. ToolBLX and RBXTax may have corrected their
  figures; RBXCalc may have added the rates it currently lacks.
- Full accessibility and performance regression review.
- Consider an embeddable calculator only if it can stay accurate — an embed
  showing a stale rate on someone else's site is worse than no embed, so it
  would need to fetch the rate rather than bake it in.

## Explicitly deferred

**Country-specific tax guidance.** High demand, and it needs qualified review
plus ongoing maintenance this project cannot commit to. The fees page models the
reader's own figure instead of asserting one. Revisit only with a qualified
reviewer.

**Machine translation.** The data contains non-English queries. Machine-
translating a site whose value is precision about money would produce confident
wrong text in a language nobody here can check. Any localisation needs native
review and a full hreflang plan.

**A page per currency, per spelling, or per number.** Handled by the selector,
the classifier and the hub respectively. These are not gaps.

**Purchase-price data.** Roblox prices Robux by package, region, platform and
promotion. Publishing one universal rate would be inventing a figure. If Roblox
publishes structured pricing, revisit.

## Ongoing maintenance

| Task | Cadence |
|---|---|
| Verify rates against official documentation | Weekly for 30 days, then monthly |
| Regenerate the FX fallback snapshot | Quarterly, or after a provider change |
| Rerun the keyword pipeline | When an export is replaced |
| Competitor audit | Quarterly |
| Accessibility and performance regression | Quarterly |
| Dependency review | Weekly via Dependabot |

## The rule that governs all of it

A new page needs a job no existing page does. "There is search volume for it" is
not a job — the 180 amount keywords have plenty of volume and are served by one
hub and eight pages, which is the right answer rather than the maximal one.
