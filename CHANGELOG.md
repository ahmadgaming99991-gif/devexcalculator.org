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
- **A chart axis printed the same tick twice.** The generic formatter rounded
  values that were already in millions, producing an axis reading 0k, 1k, 1k,
  2k, 2k. Found by looking at the rendered chart, not by an assertion.

### Added after launch

- `/platform/` — live player counts for the experiences Roblox is ranking, read
  server-side from Roblox's own public endpoints, plus a chart of what this site
  has observed. The window reports the period actually collected and widens on
  its own; nothing is back-filled.
- `/platform/stock/` — Roblox's reported results, with no embedded market
  widget and no fabricated price. Wired for a server-side provider behind
  `STOCK_PROVIDER` and `STOCK_API_KEY`.
- A Cloudflare Cron Trigger every 15 minutes recording observations into Workers
  KV, retained 14 days by key expiry. Reverses decision D-011; see D-027.
- `/roblox-stats/` — Roblox's reported creator payouts charted from its SEC
  filings, with reported and derived figures kept in separate fields, plus the
  engagement figures Roblox does publish and a named list of the ones it never
  does rather than estimates standing in for them.
- `/api/` documents the public endpoints and is served from that route itself
  rather than through a rewrite, and is no longer blocked in `robots.txt`.
- Atom and JSON feeds of rate changes, now linked visibly in the footer rather
  than only in `<link rel>`.
- Split mode divides a group's Earned Robux between collaborators, and the
  cash-out guide's preparation checklist keeps a reader's place.
- Four hand-authored diagrams for what the guides could previously only
  describe, drawn in CSS and SVG with no charting dependency.
- A per-route Open Graph card for seven pages, each carrying that page's own
  figure from the rate registry instead of the shared site card.
- Seven days of per-experience history, reached by sampling hourly rather than
  by storing more points.
- A collector heartbeat, and a health endpoint that can actually fail: it
  reports 503 once the collector is critically stale.
- The build's commit SHA and time, read from `git` at build and reported by the
  health endpoint — kept out of the client bundle so a per-build value cannot
  churn cached JavaScript.
- The site's own social profiles in the footer, in each network's colours,
  drawn in CSS with no third-party badge or script, and asserted for contrast
  in both themes.
- The footer now carries the standard rate, the minimum and the verification
  date, each read from the registry and linking to the page that explains it.
  The date's age and the copyright year are computed in the reader's browser,
  so they stay correct without a rebuild — while the verification date itself
  never advances on its own.

- Grouped header navigation. Four menus carry twenty-one destinations where a
  flat row carried eight, built on native `<details>` so they open with
  JavaScript disabled and every link is in the delivered HTML.
- An earnings goal planner on `/usd-to-robux/`. Enter a payout target and
  either what you earn or when you need it, and it works out the other: a
  projected date, or the Earned Robux a day required to reach the date. No
  default tax rate, no default fee, no growth model, and no date presented as
  one Roblox has committed to.

- An automatic check against Roblox's own DevEx document, four times a day.
  Roblox publishes that page as markdown with its own `last_updated` field; a
  scheduled job re-reads it and compares the rates and the minimum to the ones
  this site publishes. The footer gains a second, separately-labelled date —
  "checked", which moves every day — beside the "verified" date, which still
  records the day a person read the documentation and still never advances on
  its own. The check may confirm and may never rewrite: a changed figure raises
  a flag for a person rather than copying a number into the registry, and a
  document it cannot recognise is reported as unreadable rather than as a rate
  that has been withdrawn. Published at `/api/rate-check/`.

- The real brand mark, in the header and footer, on social cards and as every
  app and browser icon. Only the mark is taken from the supplied artwork: its
  "Calculator" wordmark is white at low opacity and would be invisible on the
  light theme, so the name beside the mark stays real text that follows the
  theme and can be read aloud. Icons below about 40px are drawn rather than
  downscaled, because the calculator keys and the circling arrows merge at that
  size; they keep the hexagon and the dollar sign instead. 7 kB, decorative,
  with a 3D lift on hover for pointer and keyboard alike.

### Fixed

- **A screen-high header for anyone browsing without JavaScript.** With
  scripting off the whole grouped navigation renders inline in the header, and
  the header is sticky — on a phone that pinned about eleven hundred pixels of
  menu over the page for the entire scroll. Found by a no-JavaScript test that
  had been returning early, and passing, in every environment it had ever run
  in.
- **The homepage could not be cached anywhere.** It renders per request to read
  shared-calculation links, so Next marked it `no-store`; the root document took
  1,030 ms and the page was disqualified from the browser's back/forward cache.
  Query-free requests to five pure routes are now cacheable at the edge.
- **The brand mark shipped 88% more image than it displayed.** Three densities
  now ship instead of one; 2.3 kB on an ordinary screen, immutable for a year
  behind a versioned path.

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
