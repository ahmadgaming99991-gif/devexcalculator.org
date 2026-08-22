# Agent state

Last updated 2026-08-18.

## Phase

**All ten phases complete.** The site is deployed and verified in production;
no phase remains blocked.

| Phase | Status |
|---|---|
| 0 · Repository, environment and safety audit | Complete |
| 1 · Official research and competitor audit | Complete |
| 2 · CSV intelligence, topical map, route ownership | Complete |
| 3 · Architecture, scaffold, Cloudflare foundation | Complete |
| 4 · Design system and responsive shell | Complete |
| 5 · Calculation engine and core calculator | Complete |
| 6 · FX, APIs, security, optional integrations | Complete |
| 7 · Content, page templates, internal linking | Complete |
| 8 · Technical SEO, metadata, schema, crawl infrastructure | Complete |
| 9 · Full QA, performance, accessibility, visual acceptance | Complete |
| 10 · GitHub, preview, production, post-deploy | Complete |

## Branch and commits

`main`, tracking `origin` at `github.com/ahmadgaming99991-gif/devexcalculator.org`.

```
f8fdbe9  Add E2E and schema tests; fix a site-wide CSS bug and three real defects
efe6188  Add validation tooling; move headers to next.config and fix Workers routing
92ee6b8  Add all content pages, trust and legal set, and marketplace calculator
e95762b  Add design system, layout, calculator island, APIs and homepage
d5cf335  Add keyword intelligence pipeline and content manifest
fb5f002  Scaffold Next.js 16 + Cloudflare Workers project and exact-arithmetic engine
```

Working tree clean apart from the documentation commit in progress.

## Last verified results

| Check | Result |
|---|---|
| `npm run lint` | Clean |
| `npm run typecheck` | Clean |
| `npm run test` | 363 passing |
| `npm run validate:content` | 0 errors, 0 warnings |
| `npm run validate:seo` | Passed, 444 of 444 rows accounted for |
| `npm run build` | Succeeds, 36 routes |
| `npm run validate:routes` | Passed |
| `npm run validate:links` | 32 pages, 1,755 links, 0 failures |
| `npm run validate:bundle` | 127.7 kB of 130 kB |
| `npm run cf-build` | Succeeds |
| `npm run validate:worker` | 1.99 MB of 3 MB |
| `npm run test:e2e` | 248 passing, 1 skipped |
| E2E against `wrangler dev --local` | 83 passing |
| `npm run test:visual` | 14 passing, 134 screenshots |
| Lighthouse desktop | 100 / 100 / 100 / 100 |
| Lighthouse mobile | 98 / 100 / 100 / 100 |

## Known failures

None. Every check listed above passes.

## External authorisation still required

None. Both former blockers are resolved.

One value is outstanding by the owner's choice: `STOCK_API_KEY` and
`STOCK_PROVIDER` for the Finnhub adapter. `/platform/stock/` states that no
live price is configured rather than printing one it cannot attribute, so the
page is correct either way.

## Deployment state

Live at `https://devexcalculator.org`, Worker version
`e7fe682d-1211-4a1c-a035-84526f6bcf7d` from commit `740bd65`. Both custom
domains are attached and the `*/15 * * * *` cron is collecting platform
observations into KV. Rollback targets exist now, and the procedure is in
`docs/cloudflare-deployment.md`.

## Next actions

Redeploying after a change:

```bash
export CLOUDFLARE_API_TOKEN=...      # scoped token, kept outside the repo
npm run check                        # everything CI runs, plus the size budgets
npm run cf-build && npm run cf-populate
npx wrangler deploy
BASE_URL=https://devexcalculator.org npm run test:e2e
```

`cf-populate` is not optional: without it the prerendered pages are absent from
the assets bundle and every request runs a full render inside the Worker, which
is what caused B-007. Full detail in `docs/cloudflare-deployment.md`.

## Maintenance the owner inherits

- **Verify rates weekly for the first month**, then monthly. The registry warns
  at 30 days and escalates at 90. A rate change is the one event that makes
  every page wrong at once.
- Regenerate the FX fallback snapshot quarterly with `npm run fx:snapshot`.
- Rerun `npm run seo:analyze` whenever a keyword export is replaced; CI fails if
  `seo/generated/` drifts.
