# Security model

## Attack surface

The site is almost entirely static content. What executes on request:

| Endpoint | Method | Auth | State-changing |
|---|---|---|---|
| `/api/health` | GET | None | No |
| `/api/rates` | GET | None | No |
| `/api/fx/latest` | GET | None | No |
| `/api/contact` | POST | None | **Yes**, when configured |
| `/`, `/robux-to-usd/`, `/usd-to-robux/`, `/devex-fees-and-taxes/`, `/conversions/` | GET | None | No (read `searchParams`) |

There is no database, no session, no cookie the site sets itself, and no
authenticated area. Calculations run in the browser and are never transmitted.

## Input handling

**Query parameters** (`src/features/devex/url-state.ts`) are validated before
anything reaches the engine: length capped at 24 characters, character class
restricted, numeric range checked against the documented limits, rate ids
resolved against the registry, currency codes checked against the supported
list. Anything failing falls back to a safe default rather than propagating.

**Contact submissions** (`src/lib/validation/contact.ts`) are validated
server-side regardless of what the browser checked. Control characters are
stripped, every field has a strict length limit, and the body is capped at
16 KB before parsing. Non-string input is coerced to empty rather than throwing.

**Output escaping.** The only user-controlled value that reaches an output
context is a contact message rendered into an HTML email, escaped by
`escapeHtml`. No `dangerouslySetInnerHTML` carries user input — the single use
is the JSON-LD graph, built from typed server data with `<` escaped so the JSON
cannot terminate the script element.

## Contact endpoint

Checks run cheapest-first so a flood never reaches Turnstile's API or an email
provider:

1. **Mode configured** — 503 with `CONTACT_DISABLED` if not. It never accepts a
   message it would discard.
2. **Origin** — a cross-origin POST is rejected with 403. This endpoint only
   ever serves this site's own form.
3. **Rate limit** — 5 submissions per 10 minutes per client IP.
4. **Body size** — 413 above 16 KB, checked before and after reading.
5. **Field validation**, including a honeypot.
6. **Turnstile**, verified server-side.
7. **Delivery.**

**Honeypot.** A hidden `website` field, out of the tab order and hidden from
assistive technology. A filled value returns a generic "could not be accepted"
message — a bot must learn nothing about which check it failed.

**Turnstile.** The client widget proves nothing; every token is redeemed against
`siteverify`. Action and hostname are pinned when configured, so a token minted
for another form or another site cannot be replayed. Verification **fails
closed**: an unreachable siteverify is not a pass. A stable idempotency key per
submission allows a genuine retry without permitting replay across submissions.

A server submission mode configured *without* `TURNSTILE_SECRET_KEY` is treated
as a misconfiguration and returns 503, rather than quietly accepting unprotected
submissions.

**Rate limiting is per-isolate.** It is an in-memory fixed window scoped to one
Worker isolate and does not coordinate globally. That is stated plainly in the
code rather than implied to be more than it is. A global limit would need a
Durable Object; decision D-011 records why one is not added. Turnstile is the
primary control here.

## Headers

Set in `next.config.ts` for dynamic responses and `public/_headers` for static
assets, and verified by `scripts/quality/check-routes.ts` and the E2E suite.

| Header | Value |
|---|---|
| `Content-Security-Policy` | See below |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | camera, microphone, geolocation, payment, USB and interest-cohort all denied |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `X-Frame-Options` | `DENY` |
| `x-powered-by` | Removed |

### CSP, and its one honest weakness

As served by production, where no analytics provider and no Turnstile key are
configured:

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self' data:;
connect-src 'self' https://api.devexcalculator.org;
frame-src 'none';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
object-src 'none';
upgrade-insecure-requests
```

**`connect-src` names one non-`'self'` origin, and it is this site's own.**
`/platform/` is a static document whose figures are fetched after load from the
platform data plane on `api.devexcalculator.org` — a separate, dependency-free
Worker that this repository builds and deploys, described in
`docs/platform-data-plane.md`. It is not a third party, it receives no data
about the reader, and it is read-only over HTTP. The origin is derived from
`NEXT_PUBLIC_PLATFORM_DATA_API`, the same variable the client bundle is built
against, so the policy cannot permit an origin the page never calls.

**The third-party allowlist is derived, not fixed.** `next.config.ts` adds
`static.cloudflareinsights.com`, `www.googletagmanager.com` and
`challenges.cloudflare.com` only when the environment variable that switches the
corresponding integration on is set — the same variables `src/config/site.ts`
reads. They were previously listed unconditionally, which mattered more than it
looks: with `'unsafe-inline'` already present, the origin allowlist is the part
of `script-src` still doing work, and `googletagmanager.com` will serve an
attacker-authored container. An entry for an integration that does not run is a
standing bypass. It also contradicted the privacy page, which states that no
tracking script loads.

`frame-src` falls to `'none'` rather than being omitted; an absent directive
would inherit `default-src 'self'` and permit same-origin framing.

**`script-src` includes `'unsafe-inline'`.** This is a real weakening and worth
stating rather than burying: Next.js inlines a bootstrap script, and the theme
script must run synchronously before first paint to avoid a flash of the wrong
theme. A nonce would need threading through every streamed chunk, which the
Cloudflare adapter does not currently support.

What limits the damage: `object-src 'none'`, `base-uri 'self'`,
`form-action 'self'` and `frame-ancestors 'none'` close the usual escalation
paths, the site renders no user-controlled HTML, and there is no authenticated
session or cookie for an injected script to steal.

*Revisit when:* the adapter supports nonce propagation.

`style-src 'unsafe-inline'` is required by React inline styles, used for the
progress-meter widths.

## Secrets

- `.dev.vars` and `.env*` are git-ignored; only `.example` files with empty
  values are committed.
- No secret is exposed to the client. `NEXT_PUBLIC_` carries only values that are
  safe by definition — the site URL, the Turnstile **site** key, a GA4
  measurement ID.
- `src/config/site.ts` rejects values starting `your_`, `example`, `changeme`,
  `placeholder` or `xxx`, so a copied `.env.example` placeholder disables the
  integration instead of rendering into HTML.
- The `security.yml` workflow scans tracked files for credential-shaped strings
  and fails if `.dev.vars` or `.env` are ever tracked.

## Error handling

Public errors are generic and carry a request id. Detail goes to the platform
log against that id. No stack trace, upstream URL or configuration value appears
in a response. Contact message content is never logged.

## Dependencies

Three runtime dependencies: `next`, `react`, `react-dom`. Everything else is a
development dependency and none reaches the browser. No third-party CDN is used
at runtime; fonts are system stacks with no network dependency.

`npm audit --omit=dev --audit-level=high` gates CI. Dev-dependency advisories
are reported but do not block, so a build-tool advisory cannot hold up a
content correction.

## Privacy

Calculations never leave the browser. Local storage holds only preferences and
calculations the reader explicitly saved, all clearable from the calculator. The
privacy policy reads from the same configuration the site uses, so it cannot
claim something is off while it is running.

## Known limitations

1. `'unsafe-inline'` in `script-src`, as described above.
2. Rate limiting is per-isolate, not global.
3. No external penetration test has been carried out.
4. Turnstile's own internal behaviour is outside this site's control.
