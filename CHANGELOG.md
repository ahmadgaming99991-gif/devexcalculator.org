# Changelog

Notable changes to DevExCalculator.org. Rate data changes are recorded here and
on the public [changelog page](https://devexcalculator.org/changelog/).

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] — 2026-08-17

Initial release.

### Rate data

All figures verified against the
[Roblox Creator Hub DevEx documentation](https://create.roblox.com/docs/production/monetization/developer-exchange)
on 2026-08-17. Registry version `2026-08-17.1`.

- Standard rate **0.0038 USD** per eligible Earned Robux — 114 USD for 30,000,
  effective 5 September 2025 at 10:00 PT
- Legacy rate **0.0035 USD** for balances earned before that transition
- Conditional U.S. 18+ rate **0.0054 USD** for qualifying Earned Robux from
  verified United States players aged 18 or over
- Minimum **30,000 Earned Robux**
- Eligibility: minimum age 13, Roblox-verified email, valid DevEx portal
  account, IRS form W-9 or W-8 on file, compliance with the Terms of Use and
  Community Standards

Marketplace commissions verified against
[Marketplace fees and commissions](https://create.roblox.com/docs/marketplace/marketplace-fees-and-commissions):

- In-experience purchases: creator 70%, Roblox 30%
- Marketplace avatar items: progressive 30% → 70% by price-floor multiple
- Avatar items sold in-experience: creator 30%, experience owner 40%,
  Roblox 30%

### Added

- DevEx calculator with quick, split and target modes
- Robux to USD page separating creator payout from retail purchase price
- Payout target calculator with round-up logic and the minimum applied
- Roblox marketplace fee calculator, both directions, with progressive tiers
- Conversion hub plus eight curated amount pages
- Six guides: rates, rate history, requirements, Earned Robux, cashing out,
  fees and taxes
- Eleven trust and legal pages including a public changelog and corrections
  policy
- 30 local currencies via ECB reference rates, with provider, observation date
  and stale-fallback handling
- Shareable calculation URLs, local history and preferences
- Exact `bigint` rational arithmetic throughout the money path
- Build-time rate registry validation
- Keyword intelligence pipeline over both supplied exports
- Five validator scripts covering content, SEO, routes, links and budgets
- CI, Lighthouse, security scanning and Dependabot workflows

### Data corrections at launch

- **Bulgarian lev removed** from supported currencies. The ECB stopped
  publishing a BGN reference rate after 2025-12-31; the series is still returned
  by the API frozen at that date. The provider now rejects any series whose
  latest observation predates the USD one, so this class of problem is handled
  generally.

### Defects found and fixed during the build

Recorded because each was a real bug that shipped-looking code contained:

- **All 608 `[--color-*]` utilities emitted invalid CSS.** Tailwind v4 replaced
  the v3 shorthand with `(--color-*)`, so every colour utility across 43 files
  was silently discarded. Caught by axe reporting white text on a white
  background at 1.06:1.
- **Node-runtime proxy is unsupported by the Cloudflare adapter.** Security
  headers and the `www` redirect moved into `next.config.ts`.
- **`dynamicParams = false` returned `NoFallbackError`** for every prerendered
  amount page under the Workers runtime while working under `next start`.
  Replaced with an explicit `notFound()`.
- **Tables inside grid columns pushed the page sideways** by 227px at 320px,
  because grid items default to `min-width: auto`.
- **The rate comparison table clipped a money value mid-digit** at 1024px.
  Moved full-width below the grid. Found by looking at screenshots, not by an
  assertion.
- **Mode changes used `replaceState`**, so the back button skipped past them.
- **With JavaScript disabled on a phone the header had no navigation**, since
  the desktop nav is hidden below `md` and the menu button needs scripts.
- **Duplicate keyword rows resolved by file order**, discarding the largest term
  in the dataset — `robux to usd` at 16,470 volume lost to a 30-volume duplicate.
- **Brand detection ran after spelling folding**, turning the competitor brand
  `rbx tax` into `robux tax` and routing it to this site's own calculator.
- **A four-digit amount was read as a year**, sending `how much is 2000 robux in
  dollars` to the rate history page.
- **Eight generated amount pages shared identical anchor text**, which reads as
  a sitewide exact-match link block.
- **The parser reported `1.2.3` as "not a number"** rather than as a separator
  problem.
- **The focus indicator failed WCAG 2.2.** The specification's candidate
  `#f59e0b` measures 2.15:1 against white, below the required 3:1; darkened to
  `#a16207` at 4.96:1.
- **The generated SEO artefacts were stamped with the wall clock**, so every
  run rewrote all eleven files with nothing but a new timestamp. Because those
  files are committed and CI fails when regenerating changes them, the drift
  check would have been red on every run and therefore ignored. They now carry
  the export date and a digest of the source CSVs, so a regeneration is
  byte-identical unless an input actually changed.
- **Every page exceeded the Worker CPU limit on the first deployment.**
  Cloudflare returned `error code: 1102` for anything that rendered, while
  `/api/health/` kept working: each request ran a full Next.js render inside
  the Worker even for pages whose HTML was fixed at build time. Prerendered
  pages are now served from static assets through cache interception.
- **The www redirect emitted a literal `:path*` in the `Location` header** for
  the root, because the capture is empty there — the www homepage pointed at a
  URL that does not exist. The same rule also dropped the trailing slash,
  making every other www page a two-hop chain.
- **The colour-contrast audit sampled colours mid-animation**, reporting 58
  violations for values that pass at both ends of the theme transition. A
  defective test, not a defective site, and an intermittent one.
- **The analytics test waited on `networkidle`**, which never settles against a
  real CDN; it timed out at 45s on a page that had fully rendered.

### Deliberately not included

- No universal Robux purchase price — Roblox prices by package, region and
  platform, so any single figure would be invented
- No DevEx processing time — Roblox publishes none
- No country-specific tax guidance — needs qualified review and maintenance
- No `FAQPage` structured data — Google removed the rich result
- No `Organization` node — no real organisation name is configured, and
  inventing one would be fabrication
- No page per amount, per currency or per spelling variant

[1.0.0]: https://devexcalculator.org/
