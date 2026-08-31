# Decision log

Every decision that a future maintainer might otherwise reverse without knowing
why. Each records the choice, the reasoning, and what would justify changing it.

Evidence labels follow the editorial policy: **Verified through official
source**, **Derived from supplied CSV**, **Observed on public competitor page**,
**Reasonable inference**, **New implementation decision**.

---

## D-001 · Exact rational arithmetic instead of floats or a decimal library

**New implementation decision.**

Money is held as a pair of `bigint` values — an exact fraction — from the moment
a rate is read until the moment a figure is printed.

`0.0038` is not representable in binary floating point. The drift is visible at
ordinary amounts: `17000 * 0.0054` evaluates to `91.80000000000001`, and 17,000
Robux is a real query in the supplied keyword data. A decimal library would also
have worked, but a rational is ~200 lines with no dependency, no bundle cost and
no supply-chain surface, and it handles the division in the reverse-target mode
exactly rather than at a configured precision.

*Change if:* the engine needs transcendental functions, which rationals cannot
express. Nothing planned requires them.

---

## D-002 · TypeScript 5.9.3 rather than 7.0.2

**New implementation decision.**

TypeScript 7.0.2 was the latest stable release at build time. It is a
from-scratch Go implementation, and Next.js 16.3 and `eslint-config-next` are
validated against the 5.x line. The upside of being newer is nil for this
project; the downside is an unproven type-checking path in the release gate.

*Change if:* Next.js ships official TS 7 support and the full check suite passes
on it.

---

## D-003 · Security headers in `next.config.ts`, not a proxy

**New implementation decision**, forced by **verified** adapter behaviour.

Headers and the `www` redirect were first implemented in `src/proxy.ts`. The
OpenNext Cloudflare build fails outright: *"Node.js middleware is not currently
supported."* The specification rules out the edge runtime, so the work moved into
`next.config.ts`.

This is better regardless: headers are applied by the framework's own response
path rather than by invoking a proxy function on every request.

*Change if:* the adapter gains Node-runtime proxy support **and** something needs
per-request logic that config cannot express.

---

## D-004 · `notFound()` instead of `dynamicParams = false`

**New implementation decision**, forced by **verified** adapter behaviour.

`dynamicParams = false` is the declarative way to say "only these slugs exist".
Under the Workers runtime every prerendered amount page then returned 404 with
`NoFallbackError`, while working correctly under `next start` — a divergence only
caught by testing against a real Workers preview.

`parseAmountSlug` returns `null` for anything not in the approved list and the
page calls `notFound()`. Behaviour from outside is identical: approved amounts
return a prerendered 200, everything else a genuine 404.

*Change if:* the adapter fixes fallback resolution. The `notFound()` guard should
stay either way — it is what actually enforces the guarantee.

---

## D-005 · Focus indicator darkened from `#f59e0b` to `#a16207`

**New implementation decision**, driven by a measured failure.

The specification's candidate palette proposes `#f59e0b` for the focus ring.
Measured against white that is **2.15:1**, below the 3:1 WCAG 2.2 requires of a
focus indicator. `#a16207` measures **4.96:1**, is still unmistakably amber, and
is distinct from the warning colour.

*Change if:* a different colour is chosen that measures at least 3:1 against
every surface in both themes.

---

## D-006 · Bulgarian lev removed from supported currencies

**Verified through official source** (ECB Data Portal).

The ECB stopped publishing a BGN reference rate after 2025-12-31. The series is
still returned by the API, frozen at that date. Continuing to show it would
present a rate many months stale as current.

The provider parser now rejects any series whose latest observation predates the
USD one, so this class of problem is handled generally rather than by removing
one code.

*Change if:* the ECB resumes publishing BGN.

---

## D-007 · No `/guides/[slug]/` articles

**New implementation decision.**

The target structure in the specification lists `/guides/[slug]/`. The six
explanatory pages already exist as pillars in their own right. Republishing them
under a second prefix, or writing new articles covering the same topics, would be
cannibalisation dressed as information architecture — and the specification is
explicit that no route may exist solely because a structure map listed it.

`/guides/` ships as a genuine directory: a reading order, what each guide
answers, and what it assumes you already know.

*Change if:* a guide topic appears that no pillar covers and that is genuinely
subordinate to one.

---

## D-008 · Eight amount pages, not the twelve the specification suggests

**Derived from supplied CSV**, plus a manual editorial decision.

The automated gates approved nine amounts. 40,000 was held back manually: 30,000
and 50,000 already cover the just-above-minimum case, and a third page between
them would say substantially the same thing about the same situation.

A validator now fails the build if the pipeline's approved set and the published
set disagree, so this cannot drift silently in either direction.

*Change if:* real Search Console data shows demand for a specific amount the
current set does not serve.

---

## D-009 · Duplicate keyword rows resolve by metric strength, not file order

**Derived from supplied CSV.**

`robux to usd` appears in both exports — at volume 30 in one and 16,470 in the
other. The first implementation kept whichever row was read first, so
alphabetical filename ordering discarded the stronger signal and the term
appeared to belong to no route.

The row with the highest volume wins, then the higher organic traffic, then file
order as a stable tie-break. Other rows are retained as `duplicate-variant` for
evidence.

---

## D-010 · Brand detection runs on the literal query, before spelling folding

**Derived from supplied CSV.**

Spelling folding maps `rbx` to `robux` so misspellings classify correctly. That
turned the competitor brand `rbx tax` into the ordinary product query
`robux tax`, which then routed to this site's own marketplace fee calculator —
quietly targeting someone else's brand.

Brand and script rules now read the unfolded comparison key. Everything else
reads the folded one.

---

## D-011 · No KV, D1, R2, Durable Object or Queue bindings

**New implementation decision.**

The calculator is stateless and runs entirely in the browser. FX responses are
cached through platform `fetch` caching with a bundled stale fallback. Contact is
disabled by default and needs no retention.

The rate limiter is therefore per-isolate, which is stated plainly in its own
documentation rather than presented as a global guarantee. Turnstile is the
primary control on the contact form; the limiter is a cheap second layer.

*Change if:* contact submissions are enabled with retention (D1, plus a privacy
policy update), or the FX layer needs coordination the Cache API cannot give.

---

## D-012 · No `FAQPage` structured data

**Verified through official source** (Google Search Central).

Google removed FAQ rich results for most sites. Emitting the markup would be
schema for its own sake. Visible FAQ accordions are built on native `<details>`,
so the answers stay in the DOM, remain crawlable and work without JavaScript.

---

## D-013 · No `Organization` node until a real name is configured

**New implementation decision.**

`organizationName` is null by default and no Organization node is emitted.
Inventing a publisher would be the same class of fabrication as a fake author
biography — and the specification forbids both.

---

## D-014 · `useSyncExternalStore` for browser-only values

**New implementation decision.**

Reading `localStorage` or `navigator.share` with `useState` plus a mount effect
causes a cascading render, which React 19's `set-state-in-effect` rule exists to
discourage. `useClientValue` wraps `useSyncExternalStore` with a no-op subscribe:
the server snapshot renders during hydration and the real value swaps in on the
same commit.

Each preference pairs a stored value with an in-session override written only
from an event handler, never from an effect.

---

## D-015 · Tailwind v4 CSS variable syntax

**New implementation decision**, forced by a measured failure.

Tailwind v3 accepted `bg-[--color-primary]` and wrapped it in `var()`. Tailwind
v4 replaced that shorthand with `bg-(--color-primary)`. The v3 form compiles to
`background-color: --color-primary`, which is invalid and silently discarded.

608 utilities across 43 files were doing nothing. axe caught it as white text on
a white background at 1.06:1. Fixed site-wide; the axe checks in CI now guard
against a recurrence.

---

## D-016 · `min-w-0` on scroll containers inside grid and flex

**New implementation decision**, forced by a measured failure.

Grid and flex items default to `min-width: auto`, so they refuse to shrink below
their content. A wide table inside one pushed the whole page sideways instead of
scrolling within its own container — the tax calculator overflowed by 227px at a
320px viewport.

---

## D-017 · Mode changes push a history entry; typing replaces it

**New implementation decision.**

Pushing an entry per keystroke makes the back button walk backwards through
"10000", "1000", "100". Replacing on every change makes the back button skip past
a deliberate mode switch. Typing replaces; a mode change pushes; a `popstate`
listener re-reads state from the URL.

---

## D-018 · `<noscript>` navigation in the header

**New implementation decision**, found by testing at a mobile viewport with
JavaScript disabled.

The desktop navigation is hidden below the `md` breakpoint and the mobile menu
needs JavaScript to open, so a small-screen no-script reader had no header
navigation at all. A `<noscript>` list renders only when scripting is off and
only below `md`.

---

## D-019 · No universal Robux purchase price

**New implementation decision.**

Roblox prices Robux by package, region, platform and promotion. Publishing one
number would be inventing a figure. `/robux-to-usd/` explains the distinction and
links to official pricing instead.

This costs some purchase-intent traffic. The alternative is a number that is
wrong for most readers.

---

## D-020 · No stated DevEx processing time

**Verified through official source** — by its absence.

Roblox publishes no guaranteed processing time, so this site states none. Figures
quoted elsewhere are individual experiences, not commitments.

---

## D-021 · Amount-page anchors carry the amount

**New implementation decision**, found by a validator.

Eight generated pages initially pointed at the same three destinations with
identical anchor text — an exact-match link block, which the internal-link
validator flags. Anchors now include the amount or its payout, so each is
contextual.

---

## D-022 · Generated artefacts are stamped from their inputs, not the clock

**New implementation decision**, forced by a defect.

`seo/generated/*.json` carried `generatedAt: new Date()`. The files are
committed and CI fails when regenerating them produces a diff — that check is
what catches a pipeline change made without regenerating. A wall-clock stamp
made every run a diff, so the check would have failed on every run for a reason
that says nothing about the data, and would have been switched off or ignored
within a week.

Each artefact now carries `datasetExportedAt`, read from the timestamp the
export tool writes into each source filename, and `datasetDigest`, a SHA-256
over the source bytes. Both move only when an input changes.

File modification time was considered and rejected: `git clone` does not
preserve mtimes, so it would have been stable locally and different on every CI
run — the same failure wearing a disguise.

The stamp is applied at the single point where these files are written rather
than inside each builder, so no builder can attach a clock reading of its own,
and `tests/integration/generated-artefacts.test.ts` fails if one does.

---

## D-023 · Prerendered pages are served from static assets, not re-rendered

**New implementation decision**, forced by a production failure.

The first deployment returned Cloudflare `error code: 1102` — Worker CPU limit
exceeded — for every rendered page, while `/api/health/` kept answering. Every
request was running a full Next.js server render inside the Worker, including
for the 32 pages whose HTML is fixed at build time.

`open-next.config.ts` now sets the static-assets incremental cache with
`enableCacheInterception`. Prerendered HTML is written into the assets bundle
and returned before the render path is reached.

This does not reverse D-011. That decision refused a KV, R2 or Durable Object
binding for a stateless calculator, on cost and failure-mode grounds. The
static-assets cache adds no binding and no cost — it reads from the Assets
binding the deployment already has. The adapter's own guidance is that it suits
applications that never revalidate and only serve prerendered data, which
describes every route here.

Measured: assets went from 29 files to 74, and the homepage from failing on
every request to 10 of 10 succeeding.

---

## D-024 · The www redirect is three rules, not one

**New implementation decision**, found in production.

One `/:path*` rule looked correct and was wrong twice.

At the root the capture is empty, and Next emitted the destination
unsubstituted: `https://www.devexcalculator.org/` answered
`Location: https://devexcalculator.org/:path*`. The www homepage is the most
likely www entry point there is, and it pointed at a URL that does not exist.

For every other path the destination carried no trailing slash, so the apex
answered with a second redirect to add it — a two-hop chain on every www page
request.

Now three rules: the root explicitly; anything with a file extension preserved
exactly, so `/sitemap.xml` is not sent to `/sitemap.xml/`; and pages with the
trailing slash `trailingSlash: true` requires.

Neither fault was reachable locally, because a host condition cannot be
exercised against `127.0.0.1` — the link checker had been emitting a warning
saying exactly that, and the warning was correct. It now makes real requests to
the www hostname whenever it runs against a public deployment, and asserts that
no `:path` token survives into a `Location` header.

---

## D-025 · Colour contrast is audited only after animation stops

**New implementation decision**, found by a flaky failure.

The axe suite reported 58 colour-contrast violations against the deployment at
ratios like 3.82:1 and 2.9:1. The colours were real but transient: applying the
stored theme after hydration animates the palette through `transition-colors`,
and axe was sampling mid-flight. Firefox measured `#dbdcde` on `#457aee`,
exactly midway between the light and dark values; both endpoints pass.

`reducedMotion` emulation was tried first and was not enough — Chromium
honoured it, Firefox still animated. The suite now awaits
`document.getAnimations()` before every axe run, which is deterministic and
does not depend on a timeout.

Worth stating plainly: this was a defective test, not a defective site. It was
also failing intermittently rather than always, which is the kind of test that
gets retried until it passes and quietly stops meaning anything.

---

## D-026 · A statistics page built on filings, not on a data pipeline

**New implementation decision**, prompted by a competitor page.

RoMonitor's platform page charts concurrent users, registrations and session
length over rolling windows. Those come from their own collectors, running
continuously for years. This site has no such history, no database, and a
standing rule against publishing a number it cannot trace to a document. So the
page was not copied; it was rebuilt on a different premise.

The subject changed with it. Their figures are about players. `/roblox-stats/`
is about **developer exchange fees** — the line on Roblox's income statement
recording what it actually paid creators. 1.503 billion USD in 2025 against
922.8 million in 2024. For a DevEx calculator's readers that is the more useful
number, and it is one no competitor publishes.

Four rules the page follows:

1. Every figure was read out of an SEC filing on a recorded date and links to
   it. The registry validates at build time that each one resolves to a source.
2. Quarterly is the resolution, because that is how often Roblox reports.
   Anything finer would be invented.
3. Figures derived by subtraction — a quarter obtained from a six-month total —
   are labelled `derived`, drawn as hollow bars, and must record the
   subtraction or the build fails.
4. Precision follows the filing. Exact to the dollar where Roblox reported in
   thousands, exact to the million where it reported in millions.

**No share price.** A live quote needs a paid market-data feed and a
third-party script in the reader's browser. The competitor's stock page is a
TradingView embed — they did not build a chart, they included someone else's.
Doing the same would break the content security policy, introduce third-party
tracking, and put a number on the page that no filing backs. The reported
results a share price reacts to are published instead.

**Charts are server-rendered SVG**, with no charting library and no client
JavaScript, each paired with a table carrying the same numbers. The SVG is
`aria-hidden`; the table is the accessible representation, because a bar chart
announced as coordinates helps nobody. The competitor's page renders nothing at
all with scripting disabled.

---

## D-027 · Workers KV, reversing D-011

**Reverses a previous decision**, with the owner's explicit authorisation.

D-011 refused a KV, R2, D1 or Durable Object binding. The reasoning was sound
for what the site was then: a calculator that computes from a validated
registry has no state, and a binding would have added cost, a failure mode and
an operational surface for nothing.

`/platform/` changes the premise. It charts how platform activity moves over
time, and no amount of care makes that possible without storing observations —
the past cannot be fetched. The options were to publish an estimate, to publish
nothing, or to start recording. The first is forbidden by everything else in
this project, so the choice was between the second and the third.

### Why KV specifically

The access pattern is write-once, read-many, keyed, and tiny. That is what KV
is for. D1 would mean a schema and migrations for a single append-only series;
R2 is object storage for objects far larger than a few hundred bytes; a
Durable Object would add a coordination primitive for data with no
coordination requirement. KV also expires keys natively, which is the whole of
the retention policy.

### What is stored

Only what a chart needs, and nothing that identifies a reader. Each snapshot
holds the observation time, the name of the Roblox ranking, the total players
across the listed experiences, and per experience its universe id, name and
player count. No visitor data of any kind is written — nothing on this site
reads a request in order to store anything.

    obs:<ISO timestamp>   one snapshot
    index                 the ordered list of snapshot keys that exist

The index exists so that rendering the page is a bounded number of reads
rather than a `list()` over a namespace that grows all week.

### Retention

Fourteen days, applied as an `expirationTtl` on each snapshot at write time.
KV removes them; there is no cleanup job to schedule, monitor or forget. The
index is trimmed to the same window on every write, so it cannot outgrow the
data it points at.

### Frequency and free-tier arithmetic

Every fifteen minutes: 96 runs a day, two writes each — the snapshot and the
index — so 192 writes against a free-tier allowance of 1,000 a day. Reads are
one index read plus at most 200 snapshot reads per render, against 100,000 a
day, and the page is not on a hot path. Storage peaks at roughly 1,344
snapshots of a few hundred bytes: comfortably inside the 1 GB allowance. A
test asserts the write arithmetic so a change to the interval cannot silently
breach it.

### What is not stored

No request data, no reader identifiers, no cookies. The KV namespace holds
observations of a public API and nothing else, which is why the privacy page
needed no change.

---

## D-028 · The history chart draws what exists, and says so

**New implementation decision.**

On day one there is no history. The tempting options were to hide the section
until it filled, or to draw a fourteen-day axis mostly empty. Both mislead: the
first hides that collection is running, the second implies a fortnight of
measurement that has not happened.

Instead the page reports the period it actually holds — "4 hours" on the first
afternoon — and widens on its own as observations accumulate, with no code
change at one day, three days, seven or fourteen. Below three points it lists
the readings rather than drawing a line between two dots, because a two-point
line implies a trend that two readings cannot support.

Nothing is interpolated or back-filled. A gap in collection shows as a gap,
since the x axis is real time rather than evenly spaced slots. A missed run is
a fact about the record, and hiding it would make the chart a drawing rather
than a measurement.

---

## D-029 · A stock page with no share price

**New implementation decision.**

The competitor's stock page is a TradingView embed: they include someone
else's chart rather than building one. Matching it would mean running a market
vendor's script in every reader's browser, on a site whose privacy page says
no third-party scripts run at all. That trade was not worth making for a
figure that does not affect a single DevEx payout.

The page therefore publishes the reported results a share price responds to,
and states plainly that there is no live quote and why. `market-data.ts` is
written and tested but unwired: setting `STOCK_PROVIDER` and `STOCK_API_KEY`
connects a server-side provider whose response is rendered as ordinary HTML.

There is no placeholder price anywhere in that module, deliberately, so none
can reach a render by accident. A zero price — what the provider returns for
an unknown symbol — is treated as no price rather than as a quote of nothing.

---

## D-030 · HTTPS is enforced in the Worker, not by a zone setting

**New implementation decision**, taken because the setting was out of reach.

The zone's "Always Use HTTPS" toggle is a dashboard setting, and plain HTTP
requests were being served with a 200 rather than redirected. HSTS covers a
reader who has visited before; the first visit is exactly what it cannot cover,
and the Worker logs showed real plain-HTTP traffic arriving, including
vulnerability scanners.

Those requests reach the Worker, so the Worker can answer them. The entry now
returns a 301 to the HTTPS URL before delegating anything else, which makes the
behaviour part of the repository rather than a setting someone has to remember.
The dashboard toggle remains worth enabling — it would answer at the edge
without spending a Worker invocation — but the site no longer depends on it.

---

## D-031 · The observation time is Roblox's, not ours

**New implementation decision**, found during a production audit.

Successful upstream responses are cached for five minutes. The page stamped
each reading with the clock at render time, so a four-minute-old response was
labelled as though it had just been taken — a stale number presented as
current, which is the specific failure this project spends most of its effort
avoiding.

The upstream `date` header travels with the cached response and records when
Roblox actually answered, so that is what the page now shows and what the
collector records. Verified in production: a request at 22:25:30 displayed
22:25:27, Roblox's own second-precision timestamp.

---

## D-032 · The injected analytics beacon is off, not disclosed

**Supersedes the disclosure added earlier the same day.**

Cloudflare was injecting its Web Analytics beacon into every HTML response at
the edge. The page had been updated to disclose it, because a false privacy
statement is worse than an unwanted script — but disclosure was the second-best
outcome, taken only because the setting appeared unreachable.

It was reachable. The zone carried a RUM site with `auto_install` enabled,
created when the custom domain was attached, which is why an earlier look at
the account's RUM list missed it: the list was read before the domain existed.
The zone setting `rum` was editable and is now `off`.

The privacy page is back to stating that no analytics run here, which is now
simply true. The test that enforced the invariant did its job in both
directions: it required the disclosure while the beacon loaded, and it now
requires the absence of both.


---

## D-033 · The header groups its destinations, and the menus are `<details>`

The header carried a flat row of eight links. That was already the most a
1280px row could hold beside the lockup and the theme control, and it left
thirteen real destinations — the guides, the marketplace calculator, the API,
the rate history, the stock page, the sources — reachable only from the footer.
A reader who landed on a guide from search could not see that the rest existed
without scrolling to the bottom of the page.

Four groups now hold twenty-one destinations, with the calculator kept outside
them as a direct link: the site is a calculator first, and putting its own link
behind a disclosure would cost a returning reader an extra interaction for the
thing they came for.

**The menus are native `<details>` elements, not a button and a state hook.**
The native element already is a disclosure — it opens on click, on Enter and on
Space, and reports its expanded state to assistive technology — and, deciding
it, **it works with JavaScript disabled**. A hand-built dropdown does not, and
this site's own history includes shipping a header that had no navigation at
all on a phone with scripts off. A small client island adds Escape,
outside-click and mutual exclusion on top; none of those are needed for a
destination to be reachable.

Deliberately not an ARIA menu. `role="menu"` commits to arrow-key roving focus
and to treating these as commands rather than links; a partial implementation
of that pattern reads worse to a screen reader than the plain
disclosure-of-links this actually is.

**A dead field became a checked one.** The route registry has always carried
`inPrimaryNav`, and `primaryNavRoutes` derived from it — but nothing read
either, so the flag had drifted to nine routes while the header rendered eight,
and no build could notice. The flags now describe the twenty-one routes the
header carries, and a test asserts the two sets are equal in both directions.

Cost: 0.5 kB gzipped of application JavaScript, against a 125 kB budget.

---

## D-034 · The earnings planner is a module on `/usd-to-robux/`, not a route

The target calculator answers "how much Earned Robux does $500 need". The
question a creator asks immediately afterwards is *when*, and nothing on the
site answered it.

**No new route.** The keyword corpus — 444 rows across two competitor exports —
contains no goal, timeline, "how long", "per day" or "save up" query at all.
The publication gate requires real demand before a route is created, and
inventing one for a feature would be exactly the mass-generation this project
refuses. The planner is therefore a section on `/usd-to-robux/`, the page that
already owns the payout-target intent, and it will only become a route if
Search Console later shows the cluster exists.

**It runs in both directions**, because both are the same division:

- a pace produces a date — `days = ceil(remaining ÷ per day)`
- a date produces a pace — `per day = ceil(remaining ÷ days available)`

Every rounding direction is chosen so the answer cannot flatter the reader. A
weekly pace is floored into a daily one, so a projection never assumes a
fraction that was not earned; days are ceiled, because a part day earns
nothing; and a required pace is ceiled in every period, because earning the
rounded-down amount would miss the date.

**Four refusals are built into the engine rather than into the copy.** There is
no default tax rate and no default fee. There is no growth model — a creator
entering "5,000 a week" is describing now, not a curve. A pace of zero returns
*no date at all* rather than a number derived from a division by zero. And a
plan is either paced or dated, never both, so the two can never disagree.

**A real defect the local/UTC distinction caused.** The plan was first anchored
to the UTC day. `<input type="date">` returns a *local* calendar date, so at
02:00 in Karachi the two were a day apart and "tomorrow" was counted as two
days away. The start day is now the reader's own calendar day, and both ends
are treated as plain calendar dates.

The requirement itself is not recomputed here: `planEarnings` calls
`calculateTarget`, so the planner and the calculator above it can never
disagree about the same question.

Cost: 5.2 kB gzipped of application JavaScript, taking the total to 108.5 kB
against a 125 kB budget.

---

## D-035 · Two checks that had stopped being able to fail

Found while shipping the above, and worth recording together because they are
the same mistake in different clothes.

**The sitemap's `lastmod` test compared against one hardcoded date.** Its own
purpose was to prove the build time had not leaked into `lastmod` — but the
comparison set was the literal string `2026-08-17`, so the first page to
genuinely change its content failed a test about build times. The obvious fix
would have been to add today's date to the list, which is how a check like
this quietly stops meaning anything. It now derives the accepted set from the
route registry, which is the thing it was always asking about.

**`inPrimaryNav` was read by nothing.** See D-033: a registry field and a
derived export that no code consumed, drifted to nine routes while the header
rendered eight, and no build could notice. Both directions are now asserted.

---

## D-036 · Search Console, Bing and IndexNow, all off by default

Three additions that share one rule: **an unconfigured integration must be
absent, not empty.**

**Ownership tags.** `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` and
`NEXT_PUBLIC_BING_SITE_VERIFICATION` emit a meta tag only for a value that
could plausibly be a real token. A pasted `<meta>` element, anything under
sixteen characters, anything containing whitespace and anything
placeholder-shaped are all rejected, because a verification tag reading
`YOUR_TOKEN_HERE` looks configured, proves nothing, and can sit unread in a
`<head>` for a year. Both are public identifiers rather than secrets — every
site verifying this way publishes them — but they belong to whoever owns the
console property, so they are read from the environment. DNS verification is
documented first, since it puts no token in the HTML at all.

**IndexNow.** `/indexnow.txt` serves `INDEXNOW_KEY` from a Worker secret and
**404s when it is unset**, which is the state of every local build. The key is
deliberately not committed: a key in a public repository lets anyone submit
URLs on this site's behalf. Serving it from a route rather than from `public/`
is what makes that possible, and using the spec's `keyLocation` option is what
lets the file have a fixed name instead of a dynamic route able to answer to
anything.

The submission script enforces three things the endpoint will not: URLs come
from the route registry so an API endpoint or a query state cannot be
submitted; the default is only the routes carrying the newest `dateModified`,
with anything over a quarter of the site requiring `--all`; and an unset key
exits cleanly rather than failing a pipeline. It says plainly that **Google
does not participate in IndexNow**, because the commonest thing written about
this protocol is that it does.

None of it runs in CI. Verifying ownership and submitting URLs are actions with
an outside effect, tied to accounts this repository does not own.

**The dry run found a real defect immediately.** It reported `/robux-to-usd/`
as the changed page when the planner had changed `/usd-to-robux/` — an earlier
edit had matched the route string inside another record's `internalLinks` and
bumped the wrong record's `dateModified`. The sitemap test could not have
caught it, because it derives its accepted dates from the registry and the
registry was self-consistently wrong. `npm run seo:indexnow -- --dry-run` now
answers "which pages does this release claim to have changed", which is worth
running before a deploy whether or not anything is ever submitted.

---

## D-037 · The data behind the charts is published as data

`/roblox-stats/` and `/platform/` render charts and tables that cannot be
checked without retyping them. A chart is an argument; the rows behind it are
the evidence.

`/api/stats` and `/api/platform` publish both, as JSON or as CSV, with visible
download links on the pages themselves rather than only in the API
documentation — the difference between data that is published and data that is
technically available.

**Provenance is a column, not a preamble.** Every row carries where its value
came from: whether Roblox reported it or this site derived it, which filing or
endpoint, and when it was observed. A comment block at the top of a CSV is not
part of the format — spreadsheets read it as a broken first row — and a note in
an HTTP header is invisible to anyone who already has the file. Repeating a
short string a few hundred times costs a few kilobytes and means a row pasted
into a document still says what it is.

**The absences are exported too.** The metrics Roblox does not publish ship as
rows with reasons. A file containing only what Roblox publishes reads as the
complete picture, and someone would fill the gap with an estimate — the exact
thing the page refuses to do.

**No gap is ever filled.** The observed export contains exactly the
observations collected; a collector outage leaves a hole. When no observations
can be read at all the endpoint answers 503 rather than an empty list, because
an empty file is indistinguishable from a period with no players.

**The export makes no request to Roblox.** It reads Workers KV only. An export
that triggered an upstream fetch would let anyone raise this site's request
rate against Roblox by reloading a URL.

Money crosses the boundary as an exact decimal string, never a float — the CSV
writer never sees a `number` for a monetary value.

Two of my own defects, both caught by running the thing rather than by reading
it. A row marked `derived` was carrying the note "Reported to the nearest
million", which says two different things about where a figure came from. And
the first version of the export test split rows on commas, which reads the
wrong column the moment the `note` field contains a sentence — it now parses
with the same RFC 4180 reader the keyword pipeline uses.

---

## D-038 · An OpenAPI document generated from one declaration

The risk with publishing OpenAPI is not being wrong on the day it is written;
it is becoming a second contract, maintained by hand, that drifts from the
service until it is worse than nothing — and nothing about publishing it makes
that visible.

`src/lib/api/contract.ts` is the single declaration. `/api/openapi.json` is
generated from it, the documentation page reads it, and a test compares it
against the route handlers that actually exist in `src/app/api`. An endpoint
added without being described fails the build; so does a description of an
endpoint that has been removed.

Deliberately not a runtime validation layer. The handlers already return what
they construct, and asserting that with a second implementation of the same
shapes would be the drift problem again in another form. This describes the
service; it does not re-specify it.

The document states the exact `Cache-Control` each endpoint sends, and a test
asserts the declared value matches — a caller planning around caching is
relying on it, and it is the field most likely to change without anyone
thinking of the contract.

---

## D-039 · Search Console exports are read, and never acted on automatically

Sixty-three amount pages have been held since launch because the corpus this
site was built from is two competitor exports. A competitor's rankings are a
record of what they rank for, not of what anyone searched.

`npm run seo:search-console` reads a real export and reports four things:
positions in the 5–20 band where a change plausibly moves something, pages
shown often and clicked rarely, queries answered by more than one page, and
amount queries with demand and no page.

**Every finding is a proposal.** Nothing writes a route, edits the registry or
unblocks a held page. The gate asks for distinct search behaviour, unique
worked examples and an intent no existing route serves — none of which a volume
figure can answer.

**The export never enters the repository.** `private/` is git-ignored, and so
is the report. A performance export is the owner's data about their own
property; committing it would publish a list of every query this site is seen
for.

**The output is deterministic** — same export, byte-identical report — because
a report that reorders itself cannot be diffed, and a diff is how you see what
changed since last month.

Two of my own defects, both found by running it against a synthetic export
rather than by reading the code. Concatenating the query-level and page-level
files listed one query three times and counted its impressions twice; the
query-level export is now authoritative where it exists, and the page export is
folded down only when it is absent. And the cannibalisation grouping used
`normalizeKeyword`, which tidies Unicode but leaves case alone — so "Robux To
USD" and "robux to usd" counted as two queries with one page each, which is the
opposite of the finding.

---

## D-040 · `llms.txt` is generated, because the written one had stopped being true

The file was hand-maintained in `public/`, and it did what a hand-maintained
index does. By the time it was replaced it knew nothing about `/platform/`,
`/platform/stock/`, `/roblox-stats/`, the earnings planner, the data exports or
the API description — five additions it had silently missed, while continuing
to present itself as an account of the site.

It is now generated from the route registry and the API contract, and a test
asserts every indexable route appears exactly once and no noindex route appears
at all. The prose stays hand-written: "what this site is" and "how to cite it"
are not derivable from a registry and should not read as though they were.

Two rules the generated file keeps. **No endpoint is presented as canonical
content** — the JSON and CSV endpoints sit under a heading that says they are
data, never mixed in with pages. And **no claim that publishing it does
anything**: llms.txt is a transparency convention, not a ranking factor, and
the file says so.

`/api/` and `/contact/` are excluded from their type's listing because both
already have their own heading further down. Listing either twice would suggest
two different things exist — which is what the first version did.

**Documentation counts were stale in the same way.** The implementation report
claimed 32 indexable routes and 377 unit tests against a real 36 and 574; the
internal-link strategy claimed 143 edges against 160. All corrected against
measured values. Two remaining mentions of "32 routes" are left alone on
purpose: both are historical records of what a phase delivered, and a ledger
that edits its own history is not a record.

---

## D-041 · `Dataset` only where files exist, and an analytics allowlist

**`Dataset` and `DataDownload` became legitimate the moment the exports did.**
Before `/api/stats` and `/api/platform` existed, emitting `Dataset` would have
described a distribution that did not — a broken link wearing structured data.
It is now declared on exactly the two routes that publish downloads, and an
end-to-end test fetches every `contentUrl` the markup names, so a distribution
that stops answering fails the build.

No `creator` property. `Organization` is not emitted anywhere on this site
while the real registered name is unknown, and a schema property is not a
reason to invent one.

**Analytics events are an allowlist, because the alternative fails quietly.**
Every value typed into this site is a fact about someone's income — a balance,
a target, a tax estimate — and the natural way to write an event is to attach
the number that just changed. `sanitiseEvent` therefore drops any property not
explicitly declared rather than passing it through, refuses a number arriving
where a category belongs (the exact shape a leaked balance takes), and caps
value length so a balance cannot ride in a field meant for a currency code. A
test feeds it a realistic payload full of amounts and asserts only the category
survives.

`minimum_state` is the closest this gets to describing a balance, and it is one
bit: below the documented minimum, or not. That is enough to learn "most
visitors are under the threshold" without learning anyone's balance.

`sanitisePath` strips the query string, because a shared calculation URL
carries the amount in it — sending the full path would defeat every other rule.

Every event names a committed action, never a value changing, and a test
rejects any event name ending in `_entered`, `_typed`, `_changed` or `_input`.
Nothing fires without a configured provider, and nothing fires without consent:
GA4 is loaded behind the consent prompt, so `window.gtag` simply does not exist
until then, which is the gate itself rather than a second copy of it that could
disagree.

Wired to three committed actions — copying a result, creating a share link, and
opening a navigation group. All three are dormant: no provider is configured,
and the browser suite asserts no analytics request is made.

Cost: 0.9 kB gzipped, taking application JavaScript to 109.4 kB against 125 kB.

## D-042 · The verification date is frozen; a second, automatic date is not

**Observed in repository / New implementation decision.**

The footer printed one date — "Rates verified 17 August 2026" — and it was
right to be frozen. It records the day a person read Roblox's documentation and
confirmed every figure in the registry. A footer that advanced it on its own
would be claiming a check nobody performed, which is the failure this site is
built to avoid.

But "nobody checked today" was never the goal; it was only the truth. Someone
reading the site a fortnight after that review has no way to tell whether the
rate still holds, and the honest fix is not to move the date — it is to make
the check real, automatic, and its own separately-labelled fact.

**What is read.** Roblox publishes its DevEx page as markdown alongside the
HTML, linked from the page itself, at
`…/production/monetization/developer-exchange.md`. Thirteen kilobytes, with a
`last_updated` field that is Roblox's own statement of when the page changed.
That is what the check reads — not a rendered layout that will be redesigned.
`robots.txt` on `create.roblox.com` disallows only `/dashboard/` and
`/talent/`.

**Four checks a day, not ninety-six.** The cron fires every fifteen minutes for
the player-count collector. `checkRateSource` owns its own six-hour interval
and returns null in between, so nearly every tick costs one KV read. Six hours
is far finer than a figure that changes a few times a year.

**It may confirm; it may never rewrite.** A changed figure raises `changed` and
stops. Nothing copies a number into the registry, because a rate is not a
number to be copied — it needs a person to read what changed, what balance it
applies to, and from when. The automatic date is a statement that the source
was re-read, never that the site re-published itself.

**An unreadable document is not a change.** Anchor phrases must be present
before any figure is believed. Without that guard, an outage, a challenge page
or an empty body would contain none of the expected rates and would read as
"Roblox has withdrawn the DevEx rate" — the loudest possible false alarm from
the quietest possible failure. A test feeds it a challenge page, an empty body
and a 404 and asserts none of them is ever judged `changed`.

**The comparison is not done by the job.** The scheduled run records only what
the document said; `/api/rate-check/` compares that record against the registry
at read time. So a registry edit re-evaluates the stored observation
immediately rather than leaving a verdict computed against figures the site no
longer shows — and the module stays free of imports so it can run inside the
Worker.

**The check that cannot fail, avoided.** The unit suite compares the committed
fixture — the real document, fetched unmodified — against `rates.json` itself
rather than a copy of its figures. Editing a rate without the source having
changed fails the suite, which is exactly the review this feature exists to
force. An end-to-end test asserts `/api/rate-check/` reports the same figures
`/api/rates/` publishes, so the two cannot drift into comparing different
numbers.

**Absence renders nothing.** Before the first run, or with storage unbound,
`status` is `unknown` and the footer shows no line at all. A reassuring
sentence rendered when no check had happened would be the original failure
wearing a new label, so an end-to-end test asserts the footer makes no such
claim in a build with no storage.

Cost: 0.9 kB gzipped, taking application JavaScript to 110.3 kB against 125 kB.

## D-043 · The supplied logo, minus the half of it that could not be read

**New implementation decision.**

A real brand mark arrived — a hexagon circled by two exchange arrows, holding a
calculator whose screen shows a dollar sign — replacing the geometric
placeholder that had stood in for one. Three things about adopting it were
decisions rather than mechanics.

**The wordmark inside the artwork is not used.** The supplied file is a full
lockup: the mark, "DevEx" in green, then "Calculator" in white at low opacity.
That last word is invisible on this site's light theme and faint on the dark
one, so shipping the lockup would have meant shipping a brand name half the
readers cannot see. Text baked into a bitmap also cannot be selected,
translated, resized or read aloud. So the mark is cropped out and the name
beside it stays real text, following the theme.

The background needed no removal — the supplied PNG was already transparent.
Flood-filling it would have been work done against a problem that did not
exist, and worse: the artwork's own white calculator keys would have been the
first thing a naive white-to-transparent pass destroyed.

**Every icon smaller than about 40px is drawn, not downscaled.** The mark holds
six calculator keys and two arrows; at 32px they merge, and at 16px it is a
green blob. So `icon.svg`, the maskable icon, the Apple touch icon and the
social-card mark all keep the two features that survive — the hexagon
silhouette and the dollar sign — in the brand's own greens. That is why the
header uses 40px rather than the 32px the placeholder used: 40 is where the
drawing holds together. The Apple icon drops the hexagon as well, because iOS
masks the corners and would clip the points that make it recognisable.

**The mark is decorative, and the test says so.** `alt=""`, because `Wordmark`
beside it is the link's accessible name — the old SVG carried an `aria-label`
and made a screen reader announce "DevEx Calculator" twice for one link.

**A check that had stopped asking its own question.** An end-to-end test
asserted zero `<img>` elements on the page, to keep the hand-built diagrams
from becoming pictures of text. A brand mark in the header broke it, and the
tempting fix — delete the assertion — would have removed the only thing
protecting the diagrams. It now asserts no image inside any `figure`, and a
second test holds the brand mark to exactly two instances, one source, and
empty alt text. Both can still fail.

Cost: 7 kB once, cached for a week rather than the year `/icons/*` uses —
immutable is wrong for a filename that stays stable while the artwork behind it
might not.

**Deliberately not done: the palette.** The mark is green; the interface is
still blue. Turning `--color-primary` green would recolour every link, button
and chart on the site, and the brand's greens are too bright to pass contrast
as text on white — it would mean a dark forest green that is not the logo's
green either. That is a design decision with an accessibility cost attached,
and it belongs to the owner, not to a commit about adding a logo.

## D-044 · What Google's own audit found, and the one thing it was wrong about

**Observed in repository / Verified through official source.**

The question was which colours the site should use. The answer came from
measuring rather than taste, and then from running Google's own tool instead of
guessing what it would say.

**The interface stays blue, and the reason is arithmetic.** Every green in the
supplied logo was measured against this site's surfaces:

| Colour | On white | AA text (4.5:1) |
|---|---|---|
| `#8bf60c` logo lime | 1.37:1 | fails |
| `#3fd40d` logo green | 1.97:1 | fails |
| `#15980a` logo deep green | 3.80:1 | fails |
| `#16a34a` | 3.30:1 | fails |
| `#15803d` | 5.02:1 | passes |
| `#2563eb` current | 5.17:1 | passes |

No green in the logo can carry text. The lightest one that can is `#15803d` —
which is already `--color-success` on this site, where green means *eligible*:
the balance meets the minimum, the Robux qualify. Making links the same green
would take the one colour that carries a meaning on a site about eligibility
and spend it on "this is a link". The brand green is therefore decorative — the
mark, and the icons — and the semantic palette is left alone.

**Then the audit.** Lighthouse 12.8.2, desktop, against production:
accessibility **100**, best practices **100**, performance 93, SEO 92. Four
findings were real and three are fixed here.

*The brand mark was 88% waste.* One 104×120 file was served into a 35×40 slot.
Three densities now ship and the browser chooses: 2.3 kB on an ordinary screen
instead of 7 kB. The path gained a version so the files can be immutable for a
year — a stable filename with a year-long cache would strand a revised logo in
a returning reader's browser, which is why the first attempt used a week and
was correctly flagged as an inefficient policy.

*The homepage could not be cached, anywhere.* Seven routes render per request
because they read the query string, and Next marks every such response
`no-store`. That is the right default and the wrong one here: the root document
took **1,030 ms**, and `no-store` also disqualifies a page from the browser's
back/forward cache, so returning from a click reloads instead of restoring.
`edgeCachePolicy` relaxes it for an allowlist of five routes whose HTML is a
function of the URL and the registry alone — never with a query string, since a
shared calculation carries somebody's balance; never for `/platform/`, whose
chart would quietly stop moving; and only over a response that was already
`no-store`, so it can never override a policy set on purpose.

*`robots.txt` carries an unknown directive.* Not ours: Cloudflare is prepending
a managed block to the file this site serves, and it contains
`Content-Signal: search=yes,ai-train=no,use=reference`. See the note below.

**A bug the audit did not find, and a test that had been passing for the wrong
reason.** A no-JavaScript end-to-end test returned early whenever storage was
unbound — which was every environment it had ever run in, CI included. Once
local Worker state existed it ran for the first time and failed immediately:
with scripting off there is no menu to open, so the entire grouped navigation
renders inline inside a `position: sticky` header. On a phone that is roughly
eleven hundred pixels of header pinned over the page for the whole scroll. A
`<style>` inside the `<noscript>` block now unsticks the header exactly where
that content renders, and two tests assert both halves: static without
scripting, sticky with it.

**Left for the owner: Cloudflare's managed robots.txt.** It is currently
blocking `GPTBot`, `ClaudeBot`, `CCBot`, `Google-Extended`, `Bytespider`,
`meta-externalagent`, `Amazonbot` and `Applebot-Extended` from the whole site.
That is a real editorial decision and it contradicts something this site built
on purpose — `llms.txt`, a documented API, and a body of sourced figures whose
value is partly in being citable. It also costs the SEO score through the
unknown directive. Not changed here, because deciding who may read the site is
not a performance fix.

---

## D-045 · `server-only` is taken, and the bundle check is kept as well

**New implementation decision.**

`get-dictionary.ts` used to explain the absence of the `server-only` package by
pointing at a bundle check: "the bundle validator already fails the build if
locale JSON appears in a client chunk — a check that measures the real thing
rather than asserting it." No such check existed. The bundle validator measured
sizes and searched for analytics beacons; nothing anywhere looked for a
dictionary. The sentence performed rigor — it named the empirical/assertive
distinction and put itself on the right side of it — and that is what stopped
anyone from checking. **A comment that congratulates itself on being empirical
deserves more scrutiny than a plain one, not less.**

The check exists now and is falsified (see `docs/qa/falsification.md`). So the
question is no longer "is anything guarding this" but "is the guard the right
shape", and the honest answer is that the two guards catch different things:

| | `server-only` | the bundle check |
| --- | --- | --- |
| When it fires | At the import, in `next dev` and in `next build` | After a full build, in `npm run validate:bundle` |
| What it names | The module chain that reached client code | The chunk file and the locale whose text is in it |
| What it guards | Any module that imports it — here, the dictionary **loader** | The emitted **data**, whatever path it took |
| What it misses | A client component importing `locales/de/common.json` directly, never touching the loader | A leak too small or too escaped to match a 40-character ASCII needle; a leak of loader code carrying no catalog text |

Neither is a superset. `server-only` protects the door; the bundle check
searches the room. The failure the loader's header was actually worried about —
seven languages of JSON reaching a visitor — can arrive through either.

**Cost.** One runtime dependency in a project that has three (`next`, `react`,
`react-dom`), which is a real and deliberate discipline. Against that:
`server-only` is a first-party React/Next package, has no transitive
dependencies, ships no bytes to the client, and contains a `package.json`
`exports` map plus two near-empty modules. The supply-chain surface is as close
to zero as a dependency gets, and the alternative — hand-rolling the same
`exports`-condition trick in a local module — is the same mechanism with none
of the maintenance and a worse error message.

**Verified safe before recommending.** Every value import of
`get-dictionary.ts` is from a Server Component, a layout, a view or a
server-side helper; all 30-odd client-reachable files import only
`type Translate`, which is erased at compile time and cannot pull the module
into a chunk. Adding the import breaks nothing that exists today.

*Change if:* the dependency count becomes a hard constraint for a reason this
does not anticipate, in which case delete the import and keep the bundle check
— which is the state this decision replaced, and the one that shipped for
months believing it was something else.

---

## D-046 · A published locale must have been read, not necessarily by a native speaker

**New implementation decision.**

`publishReadiness` demanded `qualityReview: "native-reviewed"` before a locale
could go public. On 2026-08-31 the owner relaxed it to accept `self-reviewed`
as well, and published Turkish on that basis.

**What changed, and what deliberately did not.** The bar moved from "a named
native speaker read it" to "a person read it". `machine-drafted` and `none` are
still refused, which is the line that matters: a locale nobody has read cannot
be public. What did *not* change is the honesty of the label — `native-reviewed`
still requires a named person and a date, `assertRegistry` still refuses a
reviewer recorded without the matching claim, and `tr` is recorded as
`self-reviewed` with `reviewerName: null`. The site does not claim a native
review it did not get, and this decision does not make that claim cheaper.

**The cost, stated plainly.** Turkish ships with four sentences whose negation
is carried by a verb suffix, confirmed only by non-native readings. Those are
the site's most load-bearing sentences — the ones that stop somebody believing
they are guaranteed money. A native reader could still find one of them
ambiguous, and ambiguity is precisely what a non-native reader is least able to
detect. `docs/i18n/critical-claims.md` records that as unresolved rather than
closed, and the review packet is kept ready to send.

**How the four got past the publish escalation.** Not by exemption.
`SETTLED_REVIEW_FINDINGS` in `scripts/i18n/audit/checks.ts` holds one entry per
locale per check per key, each naming who settled it, when, and on what basis;
a settled finding is reported at `quality` rather than vanishing, so `tr` shows
`quality 4` in every audit run instead of showing nothing. Three properties are
enforced rather than intended, and all three were falsified:

- Removing an entry re-escalates its finding to `blocking` and fails the audit.
- An entry that matches no finding is reported `STALE` and fails the audit, so
  the table cannot rot into a list nobody reads.
- An entry aimed at a `critical` finding does nothing — the table is applied
  only at the `review` escalation step. Planting a wrong figure in `tr` **and**
  a settlement for it gives `critical 2 … FAIL` plus a `STALE` report for the
  settlement. A wrong number stays a wrong number.

*Change if:* a native reader becomes available for any locale, in which case
that locale moves to `native-reviewed` with their name and the date, and the
corresponding entries in `SETTLED_REVIEW_FINDINGS` are deleted rather than
edited — the finding stops occurring once a native speaker has answered it, and
the stale check will say so.

**A ninth surface, found by this.** `scripts/quality/check-routes.ts` built its
expected sitemap from `indexableRoutes` without asking `publicLocales()`.
Publishing Turkish turned it red with 36 "unexpected URL" errors against 36
entirely correct URLs — the failure mode that trains somebody to widen a check
rather than read it. Now derived from the same two lists the sitemap itself
uses. See `docs/invariant-register.md`.
