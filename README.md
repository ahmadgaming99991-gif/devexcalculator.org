# DevEx Calculator

Independent Roblox DevEx payout estimates for creators, at
[devexcalculator.org](https://devexcalculator.org).

Converts eligible Earned Robux into an estimated US dollar payout using the
rates Roblox currently documents, with the source and verification date shown
next to every figure.

**Not affiliated with Roblox Corporation.** Roblox, Robux and Developer Exchange
are trademarks of Roblox Corporation, used descriptively.

---

## Quick start

```bash
npm ci
npm run dev          # http://localhost:3000
```

## What it does

Four calculators and six guides, built on one validated rate registry.

- **DevEx calculator** — quick, split and target modes across the standard
  (0.0038), legacy (0.0035) and conditional U.S. 18+ (0.0054) rates
- **Robux to USD** — separates creator payout from retail purchase price
- **Payout target** — Earned Robux needed for a dollar goal, rounded up
- **Roblox tax calculator** — marketplace commission, both directions
- 30 local currencies via ECB reference rates, with provenance and stale
  handling
- Shareable calculation URLs, local history, optional fee and tax modelling

Every rate-sensitive page shows its source and the date it was last checked.

## How it is built

**Next.js 16 App Router · React 19 · TypeScript strict · Tailwind 4 ·
Cloudflare Workers via OpenNext**

Three principles shape most of the code:

**The page explains itself without JavaScript.** Rates, formulas, tables,
examples, FAQs and every link are server-rendered. JavaScript adds live
recalculation, not comprehension.

**Money is never a float.** `0.0038` is not representable in binary floating
point — `17000 * 0.0054` gives `91.80000000000001`. Every value is an exact
`bigint` fraction until it is displayed.

**Nothing is published without a source.** The rate registry validates at build
time: an unsourced or internally inconsistent rate fails the build rather than
shipping.

## Commands

```bash
npm run dev              # development server
npm run build            # production build
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
npm run test             # Vitest — 574 unit and integration tests
npm run test:e2e         # Playwright — 565 tests, three browsers
npm run test:a11y        # accessibility suite only
npm run test:visual      # capture 134 screenshots for review

npm run validate:content # content manifest
npm run validate:seo     # keyword pipeline, cannibalisation, sitemap agreement
npm run validate:routes  # metadata, canonicals, schema, headers (needs a build)
npm run validate:links   # internal link crawl (needs a build)
npm run validate:bundle  # client JavaScript budget
npm run validate:worker  # Worker size via wrangler dry run

npm run check            # everything above except e2e and visual

npm run seo:analyze      # regenerate seo/generated/ from the source exports
npm run fx:snapshot      # regenerate the FX fallback snapshot
```

### Cloudflare

```bash
npm run cf-build         # OpenNext build
npm run deploy           # build and deploy
npm run cf-typegen       # regenerate binding types
```

**Windows (PowerShell):**

```powershell
npm run cf-build
npx wrangler dev --local     # Workers runtime on http://127.0.0.1:8787
```

**WSL, Linux, macOS:**

```bash
npm run preview              # cf-build + preview in one step
```

`npm run preview` chains with `&&`, which PowerShell 5.1 does not support — run
the two commands separately there.

**Test against the Workers runtime, not only `next start`.** Two defects
appeared only there and passed under `next start`; both are recorded in
`docs/decision-log.md` (D-003, D-004).

## Configuration

Everything optional. The site builds and runs with all of it unset — each
integration simply stays disabled and emits no UI and no scripts.

Copy `.env.example` to `.env.local` and `.dev.vars.example` to `.dev.vars`.

| Variable | Effect |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical origin; defaults to the production URL |
| `NEXT_PUBLIC_GA4_ID` | GA4 behind a consent prompt |
| `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` | Cookieless Cloudflare Web Analytics |
| `NEXT_PUBLIC_ORGANIZATION_NAME` | Emits an Organization JSON-LD node |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Publishes a contact address |
| `CONTACT_MODE` | `disabled` · `mailto` · `webhook` · `resend` |
| `TURNSTILE_SECRET_KEY` | Server-side Turnstile verification — **secret** |
| `RESEND_API_KEY` | Email provider — **secret** |

Placeholder values (`your_…`, `example`, `changeme`) are rejected, so a copied
example file disables the integration rather than rendering into HTML.

## Updating a rate

Rates change. The sequence is deliberately slow — a wrong rate published quickly
is worse than a right one published a day later.

1. Verify against the [official Roblox documentation](https://create.roblox.com/docs/production/monetization/developer-exchange).
2. Update `src/data/rates.json`, including `lastVerifiedAt`.
3. Update the expected values in `tests/unit/calculations/devex.test.ts`.
4. Review any page stating the figure in prose.
5. Add a `CHANGELOG.md` entry and a `/changelog/` entry.
6. `npm run check`, then deploy.

Never update a published rate from a scraped page without verifying it by hand.

## Layout

```
src/app/          Routes, API handlers, robots, sitemap, manifest, OG image
src/components/   Layout, UI primitives, content blocks, SEO
src/features/     Calculator, FX, marketplace, contact
src/lib/          Calculations, content manifest, SEO pipeline, security
src/data/         Rate registry, sources, currencies, FX fallback
seo/              Source exports, manual overrides, generated intelligence
scripts/          SEO pipeline, content and quality validators
tests/            unit · integration · e2e · visual · fixtures
docs/             Architecture, decisions, SEO strategy, QA, reports
schemas/          JSON Schemas for the shipped data files
```

## Documentation

| | |
|---|---|
| [Architecture](docs/architecture.md) | Stack, rendering, data flow, caching |
| [Calculation methodology](docs/calculation-methodology.md) | Formulas, exact arithmetic, rounding |
| [Decision log](docs/decision-log.md) | 21 decisions with reasoning |
| [Security model](docs/security-model.md) | Surface, headers, CSP, secrets |
| [Cloudflare deployment](docs/cloudflare-deployment.md) | Deploy, domain, rollback |
| [Design system](docs/design-system.md) | Tokens, contrast, components |
| [Accessibility report](docs/accessibility-report.md) | WCAG 2.2 AA results |
| [Performance report](docs/performance-report.md) | Lighthouse and budgets |
| [Test matrix](docs/qa/test-matrix.md) | What every suite covers |
| [Blockers](docs/blockers.md) | What still needs an operator |
| [SEO strategy](docs/seo/) | Keywords, routes, indexation, linking |

## Status

| | |
|---|---|
| Unit and integration | 377 passing |
| E2E, three browsers | 248 passing |
| E2E, Workers runtime | 83 passing |
| Lighthouse desktop | 100 / 100 / 100 / 100 |
| Lighthouse mobile | 98 / 100 / 100 / 100 |
| Worker bundle | 1.99 MB gzipped, 66% of limit |
| Client JavaScript | 127.7 kB gzipped |
| Routes | 36 indexable, 0 orphans |
| Keyword rows accounted for | 444 of 444 |

**Not yet deployed.** See [blockers](docs/blockers.md) — deployment and the
GitHub remote both need the repository owner.
