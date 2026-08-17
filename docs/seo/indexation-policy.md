# Indexation policy

## URL rules

- Lowercase, with a trailing slash. `trailingSlash: true` issues a single 308
  from the non-slash form.
- No `.html` suffixes and no case variants.
- Duplicate slashes are normalised by the framework.
- `www` redirects 308 to the apex, preserving path and query, at both the
  framework and Cloudflare layers.
- HTTP upgrades to HTTPS at the Cloudflare edge.
- A missing path returns a real 404. It is never redirected to the homepage —
  that hides the broken link from the reader and from crawl reporting alike.

## What is indexable

All 32 routes: the four calculators, the two directories, the conversion hub,
eight amount pages, six guides, and the trust and legal set.

Each is `status: published` and `indexation: index` in the content manifest, and
each self-canonicalises to an absolute HTTPS URL.

## What is not

| Excluded | Mechanism |
|---|---|
| `/api/*` | `Disallow` in robots.txt, plus `x-robots-tag: noindex` |
| Calculator query states | Canonical points at the clean route |
| Unapproved amount slugs | `notFound()` — a genuine 404, not a thin page |
| 404 and error pages | `robots: noindex` |

Nothing needed for rendering is blocked. CSS, JavaScript and images are all
crawlable, because blocking them stops a search engine seeing the page a reader
sees.

## Query parameters

`/?robux=100000&rate=standard-current` renders the shared state on the server
and canonicalises to `https://devexcalculator.org/`.

This is the mechanism that lets 180 amount queries be served without 180 pages.
A shared link works, reloads, and is crawlable — but it consolidates to one
canonical URL rather than creating a crawl space. Every parameter is validated;
anything malformed falls back to a default.

`scripts/quality/check-routes.ts` fails if any route's canonical carries a query
string.

## Amount pages

An amount gets its own indexable route only when it clears every gate:

1. Meaningful demonstrated demand (≥ 300 volume across variants)
2. At least two distinct query variants
3. A round amount that reads as a real query
4. At or above the 30,000 minimum — below it, a payout page would mislead
5. Within the safe display range
6. **Manual approval** in `seo/overrides/publication-overrides.json`
7. Amount-specific context that says something the hub does not

Launch set: 30,000 · 50,000 · 100,000 · 200,000 · 300,000 · 500,000 · 1,000,000
· 10,000,000.

The cap is 12 and the current count is 8. 40,000 cleared the automated gates and
was held back manually — 30,000 and 50,000 already cover the just-above-minimum
case, and three adjacent pages would say the same thing three times.

A validator fails the build if the pipeline's approved set and the published set
disagree in either direction, so this cannot drift.

## Sitemap

Generated from the content manifest, so it lists exactly the published
indexable routes and nothing else. No redirects, no API routes, no query states,
no drafts.

`lastmod` comes from each page's `dateModified`, updated when content or rate
data actually changes — deliberately **not** the build time. A sitemap claiming
every page changed on every deploy teaches crawlers to ignore the field.

`priority` and `changeFrequency` are omitted; Google states it ignores both.

Not segmented. 32 URLs does not justify it, and empty segmented sitemaps are
worse than one correct one.

## Canonical, sitemap and link agreement

All three derive from one manifest, which makes disagreement structurally
difficult. It is still checked:

- `validate:content` — duplicate titles, descriptions and H1s; orphans; broken
  internal links; missing parents.
- `validate:seo` — one canonical owner per keyword; sitemap and publish queue
  agree exactly in both directions.
- `validate:routes` — every canonical is absolute and self-referencing; every
  sitemap URL returns 200; exactly one H1 per page; no `noindex` on an indexable
  page.
- `validate:links` — crawls from the homepage; no broken links, no redirect
  chains, no internal `nofollow`, every indexable route reachable by following
  links.

## Duplicate content

The near-duplicate risk is the eight amount pages, which share a template.
Each carries an original context paragraph specific to that amount, its own
rate-comparison figures, its own reverse-target table, and contextual anchors
that include the amount. The cannibalisation check fails if two indexable routes
share 60% or more of the smaller keyword set.

## What this policy refuses

- A page per spelling variant.
- A page per number.
- Indexable internal search results or filtered views.
- Canonical tags used to excuse uncontrolled page generation.
- Doorway pages.
- `noindex` pages in the sitemap.
