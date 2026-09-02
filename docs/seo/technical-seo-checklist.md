# Technical SEO checklist

Working checklist for the pass started 2026-09-03, driven by the reports in
`technical seo/` (SEOSignalX crawl, speed, robots, security, on-page,
internal-link opportunities) plus live verification against production.

**Status key:** `[ ]` not started · `[~]` in progress · `[x]` done · `[-]` rejected, with reason

The rule for this pass: apply what genuinely helps, skip what a scanner
*claims* is wrong but would make the site worse. Every rejection below names
the reason it would be a regression, not a preference.

---

## A. Verification first — what the reports got wrong

The supplied crawl ran at 2026-09-02 ~20:35 UTC, inside the window when the
homepage was down behind the www-redirect cache loop. **241 of its findings are
artefacts of that outage**, not defects. Re-verified live before acting.

- [x] **A1** — 70/100 URLs in `internal-link-crawl.csv` returned status `0`. Re-checked live: all 200 in 0.3–0.5 s.
- [x] **A2** — "Timed out" (56 URLs) — every `?robux=` URL and `/tr/` page. Live: all 200.
- [x] **A3** — "Hreflang to redirect or broken page" (24) — caused by the `/tr/` targets timing out. Live: all 28 locale×amount combinations 200; hreflang identical and correct on flagged and unflagged pages alike.
- [x] **A4** — "Missing reciprocal hreflang" (26) — same cause as A3.
- [x] **A5** — "Slow page" (66) — cache misses during the outage. Live: 0.29–0.51 s.
- [x] **A6** — "Page has links to broken page" (69) — the "broken" targets are the A2 timeouts.
- [x] **A7** — "Duplicate pages without canonical" — `/pt-br/` and `/de/` verified to carry correct self-canonicals; `/api/*` pairs verified to carry `x-robots-tag: noindex`.
- [x] **A8** — `on-page-seo-report.csv` scored `/DevEx%20Calculator` 39/100 and `/devex` 43/100. **Neither URL exists.** The tool scored two 404s. No finding.

## B. Confirmed real defects — fix

- [x] **B1** — **Every `og:image` on the site returns 308.** `/opengraph-image` → `/opengraph-image/`, and nested cards mangle the query (`?d962…` → `?d962…=`). Affects all 252 pages' social previews.
- [x] **B2** — **`apple-touch-icon` returns 308.** `/apple-icon` → `/apple-icon/`.
- [x] **B3** — Root cause of B1/B2 and the fix, from this Next version's own docs: `trailingSlash: true` exempts *"static file URLs, such as files with extensions"*. Extension-less metadata routes get redirected; `/icon.svg` does not. The codebase already solved this for the six locale cards (`/og/de.png` etc., committed PNGs). Extend that same solution to English.
- [x] **B4** — Side effect of B3, and a large one: converting the 8 English `opengraph-image.tsx` routes and `apple-icon.tsx` to committed PNGs removes `@vercel/og` from the Worker. Bundle was at **92% of the 3 MB limit** — documented as blocking debt.

## C. Genuine improvements — add

(C2 turned out to be a configuration decision rather than a code change; it is kept here with its finding.)

- [x] **C1** — hreflang annotations (`xhtml:link`) in `sitemap.xml`. Seven locales; currently declared in `<head>` only. Google accepts either; both is standard redundancy for a multilingual site.
- [-] **C2** - `Organization` / `publisher` node in the JSON-LD graph. **Already built, and deliberately switched off — not mine to turn on.** `src/components/seo/json-ld.tsx` has `publisherNode()` and wires `publisher` onto the `WebSite` node; both are gated on `siteConfig.organizationName`, which reads `NEXT_PUBLIC_ORGANIZATION_NAME` and is unset. The config says why: it "stays null until a real registered name is confirmed; while it is null the site emits no Organization node rather than inventing a legal entity". An Organization node is a claim about a legal identity, so the only way for me to add one would be to invent it. **Owner decision:** set `NEXT_PUBLIC_ORGANIZATION_NAME` to the registered name and the node, the `publisher` link and the existing `sameAs` profiles all appear with no code change.

## D. User-requested UI work (2026-09-03)

- [x] **D1** — **Responsive tables.** Tables force horizontal scrolling to read on mobile (`min-w-[512px]` inside an `overflow-x-auto` wrapper). Wanted: readable on every device with no sideways scrolling. Applies everywhere a table appears, not just the homepage.
- [x] **D2** — **Desktop dropdown on hover.** Header menus currently need a click. Wanted: open smoothly on pointer hover on desktop, while keyboard, touch and no-JS behaviour stay intact.

## E. Rejected — would harm the site or change nothing

- [-] **E1** — "Images have alt text: fail, 2 affected" *(speed report, and 250 pages in the crawl)*. **Both images are the header logo with a deliberate `alt=""`.** It is decorative; the `Wordmark` beside it already carries the site name, and the code comment records that the previous mark made screen readers announce "DevEx Calculator" twice per link. Adding alt text would reintroduce that bug. The scanner counts `alt=""` as missing; it is the correct value.
- [-] **E2** — "Not compressed: 250 affected". Live response carries `Content-Encoding: zstd`. The scanner doesn't recognise zstd. Verified gzip negotiation separately.
- [-] **E3** — "CDN or Edge Resources Detected: fail". The site is on Cloudflare and every subresource is same-origin, so there is no third-party CDN hostname for the tool to match. Serving assets off a foreign CDN would add a DNS lookup and a connection for no gain.
- [-] **E4** — Block Ahrefs / Semrush / Moz / Majestic / Wayback crawlers *(robots report)*. No ranking benefit whatsoever — these are not search engines. Only effect is hiding our own backlink data from ourselves and losing archive.org history.
- [-] **E5** — WordPress hardening items: block `wp-admin`, `wp-json`, REST routes, XML-RPC, disable file editors, user enumeration, public registration *(robots + security reports)*. **This is not a WordPress site.** The security report's own results already show all of these as "not present / blocked". Adding the rules would be cargo-cult noise in `robots.txt`.
- [-] **E6** — "Atom / RDF Feed Links: found". The tool flags this as WordPress cruft. Ours is a deliberately published feed advertised in `<head>`, linked from the changelog. Keeping.
- [-] **E7** — `X-XSS-Protection` header *(security report, recommends `0`)*. The header is deprecated and its only modern recommended value disables a filter that no supported browser still ships. Our CSP does the actual work. No benefit.
- [-] **E8** — `Cross-Origin-Embedder-Policy: require-corp`. Would break the `/platform/` dashboard's cross-origin fetches to `api.devexcalculator.org`. The report itself marks it "enable manually after verifying compatibility" — verified, and it is not compatible.
- [-] **E9** — `Cross-Origin-Resource-Policy: same-origin`. Would break the public rates API, which exists to be read cross-origin (`Access-Control-Allow-Origin: *`, documented at `/api/`, with a published OpenAPI spec). Also a header change, which is propose-first by standing instruction.
- [-] **E10** — `devexcalculator-org-internal-link-opportunities.csv` (1064 rows). **Unusable.** 0 rows carry real impression data (all "inferred"); 814 of 1064 propose linking *across locales* (an `/es/` page to a `/pt-br/` page), which would corrupt the hreflang model; and the top suggested anchors are prepositions and a parser artefact — `para`, `en`, `un`, `la`, `ke`, `em`, and `x27` (from a mangled `&#x27;`). Acting on this would damage the site.
- [-] **E11** — Shorten 10 titles (61–65 chars) and 15 descriptions (161–165 chars). Already governed by a deliberate gate at 65/165 in `tests/unit/seo/meta-length.test.ts`, chosen as "the truncation points with a little room". All are translations, which run 15–25% longer than the English for the same sentence. A previous shortening pass dropped the "18+" figure from four locales and had to be reverted — re-editing 25 strings for 1–5 characters carries that same factual-drift risk for no measurable gain.
- [-] **E12** — "Low word count" on 5 `/contact/` pages. A contact page is short because it is a contact page. Padding it would be writing filler for a crawler.
- [-] **E13** — `/api/stats` and `/api/stats/` both 200. Both already send `x-robots-tag: noindex`, so there is no index duplication. Forcing a redirect would break existing API consumers for a cosmetic crawl gain.
- [-] **E14** — `Disallow: /*?` for `?robux=` parameter URLs. They already self-canonical to the clean URL (verified: `/?robux=50000` → `<link rel="canonical" href="https://devexcalculator.org/">`), which is Google's documented preference over blocking. Blocking would also stop Google seeing the canonical it needs.

---

## Log

- 2026-09-03 — Section A verified against production; 241 report findings traced to the 2026-09-02 outage window and dismissed with evidence.
- 2026-09-03 — B1/B2 confirmed by live request; B3 root cause found in `node_modules/next/dist/docs/.../trailingSlash.md`.
- 2026-09-03 - D2 done. Hover-to-open on pointing devices only, 90ms open / 220ms close, a CSS hover bridge across the gap to the panel, and an open animation. Click still dismisses, keyboard and no-JS unchanged. A new opened_by analytics property keeps hover opens from burying the deliberate ones.
- 2026-09-03 - D1 done. Tables with three or more columns become labelled cards below 640px, two cells to a line, long prose taking a full row. Labels are derived from the header row in Table rather than written at 113 call sites. Found and fixed a real bug on the way: a tbody wrapping its rows in a fragment shipped <tr label="Goes to"> to the browser. Verified 0 sideways-scrolling tables and 0 page overflow at 360/768/1280px, and 0 defects across all 254 built pages.
- 2026-09-03 - B1/B2/B3 done. The eight English cards and the touch icon are committed PNGs under public/og/ and public/icons/, drawn by the same script and held by the same fingerprint check as the six localized cards. Verified locally: every asset 200 with redirects=0, and /og/en.png is byte-identical (87,180 b) to what /opengraph-image was serving.
- 2026-09-03 - C1 done. 252 sitemap entries now carry the same eight-link hreflang cluster as the page head, self-reference and x-default included. A test compares the two clusters directly, because two that disagree are worse than one; negative-tested by removing x-default.
- 2026-09-03 - B4 done. The nine ImageResponse routes deleted; @vercel/og left the Worker with them. Bundle 2.75 MB (92% of the 3 MB limit) to 1.91 MB (64%). Deployed and verified: all 16 assets 200 with redirects=0 in production, old routes now 404, 9/9 card tests green against the live site.
- 2026-09-03 - Deployed fc140015 (cards, tables, menus, sitemap) and 4b876c66 (ownership tags). Pushed as a0e7171. Two conditions found during production verification and left alone deliberately, both pre-existing: /api/health/ reports the collector critical because it still reads the retired v1 KV store, while the live data plane is healthy (last observation 12 minutes old, 173h span); and www serves 200 on a cache hit because the zone cache key does not include the host, which is the same property behind the 2026-09-02 outage. Neither was introduced by this pass. GA4 was requested and is NOT enabled - see the note below.

---

## Open, for the owner

**GA4 (`G-B776T5VD3W`) — requested, not enabled.** The wiring already exists:
`NEXT_PUBLIC_GA4_ID` loads gtag behind a consent prompt, `next.config.ts` adds
`googletagmanager.com` to the CSP only when it is set, and the privacy page has
a second branch that describes GA4 correctly instead of claiming no analytics.
Setting the variable is genuinely all it takes.

What stops it being a one-line change is that four published statements become
false the moment the script loads, in all seven languages:

- `platform.noChartBody` — "This site loads no third-party scripts on any page,
  and adding one here would quietly undo that for everyone."
- `platform.stock.body.related.p2` — "This site loads no third-party scripts,
  and a number it cannot trace to a document is a number it will not publish."
- `routes.platformStock.quickAnswer` and its `metaDescription` — the same claim,
  in the text Google shows.

`/platform/stock/` uses that claim as its *argument* for refusing to embed a
market-data widget. Loading GA4 while the page says this would make the page
dishonest about the thing it is specifically asking to be trusted on.

Two coherent options, both the owner's call:

1. **Enable GA4 and rewrite those four strings** across seven languages, so the
   site says "no third-party script except the analytics you consented to".
   The stock page's argument has to be re-made on privacy grounds rather than
   on an absolute that is no longer true.
2. **Use Cloudflare Web Analytics instead** (`NEXT_PUBLIC_CF_ANALYTICS_TOKEN`).
   Cookieless, needs no consent prompt, and the same claims stay true because
   nothing runs in the reader's browser. Page views only — no custom events.

**`NEXT_PUBLIC_ORGANIZATION_NAME`** — see C2. One variable, no code change.

**Cloudflare token needs Zone → Cache Purge.** `npm run deploy`'s purge step
still cannot run.

**`/api/health/` reports `ok: false`** because its `collector` block reads the
v1 KV store that was deliberately retired on 2026-09-02. The live data plane is
healthy. A health endpoint permanently stuck at `ok: false` is one nobody reads
when it matters, so it should be pointed at the data Worker or dropped.
- 2026-09-03 - Cache Purge permission added by the owner. The API now accepts purges (success:true, previously 10000 Authentication error) and the script no longer needs a pasted Zone ID - it resolves the zone from the site's own hostname. But a purge by URL does not evict the HTML: measured on /devex-rates/, eleven requests over sixty seconds after a successful purge, all HIT with Age climbing 520 to 557. Cause is the front-of-Worker cache from wrangler's cache.enabled, whose key is not the URL - the same property behind www serving 200 and behind the 2026-09-02 outage. Recorded in docs/cache-purge.md; s-maxage=3600 still bounds staleness.
