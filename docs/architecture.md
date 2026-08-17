# Architecture

## Stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js App Router | 16.3.1 |
| UI | React | 19.2.8 |
| Language | TypeScript, strict | 5.9.3 |
| Styling | Tailwind CSS | 4.3.3 |
| Adapter | `@opennextjs/cloudflare` | 1.20.2 |
| Deploy | Cloudflare Workers with Static Assets, Wrangler | 4.123.0 |
| Unit tests | Vitest | 4.1.10 |
| E2E | Playwright, `@axe-core/playwright` | 1.62.1 |

Versions are exact in `package.json` and locked in `package-lock.json`.

## Rendering

The governing principle: **the page explains itself without JavaScript, and
JavaScript adds live recalculation on top.**

- **Server Components** for layout, navigation, headings, rate tables,
  formulas, worked examples, FAQs, source notes and every internal link.
- **One client island**, the calculator (`src/features/devex/calculator.tsx`),
  plus three small ones: the mobile menu, the theme toggle and the marketplace
  calculator.
- **Static generation** for content pages and the eight approved amount pages.
- **Dynamic rendering** only where a route reads `searchParams`, so a shared
  calculator link renders its state into the initial HTML.
- **Route Handlers** for health, rates, FX and contact.

Shared client JavaScript is 127.7 kB gzipped, checked against a 130 kB budget
by `scripts/quality/check-bundle-budget.ts`.

## Layout of the source

```
src/
  app/             Routes, API handlers, robots, sitemap, manifest, OG image
  components/
    layout/        Header, footer, breadcrumbs, navigation, theme toggle
    ui/            Primitives: Button, Card, Table, Disclosure, Badge, Callout
    content/       Quick answers, source notes, disclaimers, FAQs, tables
    seo/           JSON-LD graph, analytics, consent
  features/
    devex/         Calculator island, URL state, local storage
    fx/            ECB provider, conversion hook, types
    marketplace/   Marketplace fee calculator
    contact/       Contact form
  lib/
    calculations/  Rational arithmetic, engine, registries, formatting
    content/       Route manifest, approved amount pages
    seo/           CSV parsing, normalisation, classification, scoring, graphs
    security/      Turnstile, rate limiting, request ids
    validation/    Contact input validation
    utilities/     useClientValue
  config/          Site config, navigation, feature flags
  data/            Rate registry, source registry, currencies, FX fallback
  types/           Shared types
```

## Data flow

```
src/data/rates.json
        │  validated at module load — an invalid registry fails the build
        ▼
lib/calculations/rate-registry.ts
        │
        ▼
lib/calculations/devex.ts ──────────► pure results as exact Rationals
        │                                      │
        ▼                                      ▼
features/devex/calculator.tsx          components/content/tables.tsx
   (client island)                        (server rendered)
        │                                      │
        └──────────► lib/calculations/format.ts ◄──────────┘
                     rounds once, at display
```

Both the interactive calculator and the static tables read the same engine, so
a table and the tool cannot disagree.

## The content manifest

`src/lib/content/route-registry.ts` is the single source of truth for every
route: canonical path, title, description, H1, parent, quick answer, sections,
FAQs, internal links, schema types, source ids and review dates.

It drives navigation, breadcrumbs, canonical URLs, metadata, the sitemap, the
JSON-LD graph, the internal-link graph and every validator. A route that is not
in the manifest does not exist as far as the crawl surface is concerned — which
is what keeps the sitemap, the canonicals and the link destinations from
drifting apart.

## Caching

| Response | Policy | Why |
|---|---|---|
| `/_next/static/*` | `max-age=31536000, immutable` | Content-hashed filenames |
| Static pages | Prerendered, served from the assets binding | No Worker invocation |
| `/api/fx/latest` | `s-maxage=43200, stale-while-revalidate=86400` | ECB publishes once per working day |
| `/api/rates` | `s-maxage=86400` | Changes only on a reviewed rate update |
| `/api/health` | `no-store` | Must reflect the live instance |
| `/api/contact` | `no-store` | State-changing |

No incremental cache override is configured in `open-next.config.ts`. Every
route is either prerendered or a short-lived handler managing its own
`Cache-Control`, so an R2 or KV cache would add a binding, a cost and a failure
mode for nothing.

## State

No database. No server-side session. Nothing about a visitor is stored.

- **Calculation state** lives in the URL as validated query parameters, which
  makes a calculation shareable and reloadable.
- **Preferences and history** live in `localStorage`, read through
  `useClientValue` so hydration stays consistent.
- **FX responses** are cached by the platform `fetch` cache, with a bundled
  snapshot as a labelled stale fallback.

## Failure modes

| Failure | Behaviour |
|---|---|
| FX provider down | USD calculator unaffected; stale snapshot shown and labelled, or an explanation if even that fails |
| `localStorage` unavailable | Everything works; nothing is remembered |
| JavaScript disabled | All content, navigation, rates, formulas and tables render; live recalculation is lost |
| Rate registry invalid | **Build fails.** Never deployed |
| Contact provider unconfigured | Endpoint returns 503 and the page says so; no form pretends to accept |
| Unapproved amount slug | Genuine 404 |

## Why Workers rather than the alternatives

The specification locks this in, and the reasoning holds: the site is
overwhelmingly static content with a small dynamic surface, which is what
Workers with Static Assets is built for. Prerendered pages are served from the
assets binding without invoking the Worker at all; only the four API routes and
the three `searchParams` pages execute code.

Two adapter constraints shaped real decisions and are recorded in the decision
log: no Node-runtime proxy (D-003) and no `dynamicParams = false` (D-004).
