# Performance report

Measured 2026-08-17 against `next start` on the development workstation
(Windows 11, Node 24.16.0), Lighthouse 12 via `npx lighthouse`.

**These are local numbers.** A workstation with no network latency and no CPU
contention flatters every metric. They establish that nothing is structurally
slow; they are not a claim about field performance. Real Core Web Vitals need
field data after deployment.

## Lighthouse

### Desktop preset

| Page | Perf | A11y | Best practices | SEO | LCP | TBT | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/` | **100** | **100** | **100** | **100** | 0.6 s | 0 ms | 0 |
| `/devex-rates/` | **100** | **100** | **100** | **100** | 0.5 s | 0 ms | 0 |
| `/conversions/` | **100** | **100** | **100** | **100** | 0.6 s | 0 ms | 0 |

Homepage detail: FCP 0.3 s · Speed Index 0.4 s · Time to Interactive 0.6 s.

### Mobile emulation

| Page | Perf | A11y | Best practices | SEO | FCP | LCP | TBT | CLS | SI |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` | 98 | **100** | **100** | **100** | 0.9 s | 2.5 s | 40 ms | 0 | 0.9 s |

Mobile LCP of 2.5 s sits exactly on the "good" boundary. Lighthouse's mobile
preset applies a 4× CPU slowdown and a throttled connection, so this is the
pessimistic case rather than the typical one — but it is the number to watch
after deployment, and the one most likely to move.

## Budgets

| Budget | Target | Actual |
|---|---|---|
| LCP | < 2.5 s | 0.6 s desktop, 2.5 s mobile emulation |
| INP proxy (TBT) | < 200 ms | 0 ms desktop, 40 ms mobile |
| CLS | < 0.1 | **0** |
| Shared client JavaScript | < 130 kB gzipped | **127.7 kB** |
| Per-route JavaScript | < 60 kB gzipped | 0 kB — no route ships its own bundle |
| Worker script | < 3 MB gzipped | **1.99 MB** (66%) |

Enforced by `scripts/quality/check-bundle-budget.ts` and
`scripts/quality/check-worker-size.ts` in CI.

## CLS is zero, and that is structural

No layout shift anywhere, because there is nothing that could cause one:

- No web font. System stacks mean no swap and no reflow.
- No remote images. All artwork is inline SVG with intrinsic dimensions.
- No advertisement slot renders unless a real publisher ID is configured, so
  there is no reserved-then-filled box and no empty placeholder.
- The calculator renders its full structure server-side with a `$0.00` result,
  so hydration replaces text inside an already-sized element.
- The analytics consent banner is fixed-position and never displaces content.

## Where the 127.7 kB goes

Almost all of it is React and the Next.js runtime. The application's own client
code is small, because there is very little of it: one substantial island (the
calculator), the marketplace calculator, the mobile menu, and the theme toggle.

Everything else — headings, rate tables, formulas, worked examples, FAQs, source
notes, every internal link — is a Server Component and ships zero JavaScript.

No route ships its own chunk beyond the shared bundle, which is why the
per-route figure is 0 kB.

## Deliberate omissions

**No web font.** For a site whose primary content is a number, waiting on a font
download is the wrong trade. System stacks render immediately.

**No chart library.** The rate comparison is a table. A charting dependency
would add more to the bundle than the whole application code.

**No animation library.** Colour transitions only, disabled under
`prefers-reduced-motion`.

**No third-party script above the tool.** Analytics, when configured, loads
`afterInteractive` and never before the calculator.

**Disabled integrations emit nothing.** The bundle check greps the built chunks
for analytics hostnames and fails if any appears while no provider is
configured — so a tree-shaking regression that ships an unused beacon is caught
rather than assumed away.

## Worker bundle

1.99 MB gzipped of a 3 MB limit, measured by `wrangler deploy --dry-run` rather
than by inspecting `.open-next/worker.js` — which is a thin entry point, and an
earlier version of the size check cheerfully reported 0.00 MB by measuring it.

At 66% there is headroom, but not unlimited headroom. The check warns above 80%
so a large dependency is noticed before the deploy that would fail.

Static assets (0.67 MB) are served from the assets binding and do not count
toward the script limit.

## Caching

| Response | Policy |
|---|---|
| `/_next/static/*` | `max-age=31536000, immutable` |
| Icons and images | `max-age=31536000, immutable` |
| `/api/fx/latest` | `s-maxage=43200, stale-while-revalidate=86400` |
| `/api/rates` | `s-maxage=86400` |
| `robots.txt`, `llms.txt`, `sitemap.xml` | `max-age=3600` |
| `/api/health`, `/api/contact` | `no-store` |

24 of 32 routes are prerendered and served from the assets binding without
invoking the Worker at all.

## After deployment

- Collect field Core Web Vitals; the mobile LCP is the metric to watch.
- Re-run Lighthouse against production, where Cloudflare's edge and HTTP/3
  apply and the local figures do not.
- The Lighthouse workflow runs weekly and on pull requests. Accessibility, best
  practices and SEO are gated; performance is reported but not gated, because
  shared CI hardware varies enough that a hard gate produces failures unrelated
  to the change under review.
