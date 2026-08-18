# Blockers

## Open

None. Both blockers are resolved; see below.

The only outstanding external value is not a blocker: `STOCK_API_KEY` and
`STOCK_PROVIDER` are unset at the owner's request, and `/platform/stock/`
states that plainly rather than printing an unattributed price.

---

## Resolved

### B-002 · No GitHub remote configured

**Resolved 2026-08-18.** The owner authenticated the CLI as the repository
owner. `main` now tracks
`https://github.com/ahmadgaming99991-gif/devexcalculator.org`, and every push
runs the CI and Security workflows; both are green on the current head.

The tree was scanned before the remote was added: only `.env.example` and
`.dev.vars.example` are tracked, both placeholders, and no token-shaped string
appears anywhere in the history. It was safe to publish, and remains so.

### B-006 · Cloudflare injected an analytics beacon

**Resolved 2026-08-18.** The zone had a Web Analytics RUM site with
`auto_install` enabled — created automatically when the custom domain was
attached, which is why an earlier check of the account's RUM sites did not show
it. The zone setting `rum` was `on` and editable, so it was turned off.

Verified by fetching four pages with a browser user agent: no request to any
analytics host. The privacy page no longer discloses a beacon, because there is
none to disclose, and the browser suite asserts the absence on every run —
including `cloudflareinsights.com`, so a re-enable would fail the build rather
than quietly making the privacy page untrue.

### B-001 · Production deployment

**Resolved 2026-08-18.** The owner supplied a Cloudflare API token and
authorised the deployment. `devexcalculator.org` and `www.devexcalculator.org`
are attached as custom domains, declared in `wrangler.jsonc` so the routing
lives in the repository rather than in a dashboard. Post-deploy verification
found three real defects, all fixed and redeployed: B-007, B-008 and the
redirect faults in `next.config.ts`.

### B-007 · Worker exceeded its CPU limit on every page

**Resolved 2026-08-18.** The first deployment served `error code: 1102` for
every rendered page while `/api/health/` kept working: each request ran a full
Next.js render inside the Worker, including for pages whose HTML was fixed at
build time. `open-next.config.ts` now uses the static-assets incremental cache
with `enableCacheInterception`, which returns the prerendered entry before the
render path. Prerendered HTML ships as assets — 29 files became 74 — and the
homepage went from consistently failing to 10/10 successful. Decision D-023.

### B-008 · The www redirect emitted an unsubstituted route token

**Resolved 2026-08-18.** `https://www.devexcalculator.org/` answered
`Location: https://devexcalculator.org/:path*` — the literal token. Under a
single `/:path*` rule the capture is empty at the root, so nothing is
substituted. The www homepage is the most likely www entry point there is.
A second fault in the same rule dropped the trailing slash, making every www
page a two-hop chain. Both fixed and verified in production. Decision D-024.


### B-003 · Node-runtime proxy unsupported by the Cloudflare adapter

**Resolved 2026-08-17.** The OpenNext build failed with *"Node.js middleware is
not currently supported."* The specification rules out the edge runtime, so
security headers and the `www` redirect moved into `next.config.ts`. Better
regardless — headers are applied by the framework rather than by invoking a
proxy on every request. Decision D-003.

### B-004 · `dynamicParams = false` returned 404 for every amount page

**Resolved 2026-08-17.** Under the Workers runtime every prerendered amount page
returned `NoFallbackError`, while working under `next start`. Replaced with an
explicit `notFound()` for unapproved slugs, which enforces the same guarantee.
Decision D-004.

### B-005 · Tailwind v4 CSS variable syntax

**Resolved 2026-08-17.** All 608 `[--color-*]` utilities across 43 files emitted
invalid CSS; Tailwind v4 replaced that shorthand with `(--color-*)`. Caught by
axe reporting white-on-white text at 1.06:1. Decision D-015.

### B-006 · ESLint FlatCompat crash

**Resolved 2026-08-17.** `eslint-config-next` 16 ships native flat configs;
routing them through `FlatCompat` throws on a circular plugin reference. Now
imported directly.

---

## Configuration left to the owner (not blocking)

Every item below is optional. The site builds, deploys and works with all of
them unset — each simply stays disabled and renders no UI and no scripts.

| Variable | Effect when set |
|---|---|
| `NEXT_PUBLIC_GA4_ID` | Enables GA4 behind a consent prompt |
| `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` | Enables cookieless Cloudflare Web Analytics |
| `NEXT_PUBLIC_ORGANIZATION_NAME` | Emits an Organization JSON-LD node |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Publishes a contact address |
| `CONTACT_MODE` + provider secrets | Enables the contact form |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` | Protects the contact form |

Two are deliberately absent rather than pending: no organisation name is
invented, and no contact mailbox is published, because the specification forbids
fabricating either.
