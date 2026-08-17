# Master implementation plan

Written at the start of Phase 0 and kept as the record of intended approach.
Actual progress is in `progress-ledger.md`; deviations are in `decision-log.md`.

## Situation

Empty repository. Three supplied files: the specification and two keyword
exports. Scaffolding from nothing, so there is no existing work to preserve, no
baseline to protect and no migration to plan — which removes the usual risk but
also removes any safety net of "it worked before".

## Sequencing, and why

The order below is not the specification's phase order restated; it reflects
which work de-risks which.

**1. Verify the facts before writing anything that depends on them.** The
specification supplies rate values as a "research checkpoint, not an immutable
hardcode". If any had changed, every page, test and example would be wrong.
Verify against the Roblox Creator Hub first.

**2. Build and test the calculation engine before any UI.** The engine is the
correctness boundary. Framework-independent, pure, exhaustively tested. If it is
right, UI changes are safe; if it is wrong, nothing else matters. Target: a
passing engine suite before a single component exists.

**3. Process the keyword data before designing the route architecture.** Route
decisions should follow evidence rather than intuition. Doing this second-to-last
would mean retrofitting an architecture to data it was not built from.

**4. Content manifest as the single source of truth.** Navigation, breadcrumbs,
canonicals, metadata, sitemap, JSON-LD, internal links and every validator read
one typed structure. This is the main defence against sitemap, canonical and
link destinations drifting apart — the failure mode that is hard to detect by
inspection.

**5. Validators before content, not after.** Writing 32 pages and then checking
them finds problems late and expensively. Build the checks first so each page is
verified as it lands.

**6. Test against the Workers runtime, not only `next start`.** The adapter is
where framework assumptions break. Anything that only works under `next start`
is not shipped.

## Principal risks

| Risk | Mitigation |
|---|---|
| A rate is wrong or goes stale | Build-time registry validation; verification date on every rate-sensitive page; a documented correction sequence |
| Floating-point drift in money | Exact `bigint` rational arithmetic; rates stored as strings so a JSON number cannot creep in |
| Scaled content abuse from 172 amount keywords | Hub plus a manually approved handful; publish gates; a bidirectional drift check |
| Cannibalisation between the homepage and Robux-to-USD | Distinct tasks, distinct keyword sets, an automated 60% overlap check |
| Adapter incompatibility discovered late | Run the Workers build and preview early and repeatedly |
| Claiming eligibility a calculator cannot determine | Wording discipline plus a test asserting the claim appears nowhere |
| Inventing facts to fill a gap | Where a source is silent, say nothing — and say why |

## Acceptance criteria

The build is done when every gate in the specification's §36 passes, or is
recorded as blocked or deferred with a reason. No item is quietly dropped.

## What will deliberately not be built

Decided up front so it does not become scope creep later:

- No page per amount, per currency or per spelling variant
- No universal Robux purchase price — Roblox prices by package and region
- No DevEx processing times — Roblox publishes none
- No country-specific tax guidance — needs qualified review
- No invented organisation, author, testimonial or usage figure
- No `FAQPage` schema for a rich result Google no longer serves
- No storage binding without a defined need

Each of these is a refusal to publish something that would be invented. They are
recorded here so that omitting them reads as a decision rather than an oversight.
