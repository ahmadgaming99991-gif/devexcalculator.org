## DEVEXCALCULATOR.ORG - FULL-SITE MULTILINGUAL GROWTH, SEO, AEO, GEO, UX, AND CLOUDFLARE QA SYSTEM

Paste this entire prompt into Claude Code or another repository-capable coding agent while the `devexcalculator.org` repository root is open in Visual Studio Code.

Do not paste this into a blank folder. Work only inside the existing production repository.

---

# 0. EXECUTION DIRECTIVE

You are working inside the real production repository for:

- Site: `https://devexcalculator.org`
- Repository: `ahmadgaming99991-gif/devexcalculator.org`
- Default branch: `main`
- Hosting: Cloudflare Workers through OpenNext
- Deployment tool: Wrangler
- Framework: Next.js App Router
- Language: TypeScript in strict mode
- UI: React and Tailwind CSS
- Source control: Git and GitHub

This is an implementation task, not an audit-only task.

You must:

1. Inspect the current repository and Git state.
2. Inspect the current production site and compare it with the checked-out commit.
3. Read the current architecture, decision log, SEO documentation, route registry, source registry, tests, deployment files, and existing master prompt.
4. Create a measured baseline.
5. Implement the complete multilingual architecture and the approved launch locales.
6. Run every applicable validation, unit, integration, end-to-end, accessibility, visual, build, OpenNext, and Wrangler check.
7. Fix failures instead of only reporting them.
8. Create documentation and machine-readable reports.
9. Deploy a preview when credentials and the current workflow permit it.
10. Do not deploy production unless the repository owner has already authorized production deployment through the current workflow and every acceptance gate passes.

Do not stop after writing a plan, proposing a file tree, or creating empty translation files.

Do not ask for permission after every phase. Continue automatically unless one of these genuine blockers exists:

- Authentication is required and unavailable.
- A destructive production action has no rollback path.
- A legal or business identity fact is required and cannot be inferred safely.
- A human/native-language review is explicitly required before a locale can be marked as human-reviewed.
- An upstream service or official source is unavailable and the task cannot be completed safely without it.

When blocked, complete every non-blocked item first, record the blocker precisely, and ask one concise question only at the end.

Never claim that a translation received human review unless a real human reviewer performed it.

---

# 1. CURRENT REPOSITORY IS THE AUTHORITY

The repository is already mature and production deployed. Do not rebuild it from scratch and do not rerun the historical build prompt as though the site were empty.

Before editing, inspect at minimum:

- `package.json`
- `next.config.ts`
- `open-next.config.ts`
- `wrangler.jsonc`
- `worker/`
- `src/app/`
- `src/components/`
- `src/config/`
- `src/data/`
- `src/features/`
- `src/lib/`
- `src/lib/content/route-registry.ts`
- `src/lib/content/amount-pages.ts`
- `src/lib/calculations/`
- `src/lib/rates/`
- `src/lib/seo/`
- `src/lib/platform/`
- `src/lib/analytics/`
- `scripts/`
- `tests/`
- `docs/`
- `schemas/`
- `seo/`
- `README.md`
- `CHANGELOG.md`
- `DEVEXCALCULATOR_ORG_MASTER_SINGLE_PROMPT.md`

The historical master prompt is background context, not the current implementation specification. Current code, current tests, current production behavior, and current official sources take priority.

Do not reimplement features that already exist merely because they appear in an old prompt.

---

# 2. PRESERVATION CONTRACT

The multilingual work must preserve all existing correct behavior, including but not limited to:

- Exact rational or bigint-based money calculations
- Standard, legacy, and conditional U.S. 18+ DevEx rate handling
- Shared validated rate registry
- Source provenance and verification dates
- Automated official-rate monitoring without automatic rate mutation
- Earned Robux eligibility distinctions
- DevEx minimum handling
- Robux-to-USD and USD-to-Robux tools
- Earnings target and timeline planner
- Roblox marketplace tax calculator
- Local-currency reference estimates
- ECB or current configured FX behavior
- Stale FX handling
- Saved calculation history stored locally
- Shareable calculation URLs
- Privacy-safe analytics allowlists
- No transmission of balances, payout values, tax values, fees, or query-string amounts to analytics
- Source registry
- Methodology pages
- Corrections policy
- Changelog and feeds
- Generated `llms.txt`
- OpenAPI contract and API documentation
- JSON and CSV data exports
- Dataset and DataDownload schema where valid
- Roblox platform statistics
- Scheduled platform-history collection
- Health and collector-pulse behavior
- KV retention rules
- Cloudflare cache behavior
- CSP and all security headers
- Apex canonical host and `www` redirects
- Mandatory trailing-slash URL policy
- Current robots and sitemap behavior
- Current route registry as the crawl-surface authority
- Curated amount-page policy
- Current internal-link graph
- Existing social profiles and schema `sameAs`
- Current accessibility behavior
- Current no-JavaScript usability
- Current bundle and Worker size budgets
- Current test suites and validation scripts
- Current production rollback and deployment workflow

Do not weaken or bypass a current validator to make the multilingual build pass.

If a current validator is no longer structurally correct after localization, replace it with an equally strict or stricter locale-aware validator and prove that it can fail on a deliberately broken fixture.

---

# 3. PRIMARY MISSION

Build a complete, source-backed multilingual system that expands organic reach and usability without creating doorway pages, thin translations, duplicate intent, inaccurate financial wording, or an unmaintainable second copy of the application.

A published localized page must translate the complete experience, not only the navigation.

Complete localization includes:

- Header navigation
- Mobile navigation
- Language selector
- Skip links
- Calculator labels
- Input labels
- Placeholders
- Hints
- Validation messages
- Warnings
- Buttons
- Tabs
- Result labels
- Eligibility states
- Rate names and explanations
- Currency labels
- Local-history UI
- Share UI
- Empty states
- Loading states
- Error states
- Tables
- Captions
- Diagram text
- Tooltips
- Accessibility labels
- Screen-reader announcements
- Cookie or analytics consent UI when configured
- Contact form UI and responses
- Footer
- Breadcrumbs
- Table of contents
- Page introductions
- Quick answers
- Long-form guide content
- FAQ questions and answers
- Related-link anchors
- Legal and policy content
- Page titles
- Meta descriptions
- Open Graph titles and descriptions
- Open Graph image text or a language-neutral fallback
- Twitter metadata
- Canonicals
- Hreflang
- Structured-data text
- Sitemap alternates
- `lang` and `dir`
- Not-found and error pages
- Every other user-visible or search-relevant string

Do not publish a locale that contains translated navigation around an English article body.

---

# 4. LANGUAGE STRATEGY

## 4.1 Launch locales to implement now

Implement these seven published locales as the first complete release:

| Language | Internal locale | URL prefix | Hreflang | HTML lang | Direction | Open Graph locale |
|---|---|---|---|---|---|---|
| English | `en` | none | `en` | `en` | `ltr` | `en_US` |
| Brazilian Portuguese | `pt-BR` | `/pt-br/` | `pt-BR` | `pt-BR` | `ltr` | `pt_BR` |
| Spanish | `es` | `/es/` | `es` | `es` | `ltr` | `es_ES` |
| Indonesian | `id` | `/id/` | `id` | `id` | `ltr` | `id_ID` |
| French | `fr` | `/fr/` | `fr` | `fr` | `ltr` | `fr_FR` |
| German | `de` | `/de/` | `de` | `de` | `ltr` | `de_DE` |
| Turkish | `tr` | `/tr/` | `tr` | `tr` | `ltr` | `tr_TR` |

English remains unprefixed. Do not create `/en/` as a second indexable English site.

Use stable existing English slugs after the locale prefix in this release.

Examples:

- `/devex-rates/`
- `/pt-br/devex-rates/`
- `/es/devex-rates/`
- `/id/devex-rates/`
- `/fr/devex-rates/`
- `/de/devex-rates/`
- `/tr/devex-rates/`

Do not create translated slugs in parallel with stable slugs. A translated-slug migration may be considered later only with a complete route map, redirect plan, canonical migration plan, and measured search demand.

## 4.2 Planned locales - architecture ready, not publicly generated yet

Make the locale registry capable of supporting these future locales without restructuring the application:

Tier 2:

- Polish: `pl`
- Italian: `it`
- Vietnamese: `vi`
- Thai: `th`
- Japanese: `ja`
- Korean: `ko`

Tier 3:

- Arabic: `ar`, RTL
- Simplified Chinese: `zh-Hans`
- Traditional Chinese: `zh-Hant`

Do not create public routes, sitemap entries, hreflang targets, or placeholder dictionaries for a planned locale until its content is complete and its locale status is changed to `published`.

Do not add Russian, Hindi, Urdu, Bengali, Malay, or any other language automatically. Add another language only after a written demand assessment using Search Console, analytics, native keyword evidence, official platform terminology, and maintenance capacity.

## 4.3 Locale lifecycle

Every locale must have one explicit state:

- `planned`
- `draft`
- `review`
- `published`
- `retired`

Only `published` locales may:

- Generate public routes
- Appear in the language selector
- Appear in hreflang clusters
- Appear in sitemaps
- Be submitted through IndexNow
- Be linked from indexable pages

A draft or review locale must not leak into production HTML.

---

# 5. EVIDENCE AND RESEARCH RULES

Use evidence in this order:

1. Current repository and current tests
2. Current production behavior
3. Current official Roblox documentation
4. Current official Next.js documentation
5. Current official Cloudflare and OpenNext documentation
6. Current Google Search Central documentation
7. Current schema.org definitions
8. Supplied keyword CSV files
9. Search Console exports when available in the ignored private-data path
10. Public competitor behavior
11. Clearly labeled inference

Do not use a competitor as the source of a DevEx rate, eligibility rule, tax rule, payout promise, or Roblox policy.

Do not treat a country appearing in an English keyword export as proof of native-language demand. Country data is a useful signal, not a language keyword study.

Create:

- `docs/i18n/language-opportunity.md`
- `docs/i18n/evidence-register.md`

For every locale, record:

- Official Roblox platform support status
- Availability of official localized DevEx terminology
- Search Console country and query evidence, if available
- Existing keyword-export country evidence
- Competitor coverage
- Translation complexity
- RTL or script complexity
- Legal and financial terminology risk
- Expected maintenance cost
- Launch recommendation
- Evidence confidence

Do not promise ranking, traffic, revenue, or indexing.

---

# 6. BASELINE BEFORE EDITING

Before any code change:

1. Run `git status --short`.
2. Record the current branch and HEAD commit.
3. Refuse to discard or overwrite unrelated uncommitted work.
4. Create a safety tag such as `pre-i18n-v1-YYYYMMDD` if permissions allow.
5. Create branch `feature/full-site-i18n-v1`.
6. Install with the repository's lockfile and supported Node version.
7. Run the existing baseline commands.
8. Build for Next.js.
9. Build for OpenNext.
10. Run a Wrangler dry run or current Worker-size validator.
11. Record production HTTP behavior for representative routes.
12. Record current route counts, indexable route counts, sitemap URLs, client-JS size, Worker size, test counts, and Lighthouse or equivalent scores.
13. Record current English hardcoded-string count.
14. Record current metadata, canonical, schema, and internal-link status.
15. Record current production deployment commit through the health endpoint.

Create:

- `docs/i18n/baseline.md`
- `docs/i18n/current-route-inventory.json`
- `docs/i18n/current-string-inventory.json`
- `docs/i18n/current-seo-baseline.json`

If the README, progress documents, or blockers file contradict production reality, correct them only after verifying the current deployment. Preserve historical statements inside dated phase records.

---

# 7. REQUIRED ROUTING ARCHITECTURE

The implementation must satisfy all of these simultaneously:

- Existing English URLs remain unchanged.
- English remains unprefixed.
- Every localized page has correct server-rendered `<html lang>` from the first HTML response.
- Future RTL locales can receive correct server-rendered `dir="rtl"`.
- The implementation does not depend on a client script to repair `lang` after hydration.
- The implementation does not require a locale middleware or proxy that the current OpenNext architecture intentionally avoids.
- API endpoints remain unprefixed and stable.
- The existing trailing-slash policy remains intact.
- The existing apex-host policy remains intact.

## 7.1 Preferred Next.js structure

Use multiple root layouts through route groups unless current official Next.js and OpenNext verification proves an incompatibility.

Preferred shape:

```text
src/app/
  globals.css
  (en)/
    layout.tsx
    page.tsx
    ...existing English page routes
  (localized)/
    [locale]/
      layout.tsx
      [[...segments]]/
        page.tsx
  api/
  robots.ts
  sitemap.ts
  manifest.ts
  ...global route handlers and special files
```

Route groups must not change public URLs.

Create a shared root-document component so the English and localized root layouts do not drift:

```text
src/components/layout/root-document.tsx
```

It must receive at least:

- `locale`
- `htmlLang`
- `direction`
- localized dictionary or shell messages
- children

The server response for `/es/devex-rates/` must contain `<html lang="es" dir="ltr">` before JavaScript runs.

## 7.2 Shared page implementations

Do not maintain a complete second copy of every page under `[locale]`.

Refactor each page into a locale-aware shared page implementation used by both:

- The existing English route wrapper
- The localized route dispatcher

A valid approach is:

```text
src/features/pages/
  home-page.tsx
  devex-rates-page.tsx
  robux-to-usd-page.tsx
  ...
```

Each shared page implementation receives a typed locale context and route record.

The localized optional catch-all route may dispatch by stable route ID only when all of these are true:

- `generateStaticParams` enumerates every published localized route
- `dynamicParams = false` prevents unknown routes from silently becoming dynamic pages
- Invalid locale or route input returns a real 404
- Metadata is generated from the locale-aware route registry
- The page remains statically renderable where the English equivalent is static
- OpenNext preview returns the same status, headers, metadata, and content as the Next build

Do not create a generic catch-all that responds 200 for arbitrary slugs.

## 7.3 No automatic forced redirection

Do not force redirect a visitor or crawler from English to another language based on IP, `Accept-Language`, timezone, or browser settings.

The user may choose a language explicitly. Store that preference locally or in a non-sensitive cookie, but do not create redirect loops and do not hide English from crawlers.

A non-blocking language suggestion may be considered only if it:

- Is not shown to crawlers
- Does not redirect automatically
- Is dismissible
- Does not cause layout shift
- Does not load a third-party service

---

# 8. LOCALE AND ROUTE CONFIGURATION

Create one typed locale registry, for example:

```text
src/i18n/config.ts
src/i18n/types.ts
src/i18n/locale-path.ts
src/i18n/locale-context.ts
src/i18n/get-dictionary.ts
src/i18n/formatters.ts
src/i18n/number-parser.ts
src/i18n/glossary.ts
```

Each locale record must include:

- Stable internal locale code
- URL prefix
- BCP 47 language tag
- Hreflang value
- Open Graph locale
- Display name in English
- Native display name
- Text direction
- Lifecycle status
- Decimal separator
- Grouping separator policy
- First day of week only if the UI needs it
- Date formatting policy
- Plural rules through `Intl.PluralRules`
- Search locale or region hint for research only
- Quality-review status

Create typed helpers:

- `isSupportedLocale(value)`
- `isPublishedLocale(value)`
- `getLocaleMeta(locale)`
- `getLocaleFromPath(pathname)`
- `stripLocalePrefix(pathname)`
- `localizedPath(locale, canonicalRoute)`
- `switchLocalePath(currentLocale, targetLocale, pathname, search, hash)`
- `getPublishedLocalesForRoute(routeId)`
- `isRtl(locale)`
- `getDirection(locale)`

Never infer a locale from an arbitrary first path segment without validating it against the locale registry.

---

# 9. TRANSLATION DATA ARCHITECTURE

Use build-time, server-only, modular dictionaries.

Prefer a zero-runtime-translation architecture. Do not use Google Translate widgets, browser translation APIs, remote translation APIs, or client-side dictionary fetching for initial page content.

Do not add an i18n package only because it is popular. First verify whether the current requirements can be met cleanly with typed server-only dictionaries, dynamic imports, and the existing route registry. If a package is added, document why it is safer and smaller than the custom alternative, verify Cloudflare compatibility, and measure its bundle impact.

Recommended structure:

```text
src/i18n/
  config.ts
  types.ts
  get-dictionary.ts
  formatters.ts
  number-parser.ts
  route-content.ts
  schema/
    locale.schema.json
    dictionary.schema.json
    route-content.schema.json
  locales/
    en/
      common.json
      navigation.json
      calculator.json
      rates.json
      marketplace.json
      platform.json
      guides.json
      legal.json
      contact.json
      errors.json
      accessibility.json
      seo.json
      schema.json
      routes/
        home.json
        robux-to-usd.json
        usd-to-robux.json
        devex-rates.json
        ...one file per route or another equally modular structure
    pt-BR/
      same structure
    es/
      same structure
    id/
      same structure
    fr/
      same structure
    de/
      same structure
    tr/
      same structure
```

Use dynamic server-only imports so a request for one locale does not load every dictionary and the browser receives no unused locale payload.

Do not permit arbitrary raw HTML inside ordinary translation values.

Use structured objects and arrays for:

- FAQ entries
- Tables
- Steps
- Callouts
- Definitions
- Related links
- Legal sections
- Diagrams
- Cards
- Error messages
- Rich text with explicitly typed link placeholders

Use tokenized structured text instead of embedding uncontrolled HTML.

---

# 10. ENGLISH SOURCE OF TRUTH

English is the source locale, but invariant data must remain separate from language content.

Audit every hardcoded user-facing string in:

- `.tsx`
- `.ts`
- `.js`
- `.mjs`
- `.json`
- Worker responses
- Route handlers
- API documentation views
- Schema builders
- Metadata builders
- OG-image components
- Form handlers
- Validation code
- Toasts
- Error boundaries
- Not-found pages
- No-JavaScript fallbacks
- Data files containing labels or prose
- Rate registry text
- Source registry summaries
- Platform and stock UI
- Tests and snapshots that assert visible English

Move translatable English into the English dictionaries without deleting, shortening, genericizing, or rewriting the current content unless an independently justified content correction is required.

Do not move invariant facts into translation files.

Invariant examples:

- Numeric DevEx rates
- Minimum Earned Robux
- Effective timestamps
- Rate IDs
- Source IDs
- URLs
- API paths
- JSON property names
- OpenAPI operation IDs
- Currency codes
- Ticker symbols
- Game IDs
- Universe IDs
- KV keys
- Cache keys
- Cron configuration
- Schema property names
- Route IDs

Language-specific examples:

- Rate labels
- Eligibility summaries
- Table headings
- Date labels
- Explanatory prose
- Error messages
- Button labels
- Legal copy
- Schema descriptions
- OG text

Create a deterministic inventory with:

- Translation key
- Source file and line
- Route or component
- Content category
- Whether the string is required
- Whether it contains interpolation tokens
- Whether it contains a legal, financial, tax, or policy statement
- Whether it is allowed to remain in English
- Coverage for every published locale

Create:

- `docs/i18n/english-content-inventory.md`
- `dist/reports/i18n/english-content-inventory.json`

---

# 11. ROUTE REGISTRY REFACTOR

The current route registry is the single source of truth for crawlable routes. Preserve that principle.

Separate route invariants from localized route content without creating two competing manifests.

Keep invariant route properties centrally typed, including:

- Stable route ID
- Canonical English route path
- Status
- Indexation state
- Page type
- Primary intent ID
- Entity IDs
- Source IDs
- Parent route ID
- Relationship target route IDs
- Schema types
- Rate sensitivity
- Navigation group membership
- Publication rules
- Amount-page definition

Move localized properties into locale route content keyed by stable route ID, including:

- Title
- Meta description
- H1
- Navigation label
- Quick answer
- Section headings
- Section descriptions
- FAQ questions and answers
- Related-link anchor text
- OG image alt text
- Schema-visible descriptions
- Any page-specific introduction or body copy

Do not use the English path as the only dictionary key. Use stable route IDs so a future slug change does not orphan translations.

Add a build-time assertion that:

- Every invariant published route has English content
- Every route generated for a published locale has complete localized content
- Every internal-link target exists in that locale
- Every localized route maps back to exactly one invariant route
- No duplicate locale/path pair exists
- No localized page accidentally uses another route's metadata

---

# 12. CURATED AMOUNT PAGES

Preserve the current anti-scaled-content policy.

Do not generate a page for every numeric Robux query.

The current approved amount pages are deliberately curated and must remain the only amount pages unless a publication gate approves another amount.

For each published locale:

- Translate each approved amount page completely
- Preserve its amount-specific context
- Preserve exact calculations from the shared engine
- Localize number and currency display
- Keep stable amount route slugs
- Use same-locale sibling and hub links
- Do not replace unique context with one repeated template

A new amount may be added only when all of these are documented:

- Measurable query demand
- Distinct user intent or amount-specific context
- No cannibalization with an existing page or hub
- Unique copy beyond substituted numbers
- Strong internal-link position
- Source-backed calculations
- Publication override
- Passing near-duplicate detector

The multilingual rollout must not multiply a thin-page pattern by seven languages.

---

# 13. TRANSLATION QUALITY AND TERMINOLOGY

Translations must be natural, concise, accurate, and written for native readers.

Do not perform word-for-word translation.

Do not translate these protected names unless an official localized product name requires a descriptive companion phrase:

- Roblox
- Robux
- DevEx
- Developer Exchange
- Creator Hub
- OpenNext
- Cloudflare
- Next.js
- API
- JSON
- CSV
- USD
- Currency codes
- Product, game, experience, creator, or company names

At first meaningful mention, a locale may use the official localized term followed by the protected English term in parentheses when this improves clarity.

Build a locale glossary containing at minimum:

- Earned Robux
- Developer Exchange
- Cash out
- Exchange rate
- Legacy rate
- Standard rate
- Conditional U.S. 18+ rate
- Eligible balance
- Minimum requirement
- Marketplace commission
- Creator payout
- Purchase price
- Reference exchange rate
- Fees
- Tax estimate
- Source verified
- Last checked
- Last reviewed
- Estimate
- Not affiliated

Use current official localized Roblox documentation as terminology evidence where available. Official pages labeled AI-translated are terminology references, not unquestionable linguistic authority. Review awkward wording and do not copy long passages.

Language standards:

- `pt-BR`: natural Brazilian Portuguese, not European Portuguese
- `es`: neutral international Spanish; avoid country-specific tax or currency assumptions
- `id`: natural Bahasa Indonesia
- `fr`: natural standard French
- `de`: natural standard German with correct finance terminology
- `tr`: natural modern Turkish

Never invent:

- DevEx eligibility guarantees
- Payout approval guarantees
- Tax rates
- Bank fees
- Payment timing
- Currency rates
- Roblox policy
- Platform statistics
- Legal obligations
- Human-review claims
- Source verification dates

Preserve all placeholders exactly, including examples such as:

- `{amount}`
- `{count}`
- `{currency}`
- `{rate}`
- `{date}`
- `{minimum}`
- `{source}`
- URLs
- Email addresses
- Route IDs
- HTML IDs
- CSS classes

A changed, removed, duplicated, or translated interpolation token must fail validation.

---

# 14. EXACT CALCULATIONS AND LOCALE FORMATTING

Localization must never change calculation semantics.

Keep exact rational arithmetic through the complete calculation pipeline. Localize only parsing and presentation.

Requirements:

- No binary floating-point money arithmetic
- No translated rate constants
- No duplicated per-locale calculation engine
- No locale-specific hardcoded payout values
- No manually typed examples that can drift from the engine
- Every displayed example must be computed from the shared registry

Use `Intl.NumberFormat`, `Intl.DateTimeFormat`, `Intl.RelativeTimeFormat`, and `Intl.PluralRules` where appropriate.

Build a tested locale-aware input parser for:

- Integer Robux amounts
- Decimal USD target amounts
- Optional fee percentages
- Optional tax percentages

It must safely distinguish grouping and decimal separators.

Examples that must be tested:

- English: `1,000.50`
- Brazilian Portuguese: `1.000,50`
- German: `1.000,50`
- French: `1 000,50` and narrow no-break space formatting
- Indonesian: locale-appropriate separators
- Turkish: locale-appropriate separators
- Plain canonical input without separators

Do not accept an ambiguous value silently. Show a localized validation message when the parser cannot determine intent safely.

The DevEx base rate remains a USD rate. A localized page must not imply that Roblox publishes a BRL, EUR, IDR, TRY, or another local-currency DevEx rate.

Local-currency output remains a reference estimate from the configured FX source and must retain its timestamp, stale state, and disclaimer.

Do not infer default currency from language alone. Spanish does not identify one country or currency. Preserve the user's explicit currency choice and current privacy model.

---

# 15. FULL PAGE COVERAGE

Every currently indexable English route must have a complete equivalent in every published launch locale unless a route is explicitly documented as language-neutral and intentionally excluded.

At minimum cover:

## Tools

- Homepage DevEx calculator
- Robux to USD
- USD to Robux / payout target
- Roblox marketplace tax calculator
- Calculators directory
- Conversions hub
- Every approved amount page

## DevEx guides

- Current rates
- Rate history
- Requirements
- Earned Robux
- How to cash out
- Fees and taxes
- Guide directory or related topical hubs

## Roblox data

- Roblox statistics
- Platform live data
- Stock page
- Any published data methodology or download instructions

Translate UI, explanations, table headings, chart labels, states, export labels, and provenance labels.

Do not translate Roblox experience names or other upstream user-generated titles. Render mixed-script upstream text with `dir="auto"` where needed.

## Trust and resources

- Methodology
- Sources
- API documentation page
- Changelog index and UI
- Corrections
- About
- Contact
- Privacy
- Terms
- Disclaimer
- Accessibility
- Other current indexable trust pages

## Global and error surfaces

- Header
- Footer
- Mobile menu
- Consent UI
- Not found
- Error boundaries
- Empty states
- Loading states
- No-JavaScript fallback
- Health or operational human-readable pages, when public

Machine API payloads remain stable and language-neutral unless the API contract already defines localized text.

---

# 16. LANGUAGE SELECTOR

Create one accessible language selector used by desktop and mobile navigation.

Requirements:

- Show native language name and a clear accessible label
- Do not use flags as the only identifier
- Mark the current language
- Keyboard operable
- Correct focus management
- Escape closes
- Click outside closes when custom popover behavior is used
- Correct `aria-expanded`, `aria-controls`, and menu semantics
- No focus trap for a simple menu
- Works without JavaScript through ordinary links
- Switches to the equivalent route
- Preserves the query string used by shareable calculations
- Preserves only safe hashes that exist on the target route
- Never sends the query string to analytics
- Saves explicit preference locally
- Does not force redirect crawlers
- Does not create redirect loops
- Does not fall back to an English article while keeping a localized URL

Examples:

- `/devex-rates/` to Portuguese becomes `/pt-br/devex-rates/`
- `/es/conversions/100000-robux-to-usd/` to German becomes `/de/conversions/100000-robux-to-usd/`
- `/?amount=100000&mode=split` to Indonesian preserves the query state at `/id/?amount=100000&mode=split`

If a route is not published in the target locale, disable that locale for the route or link to the localized homepage with an explicit localized explanation. Never silently show English under the target locale.

---

# 17. LOCALIZED SEO AND SEARCH-INTENT SYSTEM

Do not translate English keywords mechanically.

Create a locale-specific search-intent map for each launch locale:

```text
seo/locales/<locale>/keyword-research/
seo/locales/<locale>/keyword-map.json
seo/locales/<locale>/route-decisions.json
seo/locales/<locale>/serp-notes.md
```

For every route, record:

- Localized primary query
- Query variants
- Search intent
- User wording
- Official terminology
- Competitor page type
- Whether demand is verified, inferred, or unknown
- Canonical route owner
- Cannibalization risks
- Title rationale
- H1 rationale
- Internal-link targets
- Publication decision

Do not create a new route only because a translated phrase exists.

Preserve one canonical owner per intent within each locale.

Localized titles and descriptions must:

- Match the actual page
- Use natural local wording
- Be unique within the locale
- Avoid keyword stuffing
- Avoid fabricated freshness
- Avoid ranking claims
- Avoid phrases such as official calculator
- Preserve independence from Roblox
- Fit measured search-result display conventions without using character count as the only criterion

Create locale-aware cannibalization analysis.

The current English SEO exports and route decisions remain evidence for English. They are not proof of search demand in another language.

---

# 18. CANONICALS AND HREFLANG

Every published localized page must have:

- Self-referencing canonical
- Complete reciprocal hreflang cluster for all published equivalents
- English alternate
- `x-default` pointing to the English equivalent
- Correct absolute URLs
- Correct trailing slash
- Correct apex host
- Correct HTML language
- Correct direction

Example cluster for the rate page:

```text
en       https://devexcalculator.org/devex-rates/
pt-BR    https://devexcalculator.org/pt-br/devex-rates/
es       https://devexcalculator.org/es/devex-rates/
id       https://devexcalculator.org/id/devex-rates/
fr       https://devexcalculator.org/fr/devex-rates/
de       https://devexcalculator.org/de/devex-rates/
tr       https://devexcalculator.org/tr/devex-rates/
x-default https://devexcalculator.org/devex-rates/
```

Do not canonicalize localized pages to English.

Do not include a draft, missing, redirected, noindex, 404, or non-reciprocal target in hreflang.

Do not use invalid region-only codes.

Create validators that crawl every hreflang target and verify:

- HTTP 200
- Self canonical
- Reciprocal return links
- Correct locale
- Correct route equivalence
- No redirect in the hreflang URL
- No mixed canonical hosts
- No missing trailing slash

---

# 19. SITEMAPS, ROBOTS, AND INDEXATION

Extend the current sitemap generator from the locale-aware route registry.

Only include:

- Published routes
- Indexable routes
- Canonical apex URLs
- HTTP 200 routes
- Valid localized routes
- Genuine `lastmod` values tied to real content changes

Exclude:

- APIs
- Health endpoints unless intentionally public but still non-indexable
- Draft locales
- Review locales
- Redirects
- Query states
- Noindex pages
- Internal tools
- Preview deployment URLs
- Errors

Use either:

- One sitemap index with logical per-locale sitemaps, or
- The existing sitemap structure extended with locale alternates

Choose based on measured URL count and maintainability, then document the decision.

Every sitemap and hreflang source must derive from the same route and locale registries.

Create:

- `docs/i18n/indexation-runbook.md`
- `dist/reports/i18n/sitemap-validation.json`
- `dist/reports/i18n/indexation-surface.json`

Verify:

- `robots.txt`
- Root sitemap
- Locale sitemaps if created
- Canonicals
- Hreflang
- Search Console verification tags when configured
- Bing verification tags when configured
- IndexNow behavior for published changed URLs only

Do not claim Google indexing from a successful sitemap request. Record account-level Search Console submission as an operator task when authentication is unavailable.

---

# 20. LOCALIZED STRUCTURED DATA

Localize visible structured-data text while preserving invariant machine fields.

Audit and support all currently valid schema types, including where applicable:

- WebSite
- WebApplication
- WebPage
- AboutPage
- ContactPage
- FAQPage
- BreadcrumbList
- CollectionPage
- ItemList
- Dataset
- DataDownload
- Organization only when a real configured organization exists

For localized pages:

- Add correct `inLanguage`
- Localize names and descriptions that are visible language content
- Keep IDs, URLs, currencies, numeric values, dates, and property names invariant
- Keep download endpoints stable
- Keep source URLs stable
- Keep social `sameAs` claims identical
- Do not invent a publisher
- Do not emit FAQ schema for questions not visibly rendered
- Do not emit Dataset distributions that do not resolve

Validate every schema graph as JSON and against repository invariants.

---

# 21. OPEN GRAPH, SOCIAL CARDS, AND IMAGES

Audit the current per-route social-card implementation and preserve all guards that ensure an `og:image` URL returns an actual image.

Localized pages must not reference an English text-bearing social card as though it were localized.

Use one of these safe options:

1. Generate a tested static locale-specific card for the route, or
2. Use a language-neutral brand-only card with localized metadata and alt text

Do not introduce dynamic amount-page image routes that recreate the known trailing-slash failure mode.

For every emitted image URL, test:

- HTTP 200
- Correct image content type
- Non-HTML response
- Expected dimensions
- Reasonable byte size
- No text clipping in every supported script
- Accessible localized alt text

Do not use fabricated screenshots of the Roblox DevEx portal.

---

# 22. API, DATA EXPORTS, FEEDS, AND LLMS FILES

## API

Keep existing API endpoints, response shapes, property names, status codes, cache behavior, and OpenAPI operation IDs stable.

The public API remains language-neutral unless the existing contract explicitly supports human-readable localized fields.

Localize the human API documentation page, not the machine endpoint paths.

If an API error includes human prose, either:

- Keep the documented API error language stable and document it, or
- Introduce explicit opt-in locale negotiation as a versioned contract

Do not silently change API error text in a way that breaks clients.

## Data exports

Keep CSV column names and JSON keys stable unless a versioned localized export is deliberately introduced. Translate surrounding UI, explanations, and provenance labels on the page.

## Changelog and feeds

Do not create a fake translated changelog history by mechanically translating dated records without deciding whether the record itself should be localized.

A safe initial policy is:

- Localize changelog UI and explanatory shell
- Keep immutable historical entry titles and bodies in English until translated
- Clearly label the entry language
- Do not expose partially translated records under a localized page without explanation

Implement full translated changelog entries only if coverage is complete.

## `llms.txt`

Preserve generation from the route registry.

Avoid one enormous duplicated file containing every page in every language.

Preferred approach:

- Root `llms.txt` remains an English/global index and lists locale entry points
- Generate `/<locale>/llms.txt` only for published locales if the current routing and static-generation model supports it cleanly
- Each locale file contains only routes published in that locale
- No claims that the file guarantees AI visibility or citation

Validate route completeness and noindex exclusion.

---

# 23. CLOUDFLARE AND OPENNEXT REQUIREMENTS

Translations are build artifacts, not KV records and not remote runtime requests.

Do not store dictionaries in KV, D1, R2, Durable Objects, or another service unless a documented requirement proves build-time files are insufficient.

Preserve:

- Current custom Worker entry
- Scheduled handler
- Platform-history KV binding
- Cron cadence
- Cache revalidation self-reference
- Custom domains
- Observability
- Secrets model
- Current compatibility flags unless official documentation requires a change

Locale-aware caching requirements:

- Cache identity must include the localized pathname
- A Portuguese page must never serve cached English HTML
- Query-string calculation states must preserve the current privacy and caching policy
- Do not cache a response containing user-specific query state under a query-free cache key
- Do not vary public HTML by an unkeyed `Accept-Language` header
- Do not load all dictionaries into the Worker or client bundle for one request

Run tests against the actual Workers runtime, not only `next start`.

Run:

- Existing OpenNext build
- Existing cache population check
- Existing Worker-size check
- Wrangler dry run
- Local Workers preview
- Representative localized route tests against the Workers runtime

---

# 24. PERFORMANCE BUDGETS

Record the current baseline before setting final thresholds.

At minimum, multilingual work must not materially regress:

- LCP
- INP
- CLS
- TTFB for cacheable pages
- Client JavaScript
- Largest application chunk
- Total application JavaScript
- Worker compressed size
- HTML size
- Image weight
- Cacheability
- Back/forward cache eligibility

Rules:

- Translation dictionaries remain server-only
- Do not ship all locale JSON to the browser
- Do not create a client provider around the entire site merely for static copy
- Client components receive only the strings they use
- Keep the language selector lightweight
- Avoid hydration for static translated prose
- No flash from English to translated content
- No locale layout shift
- No runtime machine translation

Preserve the current bundle-validator distinction between framework floor and application code.

A framework upgrade is out of scope unless required for a verified i18n or security blocker. Do not upgrade Next.js, React, OpenNext, Wrangler, Tailwind, or TypeScript casually during localization.

---

# 25. ACCESSIBILITY

Maintain WCAG 2.2 AA behavior in every locale.

Requirements:

- Correct server-rendered `lang`
- Correct server-rendered `dir`
- Translated skip link
- Translated landmarks and accessible names
- Keyboard-operable language selector
- Visible focus
- Correct focus return
- Screen-reader result announcements in the active language
- Translated form errors linked to fields
- No flags as the only language label
- Text supports 200 percent zoom
- No horizontal overflow at 320 CSS pixels
- Touch targets remain at least the current tested size
- Diagrams reflow rather than shrink text into illegibility
- Mixed-script upstream names use `dir="auto"`
- Numeric outputs remain understandable in screen readers
- Locale-specific abbreviations have accessible expanded labels where needed

Future Arabic support must be designed now at the token and component level, even though Arabic is not published in this release.

Avoid physical CSS properties in new shared components when logical properties provide correct future RTL behavior.

---

# 26. PRIVACY AND ANALYTICS

Preserve the current privacy model.

Never send any of these to analytics:

- Robux amount
- USD amount
- Local-currency amount
- Fee percentage
- Tax percentage
- Target date
- Earnings pace
- Shared calculation query string
- Full URL containing calculator state
- Contact message

A locale may be added as an allowlisted categorical analytics property only when:

- The value is validated against published locale codes
- No amount or query state can enter the field
- Analytics remains disabled when no provider is configured
- GA remains behind consent when configured
- Cloudflare analytics remains consistent with current privacy disclosures

Useful privacy-safe events may include:

- `language_selected` with allowlisted locale
- `localized_route_viewed` only when the provider already records a page view and the path is sanitized
- `share_completed` with locale but no calculation data

Do not add events merely to create more data.

Update the privacy page translations from actual configuration, not generic boilerplate.

---

# 27. SECURITY

Treat translation files as untrusted structured input even though they are committed.

Requirements:

- Validate every JSON file
- Reject unexpected keys where the schema is strict
- Escape normal string output
- No arbitrary HTML injection
- No translated URLs unless explicitly whitelisted
- No translated schema property names
- No translated route IDs
- No secrets in dictionaries
- No third-party translation scripts
- No CSP relaxation for localization
- No unsafe dynamic import path from raw URL input
- Validate locale before dictionary import
- Return 404 for unsupported locale segments
- Preserve current security headers
- Preserve Turnstile behavior where configured

Create negative tests for:

- Path traversal through locale
- Script injection in translation values
- Unsafe rich-text token
- Unknown locale
- Malformed dictionary
- Changed interpolation token
- Locale cache poisoning

---

# 28. VALIDATION TOOLING

Add or extend scripts such as:

```text
scripts/i18n/inventory-english.ts
scripts/i18n/validate-dictionaries.ts
scripts/i18n/report-coverage.ts
scripts/i18n/detect-language-leakage.ts
scripts/i18n/validate-route-parity.ts
scripts/i18n/validate-hreflang.ts
scripts/i18n/validate-localized-links.ts
scripts/i18n/validate-localized-metadata.ts
scripts/i18n/validate-localized-schema.ts
scripts/i18n/validate-number-formatting.ts
scripts/i18n/validate-glossary.ts
```

Integrate them into package scripts and the main repository check without making the default check silently skip expensive failures.

The build must fail for:

- Missing required translation key
- Orphan translation key, unless explicitly deprecated
- Invalid JSON
- Invalid schema
- Invalid Unicode
- Changed interpolation token
- English source key missing
- Required route content missing
- Localized route missing
- Unknown route ID
- Duplicate locale/path pair
- Broken internal link
- Cross-locale internal link without intent
- Hreflang target missing
- Hreflang target redirecting
- Missing reciprocal hreflang
- Canonical pointing to English from a localized page
- Canonical host mismatch
- Missing trailing slash
- Duplicate localized title
- Duplicate localized meta description
- Incorrect `lang`
- Incorrect `dir`
- Accidental English paragraph above the approved threshold
- Untranslated accessibility label
- Invalid schema
- Localized numeric example inconsistent with the calculation engine
- Localized source verification date inconsistent with source data
- Locale dictionary entering the client bundle unexpectedly
- Localized page returning 200 for an invalid route

English-leak detection must include an allowlist for legitimate protected names such as Roblox, Robux, DevEx, USD, API, JSON, CSV, product names, and source titles.

Do not use a crude detector that flags every Latin-script word in Portuguese, Spanish, French, German, Indonesian, or Turkish as English.

---

# 29. TESTING MATRIX

Preserve and run all existing tests.

Add unit tests for:

- Locale registry
- Published-locale filtering
- Path prefix parsing
- Localized path generation
- Route switching
- Query preservation
- Safe-hash preservation
- Invalid locale 404
- Dictionary loading
- Missing-key failure
- Interpolation
- Pluralization
- Date formatting
- Number formatting
- Currency formatting
- Locale-aware input parsing
- Ambiguous-number rejection
- Route parity
- Same-locale internal links
- Canonicals
- Hreflang clusters
- Sitemap alternates
- Schema `inLanguage`
- Language selector state
- Analytics locale allowlist
- Translation XSS rejection
- English leakage allowlist
- Amount-page exact values across locales

Add integration tests for:

- English route unchanged
- Locale route mapping
- Metadata generation
- Route registry plus localized content merge
- Source-backed rate text
- API stability
- Data-download stability
- Cache isolation by localized pathname
- No calculator amount in analytics

Add Playwright tests for at least:

## English

- Homepage
- Robux to USD
- Payout target
- Rates
- Requirements
- Platform
- API docs
- Privacy

## Brazilian Portuguese

- Homepage desktop
- Homepage mobile
- Calculator interaction
- Rates
- Amount page
- Privacy
- Language switching

## Spanish

- Homepage
- Calculator interaction
- Payout target
- Rates
- Requirements
- Contact or privacy

## Indonesian

- Homepage
- Calculator interaction
- Earned Robux
- Platform data state
- Sources

## French

- Homepage
- Rates
- Fees and taxes
- Accessibility

## German

- Homepage
- Locale number parsing
- USD target decimal input
- Privacy

## Turkish

- Homepage
- Calculator interaction
- Requirements
- Error state

Cross-locale Playwright tests:

- Every published locale homepage returns 200
- Representative route in every locale returns 200
- Every hreflang target returns 200
- Unknown locale returns 404
- Unknown localized slug returns 404
- Language switcher preserves equivalent route
- Language switcher preserves safe query state
- No horizontal overflow at 320 pixels
- Dark mode
- Light mode
- No JavaScript navigation
- No English body paragraph leakage
- OG image URLs return images
- Structured data parses
- Sitemap URLs match route registry

Run representative tests against both the Next server and the Workers runtime.

---

# 30. VISUAL QA

Create or extend visual tests at:

- 320 x 568
- 375 x 812
- 768 x 1024
- 1280 x 800
- 1440 x 900

Review:

- Header wrapping
- Language selector
- Long German labels
- Portuguese and Spanish navigation
- French punctuation spacing
- Turkish dotted and dotless I
- Currency tables
- Form controls
- Result cards
- Diagram wrapping
- Breadcrumbs
- Footer columns
- Legal-page table of contents
- Mobile menu
- Dark mode
- 200 percent text zoom

Do not approve screenshots by file existence alone. Inspect them.

Create:

- `docs/i18n/visual-qa.md`
- `dist/reports/i18n/visual-regressions.json`

---

# 31. CONTENT AND TRUST RULES

The localized site must remain an independent estimator, not an apparent official Roblox property.

Every locale must clearly communicate:

- This site is not affiliated with Roblox Corporation
- Results are estimates
- Roblox determines Earned Robux eligibility
- Roblox determines DevEx approval
- Rates can change
- Local-currency values are reference estimates
- Fees and taxes vary
- Purchase price and creator payout are different transactions

Do not translate the disclaimer into stronger or weaker legal meaning.

Do not give tax advice.

Do not infer a country's tax rate from locale.

Do not imply a user can select the conditional U.S. 18+ rate.

Do not imply all Robux are cashable.

Do not imply a balance below the minimum can be submitted.

Do not change a verification date merely because a translation was edited. Distinguish:

- Source last checked
- Content last translated
- Translation last reviewed
- Page date modified

Only change sitemap `lastmod` when the page's public content genuinely changed.

---

# 32. GROWTH FEATURES THAT ARE ALLOWED

Implement only growth features that improve real utility and pass privacy and performance gates.

Recommended:

- Locale-specific share text
- Equivalent-route language switching
- Localized quick answers
- Localized FAQ content
- Locale-aware number parsing
- Remembered explicit language
- Same-locale related links
- Same-locale conversion hub
- Localized source and verification explanations
- Localized calculation copy-to-clipboard text
- Privacy-safe locale analytics category
- Locale-specific Search Console reporting workflow
- Locale-specific title and snippet testing ledger
- Content refresh queue tied to source changes

Do not implement:

- Traffic counters
- Fake live-user counts
- Fake ratings
- Fake testimonials
- Forced social sharing
- Interstitial language selection
- Doorway country pages
- One page per currency with repeated copy
- One page per number
- Auto-generated articles with no distinct intent
- Runtime translation widgets
- Popups that block the calculator
- IP-based currency or language assumptions

---

# 33. DOCUMENTATION AND REPORTS

Create or update:

```text
docs/i18n/architecture.md
docs/i18n/baseline.md
docs/i18n/language-opportunity.md
docs/i18n/evidence-register.md
docs/i18n/english-content-inventory.md
docs/i18n/glossary.md
docs/i18n/routing.md
docs/i18n/seo-strategy.md
docs/i18n/indexation-runbook.md
docs/i18n/translation-process.md
docs/i18n/qa-matrix.md
docs/i18n/performance-report.md
docs/i18n/security-review.md
docs/i18n/deployment-runbook.md
docs/i18n/final-report.md
```

Generate machine-readable reports:

```text
dist/reports/i18n/coverage.json
dist/reports/i18n/missing-keys.json
dist/reports/i18n/orphan-keys.json
dist/reports/i18n/english-leakage.json
dist/reports/i18n/route-parity.json
dist/reports/i18n/hreflang.json
dist/reports/i18n/canonicals.json
dist/reports/i18n/internal-links.json
dist/reports/i18n/metadata.json
dist/reports/i18n/schema.json
dist/reports/i18n/sitemap-validation.json
dist/reports/i18n/number-formatting.json
dist/reports/i18n/performance.json
dist/reports/i18n/visual-regressions.json
```

Do not commit disposable screenshots, private Search Console exports, analytics exports, secrets, or personal data unless the repository already has an approved ignored path and documentation.

---

# 34. GIT AND DEPLOYMENT SAFETY

Before work:

1. Confirm clean or understood working tree.
2. Record HEAD.
3. Create safety tag.
4. Create `feature/full-site-i18n-v1`.
5. Record baseline.

During work:

- Commit logical phases
- Use descriptive commit messages
- Do not mix dependency upgrades with translation work unless required
- Never commit `.env`, `.dev.vars`, secrets, API keys, or account exports
- Keep generated reports deterministic or exclude volatile reports appropriately

Before preview deployment:

1. Run lint.
2. Run TypeScript.
3. Run unit and integration tests.
4. Run i18n validators.
5. Run content validation.
6. Run SEO validation.
7. Run duplicate-content validation.
8. Run Next production build.
9. Run route and link validation.
10. Run bundle validation.
11. Run OpenNext build.
12. Populate or validate cache using the current workflow.
13. Run Worker-size validation.
14. Run Wrangler dry run.
15. Run Workers-runtime E2E tests.
16. Run visual review.

After preview deployment:

- Verify English URLs unchanged
- Verify all launch locale homepages
- Verify representative tool, guide, data, amount, and legal route in every locale
- Verify canonicals
- Verify hreflang
- Verify sitemaps
- Verify robots
- Verify API contracts
- Verify health endpoint
- Verify collector state
- Verify KV history is intact
- Verify `www` redirect behavior
- Verify non-slash to slash redirects remain single-hop
- Verify query strings survive redirects and language switching
- Verify static assets
- Verify cache headers
- Verify no English HTML is cached under a localized route

Production deployment is allowed only after all acceptance gates pass and rollback instructions identify the last known-good deployment.

---

# 35. PHASED EXECUTION ORDER

## Phase 0 - Audit and baseline

- Repository state
- Production parity
- Existing architecture
- Existing i18n absence or partial implementation
- Route inventory
- String inventory
- Test baseline
- Performance baseline
- Worker baseline
- Indexation surface
- Documentation drift

## Phase 1 - Foundation

- Locale registry
- Multiple SSR-correct root layouts
- Shared root document
- Locale path helpers
- Server-only dictionary loader
- Translation schemas
- English source extraction
- Locale-aware route registry
- Localized metadata foundation
- Language selector skeleton
- Validators capable of failing

Do not publish a non-English locale during an incomplete foundation.

## Phase 2 - English parity refactor

- Move English pages to shared locale-aware renderers
- Prove every existing English route remains visually and functionally equivalent
- Prove URLs, metadata, API, schema, calculations, and tests are unchanged
- Fix regressions before translation

## Phase 3 - Highest-priority locales

Complete and publish in this order:

1. Brazilian Portuguese
2. Spanish
3. Indonesian

For each locale, complete the entire site, run all gates, and do not leave mixed-language routes.

## Phase 4 - Additional launch locales

Complete and publish:

4. French
5. German
6. Turkish

## Phase 5 - SEO and discovery

- Native keyword maps
- Localized titles and descriptions
- Internal links
- Hreflang
- Sitemaps
- Schema
- OG handling
- Locale llms files if approved
- Indexation runbook
- Search Console operator checklist

## Phase 6 - Full QA

- Unit
- Integration
- E2E
- Workers runtime
- Accessibility
- Visual
- Performance
- Security
- Link crawl
- Schema
- Metadata
- Canonical and hreflang
- Bundle and Worker budgets

## Phase 7 - Preview and final report

- Preview deployment
- Production-like verification
- Blocker list
- Rollback plan
- Final report
- Pull request or feature-branch push

Do not start Tier 2 or Tier 3 planned languages in this execution.

---

# 36. ACCEPTANCE GATES

Do not say complete until all applicable gates pass.

## Architecture

- English URLs are unchanged
- English remains unprefixed
- Every localized route has server-rendered correct `lang`
- Route groups do not alter URLs
- No forced locale redirect
- No client-only translation flash
- No all-locale client bundle
- No runtime translation service

## Coverage

- Seven published locales exist
- Every currently indexable English route has a complete localized equivalent in all six non-English launch locales
- Every global UI string is localized
- Every calculator state is localized
- Every current guide is localized
- Every trust and legal page is localized
- Every approved amount page is localized
- No accidental English body content remains beyond the allowlist
- No fake human-review claim exists

## Accuracy

- All rates come from the central registry
- All examples come from the exact calculation engine
- No per-locale numeric constants drift
- DevEx minimum is consistent everywhere
- Source verification dates remain truthful
- Local-currency wording remains estimate-only
- Legal and policy meaning remains intact

## SEO

- Self canonicals are correct
- Reciprocal hreflang is complete
- `x-default` is correct
- Only published locales appear in hreflang
- Only valid 200 canonical routes appear in sitemaps
- Titles and descriptions are unique within each locale
- Same-locale internal links are complete
- No localized doorway pages
- No new unapproved amount pages
- No duplicate localized intent owners

## Technical quality

- Lint passes
- TypeScript passes
- Existing tests pass
- New i18n tests pass
- Content validation passes
- SEO validation passes
- Duplicate-content validation passes
- Link validation passes
- Route validation passes
- Next build passes
- OpenNext build passes
- Cache validation passes
- Worker-size validation passes
- Wrangler dry run passes
- Workers-runtime tests pass
- Visual review passes
- Accessibility checks pass
- Performance remains within measured budgets

## Production safety

- API contract unchanged
- Health endpoint works
- Scheduled collector works
- KV history remains intact
- `www` redirect remains correct
- Trailing-slash redirects remain correct
- CSP remains strict
- No secrets exposed
- Rollback is documented

---

# 37. FINAL RESPONSE FORMAT

At the end, provide a concise factual report containing:

1. Branch and final commit
2. Exact route count by locale
3. Exact published locale list
4. Translation-key count by locale
5. Coverage percentage by locale
6. English-leak count by locale
7. Hreflang validation result
8. Canonical validation result
9. Sitemap validation result
10. Test results by suite
11. Client JavaScript before and after
12. Worker size before and after
13. Build duration before and after
14. Performance before and after
15. Preview URL, if created
16. Production URL and deployed commit, only if production was deployed
17. Remaining operator tasks
18. Remaining blocked items
19. Rollback command or deployment identifier
20. Files containing the complete implementation report

Do not report a rounded 100 percent if any required key, route, test, or review remains incomplete.

---

# 38. BEGIN NOW

Start by:

1. Reading the repository and current Git state.
2. Verifying the production deployment commit.
3. Running the baseline.
4. Auditing current routes and hardcoded English.
5. Writing the i18n architecture and route-migration plan.
6. Implementing the foundation immediately.

Do not stop after the audit.
