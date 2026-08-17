# Blockers

## Open

### B-001 · Production deployment requires operator authorisation

**Status:** blocked, awaiting the repository owner.
**Raised:** 2026-08-17.

`npx wrangler deploy` was refused by this environment's permission policy, which
gates outward-facing actions. This is a sandbox restriction, not a technical
failure — no workaround was attempted.

**Everything deployment depends on is done and verified:**

| | |
|---|---|
| Cloudflare authentication | Present — `wrangler whoami` resolves an account with `workers (write)` |
| OpenNext build | Succeeds |
| Worker bundle | 1.99 MB gzipped, 66% of the 3 MB limit |
| Wrangler dry run | Succeeds; bindings resolve |
| Workers runtime preview | Serves every route correctly |
| E2E against the Workers runtime | 83 passing |
| Quality gates | All passing |

**To deploy:**

```bash
npm run cf-build
npx wrangler deploy
```

Then bind the custom domain, configure the `www` redirect and run the
post-deploy checklist — all in `docs/cloudflare-deployment.md`.

---

### B-002 · No GitHub remote configured

**Status:** blocked, awaiting the repository owner.
**Raised:** 2026-08-17.

The repository is initialised with six commits on `main` and no remote. The
specification is explicit that a GitHub owner must not be invented, so none was.

`gh` is authenticated as `eazagaz-cpu`, so the owner can create and push:

```bash
gh repo create devexcalculator.org --private --source=. --remote=origin
git push -u origin main
```

CI workflows, Dependabot and the security scan are committed and will run on the
first push. Cloudflare Workers Builds can then be connected —
`docs/cloudflare-deployment.md` has the exact settings.

---

## Resolved

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
