# Cloudflare deployment

## Target

| | |
|---|---|
| Worker name | `devexcalculator-org` |
| Production branch | `main` |
| Apex | `devexcalculator.org` |
| Alternate | `www.devexcalculator.org` → 308 → apex |
| Adapter | `@opennextjs/cloudflare` 1.20.2 |
| Entry | `.open-next/worker.js` |
| Assets | `.open-next/assets`, bound as `ASSETS` |
| Compatibility date | `2026-06-01` |
| Compatibility flags | `nodejs_compat`, `global_fetch_strictly_public` |

`.open-next/` is build output and is not committed.

## Local commands

PowerShell and WSL differ only in path syntax; the commands are the same.

```powershell
# Windows PowerShell
npm ci
npm run dev              # http://localhost:3000, standard Next.js
npm run build            # production build
npm run cf-build         # OpenNext -> .open-next/
npx wrangler dev --local # Workers runtime on http://127.0.0.1:8787
```

```bash
# WSL / Linux / macOS
npm ci
npm run dev
npm run preview          # cf-build + Workers preview in one step
```

### Windows note

The OpenNext build and `wrangler dev --local` both run on native Windows — this
was verified during the build, and the full E2E suite passes against the local
Workers runtime there. `npm run preview` chains the two with `&&`, which
PowerShell 5.1 does not support; run the two commands separately, or use WSL.

Testing against the Workers runtime is not optional. Two defects appeared only
there and passed under `next start`:

- Node-runtime proxy is unsupported by the adapter (decision D-003).
- `dynamicParams = false` returns `NoFallbackError` for every prerendered path
  (decision D-004).

## Release gate

Run before any deployment:

```bash
npm run check          # lint, types, unit, content, SEO, build, routes, links, bundle
npm run cf-build
npm run validate:worker
BASE_URL=http://127.0.0.1:8787 npm run test:e2e
```

Current measurements:

| Check | Result |
|---|---|
| Unit and integration tests | 363 passing |
| E2E (Chromium, mobile Chromium, Firefox) | 248 passing |
| E2E against the Workers runtime | 83 passing |
| Worker bundle | 1.99 MB gzipped, 66% of the 3 MB limit |
| Shared client JavaScript | 127.7 kB gzipped, budget 130 kB |
| Indexable routes | 32, all returning 200 |

## First deployment

```bash
npx wrangler whoami          # confirm the account
npm run cf-build
npx wrangler deploy --dry-run --outdir .wrangler/size-check   # verify size
npm run deploy
```

`npm run deploy` runs `opennextjs-cloudflare build && opennextjs-cloudflare deploy`.

## Custom domain

After the first successful deployment:

1. **Workers & Pages → devexcalculator-org → Settings → Domains & Routes → Add
   custom domain** → `devexcalculator.org`. Cloudflare provisions the
   certificate.
2. Check no other Worker route or Pages project already claims the hostname.
   Investigate any conflict before removing anything.
3. **SSL/TLS → Overview** → Full (strict).
4. `www` → apex is handled two ways deliberately, so the canonical host holds
   if either is removed:
   - `next.config.ts` returns a 308 from `www` preserving path and query.
   - A Cloudflare **Redirect Rule**: when hostname equals
     `www.devexcalculator.org`, redirect 301 to
     `https://devexcalculator.org${http.request.uri.path}` preserving the query.
     Requires a DNS record for `www` (proxied).

## Workers Builds (GitHub integration)

**Workers & Pages → devexcalculator-org → Settings → Builds → Connect**

| Setting | Value |
|---|---|
| Repository | the GitHub repository for this project |
| Production branch | `main` |
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |
| Build variables | `NEXT_PUBLIC_SITE_URL=https://devexcalculator.org` |

Division of responsibility: **GitHub Actions runs the quality gates**
(lint, types, tests, validators, E2E, budgets); **Workers Builds builds and
deploys**. Neither duplicates the other, so there is no double deployment.

Enable pull-request previews for a preview URL per PR.

## Secrets

Only needed if the contact form is enabled. Never commit any of these.

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put CONTACT_EMAIL
npx wrangler secret put CONTACT_WEBHOOK_URL
```

Non-secret configuration lives in `vars` in `wrangler.jsonc`. Regenerate types
after changing bindings with `npm run cf-typegen`.

## Post-deploy verification

```bash
BASE_URL=https://devexcalculator.org npm run test:e2e
```

Then confirm by hand:

- [ ] `https://devexcalculator.org/` returns 200 over HTTPS
- [ ] `https://www.devexcalculator.org/devex-rates/?x=1` redirects **once** to the apex, preserving path and query
- [ ] The calculator produces $114.00 for 30,000 and $380.00 for 100,000
- [ ] All 36 routes in the sitemap return 200
- [ ] A missing path returns a real 404, not a redirect
- [ ] `/robots.txt`, `/sitemap.xml`, `/llms.txt` serve correctly
- [ ] `/_next/static/*` carries `immutable` caching
- [ ] `/api/health` reports `ok: true` and the expected registry version
- [ ] `/api/fx/latest` returns rates, or a labelled stale fallback
- [ ] Canonicals point at `https://devexcalculator.org`
- [ ] No console errors, no mixed content
- [ ] Security headers present on a page response
- [ ] Rates and verification dates on the live pages match the registry
- [ ] Cloudflare observability shows no new errors

Record the commit SHA, Worker version id, deployment time and preview URL in
`docs/final-implementation-report.md`.

## Rollback

```bash
npx wrangler deployments list
npx wrangler rollback --message "Reason for rollback"
```

Or **Workers & Pages → devexcalculator-org → Deployments → ⋯ → Rollback**.

Rollback is immediate and needs no rebuild. Never delete a previous deployable
version.

If a rate is wrong rather than the deployment: correct
`src/data/rates.json`, update the affected tests, add a changelog entry and
redeploy. Rolling back would restore the previous — also wrong — figure.

## Observability

Enabled in `wrangler.jsonc` at a 100% head sampling rate. Traffic at this scale
does not justify sampling down, and a complete picture is more useful than a
cheaper one.

```bash
npx wrangler tail                    # live logs
npx wrangler tail --status error     # errors only
```

Logged: request ids, FX provider failures by code, contact delivery failures,
Turnstile rejection reasons. Never logged: contact message content, calculator
values, or any secret.

---

## Deployment of record

Deployed 2026-08-18 to account `Ahmadgaming99991@gmail.com's Account`.

| | |
|---|---|
| Worker | `devexcalculator-org` |
| Hostnames | `devexcalculator.org`, `www.devexcalculator.org` — both custom domains |
| Bundle | 8,485 KiB raw, 2,044 KiB gzipped (68% of the 3 MB limit) |
| Worker startup | 27 ms |
| Assets | 74 files, including the prerendered HTML |
| `workers.dev` | disabled — the site answers only on its own domain |

Routing is declared in `wrangler.jsonc`, not clicked into the dashboard, so a
rebuild from this repository reproduces it.

### Verified against the deployment

| Check | Result |
|---|---|
| 36 indexable routes, metadata, structured data | pass |
| Internal link crawl | 1,947 links, 0 failures |
| Near-duplicate detection | pass, 0 warnings |
| Browser E2E, 3 browsers | 245 of 249, see below |
| Security headers | HSTS, CSP, COOP, `x-frame-options`, `x-content-type-options`, `referrer-policy`, `permissions-policy` all present |
| `www` → apex | single hop, path and query preserved |

The four non-passing results are three browsers reporting the same finding —
B-006, the injected analytics beacon — plus one skip.

### Outstanding settings, dashboard only

Neither can be set from this repository, and both need the account owner.

1. **Always Use HTTPS is off.** `http://devexcalculator.org/` currently answers
   `200` in plaintext instead of redirecting to HTTPS. HSTS is served, so a
   browser that has already visited will upgrade on its own, but a first-time
   plaintext request is not redirected. SSL/TLS → Edge Certificates → Always
   Use HTTPS.

2. **A redirect rule for `www` would remove the second hop.** The Next.js
   rules answer correctly today, and a page request costs two hops because the
   destination cannot carry a trailing slash without breaking `/sitemap.xml`.
   An edge rule redirecting to
   `concat("https://devexcalculator.org", http.request.uri)` preserves the path
   exactly and answers in one hop, before the Worker runs.

`/robots.txt` on `www` is served from static assets and does not redirect. That
is intentional and correct: a host should answer its own `robots.txt` rather
than redirect it.

