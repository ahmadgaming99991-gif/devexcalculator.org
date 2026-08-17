# Answer and generative engine strategy

No "AI SEO tags" exist and none are invented here. What follows improves
answerability through visible, well-structured, sourced content — which is the
same thing that makes a page useful to a person in a hurry.

## What every major page carries

1. A direct answer near the top, 40–70 useful words, in a `QuickAnswer` block
   with an anchor link to the detail below.
2. The formula stated openly.
3. A definition block for the terms the answer depends on.
4. A comparison table where one clarifies.
5. The source and the date it was last verified, visibly.
6. A limitation note saying what the page cannot tell you.
7. Consistent entity terminology.
8. Passage-friendly headings with stable anchor ids.
9. Short factual paragraphs before deeper explanation.
10. Crawlable contextual links.

All of it server-rendered. A page whose substance requires JavaScript is
invisible to most extraction, which is the clearest weakness in the competitor
set — RoMonitor serves only a title without scripts.

## Question mapping

`seo/generated/paa-map.json` maps 127 questions, each to exactly one canonical
route and section. 55 are answered directly in a published FAQ block; the rest
are question-form queries from the exports, answered by the owning page's
content.

Representative mappings:

| Question | Route | Section |
|---|---|---|
| What is the current Roblox DevEx rate? | `/devex-rates/` | `current-rates` |
| How much is 100,000 Earned Robux in DevEx? | `/conversions/100000-robux-to-usd/` | `value` |
| What is the minimum Earned Robux for DevEx? | `/devex-requirements/` | `minimum` |
| Does every Robux balance qualify? | `/earned-robux/` | `definition` |
| What is the difference between the current and legacy rate? | `/devex-rate-history/` | `comparison` |
| Who can qualify for the U.S. 18+ rate? | `/devex-rates/` | `which-applies` |
| How many Earned Robux are needed for USD 1,000? | `/usd-to-robux/` | `examples` |
| Why is DevEx lower than the price of buying Robux? | `/robux-to-usd/` | `two-answers` |
| Are there fees or taxes after DevEx? | `/devex-fees-and-taxes/` | `three-layers` |
| Can group funds qualify? | `/earned-robux/` | `groups` |
| How are local-currency estimates calculated? | `/methodology/` | `currency` |

One route per question. A question answered in three places is a question whose
answer will eventually disagree with itself.

## Entities

14 entities in `seo/generated/entity-map.json`, each with aliases, the routes
referencing it, its source ids and its relationship to the programme.

The three rate entities carry their values and effective dates, which is what
keeps terminology consistent: the site says "standard rate", "legacy rate" and
"eligible U.S. 18+ rate" everywhere, never "old rate" on one page and "previous
rate" on another.

## Update sensitivity

Each mapped question is tagged high, medium or low. High-sensitivity answers —
anything quoting a rate, the minimum or a fee percentage — are the ones that go
wrong silently, so they are tied to the registry and re-verified on the review
cadence rather than reviewed ad hoc.

## What is not done

- No mechanical repetition of exact question strings as headings.
- No FAQ schema for a rich result Google no longer serves.
- No claim that `llms.txt` is a ranking factor. `public/llms.txt` says so
  explicitly, because publishing transparency infrastructure and then
  overclaiming what it does would undercut the point of it.
- No content written to be quotable at the expense of being correct. Where an
  official source is silent — DevEx processing times, for instance — this site
  is silent too, even though a number would extract more cleanly than an
  explanation of why there is no number.
