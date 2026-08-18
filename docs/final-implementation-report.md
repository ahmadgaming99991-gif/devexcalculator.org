# Final implementation report

DevExCalculator.org · 2026-08-17 · commit `f8fdbe9` plus the documentation commit

---

## 1. Executive summary

A complete Roblox DevEx calculator and reference site, built from an empty
directory to a deployable Cloudflare Workers application with 32 indexable
routes, 377 unit tests, 248 end-to-end tests and full documentation.

Every applicable acceptance gate passes. **Production deployment is the one
outstanding item**, blocked by this environment's permission policy on
outward-facing actions rather than by anything technical — the OpenNext build
succeeds, the Worker measures 1.99 MB against a 3 MB limit, and the full E2E
suite passes against a local Workers runtime.

What distinguishes the result from the competitor set is not features but
correctness discipline: rates are validated at build time against a registry
that fails the build if a figure is unsourced or internally inconsistent, money
never touches a float, and the site says plainly what it cannot determine.

## 2. Repository baseline

Empty. Three files: the specification and two CSV exports, all preserved. No
git, no package manifest, nothing to migrate. Full detail in
`repository-audit.md`; environment in `environment-audit.md`.

## 3. Final architecture

Next.js 16.3.1 App Router · React 19.2.8 · TypeScript 5.9.3 strict · Tailwind
4.3.3 · `@opennextjs/cloudflare` 1.20.2 · Wrangler 4.123.0.

Server Components throughout; one substantial client island (the calculator)
plus three small ones. 24 of 32 routes prerendered and served from the assets
binding without invoking the Worker. Three runtime dependencies.

No database, no session, no KV/D1/R2/Durable Object/Queue binding — the
calculator is stateless and the reasoning is recorded as decision D-011.

## 4. Route inventory

**32 indexable routes, 0 orphans, all returning 200.**

Calculators (4): `/` · `/robux-to-usd/` · `/usd-to-robux/` ·
`/robux-tax-calculator/`

Directories and hub (3): `/calculators/` · `/guides/` · `/conversions/`

Amount pages (8): 30,000 · 50,000 · 100,000 · 200,000 · 300,000 · 500,000 ·
1,000,000 · 10,000,000

Guides (6): `/devex-rates/` · `/devex-rate-history/` · `/devex-requirements/` ·
`/earned-robux/` · `/how-to-cash-out-robux/` · `/devex-fees-and-taxes/`

Trust and legal (11): about · methodology · sources · editorial-policy ·
corrections · changelog · contact · privacy · terms · disclaimer · accessibility

API (4, noindex): health · rates · fx/latest · contact

## 5. Calculator features

Quick, split and target modes. Three documented rates with comparison. Threshold
meter that reports meeting the minimum and never claims eligibility. Eight
presets. 30 local currencies with provider, observation date and stale handling.
Optional fee and tax modelling. Shareable URLs rendered server-side. Local
history. Copy and share with announced feedback. Full keyboard operation.

Separately, a marketplace fee calculator covering in-experience sales, the
progressive Marketplace tiers and the three-way avatar split, in both
directions.

## 6. Rate and source registry

Version `2026-08-17.1`, verified against the Roblox Creator Hub on 2026-08-17.

| Rate | Value | Per 30,000 |
|---|---|---|
| Standard | 0.0038 | **$114.00** |
| Legacy (pre 5 Sep 2025 10:00 PT) | 0.0035 | $105.00 |
| Conditional U.S. 18+ | 0.0054 | $162.00 |

Minimum 30,000 Earned Robux. Eleven sources in the registry, each with the facts
it supports, a check date and a review cadence.

## 7. CSV processing

| | Rows | Volume | Traffic | Checkpoint |
|---|---:|---:|---:|---|
| RBXTax | 82 | 14,270 | 1,564 | matches exactly |
| RoMonitor | 362 | 81,220 | 13,534 | matches exactly |

**444 of 444 rows accounted for**: 376 included, 63 duplicate variants, 5
excluded, **0 ambiguous**.

## 8. Clusters and ownership

Ten clusters, 196 canonical owners across 8 routes, **0 ownership conflicts**.
Largest: Robux to USD (88 keywords, 29,680), specific amounts (172, 23,900),
DevEx calculator (45, 16,850). Full detail in `seo/route-ownership.md`.

## 9. Published, deferred, excluded

| | Count |
|---|---:|
| Published indexable routes | 32 |
| Amount pages published | 8 |
| Amount candidates held at review | 63 |
| Keywords excluded | 5 |

The 8-of-71 amount ratio is the point: 172 amount keywords are served by one hub
plus eight pages, not by 172 pages.

## 10. Internal linking

143 contextual edges, 0 orphans, 0 broken targets, 0 over-repeated anchors.
Crawl verified 32 pages and 1,755 links with zero failures.

## 11. Metadata, schema and sitemap

Unique title, description and single H1 per route; absolute self-referencing
canonicals; OG and Twitter metadata; build-time OG images. JSON-LD limited to
types the visible content supports — no `FAQPage`, no `Organization` without a
real name, no `Product` or `Review`. Sitemap matches the indexable set exactly
in both directions, with `lastmod` from content dates rather than build time.

## 12. Accessibility

**0 axe violations** across 15 routes plus the calculator-with-result and
dark-mode states. Lighthouse accessibility **100** everywhere.

Verified manually: keyboard operation, focus visibility at 4.96:1, 320px reflow,
200% zoom, reduced motion, colour independence, and no-JavaScript rendering.
Five limitations published on `/accessibility/`. Full report in
`accessibility-report.md`.

## 13. Performance

| Page | Perf | A11y | BP | SEO | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/` desktop | 100 | 100 | 100 | 100 | 0.6 s | 0 ms | 0 |
| `/devex-rates/` desktop | 100 | 100 | 100 | 100 | 0.5 s | 0 ms | 0 |
| `/conversions/` desktop | 100 | 100 | 100 | 100 | 0.6 s | 0 ms | 0 |
| `/` mobile | 98 | 100 | 100 | 100 | 2.5 s | 40 ms | 0 |

Local measurements — field data needs deployment. CLS is structurally zero: no
web font, no remote images, no unfilled ad slot.

## 14. Security

Headers verified on every response. CSP with one documented weakness
(`'unsafe-inline'` in `script-src`, required by Next.js, with the mitigations
recorded). Contact protected by origin check, rate limit, honeypot and
fail-closed Turnstile, and honest — 503 rather than a false success when
unconfigured. No secret in the client or in Git; CI scans for both.

## 15. Test results

| Suite | Result |
|---|---|
| Lint | Clean |
| Typecheck | Clean |
| Unit and integration | **377 passing** |
| Content validation | 0 errors, 0 warnings |
| SEO validation | Passed, 444/444 rows |
| Build | 32 routes |
| Route checks | Passed |
| Link crawl | 32 pages, 1,755 links, 0 failures |
| Bundle budget | 127.7 kB of 130 kB |
| OpenNext build | Succeeds |
| Worker size | 1.99 MB of 3 MB |
| E2E, three browsers | **248 passing**, 1 skipped |
| E2E, Workers runtime | **83 passing** |
| Visual capture | 14 passing, 134 screenshots |

## 16. Worker bundle

1.99 MB gzipped (8.27 MB raw), **66%** of the 3 MB limit, measured by
`wrangler deploy --dry-run`. Static assets 0.67 MB, served from the assets
binding and not counted against the script.

## 17. Git

`main` tracks `origin/main` at
`github.com/ahmadgaming99991-gif/devexcalculator.org`, most recent `740bd65`.
Working tree clean. Every push runs the CI and Security workflows; both are
green on the current head.

## 18. Preview URL

Local Workers runtime: `http://127.0.0.1:8787` via `wrangler dev --local`.
Production is live, so the preview is now a development convenience rather than
the only way to exercise the Worker runtime.

## 19. Production URL and deployment id

**Deployed.**

```
Production URL:   https://devexcalculator.org
Worker version:   e7fe682d-1211-4a1c-a035-84526f6bcf7d
Deployment time:  2026-08-18T23:43Z
Deployed commit:  740bd65
```

Scheduled collection runs on the same Worker: `*/15 * * * *`, writing
observations to the `PLATFORM_HISTORY` KV namespace.

## 20. Custom domain verification

Verified live. `devexcalculator.org` and `www.devexcalculator.org` are both
attached as custom domains; `www` answers with a single 308 to the apex,
preserving path and trailing slash, and plain HTTP is upgraded with a 301 from
the Worker itself. The checklist is in `cloudflare-deployment.md` §
Post-deploy verification.

## 21. Remaining external configuration

**Blocking: none.** Both items that were blocking are resolved — the site is
deployed, and `main` pushes to a GitHub remote that runs CI.

**Awaiting a value from the operator:**

1. **`STOCK_API_KEY` / `STOCK_PROVIDER`** — the Finnhub adapter is written and
   tested but unconfigured, at the operator's request. Until it is set,
   `/platform/stock/` states that no live price is configured rather than
   printing one it cannot attribute.

**Optional, all cleanly disabled:** GA4, Cloudflare Web Analytics, organisation
name, contact email, contact mode and provider secrets, Turnstile keys. Each
absent provider now also drops its origin from the CSP, so the policy describes
the same deployment the privacy page does.

Two are deliberately absent rather than pending: no organisation name and no
contact mailbox are invented.

## 22. Known limitations

1. No production deployment yet.
2. No external accessibility audit; no live screen-reader testing by a daily
   user.
3. No WebKit/Safari testing.
4. `'unsafe-inline'` in `script-src`, required by Next.js.
5. Rate limiting is per-isolate, not global. Turnstile is the primary control.
6. Mobile LCP of 2.5 s sits exactly on the threshold under emulation.
7. No field Core Web Vitals.
8. Wide tables scroll horizontally at narrow widths.
9. No universal Robux purchase price, no processing times, no country tax
   guidance — each a deliberate refusal to publish an invented figure.

## 23. Rollback

```bash
npx wrangler deployments list
npx wrangler rollback --message "Reason"
```

Immediate, no rebuild. For a wrong **rate** rather than a bad deployment,
correct `src/data/rates.json`, update the tests, add a changelog entry and
redeploy forward — rolling back would restore the previous, also wrong, figure.

## 24. Roadmap

**Days 1–30.** Submit the sitemap, verify Search Console, watch indexation,
**re-verify rates weekly**, improve snippets from real impression data. No new
pages.

**Days 31–60.** Promote amount pages only where Search Console shows real
unserved demand — reassess 40,000 first. Consider a server-rendered
local-currency table. At most one further calculator.

**Days 61–90.** Expand what performs, consolidate what does not, refresh the
competitor audit, run accessibility and performance regressions, consider an
embeddable calculator only if it can stay accurate.

Detail in `seo/content-roadmap.md`. Nothing bypasses the publication gate.

---

## Closing note

Eighteen real defects were found and fixed, listed in
`CHANGELOG.md`. The pattern is worth recording: nearly all were caught by a
testing layer that did not exist when the code was written. axe found 608 broken
CSS utilities producing invisible text; the Workers runtime found two adapter
incompatibilities that passed under `next start`; the SEO validators found an
exact-match link block and a silent data loss discarding the largest keyword in
the dataset; and simply looking at a screenshot found a money value clipped
mid-digit that every automated assertion had passed.

That last one is the argument for the specification's insistence that passing
automated tests is not visual acceptance.
