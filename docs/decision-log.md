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

