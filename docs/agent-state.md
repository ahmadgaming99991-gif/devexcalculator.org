# Agent state

Last updated 2026-08-17.

## Phase

**All ten phases complete except production deployment**, which is blocked on
operator authorisation (blocker B-001).

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
| 10 · GitHub, preview, production, post-deploy | **Blocked** — B-001, B-002 |

## Branch and commits

`main`, no remote configured (B-002).

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
| `npm run build` | Succeeds, 32 routes |
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

1. **Production deployment.** `npx wrangler deploy` was refused by this
   environment's permission policy. Cloudflare authentication is present and
   every prerequisite verified. See B-001.
2. **GitHub remote.** No remote configured, because the specification forbids
   inventing an owner. `gh` is authenticated as `eazagaz-cpu`. See B-002.

## Deployment state

Not deployed. The Worker has never been created, so there is no production
deployment to replace and no rollback target — which is why deploying is safe
whenever it is authorised.

## Next actions

For the repository owner, in order:

```bash
# 1. Create the remote and push
gh repo create devexcalculator.org --private --source=. --remote=origin
git push -u origin main

# 2. Confirm CI passes on the first push

# 3. Deploy
npm run cf-build
npx wrangler deploy

# 4. Bind devexcalculator.org in the Cloudflare dashboard,
#    add the www redirect rule, then:
BASE_URL=https://devexcalculator.org npm run test:e2e
```

Full detail in `docs/cloudflare-deployment.md`. The post-deploy checklist is
there too, and `docs/final-implementation-report.md` has spaces reserved for the
deployment id and verification results.

## Maintenance the owner inherits

- **Verify rates weekly for the first month**, then monthly. The registry warns
  at 30 days and escalates at 90. A rate change is the one event that makes
  every page wrong at once.
- Regenerate the FX fallback snapshot quarterly with `npm run fx:snapshot`.
- Rerun `npm run seo:analyze` whenever a keyword export is replaced; CI fails if
  `seo/generated/` drifts.
