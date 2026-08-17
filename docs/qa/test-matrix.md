# Test matrix

## Totals

| Suite | Count | Status |
|---|---:|---|
| Unit and integration (Vitest) | 363 | passing |
| End-to-end, 3 browsers (Playwright) | 248 | passing, 1 skipped |
| End-to-end against Workers runtime | 83 | passing |
| Validators | 5 scripts | passing |

The skipped test is clipboard verification, which needs Chromium-specific
permissions; it runs on Chromium and is skipped on Firefox.

## Unit — calculation engine

`tests/unit/calculations/`

| Area | Covers |
|---|---|
| `rational.test.ts` | Exact decimal parsing, arithmetic without drift, all five rounding modes, sign handling, negative zero, ceil and floor in both signs, very large values, division by zero |
| `devex.test.ts` | Standard, legacy and U.S. 18+ rates; the published 30,000 = $114.00 anchor; 11 amounts from 1,000 to 10,000,000; split totals; no double counting; blended rate; fee, flat fee and tax in order; negative clamping; reverse target with ceiling; below-minimum flagging; progress; comparison differences; zero and negative inputs; unknown rate id |
| `parse-amount.test.ts` | Plain digits, comma and space grouping, apostrophes, underscores, K/M/B shorthand, fractional shorthand, currency decoration, invisible characters; rejection of empty, negative, non-numeric, scientific notation, over-long, malformed separators, fractional Robux and over-limit values; the limit message stating it is not a Roblox limit |
| `format.test.ts` | Currency minor units including zero-decimal, grouping, half-up at the boundary, no negative zero, rate precision with trailing zeros, compact Robux only for exact multiples, signed values, date formatting |
| `marketplace.test.ts` | 70/30 in-experience split, rounding down, the three-way avatar split summing exactly, all ten progressive tiers, tier boundaries, before-fee round trip |
| `rate-registry.test.ts` | Registry loads and validates, the three documented values, `usdPerThousandRobux` consistency, every rate sourced and dated, exactly one active rate, effective dates, the 30,000 minimum, limits labelled as application limits, freshness state transitions |

**Fixed expected values throughout**, not snapshots. `30_000 → "$114.00"` is
asserted because Roblox publishes that figure; a snapshot would happily record a
wrong number as correct.

## Unit — SEO pipeline

`tests/unit/seo/`

| Area | Covers |
|---|---|
| `csv.test.ts` | BOM stripping, quoted fields containing commas, escaped quotes, CRLF, newlines inside fields, trailing record with no newline, empty fields preserved, unterminated quote error, column mapping and aliases, missing and unmapped column reporting, metric parsing with blank and non-numeric cells |
| `normalize.test.ts` | Whitespace and punctuation normalisation, zero-width removal, Robux and DevEx spelling folding, bare dollar sign, calculator and converter variants, direction preservation, spelling families, 13 amount extraction cases, formatting variants to one entity, year-versus-amount disambiguation, currency detection across six currencies, entity extraction, non-Latin detection |
| `classify.test.ts` | 10 DevEx variants to the homepage, spelling variants yielding one route, 9 generic conversion terms, 5 misspellings, tool queries without a currency, reverse intent kept separate, 7 rate terms, dated queries to history, amount-not-year, numeric routing and query-state fallback, local-currency intent, marketplace fee separation, eligibility and process routing, 4 exclusion categories, determinism, rationale presence |

## Unit — features and security

| File | Covers |
|---|---|
| `features/url-state.test.ts` | Parsing all three modes, mode inference, grouping stripped; hostile input — unknown rate, unsupported currency, script injection, negatives, over-limit, over-long, out-of-range percentages, unknown mode, repeated parameters; serialisation omitting defaults and irrelevant fields; round-trip across every mode; the query carrying no personal data |
| `security/security.test.ts` | Contact validation, email shapes, length limits, control-character stripping, honeypot revealing nothing, non-string input; HTML escaping including ampersand ordering; rate limit allow, block, per-key isolation, remaining count, Cloudflare IP header, no trust in a spoofable header; request id uniqueness |

## Integration

| File | Covers |
|---|---|
| `schemas.test.ts` | Rate, source and currency data against their JSON Schemas, plus negative cases — a rate as a JSON number, a rate without a source, an unknown status, a non-HTTPS URL, a disallowed evidence label, a malformed currency code |
| `fx.test.ts` | Real captured ECB response; USD base; provider and observation date; EUR reciprocal; **cross-rate direction** sanity in both directions; 8 currencies present and positive; only supported currencies published; discontinued series excluded; stale detection at both ends; typed errors for missing structure and missing USD; fallback always stale with a reason; conversion including a zero-decimal currency; null when rates unavailable |

## End-to-end

`tests/e2e/` — Chromium, mobile Chromium (Pixel 7) and Firefox.

**`calculator.spec.ts`** — quick mode conversions at all three rates, shorthand
and separators, presets, error handling preserving user input, the input cap
message; threshold below and above the minimum, and that it never claims
eligibility; split mode totals and comparison; fees and tax; target rounding, the
minimum warning and progress; shared state rendered in server HTML, address-bar
sync, reload restoration, hostile query rejection, back navigation between modes;
copy with clipboard verification, reset confirmation and its disabled state; FX
failure leaving USD intact; currency provenance shown; history save and clear;
marketplace fee in both directions and the progressive tier.

**`accessibility.spec.ts`** — axe on 15 routes plus result and dark-mode states;
error announcement wiring; skip link; keyboard operation; arrow-key tabs; focus
visibility; mobile menu Escape, expanded state and scroll lock; 320px overflow
per route; a very large result at 320px; 200% zoom; viewport scalability;
reduced motion; dark mode.

**`content.spec.ts`** — without JavaScript: the homepage explains itself, header
navigation works at every width, no page is a blank shell, rate tables render;
honesty: no eligibility or approval claims, the estimate disclaimer wherever a
payout appears, the requirements page separating threshold from approval, no
placeholders, verification dates, the trademark disclaimer; disabled
integrations: no analytics request, no empty ad slot, honest contact; crawl
infrastructure: robots, sitemap contents and `lastmod` provenance, llms.txt, a
real 404, API endpoints noindex, FX contract, contact refusing honestly;
security headers; structured data with no unsupported types and breadcrumbs
matching the visible trail.

## Validators

| Command | Checks |
|---|---|
| `validate:content` | URL shape, required fields, metadata length, quick-answer length, hierarchy, sourcing, internal links, schema declarations, section ids, dates, amount approval, duplicate title/description/H1, orphans, parent links |
| `validate:seo` | Row accounting, checkpoint reconciliation, one canonical owner per keyword, targets existing in the manifest, cannibalisation, publish-queue blockers, sitemap and queue agreement in both directions, broken link targets, over-repeated anchors, amount-page cap |
| `validate:routes` | Every indexable route 200, one H1, canonical absolute and self-referencing, unique title and description, no meta keywords, OG and Twitter fields, no noindex on indexable pages, JSON-LD parses with no unsupported types, images with alt and dimensions, crawl files, sitemap matching exactly, 404 behaviour, security headers, API noindex |
| `validate:links` | Crawls from the homepage: broken links, redirect targets and chains, internal nofollow, external noopener, reachability of every indexable route |
| `validate:bundle` / `validate:worker` | Shared and per-route JavaScript budgets, no analytics references when unconfigured, Worker size via wrangler dry run |

## What the layers caught that the others could not

- **Unit tests** caught the float drift in `17000 × 0.0054` and the parser
  reporting a separator problem as "not a number".
- **The pipeline audit** caught duplicate rows resolving by filename order,
  discarding the largest term in the dataset.
- **Validators** caught eight amount pages sharing identical anchor text, and the
  approved-set drift between pipeline and pages.
- **E2E with axe** caught 608 broken CSS utilities producing white-on-white text.
- **E2E at 320px** caught a 227px horizontal overflow.
- **E2E without JavaScript on mobile** caught the header having no usable
  navigation.
- **The Workers preview** caught unsupported Node-runtime proxy and
  `NoFallbackError` on every prerendered amount page — both passing under
  `next start`.

The last one is why the acceptance gate requires the suite to run against the
Workers runtime and not only against `next start`.

## Not automated

- Live screen-reader testing by a daily user.
- Field Core Web Vitals, which need real traffic.
- Visual review of screenshots for density, clipping and unwanted blank space —
  recorded in `visual-qa.md`.
- Production verification, which needs a deployment.
