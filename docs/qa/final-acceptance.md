# Final acceptance

Checked 2026-08-17 against the acceptance gate in the master specification.

**Status: complete except deployment**, which is blocked by an environment
permission policy and needs the repository owner. Everything deployment depends
on is verified.

Legend: **PASS** · **BLOCKED** (needs an operator) · **DEFERRED** (with reason).

## Repository and architecture

| Item | Status | Evidence |
|---|---|---|
| Next.js App Router + React + strict TypeScript | PASS | Next 16.3.1, React 19.2.8, TS 5.9.3 strict |
| Runs through Cloudflare Workers/OpenNext, not Vercel or Pages | PASS | `.open-next/worker.js`, verified under `wrangler dev --local` |
| Wrangler configuration valid | PASS | `wrangler deploy --dry-run` resolves all bindings |
| Builds from `npm ci` | PASS | Clean install verified |
| Versions and lockfile committed | PASS | Exact versions in `package.json`, `package-lock.json` committed |
| No destructive unreviewed changes | PASS | Empty repository; nothing existed to destroy |

## Product

| Item | Status | Evidence |
|---|---|---|
| Homepage calculator works | PASS | E2E, three browsers |
| Standard rate accurate | PASS | 30,000 → $114.00, the figure Roblox publishes |
| Legacy rate accurate | PASS | 30,000 → $105.00 |
| Conditional U.S. 18+ accurate | PASS | 30,000 → $162.00 |
| Split mode does not double count | PASS | Separate inputs per bucket; bucket total asserted equal to input total |
| Reverse target rounds up | PASS | $1,000 → 263,158 Robux |
| Minimum state not mislabelled as eligibility | PASS | "Meets the stated minimum"; a test asserts "you are eligible" appears nowhere |
| Fee and tax controls optional and honest | PASS | Zero by default; labelled as the user's own figures |
| Share URLs reload state | PASS | E2E reload and hostile-parameter tests |
| Copy, reset and history work | PASS | E2E including clipboard verification |
| FX failure does not break USD | PASS | E2E with the endpoint stubbed to 503 |

## Data and sources

| Item | Status | Evidence |
|---|---|---|
| Rates have official sources and dates | PASS | Registry validates at build; every rate cites a resolvable source |
| Both CSVs completely processed | PASS | 444 of 444 rows |
| Every source row accounted for | PASS | 376 included, 63 duplicate, 5 excluded, **0 ambiguous** |
| Route ownership has no conflicts | PASS | 196 canonical owners, 0 conflicts |
| Source registry validates | PASS | JSON Schema plus load-time checks |
| No stale competitor claim published | PASS | Every figure recomputed from the registry |

## Content and SEO

| Item | Status | Evidence |
|---|---|---|
| P0/P1 routes complete | PASS | 32 routes |
| No thin indexable route | PASS | Every route renders 800+ characters without JavaScript |
| No doorway pattern | PASS | 8 amount pages of 63 candidates, each manually approved |
| No mass low-value amount pages | PASS | Cap 12, published 8; bidirectional drift check |
| Titles, descriptions, H1s, canonicals unique | PASS | `validate:content` and `validate:routes` |
| Internal links crawlable | PASS | 1,755 links crawled, 0 failures |
| No indexable orphan | PASS | 0 orphans |
| Sitemap only canonical 200 indexable URLs | PASS | Sitemap and route set match exactly, both directions |
| `lastmod` meaningful | PASS | From `dateModified`, never build time; asserted |
| Structured data matches visible content | PASS | Breadcrumb markup asserted against the visible trail |
| No deprecated FAQ rich-result dependency | PASS | No `FAQPage`; asserted absent |
| No copied competitor prose or assets | PASS | All copy original; audit boundaries recorded |

## UX and accessibility

| Item | Status | Evidence |
|---|---|---|
| Layouts manually reviewed | PASS | 134 screenshots reviewed; two issues found, one fixed |
| No horizontal overflow at 320px | PASS | 126 of 126 assertions |
| Navigation and calculator keyboard accessible | PASS | E2E keyboard suite |
| Focus visible | PASS | Computed outline asserted; 4.96:1 |
| Errors and results announced | PASS | `role="alert"`, `aria-describedby`, polite live region |
| No critical axe violations | PASS | **0 violations** across 15 routes plus result and dark states |
| 200% zoom usable | PASS | E2E |

## Performance and security

| Item | Status | Evidence |
|---|---|---|
| No critical console errors | PASS | Lighthouse `errors-in-console` clean |
| No secrets in client or Git | PASS | Secret scan in CI; `.dev.vars` and `.env` untracked |
| Security headers tested | PASS | `validate:routes` and E2E |
| Contact protected and honest | PASS | 503 when unconfigured; origin, rate limit, honeypot, Turnstile |
| Turnstile server-validated when enabled | PASS | Fails closed; action and hostname pinned |
| Worker bundle within limits | PASS | 1.99 MB gzipped, 66% of 3 MB |
| Core Web Vitals met | PASS | Desktop 100; mobile 98 with LCP 2.5s at the boundary |
| Disabled analytics do not load | PASS | E2E network assertion plus a bundle grep |

## Delivery

| Item | Status | Evidence |
|---|---|---|
| CI passes | BLOCKED | Workflows committed; no remote to run them on (B-002) |
| Workers preview passes | PASS | 83 E2E tests against `wrangler dev --local` |
| Public production verification | BLOCKED | Deployment refused by environment policy (B-001) |
| `www` redirects correctly | PASS (config) | Configured in `next.config.ts`; needs live verification |
| Rollback documented | PASS | `docs/cloudflare-deployment.md` |
| Final report records commit and deployment | PASS | Commit recorded; deployment id pending |

## Deferred, with reasons

| Item | Reason |
|---|---|
| WebKit/Safari testing | Browser not installed; Chromium and Firefox covered |
| Live screen-reader testing | Needs a daily user; stated as a limitation on `/accessibility/` |
| Field Core Web Vitals | Needs production traffic |
| Country-specific tax guidance | Needs qualified review and ongoing maintenance |
| Universal Robux purchase price | Roblox prices by package, region and platform; any single figure would be invented |
| DevEx processing times | Roblox publishes none |
| `/guides/[slug]/` articles | Would cannibalise the existing pillars (D-007) |

## Summary

Every applicable gate passes. Two items are blocked on operator authorisation
rather than on implementation, and both are documented with the exact commands
needed.

The seven deferrals are deliberate. Five of them are refusals to publish
something that would be invented — which the specification requires — rather
than work left undone.
