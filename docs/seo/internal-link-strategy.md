# Internal link strategy

Generated from the content manifest into `seo/generated/internal-link-map.json`.
160 contextual edges across 36 routes, 0 orphans, 0 broken targets.

## Principles

- Every link is a real crawlable `<a href>`. No JavaScript-only navigation.
- No internal link carries `nofollow`.
- Anchors are descriptive and vary by context.
- No sitewide exact-match keyword blocks.
- No page links to everything; no page links to nothing.
- Nothing links to a `noindex` route.

## How the graph is built

Links are declared per route in `src/lib/content/route-registry.ts` with a
relationship — `parent`, `child`, `sibling`, `next-step`, `prerequisite` or
`tool`. Components render from that declaration, so the rendered links and the
graph the validator checks are the same data and cannot drift.

Relationships also drive placement. `RelatedLinks` on a tool page renders
`tool` relationships as related calculators and `child`/`next-step` as related
guides, so the same declaration produces contextually appropriate sections
without a second list to maintain.

## Required patterns

**Homepage** links to Robux to USD, DevEx rates, requirements, Earned Robux, the
cash-out guide, the calculator directory, the conversion hub, the payout target
tool and the methodology — nine contextual links, all within body content rather
than only in navigation.

**Tool pages** link to their supporting definition, rate and requirements pages,
one or two related tools, their parent hub, and the methodology.

**Guide pages** link to the relevant calculator near the first actionable
section, their parent pillar, one prerequisite and one next step.

**Amount pages** link to the conversion hub, the main converter, the rates page,
and two adjacent approved amounts — not an arbitrary chain.

**Trust pages** link back into the product rather than only to each other.

## Anchor text

Anchors describe the destination in the sentence's own terms. The same
destination is reached by different anchors from different contexts —
`/devex-rates/` is "the current DevEx rates in full" from the homepage, "the
rate behind this conversion" from Robux to USD, and "the rates used in this
table" from the conversion hub.

The validator fails when the same anchor text points at the same destination
more than three times. It caught a real problem: the eight generated amount
pages initially used identical anchors — "all common amount conversions",
"convert a different amount", "the rates used here" — which reads as a sitewide
exact-match link block rather than contextual linking. Anchors now carry the
amount or its payout, so each is genuinely contextual.

The same check caught "back to the calculator" five times and "about this site"
four times across trust pages; both were varied.

## Header and footer

The header carries six primary links; the footer carries all 32 in four groups.
Both are server-rendered anchors.

Footer links count as real inbound links for orphan detection — they are
ordinary crawlable anchors on every page. But a route reachable *only* from the
footer gets a warning, because a page with no contextual link from related
content is weakly connected even when it is not orphaned. That warning is what
prompted `/about/` to link to `/accessibility/`.

## External links

Official source citations open in a new tab with `rel="noopener noreferrer"` and
deliberately **without** `nofollow`. These are authoritative citations and
marking them nofollow would misrepresent the relationship.

Social links, when configured, would use `rel="nofollow noopener noreferrer"`.
None are configured.

Every external link opening in a new tab is announced to screen readers with a
visually hidden "(opens in a new tab)".

## Validation

`npm run validate:content` — broken targets, orphans, self-links, links to
`noindex` routes, anchors too short to be descriptive, missing parent links.

`npm run validate:seo` — broken targets, over-repeated anchors.

`npm run validate:links` — crawls the built site from the homepage: broken
links, redirect targets, redirect chains, internal `nofollow`, missing
`noopener`, and whether every indexable route is reachable by following links.

Current: 32 pages crawled, 1,755 links checked, zero failures.
