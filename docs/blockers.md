# Blockers

## Open

### B-006 · Cloudflare injects an analytics beacon the privacy page denies

**Status:** open, awaiting an account-level setting change.
**Raised:** 2026-08-18.

`/privacy/` states plainly: *"No analytics provider is configured, so no
tracking script is loaded and no analytics cookie is set."* The deployment
contradicts it. Cloudflare injects
`static.cloudflareinsights.com/beacon.min.js` into HTML responses at the edge,
after the Worker has replied.

The application is not doing this. `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` is unset,
the Worker emits no beacon, and the injection is not in the bundle.

**It only happens for browser-like requests.** `curl` receives HTML without the
beacon; `curl` with a browser `User-Agent` and `Accept: text/html` receives it.
That is why every server-side validator here — route checks, link crawl,
duplicate detection — reports clean, and only the browser E2E suite run against
the deployment catches it:

```
[desktop-chromium] › no analytics script loads when none is configured
[mobile-chromium]  › no analytics script loads when none is configured
[desktop-firefox]  › no analytics script loads when none is configured
```

**Two honest resolutions, and the choice is the owner's:**

1. **Turn the injection off** — Cloudflare dashboard, Web Analytics for this
   site, or the zone's Browser Insights setting. The privacy page then becomes
   true again with no code change. Account-level RUM auto-install is enabled
   for two other zones on this account but not for `devexcalculator.org`, so
   the switch is elsewhere in the dashboard.
2. **Keep it and disclose it.** Cloudflare Web Analytics sets no cookie and
   does not track across sites, so it is defensible — but the privacy page must
   then say it is running, and the claim that the section "reads from the same
   configuration the site uses, so it cannot fall out of step" has to go,
   because an edge injection is exactly how it falls out of step.

Not resolved unilaterally: rewriting a privacy statement to match tracking the
owner may not want is the wrong direction to reconcile the two.

The failing test is left failing on purpose. It is reporting the truth.

---

### B-002 · No GitHub remote configured

**Status:** open — the repository exists, the push needs access.
**Raised:** 2026-08-17. **Updated:** 2026-08-18.

The owner supplied `https://github.com/ahmadgaming99991-gif/devexcalculator.org`
(public, empty). The remote is configured. The push cannot proceed because the
authenticated CLI account is a different user:

```
gh auth status  → eazagaz-cpu
repo permissions → {"admin": false, "push": false, "pull": true}
```

Either grant that account write access on the repository, or authenticate as
the owner:

```bash
gh auth login            # as ahmadgaming99991-gif
git push -u origin main
```

The tree was scanned before the remote was added: only `.env.example` and
`.dev.vars.example` are tracked, both placeholders, and no token-shaped string
appears anywhere in the history. It is safe to publish.

CI workflows, Dependabot and the security scan are committed and will run on the
first push. Cloudflare Workers Builds can then be connected —
`docs/cloudflare-deployment.md` has the exact settings.

---

## Resolved

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
