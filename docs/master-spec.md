# MASTER SINGLE EXECUTION PROMPT
## DEVEXCALCULATOR.ORG — NEXT.JS + REACT + CLOUDFLARE WORKERS + WRANGLER + GITHUB + SEO/AEO/GEO

> Paste this entire prompt into Claude Code, Codex, or another repository-capable coding agent inside the **root folder of the `devexcalculator.org` workspace** in Visual Studio Code. Keep the competitor URLs, CSV files, screenshots, and any existing repository files available in the workspace. This prompt is intentionally repository-first and execution-oriented: the agent must inspect, implement, test, document, and deploy rather than merely explain.

---

# 0. EXECUTION DIRECTIVE

You are working inside a real production repository for **https://devexcalculator.org**.

You must not stop after producing an audit, a plan, a file tree, code snippets, or recommendations. When filesystem and terminal tools are available, you must modify the actual repository, run commands, inspect failures, fix them, and continue through the phases until the applicable acceptance gates pass.

Operate continuously and phase by phase. Give only short progress updates in chat while continuing the repository work. Do not wait for approval after every phase. Ask one concise blocking question only when one of these conditions is true:

1. Authentication or account authorization is required and cannot be completed through the available tools.
2. A destructive or irreversible production action is about to replace a working deployment and no preview or rollback path exists.
3. A genuinely required business fact cannot safely be inferred or disabled, such as a legal business name that must appear in a policy.
4. A required source file is missing and no useful implementation can continue without it.

For every other missing non-secret input, choose a production-safe default, centralize it in configuration, document the assumption, and continue.

Do not merely promise future work. Do not leave TODO, FIXME, placeholder, lorem ipsum, fake data, fake counters, fake reviews, invented credentials, or disconnected scaffolding in the production path.

---

# 1. LOCKED PROJECT PROFILE

## 1.1 Identity

- Public site name: **DevEx Calculator**
- Compact brand: **DevExCalculator**
- Canonical production URL: **https://devexcalculator.org**
- Canonical host: **devexcalculator.org**
- Alternate host: **www.devexcalculator.org**, which must permanently redirect to the canonical host while preserving path and query string
- Primary language at launch: **English**
- Primary market: global English-speaking Roblox creator audience
- Priority markets evident in supplied data: United States, Canada, United Kingdom, and other countries supported by actual query and currency evidence
- Default production branch: **main**
- Default Cloudflare Worker name if no existing compatible name is found: **devexcalculator-org**
- Repository slug: inspect the existing Git remote; if no remote exists, recommend **devexcalculator.org** without inventing a GitHub owner
- Contact email: inspect existing configuration. If none exists, keep contact functionality configuration-driven and do not publish a fabricated mailbox.

## 1.2 Locked technology direction

The public website must use:

- Next.js App Router
- React
- TypeScript in strict mode
- Tailwind CSS v4 or the currently supported Tailwind v4-compatible integration
- Semantic HTML5
- React Server Components by default
- Client Components only where interaction requires them
- Cloudflare Workers with Static Assets
- Wrangler
- `@opennextjs/cloudflare` or the current official Cloudflare-recommended Next.js adapter
- Git and GitHub
- Cloudflare Workers Builds connected to GitHub for automatic builds/deployments

Do not deploy this project to Vercel, Netlify, shared hosting, Cloudflare Pages, or another host. A competitor or screenshot may show Vercel; that is evidence about a reference implementation, not the target hosting architecture.

Do not replace Next.js/React with Astro, Eleventy, WordPress, Laravel, Vue, Angular, a static HTML-only rebuild, or another framework.

## 1.3 Version policy

Research checkpoint date: **2026-08-17**.

At implementation time, verify the current mutually compatible stable versions from official documentation, then pin exact resolved versions in `package-lock.json`. Do not blindly copy a stale version number from this prompt.

The supplied technology screenshot shows Next.js 16.3.0, React, Tailwind CSS, Google Analytics, Cloudflare Turnstile, and Vercel. Use it only as stack/reference evidence. The target must remain on Cloudflare Workers.

Before installing packages, verify:

- Current supported Next.js 16 release
- Current React release compatible with that Next.js release
- Current `@opennextjs/cloudflare`
- Current Wrangler
- Current Node.js LTS supported by Next.js and the adapter
- Current Tailwind CSS v4 integration

Prefer stable APIs. Do not enable experimental Next.js features solely for novelty. If Partial Prerendering, composable caching, a build adapter API, or another experimental feature is not required, leave it disabled.

---

# 2. ROLE

Act simultaneously as:

- Principal full-stack architect
- Senior Next.js App Router and React engineer
- Senior TypeScript engineer
- Cloudflare Workers, Workers Static Assets, Wrangler, and OpenNext engineer
- GitHub CI/CD and release engineer
- Technical SEO and programmatic SEO architect
- Semantic SEO, topical authority, AEO, and GEO strategist
- Search-intent, keyword clustering, and cannibalization analyst
- Product designer and design-systems engineer
- Accessibility specialist targeting WCAG 2.2 AA
- Core Web Vitals and web-performance engineer
- Application security and abuse-prevention engineer
- Data-quality and calculation-engine engineer
- Editorial strategist, source-verification reviewer, and content QA lead
- Visual regression and end-to-end testing engineer

Your job is to deliver a working, original, maintainable, source-backed, production-ready website that is materially stronger than the supplied competitors in product utility, accuracy, transparency, performance, accessibility, SEO architecture, and deployment quality.

---

# 3. PRIMARY MISSION

Build **DevEx Calculator** as a calculator-first Roblox creator finance utility and topical resource that helps users:

1. Convert eligible Earned Robux into an estimated USD DevEx payout.
2. Compare the current standard rate, eligible U.S. 18+ rate, and legacy balance rate when those rates remain supported by current official Roblox documentation.
3. Split a balance across applicable rate buckets without double-counting Robux.
4. Convert the USD estimate into supported local currencies using an honest, timestamped reference-rate source.
5. Calculate how many eligible Earned Robux are needed for a target payout.
6. Understand the DevEx minimum, eligibility, Earned Robux definition, rate history, limitations, fees, taxes, and payout uncertainty through concise source-backed guidance.
7. Compare creator payout value with generic Robux purchase-price intent without misleading users into treating purchase price and DevEx payout as the same thing.
8. Share a calculation through a privacy-safe URL.
9. Use related calculators and guides through a coherent topical architecture.

The site must be immediately useful above the fold, yet deep enough to become the most complete trustworthy resource in its niche.

---

# 4. SOURCE INPUTS AND EVIDENCE PRIORITY

Use available evidence in this order:

1. **Current repository** — existing code, configuration, routes, Git history, content, assets, tests, Cloudflare files, and uncommitted work are implementation authority unless this prompt explicitly changes the target architecture.
2. **Official current sources** — official Roblox, Cloudflare, OpenNext, Next.js, Google Search Central, schema.org, and ECB documentation for facts that can change.
3. **Supplied keyword CSVs** — process the complete files, not a sample:
   - `rbxtax.com-devex.html-organic-keywords-path_2026-08-17_14-15-54.csv`
   - `romonitorstats.com-devex-calculator-organic_2026-08-17_14-15-10.csv`
4. **Supplied screenshots** — use the technology-stack screenshot and VS Code screenshot as contextual evidence.
5. **Supplied prompt/reference files** — use their useful execution, SEO, design, validation, and documentation patterns, but adapt them fully to this project and stack.
6. **Public competitor pages** — use only public information architecture, visible product behavior, layout patterns, topic coverage, source quality, and usability as research evidence.
7. **Reasonable inference** — label it as inference in documentation, never present it as an observed fact.
8. **New implementation decision** — document why the decision improves utility, safety, maintainability, or search quality.

For every important research conclusion in documentation, use one of these labels:

- Observed in repository
- Derived from supplied CSV
- Observed on public competitor page
- Verified through official source
- Reasonable inference
- New implementation decision

Never silently convert an inference into a fact.

## 4.1 Supplied competitor set

Audit all of these:

- https://devexcalc.com/
- https://romonitorstats.com/devex-calculator/
- https://rbxtax.com/devex.html
- https://www.devexconverter.com/
- https://rbxcalc.com/robux-devex-calculator
- https://toolblx.com/tools/devex-calculator

You may inspect additional relevant public competitors discovered in current search results, but clearly distinguish supplied competitors from supplemental benchmarks.

## 4.2 Official source registry seed

Verify and record current URLs rather than assuming they remain unchanged. Start with:

- Roblox Developer Exchange documentation: `https://create.roblox.com/docs/production/monetization/developer-exchange`
- Roblox U.S. 18+ DevEx rate documentation: locate the current official Creator Hub page
- Roblox DevEx terms/eligibility documentation: locate the current official Roblox Help or Creator Hub page
- Cloudflare Next.js on Workers guide: `https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/`
- OpenNext Cloudflare guide: `https://opennext.js.org/cloudflare/get-started`
- Cloudflare Workers Git integration: `https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/`
- Cloudflare Turnstile server validation: `https://developers.cloudflare.com/turnstile/get-started/server-side-validation/`
- Next.js deployment documentation: `https://nextjs.org/docs/app/getting-started/deploying`
- Google Search spam policies: `https://developers.google.com/search/docs/essentials/spam-policies`
- Google canonical guidance: `https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls`
- Google sitemap guidance: `https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap`
- ECB Data API: `https://data-api.ecb.europa.eu/`

Create a versioned source registry containing publisher, title, URL, fact supported, last checked time, effective date where relevant, and review cadence.

---

# 5. REFERENCE BOUNDARY, ORIGINALITY, AND TRADEMARK SAFETY

Competitor research may inform:

- Page-type strategy
- Calculator workflow
- Input/output hierarchy
- Quick-preset behavior
- Rate transparency
- Content and FAQ placement
- Navigation depth
- Related-calculator architecture
- Source and last-verified treatment
- Responsive layout patterns
- Internal-link concepts
- Search-intent coverage
- Publicly visible accessibility or performance weaknesses

Do not copy:

- Competitor brand names as target branding
- Competitor logos, icons, graphics, screenshots, illustrations, or favicons
- Exact UI copy, paragraphs, FAQ answers, metadata, legal text, or author identities
- Competitor source code, CSS, proprietary scripts, hidden APIs, or analytics IDs
- Competitor numerical examples without independently recomputing them
- Competitor rate values when current official sources contradict them
- A wholesale content structure that makes the target appear to be a clone

Create original branding and assets. Do not imitate Roblox's logo or trade dress. Do not imply that DevExCalculator.org is official, endorsed, sponsored, or operated by Roblox Corporation.

Display a clear, unobtrusive trademark/affiliation disclaimer in the footer and relevant methodology/legal pages. Do not overuse trademark terms in branding.

---

# 6. MASTER OPERATING PROTOCOL

## 6.1 Repository-first mode

Before changing anything:

1. Print the current working directory.
2. Inspect all files, hidden files, and the directory depth.
3. Run `git status --short --branch`.
4. Inspect the current branch, remotes, tags, and recent commits.
5. Detect whether the repository is empty, partial, or already functional.
6. Inspect `package.json`, lockfiles, Next.js config, TypeScript config, Tailwind config, Wrangler config, OpenNext config, environment examples, GitHub workflows, tests, and documentation.
7. Inspect Node, npm, Git, Wrangler, GitHub CLI, and Cloudflare authentication state without exposing tokens.
8. Preserve all useful code and all user-owned uncommitted work.
9. Run baseline checks before editing when a runnable project already exists.
10. Record baseline failures separately from regressions caused by this implementation.

Create immediately:

- `docs/agent-state.md`
- `docs/progress-ledger.md`
- `docs/decision-log.md`
- `docs/blockers.md`
- `docs/repository-audit.md`
- `docs/master-implementation-plan.md`

Copy or summarize the locked project specification into `docs/master-spec.md` so future agent sessions can resume without relying on chat history.

## 6.2 State persistence

After every meaningful phase or context-heavy operation, update `docs/agent-state.md` with:

- Current phase
- Completed tasks
- Active branch
- Last successful commands
- Known failures
- Next exact actions
- Files changed
- External authorization still required
- Deployment state

If the context window is close to its limit, do not lose progress. Update the state documents, commit safe completed work when appropriate, and continue from those documents.

## 6.3 Empty-repository behavior

If the current repository is empty:

- Scaffold in the current repository root. Do not create an unnecessary nested `devexcalculator.org/devexcalculator.org` directory.
- Use the current official Cloudflare/Next.js path for a new app, or use `create-next-app` followed by the current OpenNext migration if that is safer in the existing root.
- Preserve the desired App Router, `src/` directory, TypeScript, Tailwind, ESLint, and import alias architecture.
- Initialize Git only if `.git` does not already exist.

If the repository is partial or already functional:

- Do not reinitialize it.
- Migrate or patch incrementally.
- Preserve working routes, content, analytics, metadata, and deployment configuration unless a documented conflict requires change.

## 6.4 Safe Git protocol

Never use:

- `git reset --hard`
- `git clean -fd` without a reviewed target list
- force push
- history rewriting on a shared branch
- deletion of production tags
- deletion of Cloudflare resources
- destructive database or KV operations

When the repository has existing production code:

1. Confirm the working tree state.
2. Create a safety tag such as `pre-devexcalculator-rebuild-YYYYMMDD` if authenticated and appropriate.
3. Create a feature branch such as `build/devexcalculator-v1`.
4. Commit in logical, reviewable groups.
5. Use a preview deployment before production promotion.
6. Maintain a documented rollback path.

## 6.5 Execution precedence

When requirements conflict, apply this order:

1. User and account safety
2. Security and data integrity
3. Correct calculations and source accuracy
4. Preservation of existing user work
5. Legal originality and trademark safety
6. Search-quality compliance and indexation control
7. Accessibility
8. Performance and reliability
9. Maintainability and testability
10. Product usefulness
11. Visual polish
12. Competitor parity
13. Convenience of implementation

---

# 7. NON-NEGOTIABLE ENGINEERING RULES

- No TODO or FIXME markers in production code.
- No lorem ipsum.
- No fake testimonials, ratings, review counts, user counts, payout counts, or usage metrics.
- No fake live exchange rates.
- No claims that the calculator determines official eligibility or guaranteed payout.
- No stale DevEx rate hardcoded without a source, effective date, and last-verified date.
- No mixing purchased Robux value with DevEx payout without an explicit distinction.
- No unsafe floating-point assumptions for financial calculations.
- No secret keys in client-side JavaScript, Git, screenshots, logs, or documentation.
- No inaccessible icon-only controls without accessible names.
- No clickable `div` elements where a button or link is required.
- No horizontal overflow at 320px.
- No core calculator that requires JavaScript merely to expose the page's primary explanatory content.
- No giant client-side keyword map or content JSON payload.
- No mass publishing of thin numeric conversion pages.
- No doorway pages.
- No keyword stuffing.
- No copied competitor text.
- No meta keywords tag.
- No fake `lastmod` values.
- No canonicalizing every distinct page to the homepage.
- No indexable internal search-results or arbitrary query-parameter pages.
- No unsupported structured data, fake reviews, or schema that does not match visible content.
- No production deployment while tests are failing due to the implementation.
- No claim of completion unless every applicable acceptance gate passes.

---

# 8. CURRENT FACT CHECKPOINT — REVERIFY BEFORE PUBLICATION

Treat the following as a research checkpoint, not an immutable hardcode. Reverify against current official Roblox documentation before shipping and store all rates in one validated versioned registry.

As of the checkpoint date:

- Standard DevEx rate: **USD 0.0038 per eligible Earned Robux**, equivalent to **USD 114 for 30,000**.
- Certain eligible U.S. 18+ Earned Robux may qualify for **USD 0.0054 per Robux** under specific official conditions.
- Eligible balances from before **2025-09-05 10:00 PT** may use the legacy **USD 0.0035 per Robux** rate under the official transition rules.
- The commonly stated minimum is **30,000 eligible Earned Robux**, subject to the current official terms.
- Roblox, not this site, decides whether Robux qualify as Earned Robux and whether a request is approved.

If any checkpoint fact has changed:

1. Update the rate registry.
2. Update calculator tests and content.
3. Update `lastVerifiedAt`.
4. Record the change in `CHANGELOG.md` and the public rate-history page.
5. Do not preserve an outdated public claim for SEO reasons.

---

# 9. TARGET ARCHITECTURE

## 9.1 Rendering strategy

Use a hybrid architecture optimized for crawlability and low client JavaScript:

- Server Components for layouts, content, navigation, metadata, source notes, tables, FAQs, related links, and static calculator shell.
- A focused Client Component island for live calculator interaction.
- Static generation for stable content and guide pages.
- Dynamic Route Handlers only where required for FX, health, contact, or other approved server behavior.
- Avoid unnecessary server-side rendering on every request.
- Use explicit caching semantics.
- Prefer deterministic build output and source-controlled content.

The primary calculator must be visible and usable immediately. The page must include meaningful server-rendered labels, formulas, examples, and default state so crawlers and no-script users can understand the tool.

## 9.2 Cloudflare runtime

Use the Node.js runtime path supported by `@opennextjs/cloudflare`, not `export const runtime = "edge"`, unless current official adapter documentation explicitly changes this requirement and the implementation is verified.

Required Cloudflare files include, adapted to the current adapter:

- `wrangler.jsonc`
- `open-next.config.ts`
- `cloudflare-env.d.ts`
- `public/_headers`
- `.dev.vars.example`
- package scripts for build, preview, upload, deploy, and type generation

The Wrangler configuration should conceptually include:

- Worker name
- `.open-next/worker.js` main entry
- `.open-next/assets` static asset directory
- `nodejs_compat`
- current compatibility date chosen during implementation
- observability configuration when supported
- bindings only when actually used

Do not commit `.open-next/` output.

Add immutable caching for `/_next/static/*` as recommended by current OpenNext/Cloudflare documentation.

## 9.3 Windows and VS Code handling

The supplied VS Code screenshot indicates a Windows workstation. Detect the actual environment.

If running on native Windows:

- Prefer WSL2 plus VS Code Remote - WSL for OpenNext builds and Workers-runtime previews.
- If WSL is unavailable, use standard `next dev` for local iteration and run OpenNext build/preview validation in Linux CI or Cloudflare Workers Builds.
- Do not claim native Windows parity unless the adapter build and preview actually pass there.
- Document the exact recommended local commands for PowerShell and WSL without mixing path syntax.

## 9.4 State and storage policy

The core calculator must be stateless and must not require a database.

Use:

- URL query parameters for shareable, non-sensitive calculator state
- Local storage for optional history, preferences, and theme
- Cloudflare Cache API or framework caching for public FX responses

Do not add D1, KV, R2, Durable Objects, or Queues merely to make the stack look more "Cloudflare-native." Add a binding only for a defined use case and document its cost, data model, retention, and fallback.

Potential approved bindings:

- KV for durable FX cache only if Cache API/fetch caching is insufficient
- D1 for contact submissions only if the owner explicitly chooses database retention and a privacy policy is updated
- R2 for generated media only if a real need appears

## 9.5 Dependency policy

- Keep dependencies minimal and version-pinned.
- Prefer platform and browser APIs over heavy packages.
- Use a reliable decimal or integer-rational approach for money calculations.
- Do not add a charting library for a simple comparison that CSS, SVG, or a table can handle.
- Avoid runtime dependencies on third-party CDNs.
- Self-host or package fonts; do not create a render-blocking runtime font dependency.
- Run a production dependency audit and document unresolved risks.

---

# 10. TARGET REPOSITORY STRUCTURE

Adapt this structure to existing compatible conventions. Do not duplicate equivalent folders or utilities.

```text
.
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── not-found.tsx
│   │   ├── error.tsx
│   │   ├── robots.ts
│   │   ├── sitemap.ts
│   │   ├── manifest.ts
│   │   ├── opengraph-image.tsx
│   │   ├── calculators/
│   │   │   └── page.tsx
│   │   ├── robux-to-usd/
│   │   │   └── page.tsx
│   │   ├── usd-to-robux/
│   │   │   └── page.tsx
│   │   ├── devex-rates/
│   │   │   └── page.tsx
│   │   ├── devex-requirements/
│   │   │   └── page.tsx
│   │   ├── earned-robux/
│   │   │   └── page.tsx
│   │   ├── how-to-cash-out-robux/
│   │   │   └── page.tsx
│   │   ├── devex-rate-history/
│   │   │   └── page.tsx
│   │   ├── devex-fees-and-taxes/
│   │   │   └── page.tsx
│   │   ├── robux-tax-calculator/
│   │   │   └── page.tsx
│   │   ├── conversions/
│   │   │   ├── page.tsx
│   │   │   └── [amount]/
│   │   │       └── page.tsx
│   │   ├── guides/
│   │   │   ├── page.tsx
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   ├── about/
│   │   ├── methodology/
│   │   ├── sources/
│   │   ├── editorial-policy/
│   │   ├── corrections/
│   │   ├── changelog/
│   │   ├── contact/
│   │   ├── privacy/
│   │   ├── terms/
│   │   ├── disclaimer/
│   │   ├── accessibility/
│   │   └── api/
│   │       ├── health/route.ts
│   │       ├── rates/route.ts
│   │       ├── fx/latest/route.ts
│   │       └── contact/route.ts
│   ├── components/
│   │   ├── layout/
│   │   ├── calculator/
│   │   ├── content/
│   │   ├── seo/
│   │   └── ui/
│   ├── features/
│   │   ├── devex/
│   │   ├── fx/
│   │   ├── sharing/
│   │   └── contact/
│   ├── lib/
│   │   ├── calculations/
│   │   ├── content/
│   │   ├── cloudflare/
│   │   ├── seo/
│   │   ├── security/
│   │   ├── validation/
│   │   └── utilities/
│   ├── config/
│   │   ├── site.ts
│   │   ├── navigation.ts
│   │   ├── analytics.ts
│   │   └── features.ts
│   ├── data/
│   │   ├── rates.json
│   │   ├── source-registry.json
│   │   ├── quick-amounts.json
│   │   ├── currencies.json
│   │   └── content-manifest.json
│   ├── content/
│   │   ├── pages/
│   │   ├── guides/
│   │   ├── faqs/
│   │   └── legal/
│   └── types/
├── seo/
│   ├── source/
│   │   ├── rbxtax.com-devex.html-organic-keywords-path_2026-08-17_14-15-54.csv
│   │   └── romonitorstats.com-devex-calculator-organic_2026-08-17_14-15-10.csv
│   ├── overrides/
│   │   ├── cluster-overrides.json
│   │   ├── route-overrides.json
│   │   ├── exclusions.json
│   │   └── publication-overrides.json
│   └── generated/
│       ├── dataset-summary.json
│       ├── keyword-intelligence.json
│       ├── keyword-route-map.json
│       ├── content-priority-map.json
│       ├── internal-link-map.json
│       ├── entity-map.json
│       ├── paa-map.json
│       ├── cannibalization-map.json
│       ├── competitor-gap-map.json
│       ├── keyword-exclusions.json
│       └── publish-queue.json
├── scripts/
│   ├── seo/
│   │   ├── analyze-keywords.ts
│   │   ├── normalize-keywords.ts
│   │   ├── cluster-keywords.ts
│   │   ├── build-route-map.ts
│   │   ├── build-publish-queue.ts
│   │   ├── validate-keyword-coverage.ts
│   │   ├── validate-cannibalization.ts
│   │   ├── validate-metadata.ts
│   │   ├── validate-schema.ts
│   │   ├── validate-internal-links.ts
│   │   ├── detect-near-duplicate-content.ts
│   │   └── generate-seo-report.ts
│   ├── content/
│   │   ├── validate-content.ts
│   │   ├── validate-sources.ts
│   │   └── generate-content-manifest.ts
│   └── quality/
│       ├── check-routes.ts
│       ├── check-links.ts
│       ├── check-worker-size.ts
│       └── check-bundle-budget.ts
├── schemas/
│   ├── rate-registry.schema.json
│   ├── source-registry.schema.json
│   ├── keyword-intelligence.schema.json
│   ├── keyword-route-map.schema.json
│   ├── content-manifest.schema.json
│   └── page-content.schema.json
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── visual/
│   └── fixtures/
├── docs/
│   ├── agent-state.md
│   ├── progress-ledger.md
│   ├── decision-log.md
│   ├── blockers.md
│   ├── repository-audit.md
│   ├── environment-audit.md
│   ├── competitor-audit.md
│   ├── visual-reference-audit.md
│   ├── architecture.md
│   ├── calculation-methodology.md
│   ├── cloudflare-deployment.md
│   ├── security-model.md
│   ├── accessibility-report.md
│   ├── performance-report.md
│   ├── seo/
│   │   ├── dataset-report.md
│   │   ├── keyword-strategy.md
│   │   ├── topical-map.md
│   │   ├── route-ownership.md
│   │   ├── cannibalization-report.md
│   │   ├── internal-link-strategy.md
│   │   ├── content-roadmap.md
│   │   ├── aeo-geo-strategy.md
│   │   ├── indexation-policy.md
│   │   └── metadata-schema-policy.md
│   ├── qa/
│   │   ├── test-matrix.md
│   │   ├── visual-qa.md
│   │   └── final-acceptance.md
│   └── final-implementation-report.md
├── public/
│   ├── icons/
│   ├── images/
│   ├── _headers
│   └── llms.txt
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── lighthouse.yml
│   │   └── security.yml
│   └── dependabot.yml
├── .dev.vars.example
├── .env.example
├── .gitignore
├── .nvmrc
├── eslint.config.mjs
├── next.config.ts
├── open-next.config.ts
├── playwright.config.ts
├── tailwind configuration if required by the installed version
├── tsconfig.json
├── vitest.config.ts
├── wrangler.jsonc
├── package.json
├── package-lock.json
├── README.md
└── CHANGELOG.md
```

Do not create every listed route or file blindly if an equivalent already exists. Use this as a completeness map, then adapt it to the actual repository.

---

# 11. CONFIGURATION CONTRACT

Create one typed site configuration source. It must include:

- Site name
- Compact brand
- Canonical base URL
- Canonical host
- Default locale
- Contact email, nullable
- Organization name, nullable until confirmed
- Social URLs, nullable
- Git commit/version metadata where safely available
- Analytics provider IDs, nullable
- Ad provider IDs, nullable
- Turnstile site key, nullable
- Feature flags
- Public rate registry version
- Content review date
- Source review cadence

Optional integrations must be disabled cleanly when values are absent. The application must build and run without analytics, advertising, contact provider credentials, Turnstile, a database, or an FX provider.

Never publish placeholder strings such as `YOUR_GA_ID`, `example@example.com`, or `YOUR_TURNSTILE_KEY` in rendered HTML.

---

# 12. DESIGN RESEARCH AND ORIGINAL VISUAL SYSTEM

## 12.1 Research procedure

Before finalizing the design system:

1. Capture or inspect each supplied competitor at desktop and mobile sizes when browser tools are available.
2. Record observable layout, color, typography, spacing, controls, density, content order, empty states, responsiveness, and accessibility.
3. Separate observed facts from visual inference.
4. Identify weak patterns to avoid, including JS-only content, stale facts, poor source disclosure, oversized empty areas, low contrast, and cramped mobile controls.
5. Create `docs/visual-reference-audit.md` and `docs/design-system.md`.
6. Build an original design rather than averaging competitor styles mechanically.

## 12.2 Default visual direction

Unless research supports a stronger accessible alternative, use a **Creator Finance** visual language:

- Clean, trustworthy, calculator-first layout
- Light neutral background
- White elevated surfaces
- Deep navy text
- Electric blue primary action
- Violet secondary accent
- Cyan information accent
- Green positive values
- Amber warnings and focus indicator
- Red reserved for genuine errors
- Subtle gradients only in small brand/hero accents
- No Roblox-logo imitation
- No excessive glassmorphism
- No neon gaming clutter
- No finance-app complexity that hides the calculator

Default token candidates to validate and adjust for contrast:

```css
--background: #f6f8fc;
--surface: #ffffff;
--surface-subtle: #eef3fa;
--text: #0b1220;
--text-muted: #526174;
--primary: #2563eb;
--primary-strong: #1d4ed8;
--secondary: #7c3aed;
--accent: #0891b2;
--success: #15803d;
--warning: #b45309;
--danger: #b91c1c;
--border: #dce4ef;
--focus: #f59e0b;
```

Optional dark mode tokens must be separately validated, not produced by simply inverting colors.

## 12.3 Typography

- Use a clean, locally packaged or framework-managed sans-serif such as Geist or Inter.
- Use a monospaced numeric face for calculated values and formulas.
- Maintain a compact readable type scale.
- Do not use tiny legal or source text.
- Keep paragraphs readable on mobile.
- Use tabular numerals for money values when available.

## 12.4 Layout

Desktop:

- Compact sticky header
- Calculator visible above the fold
- Main tool container approximately 960–1120px depending on content
- Two-column layout for input and result on wide screens
- Optional source/trust rail that does not distract
- Related content below the primary task

Mobile:

- One-column calculator
- Sticky result action only if it does not cover inputs or browser safe areas
- Minimum 44px interactive targets
- No sideways scrolling
- Presets wrap cleanly
- Advanced controls collapse progressively
- Mobile navigation supports Escape, focus management, and body scroll lock

## 12.5 Required reusable UI components

Create or adapt:

- SiteHeader
- DesktopNavigation
- MobileNavigation
- SiteFooter
- Breadcrumbs
- CalculatorHero
- QuickCalculator
- AdvancedCalculator
- RobuxAmountInput
- RateSelector
- CurrencySelector
- FeeControls
- TaxEstimateControls
- TargetPayoutInput
- QuickPresetChips
- ResultSummary
- ResultBreakdown
- ThresholdMeter
- ScenarioComparison
- FormulaDisclosure
- CopyResultButton
- ShareCalculationButton
- ResetButton
- SourceBadge
- LastVerifiedBadge
- EstimateDisclaimer
- QuickAnswer
- DefinitionBlock
- ComparisonTable
- SourceNote
- MethodologyNote
- LimitationsNote
- RelatedTools
- RelatedGuides
- FAQAccordion
- TableOfContents
- AdSlot, disabled without real configuration
- AnalyticsConsent, only if required by configured analytics
- ThemeToggle, only if dark mode is complete
- Toast or live status region
- ContactForm, only if a real backend mode is configured

Every component must have semantic markup, keyboard behavior, focus styles, empty/error/loading states, and tests appropriate to its risk.

---

# 13. CALCULATION ENGINE — SOURCE OF TRUTH

The calculation engine is the most important correctness boundary. Implement it as framework-independent pure TypeScript with complete unit tests. UI components must call the engine rather than duplicating formulas.

## 13.1 Rate registry

Create a validated rate registry, conceptually:

```json
{
  "schemaVersion": 1,
  "registryVersion": "2026-08-17.1",
  "lastVerifiedAt": "2026-08-17T00:00:00Z",
  "rates": [
    {
      "id": "standard-current",
      "label": "Standard current rate",
      "usdPerRobux": "0.0038",
      "usdPerThousandRobux": "3.80",
      "effectiveFrom": "2025-09-05T10:00:00-07:00",
      "effectiveTo": null,
      "eligibilitySummary": "Eligible Earned Robux under the standard current DevEx rate.",
      "sourceIds": ["roblox-devex-program"],
      "status": "active"
    },
    {
      "id": "us-18-plus-qualified",
      "label": "Eligible U.S. 18+ rate",
      "usdPerRobux": "0.0054",
      "effectiveFrom": null,
      "effectiveTo": null,
      "eligibilitySummary": "Only qualifying Earned Robux under current official U.S. 18+ conditions.",
      "sourceIds": ["roblox-us-18-plus-rate"],
      "status": "conditional"
    },
    {
      "id": "legacy-pre-2025-09-05",
      "label": "Legacy balance rate",
      "usdPerRobux": "0.0035",
      "effectiveFrom": null,
      "effectiveTo": "2025-09-05T10:00:00-07:00",
      "eligibilitySummary": "Applicable only to eligible legacy Earned Robux balances under official transition rules.",
      "sourceIds": ["roblox-devex-program"],
      "status": "legacy"
    }
  ]
}
```

This is a model, not permission to hardcode unverified facts. Reverify values, dates, and conditions. Fail the build if:

- A public active rate has no official source.
- A rate value is not a positive decimal string.
- `usdPerThousandRobux` does not equal the rate multiplied by 1,000.
- Effective dates conflict.
- An active rate lacks `lastVerifiedAt`.
- Content references a rate ID that does not exist.

## 13.2 Arithmetic rules

Do not use ordinary binary floating-point arithmetic for core money logic when exact decimal/rational math is available.

Use one of these approaches:

- Integer rational arithmetic, for example `38 / 10,000` for 0.0038
- A small well-maintained decimal library
- Integer microdollars or another documented fixed-point representation

Required formulas:

```text
standardUsd = standardEligibleRobux × standardRate
legacyUsd = legacyEligibleRobux × legacyRate
us18Usd = us18QualifiedRobux × us18Rate
grossUsd = standardUsd + legacyUsd + us18Usd
percentageFeeUsd = grossUsd × feePercent / 100
netBeforeTaxUsd = grossUsd - percentageFeeUsd - flatFeeUsd
estimatedTaxUsd = max(0, netBeforeTaxUsd × userTaxPercent / 100)
netAfterEstimateUsd = max(0, netBeforeTaxUsd - estimatedTaxUsd)
requiredRobuxForTarget = ceil(targetUsd / selectedRate)
localCurrencyValue = usdValue × usdToTargetCurrencyRate
```

Do not allow the same Robux amount to be counted in multiple rate buckets without an explicit user-entered split. The default quick mode uses one selected rate and one amount.

All money output must have a documented rounding policy:

- Preserve full precision internally.
- Round display values using currency-specific minor units.
- Use `Intl.NumberFormat` for display.
- Round required Robux upward to a whole Robux.
- Never round intermediate results in a way that materially changes the final result.
- Show that results are estimates.

## 13.3 Input validation

Support:

- Plain digits
- Thousands separators
- Spaces in large numbers
- `k`, `m`, and `b` shorthand when unambiguous
- Paste from formatted values
- Decimal target-currency amounts where appropriate

Reject or normalize safely:

- Negative values
- `NaN`, Infinity, scientific notation unless intentionally supported and bounded
- Excessively long strings
- Invisible control characters
- Malformed mixed separators
- Values beyond a documented safe calculation limit

Do not publish an arbitrary maximum as an official Roblox limit. A technical input cap is an application-safety limit and must be labeled as such.

Provide clear inline validation and preserve the user's value while explaining the error.

## 13.4 Required calculation modes

### Quick mode

- One Earned Robux amount
- One rate selection
- USD result
- Optional local currency result
- Quick presets
- Copy, share, and reset
- Minimum-threshold status
- Source and last-verified indicator

### Advanced split mode

- Current standard Earned Robux bucket
- Legacy Earned Robux bucket
- Eligible U.S. 18+ bucket
- Gross subtotal by bucket
- Blended effective rate
- Comparison with standard-only payout
- Optional user-defined payment fee
- Optional user-entered tax estimate
- Optional local currency conversion
- Clear warning that the user is responsible for classifying their balances correctly

### Reverse target mode

- Target USD or supported local-currency payout
- Selected applicable rate
- Required whole Earned Robux, rounded upward
- Difference from the official minimum when relevant
- Progress percentage when the user also enters a current balance

### Comparison mode

Compare, for the same amount:

- Current standard estimate
- Legacy estimate
- Conditional U.S. 18+ estimate
- Absolute and percentage difference

Do not imply that every user can select whichever rate pays the most.

## 13.5 Minimum and eligibility communication

The threshold meter must distinguish:

- Below the currently verified minimum
- At or above the numerical minimum
- Eligibility still subject to official review

Never say "You are eligible" based only on an amount. Say "This amount meets the currently stated minimum" and retain the eligibility disclaimer.

## 13.6 Earned Robux versus purchased Robux

Place a visible explanation near the calculator:

- DevEx applies to eligible Earned Robux, not every Robux balance.
- The retail price of buying Robux is not the DevEx cash-out rate.
- Gift cards, purchased balances, subscription grants, trading/resale proceeds, or other categories may not qualify, according to current official rules.
- Link to the current official source and the dedicated Earned Robux page.

Do not create a generic "Robux value" result that silently uses DevEx math.

## 13.7 Shareable state

Use human-readable, privacy-safe query parameters, for example:

```text
/?robux=100000&rate=standard-current&currency=USD
/?standard=80000&legacy=20000&currency=CAD&mode=advanced
/?target=1000&rate=standard-current&mode=target
```

Requirements:

- Validate all query parameters.
- Do not include contact details, account identifiers, or sensitive data.
- Use one canonical URL without query parameters unless a specifically approved static amount page exists.
- Support Web Share API with copy-link fallback.
- Preserve accessibility and no-JavaScript fallback content.

## 13.8 History and preferences

Optional local-only functionality:

- Recent calculations
- Favorite presets
- Preferred currency
- Theme preference
- Advanced-mode preference

Requirements:

- Store only non-sensitive calculation data.
- Provide a clear "Clear history" action.
- Do not sync data or create accounts.
- Gracefully handle disabled or unavailable local storage.
- Document the behavior in the privacy policy.

---

# 14. FOREIGN EXCHANGE LAYER

The canonical DevEx calculation is always performed in USD. Local-currency conversion is a secondary estimate.

## 14.1 Provider policy

Use a provider abstraction. Prefer a reputable primary or official source such as the ECB Data API for supported currencies. Do not claim support for a currency that the configured provider does not actually supply at the required frequency.

Requirements:

- Store provider name and source URL.
- Display the observation date/time.
- Label rates as reference rates, not live bank quotes.
- Explain that banks/payment processors may use different rates and fees.
- Cache responsibly.
- Implement timeout, retry limit, and stale fallback.
- Never block the core USD calculator when FX is unavailable.

## 14.2 Cross-rate calculation

If the provider is EUR-based, compute USD-to-target cross rates correctly from the provider's published conventions. Document the exact formula and write fixtures for known observations.

Do not reverse a rate accidentally. Add unit tests for USD, EUR, GBP, CAD, AUD, JPY, CHF, and at least one zero-decimal display currency if supported.

## 14.3 Caching behavior

Recommended behavior:

- Fetch server-side only.
- Cache successful public responses for approximately 12 hours or according to provider publication frequency.
- Use stale-while-revalidate where supported.
- Include `fetchedAt`, `observationDate`, `provider`, and `stale` in the normalized response.
- Keep a source-controlled fallback snapshot solely to preserve degraded functionality; clearly mark it stale.
- Do not silently use a stale rate as if it were current.

## 14.4 API response contract

Conceptual success response:

```json
{
  "ok": true,
  "data": {
    "base": "USD",
    "rates": {"EUR": 0.87, "GBP": 0.75},
    "provider": "European Central Bank",
    "observationDate": "2026-08-14",
    "fetchedAt": "2026-08-17T12:00:00Z",
    "stale": false
  },
  "meta": {"cache": "HIT"}
}
```

Conceptual failure response:

```json
{
  "ok": false,
  "error": {
    "code": "FX_UNAVAILABLE",
    "message": "Local-currency estimates are temporarily unavailable. The USD calculator still works."
  }
}
```

Do not expose provider secrets or raw unbounded upstream payloads.

---

# 15. PRODUCT PAGE AND COMPONENT REQUIREMENTS

## 15.1 Homepage `/`

The homepage is the canonical owner of DevEx calculator intent.

Required order:

1. Header
2. Compact trust/source strip
3. H1 and one concise explanation
4. Primary calculator above the fold
5. Result and source state
6. Quick rate comparison
7. Concise quick-answer block
8. How the calculation works
9. Current rate summary
10. Earned Robux warning
11. Popular amount table or curated conversion links
12. DevEx requirements summary
13. Related calculators
14. Related guides
15. Visible user-focused FAQs
16. Methodology/source note
17. Footer

The calculator must remain the dominant element. Do not place a long article, large ad, or decorative hero before it.

Suggested H1 direction, subject to final keyword mapping:

**DevEx Calculator: Convert Earned Robux to USD**

Suggested positioning:

"Estimate Roblox DevEx payouts using the currently verified standard rate, optional legacy and qualifying U.S. 18+ rate buckets, and timestamped local-currency reference rates."

Do not use this wording verbatim if final research finds a better original expression.

## 15.2 `/robux-to-usd/`

Canonical owner for generic Robux-to-USD calculator/converter intent.

This page must solve ambiguity rather than conceal it:

- Prominent mode selection: creator DevEx payout versus purchase-price estimate
- DevEx mode is source-backed and exact to the configured rate
- Purchase-price mode must use current official or user-provided package data; if reliable package data is unavailable, explain the distinction and do not fabricate a universal purchase rate
- Bidirectional conversion when mathematically valid
- Comparison table showing why purchase value and creator payout differ
- Link to the main DevEx calculator for advanced rate splitting
- Unique content and metadata distinct from the homepage

Do not let this page cannibalize the homepage's primary DevEx calculator query. The route map and headings must make the distinction clear.

## 15.3 `/usd-to-robux/`

Canonical owner for reverse-conversion and payout-goal intent.

Required:

- "Earned Robux needed for a target DevEx payout" as the primary reliable mode
- Clear distinction from buying Robux
- Selected rate and rounding-up logic
- Target progress calculator
- Examples
- Link to current rates and requirements

If purchase-price data is not sourceable, do not pretend this route can state how much Robux a consumer can buy universally.

## 15.4 `/devex-rates/`

Canonical owner for:

- devex rate
- devex rates
- Roblox DevEx rate
- DevEx exchange rate
- current versus legacy rate
- conditional U.S. 18+ rate

Required:

- Current verified rate table
- Effective dates
- Eligibility scope
- Per 1,000 / 30,000 / 100,000 / 1,000,000 examples
- Source links
- Last verified date
- Rate history timeline
- Difference calculator
- Explanation that rates can change
- No unsourced forecasting

## 15.5 `/devex-requirements/`

Canonical owner for eligibility and minimum intent.

Required:

- Current official minimum
- Earned Robux requirement
- Age, email, identity, tax, account standing, and portal requirements only where current official sources support them
- "Numerical threshold is not approval" warning
- Process checklist
- Common rejection/misunderstanding explanations only when sourceable
- Links to official terms
- Last reviewed date

Do not repeat stale competitor statements such as an old 10,000 or 100,000 minimum.

## 15.6 `/earned-robux/`

Required:

- Definition
- Common qualifying categories
- Common non-qualifying categories
- Pending versus available balance explanation when sourceable
- Group payout caveat
- Examples framed as educational, not official determinations
- Link to official documentation
- Link back to calculator and requirements

## 15.7 `/how-to-cash-out-robux/`

Required:

- Source-backed high-level process
- Preparation checklist
- Calculator CTA
- Identity/tax/payment caveats
- Expected timing only if current official sources support it
- No promise of approval or processing time
- No request for Roblox credentials
- Warning against unofficial account or payout services

## 15.8 `/devex-rate-history/`

Required:

- Verified timeline only
- Legacy 0.0035 and current 0.0038 transition when still documented
- Conditional U.S. 18+ introduction when verifiable
- Effective dates and source IDs
- Comparison tables
- Public changelog connection
- No speculative future-rate section presented as fact

## 15.9 `/devex-fees-and-taxes/`

Required:

- Separate the DevEx conversion rate from payment-provider fees, foreign-exchange spreads, and taxes
- Optional user-entered fee and tax estimate controls
- No tax advice
- No universal tax percentage
- Country-specific content only when reviewed by a qualified source and maintained
- Strong disclaimer and links to official/provider guidance

## 15.10 `/robux-tax-calculator/`

This is a distinct product intent, not a duplicate DevEx page.

Required:

- Marketplace/platform fee calculation only with currently verified rules
- After-fee amount
- Before-fee target amount
- Clear scope and exclusions
- Source and review date
- Internal links to DevEx calculator where appropriate

Do not automatically apply marketplace tax to DevEx payouts. The systems are conceptually separate.

## 15.11 `/calculators/`

Create a crawlable directory containing only complete tools. Potential cards:

- DevEx Calculator
- Robux to USD
- USD target to Earned Robux
- Robux Tax Calculator
- Advanced DevEx Split Calculator, if exposed as a section rather than duplicate route
- Team payout split calculator, only if built and source-safe

Do not list future placeholders as working tools.

## 15.12 `/conversions/`

Create a strong conversion hub with:

- Interactive amount input
- Server-rendered popular amount table
- Current/legacy/conditional comparison columns
- Links to a small approved set of standalone amount pages
- Explanation of rounding and rate scope
- Search/filter that does not create indexable result URLs

## 15.13 Standalone numeric amount pages

The supplied datasets contain many amount queries. Do not automatically create a page for every number or formatting variant.

A standalone amount page may be indexable only when all of these are true:

1. The normalized amount has meaningful demonstrated demand.
2. The intent is distinct enough to merit a stable URL.
3. The page provides unique computed utility beyond substituting one number.
4. It includes current, legacy, and conditional comparisons when relevant.
5. It includes a target reverse table, percentage differences, source timestamp, and calculator state.
6. It has original explanatory context appropriate to that amount.
7. It passes near-duplicate and thin-content checks.
8. It is manually approved in the publish queue.
9. It does not create an uncontrolled crawl space.
10. It links naturally to the parent hub and adjacent meaningful amounts.

At launch, cap approved numeric pages to a conservative curated set, normally no more than 10–20. Keep the remainder mapped to the conversion hub, query-parameter calculator state, or `REVIEW`/`EXCLUDED` status.

Potential candidates from the supplied data include, subject to scoring and SERP validation:

- 1,000 Robux to USD
- 5,000 Robux to USD
- 10,000 Robux to USD
- 17,000 Robux to USD
- 20,000 Robux to USD
- 30,000 Robux to USD
- 50,000 Robux to USD
- 100,000 Robux to USD
- 200,000 Robux to USD
- 500,000 Robux to USD
- 1 million Robux to USD
- 10 million Robux to USD

Formatting variants such as `100000`, `100,000`, `100 000`, and `100k` must map to one amount entity and one canonical route, not separate pages.

## 15.14 Trust and legal pages

Create complete original pages:

- About
- Methodology
- Sources
- Editorial Policy
- Corrections Policy
- Public Changelog
- Contact
- Privacy Policy
- Terms
- Disclaimer
- Accessibility Statement

Do not invent a company registration, physical address, staff credential, author biography, or response time.

---

# 16. CALCULATOR USER EXPERIENCE CONTRACT

## 16.1 Initial state

- Default amount may be blank or a helpful example such as 100,000, chosen through usability testing.
- Do not animate a fake result before input.
- Show the currently selected rate and source.
- Render useful formula/examples without requiring interaction.

## 16.2 Quick presets

Use data-driven presets informed by keyword demand and user usefulness. Include a balanced set such as:

- 1K
- 5K
- 10K
- 30K
- 50K
- 100K
- 500K
- 1M

Do not render dozens of chips above the fold. Put extended amounts in the conversion table.

## 16.3 Result panel

Show:

- Estimated gross USD payout
- Optional local currency estimate
- Applied rate label and value
- Amount classification
- Minimum-threshold state
- Breakdown by rate bucket in advanced mode
- Fee/tax estimate only when user enabled it
- Source and observation date
- Estimate disclaimer
- Copy/share actions

The primary value must remain readable at 320px and with 200% text zoom.

## 16.4 Advanced controls

- Closed by default for first-time users unless URL state requests it
- Persist explicit preference locally
- Keyboard accessible disclosure
- Do not hide essential warnings inside the disclosure
- Preserve values when switching modes where logically safe
- Warn before destructive reset only if meaningful data would be lost

## 16.5 Copy behavior

Offer:

- Copy primary result
- Copy full calculation summary
- Copy share link

Use the Clipboard API with a safe fallback. Announce success/failure through an `aria-live` region. Do not rely only on color or icon changes.

## 16.6 Error behavior

- Keep the core USD calculator working when FX fails.
- Give actionable messages.
- Never expose stack traces or secrets.
- Log server errors with a request ID.
- Use recoverable boundaries for non-critical widgets.

---

# 17. ANALYTICS, ADVERTISING, AND MONETIZATION GUARDRAILS

## 17.1 Analytics

Implement an analytics abstraction with all providers disabled by default.

Potential providers:

- Cloudflare Web Analytics
- Google Analytics 4

Requirements:

- Load only when a valid ID/config is present.
- Do not hardcode competitor IDs.
- Do not send calculator values as personally identifiable information.
- Do not send raw contact-form content.
- Respect consent requirements applicable to the chosen implementation.
- Avoid duplicate page-view events under App Router navigation.
- Document event names and data minimization.

Useful privacy-conscious events may include:

- calculator_used
- calculator_mode_changed
- currency_selected
- result_copied
- share_used
- related_tool_clicked

Use coarse buckets instead of exact high-value amounts if analytics collection creates unnecessary sensitivity.

## 17.2 Advertising

Create a reusable ad component only if monetization is expected, but keep it disabled until real publisher and slot IDs exist.

- No fake blank ads visible to users.
- No scripts when disabled.
- Reserve dimensions only for enabled slots.
- Do not place ads between an input and its result.
- Do not use deceptive button-like ad placement.
- Prevent CLS.
- Respect consent and policy requirements.

---

# 18. CONTACT AND FEEDBACK

The site must not pretend a contact submission succeeded when no backend provider is configured.

Support configuration modes:

- `disabled`
- `mailto`
- `webhook`
- `resend` or another approved email provider
- optional D1 retention only after explicit approval

When a server submission mode is enabled:

- Validate name, email, subject, and message server-side.
- Enforce strict length limits.
- Sanitize output contexts.
- Use a honeypot.
- Rate limit.
- Validate Cloudflare Turnstile server-side on every protected submission.
- Validate Turnstile action and hostname where configured.
- Use idempotency where appropriate.
- Return honest success/error state.
- Never expose secret keys.
- Define retention and deletion behavior in privacy documentation.

If credentials are absent, provide a working direct-email link only when a confirmed email exists; otherwise show a neutral configuration-dependent contact notice in development and omit the public form in production.

---

# 19. COMPLETE KEYWORD DATA PIPELINE

Process the complete supplied CSVs. Do not manually select only the obvious top terms.

## 19.1 Source preservation

- Copy the source CSVs unchanged into `seo/source/` if they are not already there.
- Preserve exact filenames or create a manifest that records original filenames and hashes.
- Never overwrite source exports with normalized data.
- Record byte size, row count, encoding, delimiter, header names, and SHA-256 hash.
- Support UTF-8 BOM and quoted fields.
- Treat the CSV metrics as third-party estimates, not guaranteed traffic.

Expected headers include:

- Keyword
- Volume
- Organic traffic
- Paid traffic
- Average position
- Locations
- Top location
- Top location code
- Top location's volume
- Top location's traffic

If columns differ, adapt through a documented import mapping rather than discarding rows.

## 19.2 Validation checkpoints

Recompute these from the actual files and treat them as anomaly checks, not hardcoded public claims:

- RBXTax export: approximately 82 keyword rows, summed Volume around 14,270, summed Organic traffic around 1,564.
- RoMonitor Stats export: approximately 362 keyword rows, summed Volume around 81,220, summed Organic traffic around 13,534.

A mismatch may indicate a changed export, encoding issue, duplicate-handling difference, or parse error. Document the reason. Do not force the numbers to match.

## 19.3 Normalization

For each row preserve:

- Raw keyword
- Source file
- Source row number
- Original metrics
- Original country/location fields

Create normalized fields:

- Unicode-normalized keyword
- Lowercase comparison key
- Collapsed whitespace
- Normalized punctuation
- Numeric amount in whole Robux where parsable
- Numeric display form
- Currency/entity tokens
- Spelling-family ID
- Intent cluster
- Search task
- Candidate route

Normalization must:

- Preserve the original keyword for evidence.
- Merge spacing variants such as `dev ex`, `devex`, and `dev x` into a spelling family without deleting the raw forms.
- Map `100000`, `100,000`, `100 000`, and `100k` to the same amount when semantically equivalent.
- Distinguish `1m` when ambiguity exists.
- Preserve locale and currency signals.
- Avoid collapsing different intents merely because they share tokens.

## 19.4 Required intent taxonomy

Assign one primary intent and optional secondary intents:

- Core DevEx calculator
- DevEx rate/current rate
- DevEx rate history/legacy rate
- Conditional U.S. 18+ rate
- Generic Robux to USD
- Reverse USD to Robux / payout goal
- Numeric amount conversion
- Local-currency conversion
- Earned Robux definition
- DevEx eligibility/requirements/minimum
- Cash-out process
- Fees/payment processing
- Taxes
- Marketplace tax
- Calculator comparison/alternative
- Brand/navigational
- Informational definition
- Troubleshooting
- Off-topic
- Ambiguous review

Do not force unrelated queries into the site because they contain `Robux`, `Roblox`, `money`, or `calculator`.

## 19.5 Core observed keyword families

Use the data, not these examples alone. The supplied exports visibly include strong demand around:

- robux to usd
- devex calculator
- robux calculator
- devex roblox
- devex rates
- robux converter
- robux to money converter
- robux to usd calculator
- roblox devex calculator
- devex to usd
- usd to robux
- numeric conversions from small amounts through millions or billions
- Roblox tax

Map spelling variants to canonical pages rather than creating separate URLs.

## 19.6 Keyword record contract

Every source row must end in exactly one of these statuses:

- `included`
- `excluded`
- `ambiguous-review`
- `duplicate-variant`

Recommended included record:

```json
{
  "keywordRaw": "devex calculator",
  "keywordNormalized": "devex calculator",
  "sourceFile": "romonitorstats.com-devex-calculator-organic_2026-08-17_14-15-10.csv",
  "sourceRow": 2,
  "volume": 6440,
  "organicTraffic": 2301,
  "averagePosition": 1,
  "topLocation": "Canada",
  "topLocationCode": "CA",
  "spellingFamily": "devex-calculator",
  "primaryIntent": "core-devex-calculator",
  "secondaryIntents": ["tool", "conversion"],
  "entity": "Roblox Developer Exchange",
  "amountRobux": null,
  "currency": "USD",
  "targetRoute": "/",
  "targetSection": "calculator",
  "canonicalOwner": true,
  "routeStatus": "existing-or-required",
  "priority": "P0",
  "mappingConfidence": 0.99,
  "notes": "Homepage owns DevEx calculator variants."
}
```

Recommended numeric variant record:

```json
{
  "keywordRaw": "100,000 robux to usd",
  "keywordNormalized": "100000 robux to usd",
  "amountRobux": 100000,
  "amountEntityId": "robux-100000",
  "primaryIntent": "numeric-robux-to-usd",
  "targetRoute": "/conversions/100000-robux-to-usd/",
  "fallbackRoute": "/robux-to-usd/?robux=100000",
  "publicationStatus": "review",
  "canonicalOwner": false,
  "notes": "Publish a standalone route only if the amount-page quality gate passes."
}
```

Recommended exclusion record:

```json
{
  "keywordRaw": "example ambiguous keyword",
  "status": "excluded",
  "reasonCode": "intent-mismatch",
  "reason": "The likely search task is outside DevExCalculator.org's product scope.",
  "candidateRoute": null
}
```

## 19.7 Clustering

Build deterministic rule-based clustering first, then use semantic similarity only as an assistive layer. Every automated cluster must be auditable and overrideable.

Required cluster outputs:

- Cluster ID and label
- Parent topic
- Primary keyword
- Secondary variants
- Search intent
- User task
- Total unique keyword count
- Non-overlapping volume summary
- Raw summed volume with warning
- Traffic evidence
- Top locations
- Representative SERP patterns
- Existing target route
- Recommended route
- Distinct-value rationale
- Cannibalization risks
- Content/tool requirements
- Publication priority
- Review state

Do not present the sum of overlapping variants as a traffic forecast.

## 19.8 Route ownership

Every meaningful included keyword must map to one best canonical route. A route may own many variants, but a keyword must not have multiple canonical owners.

Initial ownership direction, to be validated:

| Route | Primary ownership |
|---|---|
| `/` | DevEx calculator, Roblox DevEx calculator, Robux DevEx calculator, DevEx converter |
| `/robux-to-usd/` | Robux to USD, Robux to USD calculator/converter, Robux to money converter |
| `/usd-to-robux/` | USD to Robux, payout target to Earned Robux, reverse converter |
| `/devex-rates/` | DevEx rate/rates/exchange rate/current rate |
| `/devex-rate-history/` | Legacy rate, old rate, rate change history |
| `/devex-requirements/` | Minimum, eligibility, requirements |
| `/earned-robux/` | Earned Robux definition and qualifying balance |
| `/how-to-cash-out-robux/` | Cash-out process |
| `/devex-fees-and-taxes/` | DevEx fees, payout fees, FX, tax estimate |
| `/robux-tax-calculator/` | Roblox/Robux tax and marketplace fee calculator |
| `/conversions/` | Numeric amount hub and non-published amount variants |
| Curated `/conversions/{amount}-robux-to-usd/` | One approved normalized amount entity only |

Do not create separate pages for:

- dev ex calculator
- dev x calculator
- devex calc
- devex calculator Roblox
- Roblox DevEx calculator

These are homepage variants unless SERP evidence proves a distinct task.

## 19.9 Cannibalization controls

Create `seo/generated/cannibalization-map.json` and a validator that fails when:

- One included keyword has multiple canonical owners.
- Two indexable pages have substantially identical target keyword sets.
- Two routes have near-identical title/H1/description combinations.
- A standalone amount page duplicates the parent conversion hub without distinct utility.
- Query-parameter calculator states are self-canonicalized as separate pages.
- A new guide targets the same task as a tool page without a clearly subordinate intent.
- Redirect, sitemap, and canonical maps disagree.

## 19.10 Priority scoring

Create transparent separate scores:

### Strategic Priority Score

Suggested weighted components:

- Search demand: 20%
- Topical relevance: 20%
- Product/task value: 20%
- Distinct intent: 15%
- Competitor weakness/opportunity: 10%
- Proven traffic evidence: 10%
- Internal-link support: 5%

### Quick-Win Score

Suggested weighted components:

- Demand: 20%
- Competitor position/opportunity: 20%
- Current site gap: 20%
- Implementation effort inverse: 15%
- Low cannibalization risk: 10%
- Original utility potential: 10%
- Internal-link readiness: 5%

Apply explicit penalties for:

- Ambiguous intent
- Thin-page risk
- Near-duplicate route concept
- Trademark/legal risk
- Outdated or unverifiable factual requirements
- No functional differentiation
- Weak source support
- High maintenance burden
- Local-currency data unavailable

Priority bands:

- P0 — core tool, trust, legal, deployment, and crawl infrastructure required before launch
- P1 — highest-fit demand pages for initial indexation
- P2 — supporting authority pages after P1 QA
- P3 — experimental or lower-demand pages, normally deferred
- REVIEW — manual SERP, legal, source, or product validation required
- EXCLUDED — off-topic, duplicative, unsafe, or no-value

## 19.11 Publish queue

`publish-queue.json` must include:

- Route
- Page type
- Canonical owner keywords
- Priority scores
- Unique utility requirement
- Source requirement
- Content readiness
- Tool readiness
- Internal links ready
- Schema ready
- Indexation state
- Manual approval state
- Blockers

Only routes with all required gates may enter the sitemap.

## 19.12 Required SEO scripts and tests

Implement and run:

- CSV parser validation
- Duplicate source-row detection
- Keyword normalization tests
- Amount parser tests
- Spelling-family tests
- Intent-classification tests
- Route-mapping tests
- One-keyword/one-owner tests
- Exclusion accounting
- Priority-score reproducibility
- Cannibalization validation
- Metadata uniqueness validation
- Internal-link validation
- Sitemap/indexation agreement
- Near-duplicate content detection

The final report must account for every source row.

---

# 20. COMPETITOR AUDIT CONTRACT

Audit representative desktop and mobile behavior for every supplied competitor. Do not bypass access controls or scrape private endpoints.

For each competitor record:

- URL
- Access status
- Rendering model visible from public evidence
- Calculator inputs
- Calculator outputs
- Supported directions
- Rate choices
- Currency choices
- Quick presets
- Source transparency
- Last-updated/verified treatment
- Eligibility explanation
- Earned-versus-purchased distinction
- Fees/tax handling
- Share/history behavior
- Page section order
- Related tools
- Internal linking
- Metadata
- Structured data
- Crawlability with JavaScript disabled where observable
- Accessibility observations
- Mobile behavior
- Performance observations
- Content gaps
- Potential inaccuracies or stale claims
- Original opportunity for DevExCalculator.org

Create:

- `docs/competitor-audit.md`
- `docs/competitor-feature-matrix.md`
- `seo/generated/competitor-gap-map.json`

## 20.1 Research checkpoint observations to verify

Use these only as starting observations:

- DevExCalc appears to provide a minimal two-way Robux/USD interface with copy actions and very little supporting content.
- RoMonitor Stats presents a JavaScript-dependent page and has historically competed strongly for broad conversion queries.
- RBXTax has a simple DevEx page, but public copy may contain internally inconsistent or outdated minimum requirements.
- DevExConverter provides a clean two-way interface and visibly states 1,000 Robux = USD 3.80 at the checkpoint.
- RBXCalc combines quick amounts, a source/last-verified block, FAQs, related calculators, and current standard-rate explanation.
- ToolBLX provides broad guide content and custom-rate scenarios, but public examples at the checkpoint appear to use older 0.0035/350-per-100k assumptions and an outdated minimum.

Verify every observation before relying on it. The target must not copy competitor wording.

## 20.2 Required differentiation

DevExCalculator.org should outperform through:

- Current official multi-rate support
- Split-balance calculator
- Honest Earned Robux classification warning
- Reverse target calculator
- Source registry and visible last-verified date
- Reference-rate local currencies with timestamp and fallback state
- Server-rendered crawlable content
- Accessible interactions
- Shareable calculation URLs
- Strong methodology and changelog
- Distinct route ownership
- Controlled numeric-page publishing
- Faster mobile experience
- More reliable error states
- Better internal linking
- Better test coverage
- Cloudflare edge deployment

---

# 21. TOPICAL MAP AND INFORMATION ARCHITECTURE

Build a topic graph, not a flat list of keyword pages.

## 21.1 Pillar cluster: DevEx Calculator

Parent: `/`

Supporting topics:

- Current payout calculation
- Advanced split calculation
- Reverse payout target
- Rate comparison
- Minimum threshold
- Earned Robux
- Source/methodology
- Popular amounts
- Local currencies
- Fees/taxes caveat

## 21.2 Pillar cluster: Robux to USD

Parent: `/robux-to-usd/`

Supporting topics:

- DevEx payout versus purchase price
- Robux to money converter
- USD to Robux reverse intent
- Popular amount conversions
- Local currency conversions
- Conversion formula
- Why values differ

## 21.3 Pillar cluster: DevEx Rates

Parent: `/devex-rates/`

Supporting topics:

- Standard current rate
- Eligible U.S. 18+ rate
- Legacy rate
- Effective dates
- Per-thousand examples
- Rate history
- Rate-change impact
- Official source updates

## 21.4 Pillar cluster: Eligibility and Process

Parent: `/devex-requirements/`

Supporting topics:

- Earned Robux
- Minimum
- Account standing
- Identity and payment setup
- Cash-out process
- Common misunderstandings
- Official review

## 21.5 Pillar cluster: Creator Finance Calculators

Parent: `/calculators/`

Supporting tools:

- DevEx Calculator
- Robux to USD
- Reverse target
- Robux tax
- Potential future team payout split or revenue goal tool only when complete

## 21.6 Trust cluster

- Methodology
- Sources
- Editorial policy
- Corrections
- Changelog
- Disclaimer
- Privacy
- Terms
- Accessibility

Every indexable page must have a defined parent, sibling relationships, and next-step links.

---

# 22. CONTENT SYSTEM

## 22.1 Content model

Use typed structured content and/or local MDX. Do not store long production content in JSX when a reusable content model is more maintainable.

Each indexable route record should include:

```json
{
  "route": "/devex-rates/",
  "status": "published",
  "indexation": "index",
  "pageType": "pillar-guide",
  "title": "",
  "metaDescription": "",
  "h1": "",
  "primaryIntent": "devex-rate",
  "primaryKeyword": "devex rates",
  "secondaryKeywords": [],
  "entities": [],
  "sourceIds": [],
  "lastReviewedAt": "",
  "dateModified": "",
  "quickAnswer": "",
  "sections": [],
  "faqs": [],
  "internalLinks": [],
  "schemaTypes": [],
  "canonical": "https://devexcalculator.org/devex-rates/"
}
```

Validate content at build time.

## 22.2 Source-backed writing

For every factual page:

- Identify factual claims before writing.
- Link each time-sensitive claim to a source ID.
- Use exact dates when describing a change.
- Use "as of" or "last verified" where appropriate.
- Separate official requirements from calculator assumptions.
- Add a concise limitation note.
- Do not invent data to fill a section.

## 22.3 Writing standard

All copy must be:

- Original
- Direct
- Natural
- Useful to a real creator
- Accurate at the time of review
- Free of keyword stuffing
- Free of artificial word-count padding
- Scannable on mobile
- Specific about formulas and limitations
- Consistent in terms such as Earned Robux, DevEx, standard rate, legacy rate, and estimate

Avoid formulaic AI phrases and empty transitions. Do not deliberately insert grammatical quirks to appear human. Quality and precision matter more than a target word count.

## 22.4 Recommended major-page sequence

1. H1
2. One-sentence purpose
3. Quick answer of approximately 40–70 useful words
4. Tool or task interface
5. Immediate result explanation
6. Key definitions
7. Formula/method
8. Examples or comparison table
9. Requirements/limitations
10. Source note
11. Related next steps
12. Visible FAQs where useful
13. Last-reviewed information

Adapt the sequence to user intent. Do not force a long article above a calculator.

## 22.5 Quick-answer blocks

A quick answer must:

- Answer the query immediately
- Use the current verified rate where relevant
- State that the calculation is an estimate
- Mention eligible Earned Robux where needed
- Avoid hedging so much that it becomes useless
- Link to detail below through an anchor

## 22.6 FAQ policy

Visible FAQs are for users and semantic coverage. Do not create repetitive FAQ blocks on every page.

As of the 2026 checkpoint, Google announced the removal/deprecation of FAQ rich-result support. Therefore:

- Do not add `FAQPage` JSON-LD merely for ranking.
- Use visible accessible FAQ accordions where users benefit.
- Use ordinary headings and text that remain available without JavaScript.
- Recheck current Google documentation before deciding whether any FAQ schema should exist.

## 22.7 Content gap outputs

Create:

- Search-intent analysis
- Complete topical map
- Important entities
- PAA-style question map
- Competitor content gaps
- Trust gaps
- Product gaps
- Content roadmap
- Update cadence

Do not generate generic lists disconnected from routes and user tasks.

## 22.8 Entity map

Include relevant entities only, such as:

- Roblox Corporation
- Roblox
- Developer Exchange Program
- DevEx
- Robux
- Earned Robux
- Roblox Creator Hub
- DevEx portal
- U.S. 18+ rate
- legacy rate
- standard rate
- USD
- supported local currencies
- European Central Bank when used
- payment provider only when verified in current official sources
- identity verification
- tax information
- exchange rate
- payout estimate

Map each entity to routes, source IDs, aliases, and relationship descriptions.

## 22.9 PAA/question map

Generate and map genuine questions, for example:

- What is the current Roblox DevEx rate?
- How much is 100,000 Earned Robux in DevEx?
- What is the minimum Earned Robux for DevEx?
- Does every Robux balance qualify?
- What is the difference between the current and legacy rate?
- Who can qualify for the U.S. 18+ rate?
- How many Earned Robux are needed for USD 1,000?
- Why is DevEx lower than the price of buying Robux?
- Are there fees or taxes after DevEx?
- Can group funds qualify?
- How often can a creator submit a request?
- How are local-currency estimates calculated?

Verify time-sensitive answers before publication. Map each question to one canonical route and section.

---

# 23. INTERNAL LINKING SYSTEM

Create a data-driven internal-link graph.

## 23.1 Link principles

- Important links must be crawlable `<a href>` elements.
- Internal links must not use `nofollow`.
- Use descriptive natural anchors.
- Vary anchors according to context without obscuring the destination.
- Do not add sitewide exact-match keyword blocks.
- Do not link every page to every page.
- Do not create orphan pages.
- Do not link to drafts or noindex pages from primary navigation.

External social links, when configured, should open in a new tab and use `rel="nofollow noopener noreferrer"`. Official factual source links may open in a new tab with `noopener noreferrer`; do not automatically mark authoritative citations `nofollow` unless a policy reason exists.

## 23.2 Required graph behavior

Homepage links to:

- Robux to USD
- DevEx rates
- Requirements
- Earned Robux
- Cash-out guide
- Calculator directory
- Methodology

Tool pages link to:

- Their supporting definition/rate/requirements pages
- One or two related tools
- Parent hub
- Methodology/source where relevant

Guide pages link to:

- The relevant calculator near the first actionable section
- Parent pillar
- One prerequisite page
- One next-step page

Numeric pages link to:

- Conversion hub
- Main Robux-to-USD calculator
- Current rates
- Adjacent meaningful amounts, not arbitrary chains

Trust pages link back to the relevant product rather than becoming isolated legal silos.

## 23.3 Validation

Fail validation on:

- Broken internal links
- Links to noncanonical redirect sources in primary content
- Orphan indexable pages
- Parent/child graph cycles that create navigation confusion
- Internal `nofollow`
- JavaScript-only important navigation
- Links to draft routes
- Excessive repeated exact-match anchors

Generate `seo/generated/internal-link-map.json` and `docs/seo/internal-link-strategy.md`.

---

# 24. TECHNICAL SEO CONTRACT

## 24.1 URL policy

- Use lowercase clean URLs with trailing slashes consistently.
- Homepage remains `/`.
- Do not expose `.html` duplicates.
- Do not create uppercase/lowercase variants.
- Normalize malformed duplicate slashes.
- Redirect `www` to apex while preserving path/query.
- Redirect HTTP to HTTPS through Cloudflare configuration.
- Use 301 or 308 permanent redirects consistently.
- Do not redirect missing paths to the homepage; return a useful 404.

Configure `trailingSlash` only after verifying Cloudflare/OpenNext behavior. Test both slash and non-slash requests and ensure one canonical response.

## 24.2 Metadata

Every indexable page must have:

- Unique title
- Unique meta description
- One visible H1
- Absolute self-referencing canonical
- Open Graph title, description, URL, type, site name, and image
- Twitter card metadata
- Correct robots directives
- Last-reviewed information when appropriate
- Consistent `lang="en"`

Title guidance:

- Lead with the user task.
- Use brand at the end where useful.
- Avoid repeated year modifiers unless the page is genuinely reviewed and year-sensitive.
- Avoid clickbait.
- Avoid near-identical titles across numeric pages.

Meta descriptions must accurately summarize visible page content. They are not keyword-dump fields.

## 24.3 Canonicals

- Every indexable page self-canonicalizes.
- Query-parameter calculator states canonicalize to the clean owning route.
- Published numeric pages self-canonicalize only after passing publication gates.
- Draft, review, internal search, and preview pages use `noindex` and stay out of sitemaps.
- Canonical, redirect, internal-link, and sitemap destinations must agree.
- Use absolute HTTPS URLs.

Do not use canonical tags to excuse uncontrolled duplicate-page generation.

## 24.4 Robots and indexation

Create `robots.ts` or a static equivalent that:

- Allows public indexable content
- References the absolute sitemap URL
- Does not block CSS/JS required for rendering
- Excludes private/internal endpoints only when appropriate
- Does not rely on robots.txt to remove sensitive data

Use `noindex` for:

- Draft pages
- Internal previews
- Internal search results
- Arbitrary filtered/query result pages
- Unapproved generated amount pages
- Thin utility endpoints
- Embed-only routes if created

Do not put `noindex` pages in the sitemap.

## 24.5 Sitemaps

Start with a correct sitemap and split only when route volume justifies it.

Requirements:

- Include only canonical HTTP 200 indexable URLs.
- Use absolute URLs.
- Exclude redirects, APIs, drafts, noindex, search results, and arbitrary query states.
- Use meaningful `lastmod` from content/rate updates, not the build time or copyright year.
- Verify that route count, sitemap count, and content manifest agree.
- Add an automated fetch test after deployment.

Potential future segmentation:

- sitemap-pages.xml
- sitemap-guides.xml
- sitemap-conversions.xml

Do not add empty segmented sitemaps.

## 24.6 Structured data

Create one validated JSON-LD graph per page as appropriate. Candidate types:

Global:

- `WebSite`
- `Organization` only with truthful organization data

Homepage/tool pages:

- `WebApplication` or `SoftwareApplication` where the visible calculator supports the description
- `BreadcrumbList` where breadcrumbs are visible

Guides:

- `Article` only when the page functions as an article and has truthful author/publisher/date data
- `BreadcrumbList`

Directories:

- `CollectionPage`
- `ItemList` when the visible list matches the schema

Legal/about/contact:

- `AboutPage`
- `ContactPage`
- `WebPage`

Rules:

- Schema must match visible content.
- Do not add `Product`, `Review`, `AggregateRating`, `FinancialProduct`, `QAPage`, or `FAQPage` without a truthful qualifying use case.
- Do not invent an author or rating.
- Use stable canonical `@id` values.
- Validate JSON syntax and schema relationships.
- Do not promise rich results.

## 24.7 Breadcrumbs

- Visible on non-homepage content pages.
- Match canonical hierarchy.
- Use real links.
- Match `BreadcrumbList` JSON-LD.
- Avoid duplicating the page title unnecessarily on mobile.

## 24.8 Open Graph assets

Create original local or generated OG images with:

- Brand
- Page task
- Simple calculation motif
- No Roblox logo
- Correct dimensions
- Readable safe-area text
- Explicit alt text

Verify OpenNext/Cloudflare compatibility for dynamic `ImageResponse`. If unreliable, pre-generate static OG images during build.

## 24.9 404 and error handling

The 404 page must:

- Return actual 404 status
- Explain the missing page
- Offer calculator, rates, and guides links
- Be noindex
- Avoid auto-redirecting to the homepage

Error boundaries must not emit indexable empty pages or leak internals.

## 24.10 `llms.txt`

Provide a concise transparent `public/llms.txt` that may include:

- Site identity
- Canonical URL
- Main calculators
- Methodology and sources URLs
- Content license/usage policy if defined
- Contact route
- Sitemap URL
- Non-affiliation statement

Do not claim `llms.txt` is a Google ranking factor or guarantees AI-engine inclusion.

---

# 25. AEO AND GEO IMPLEMENTATION

Do not invent "AI SEO tags." Improve answerability and entity clarity through visible high-quality content.

Every major tool/pillar page should include:

- A direct answer near the top
- A clearly stated formula
- A concise definition block
- A comparison table when useful
- Explicit source and last-verified information
- A limitation note
- Entity-consistent terminology
- Passage-friendly headings
- Short factual paragraphs before deeper explanation
- Crawlable contextual links

Create `docs/seo/aeo-geo-strategy.md` that maps:

- Query/question
- Canonical page
- Direct-answer block
- Supporting evidence
- Entity relationships
- Comparison/table opportunity
- Source IDs
- Update sensitivity

Do not over-optimize by repeating exact questions mechanically.

---

# 26. CONTENT FRESHNESS AND CHANGE MANAGEMENT

Rates and rules are time-sensitive.

Implement:

- `lastVerifiedAt` in rate data
- `lastReviewedAt` in page content
- Public "Last verified" display on rate-sensitive pages
- Source registry
- Rate-change changelog
- Build warning when a rate-sensitive page exceeds a configurable review age
- Optional CI failure after a longer critical threshold

Suggested policy:

- Warning after 30 days for core rates
- Manual review required after 60–90 days
- Immediate review when official source content changes

Do not automatically update a public rate from an unreviewed scraped page. A rate update requires:

1. Official source verification
2. Data update
3. Unit-test update
4. Content update
5. Changelog entry
6. Review date update
7. Deployment

---

# 27. ACCESSIBILITY CONTRACT

Target WCAG 2.2 AA.

Required:

- One logical H1
- Landmark structure
- Skip link
- Keyboard-operable navigation and calculator
- Visible focus indicator with adequate contrast
- 44px target size where practical
- Programmatic labels and descriptions
- Error messages associated with fields
- `aria-live` for result/copy/status updates without excessive announcements
- No result communicated only by color
- Accessible disclosure/accordion semantics
- Focus restoration for mobile menu/dialogs
- Escape closes modal-like UI
- Reduced-motion support
- 200% text zoom without loss of content/function
- 320px width without horizontal scrolling
- High-contrast testing
- Screen-reader-friendly currency and large-number labels
- Correct table headers and captions
- Decorative icons hidden from assistive technology
- Meaningful SVG titles/labels where needed

Do not use `aria` to compensate for incorrect native elements.

Automated axe testing is required, but manual keyboard and screen-reader-oriented review is also required.

---

# 28. PERFORMANCE AND CORE WEB VITALS CONTRACT

## 28.1 Performance principles

- Calculator first, minimal client bundle
- Server-render content
- No heavy animation library
- No chart library unless justified
- No third-party scripts above the primary tool
- Lazy-load below-the-fold noncritical media
- Explicit image dimensions
- Local optimized SVG/AVIF/WebP assets
- Preload only critical resources
- Use font-display behavior that prevents invisible text
- Avoid hydration of static content
- Avoid giant serialized props
- Avoid sending keyword intelligence to the browser
- Cache immutable assets
- Cache stable content appropriately
- Preserve calculator responsiveness during typing

## 28.2 Budgets

Set and enforce realistic budgets after measuring the baseline. Initial targets:

- LCP under 2.5 seconds at the 75th percentile target environment
- INP under 200ms
- CLS under 0.1
- No long task caused by calculation logic
- Route-specific client JavaScript kept as small as practical
- No unapproved dependency adding more than a documented bundle threshold
- Worker bundle below the current account/platform script-size limit

Use Lighthouse as one signal, not the sole acceptance criterion. Aim for 95+ on performance, accessibility, best practices, and SEO for representative production-like pages, but document environment and do not falsify scores.

## 28.3 Worker and bundle checks

- Build with OpenNext.
- Run a Wrangler dry run or equivalent size report.
- Record compressed/uncompressed Worker size.
- Inspect route chunks.
- Fail CI when a configured critical budget is exceeded.
- Verify that analytics/ads are tree-shaken or absent when disabled.

## 28.4 No-JavaScript and degraded behavior

With JavaScript disabled:

- Page title, H1, explanation, rate table, formula, source, links, and examples remain visible.
- The live calculator may not update, but a server-rendered default example and form fallback should remain understandable.
- Navigation remains usable.
- No page is a blank shell.

---

# 29. SECURITY AND PRIVACY CONTRACT

## 29.1 Input and output safety

- Validate all query parameters and form inputs on the server where used.
- Limit lengths and numeric magnitude.
- Escape rendered user-controlled values.
- Avoid `dangerouslySetInnerHTML` for user content.
- Do not log contact messages or sensitive data unnecessarily.
- Return generic public errors and detailed private logs with request IDs.

## 29.2 Headers

Implement and test appropriate headers, for example:

- Strict-Transport-Security where production HTTPS is confirmed
- X-Content-Type-Options: nosniff
- Referrer-Policy
- Permissions-Policy
- frame-ancestors through CSP or equivalent
- Content-Security-Policy designed for Next.js, configured analytics, and Turnstile

Do not ship a CSP that breaks the app. Build it deliberately, test it in report-only mode if needed, then enforce. Keep directives conditional for disabled third-party integrations.

## 29.3 CSRF and abuse

For state-changing routes:

- Restrict methods
- Validate Origin/Host where appropriate
- Use SameSite cookies only if cookies exist
- Add rate limiting
- Add Turnstile to public contact/feedback forms
- Validate Turnstile server-side
- Prevent replay and duplicate submission
- Use idempotency keys for retryable actions

The calculator and public FX GET endpoint should not require Turnstile.

## 29.4 Secrets

- Use `.dev.vars` locally and Cloudflare secrets/build secrets in production.
- Commit only `.dev.vars.example` and `.env.example` with empty values and descriptions.
- Generate Cloudflare environment types.
- Never echo secrets.
- Scan Git history/diff for accidental tokens before push.

Potential variables:

```text
NEXT_PUBLIC_SITE_URL=
NEXT_PUBLIC_GA4_ID=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
CONTACT_MODE=
CONTACT_EMAIL=
CONTACT_WEBHOOK_URL=
RESEND_API_KEY=
FX_PROVIDER=
FX_CACHE_TTL_SECONDS=
```

Use `NEXT_PUBLIC_` only for values safe to expose.

## 29.5 Privacy

The privacy policy must accurately describe only configured behavior:

- Local storage preferences/history
- Analytics if enabled
- Contact submissions if enabled
- Turnstile if enabled
- Cloudflare infrastructure
- Server logs and retention if known
- Cookies if any
- External official links

Do not claim "we collect no data" if analytics, logs, Turnstile, or contact forms are enabled.

---

# 30. TESTING STRATEGY

## 30.1 Unit tests — calculation engine

Test at minimum:

- Standard rate calculation
- Legacy rate calculation
- Conditional U.S. 18+ calculation
- Split-bucket total
- Prevention of accidental double counting
- Reverse target calculation and ceiling
- Fee percentage
- Flat fee
- Tax estimate
- Negative result clamp
- Local currency conversion
- Cross-rate direction
- Currency minor-unit formatting
- Large values within safe bounds
- Zero
- Minimum threshold boundary: below, exactly at, above
- Shorthand parser: K/M/B
- Thousands separators
- Invalid input
- Rate registry validation
- Rate source presence
- Effective date behavior

Use fixed expected values, not snapshots alone.

## 30.2 Unit tests — SEO/data

Test:

- CSV BOM and quoted-field parsing
- Numeric metric parsing
- Exact source-row accounting
- Keyword normalization
- Amount extraction
- Formatting-variant grouping
- Spelling-family grouping
- Intent classification
- Override behavior
- One canonical owner per keyword
- Exclusion reason codes
- Priority scoring
- Route canonicalization
- Metadata uniqueness
- Structured-data JSON validity
- Internal link normalization
- Sitemap lastmod behavior
- Near-duplicate detector

## 30.3 Component tests

Test:

- Amount input normalization
- Rate selector
- Quick presets
- Advanced mode disclosure
- Currency fallback
- Result update
- Copy feedback
- Share fallback
- Reset
- Threshold meter
- Error announcement
- Mobile menu
- FAQ disclosure
- Contact validation when enabled

## 30.4 Integration tests

Test:

- Content manifest validates
- Rate registry loads
- Homepage renders source-backed default data
- FX route normalizes provider response
- FX route handles timeout/failure/stale fallback
- API health response
- Contact route Turnstile validation when enabled
- Draft pages remain noindex and absent from sitemap
- Redirects and canonicals agree
- Sitemap routes return 200
- Security headers are present
- Disabled integrations do not emit scripts or fake UI

## 30.5 End-to-end tests

Use Playwright against both standard Next.js development where useful and Cloudflare/OpenNext preview before acceptance.

Representative routes:

- `/`
- `/robux-to-usd/`
- `/usd-to-robux/`
- `/devex-rates/`
- `/devex-requirements/`
- `/earned-robux/`
- `/how-to-cash-out-robux/`
- `/robux-tax-calculator/`
- `/conversions/`
- One approved amount page
- `/methodology/`
- `/sources/`
- `/privacy/`
- `/contact/` when configured
- A missing route
- `www` redirect after deployment

Flows:

- Enter amount and see accurate result
- Select each rate
- Use advanced split mode
- Reverse target calculation
- Apply optional fee/tax
- Change currency
- Handle FX failure
- Copy result
- Share URL and reload state
- Use back/forward navigation
- Clear local history
- Keyboard-only navigation
- Mobile menu open/close/Escape
- 404 behavior

## 30.6 Accessibility tests

- axe on representative routes
- Keyboard walkthrough
- Focus order
- 200% zoom
- 320px viewport
- Reduced motion
- High contrast
- Screen-reader-oriented name/role/value inspection

## 30.7 Visual regression

Capture and manually inspect at:

- 1920×1080
- 1440×900
- 1366×768
- 1024×768
- 768×1024
- 425×887
- 390×844
- 360×800
- 320×568

Capture at least:

- Homepage quick mode
- Homepage advanced mode
- Result with large number
- Validation error
- FX unavailable state
- Robux-to-USD page
- Rates page
- Requirements page
- Conversion hub
- Legal/article layout
- Mobile navigation
- Dark mode if implemented

Passing automated tests alone is not visual acceptance. Review screenshots for density, clipping, overflow, focus, contrast, safe areas, and unwanted blank space.

## 30.8 Link and metadata tests

Automate:

- Broken internal links
- Redirect chains
- Duplicate titles
- Duplicate descriptions
- Duplicate H1s within a page
- Missing canonical
- Canonical to non-200 route
- Sitemap to redirect/noindex route
- Structured-data parse failures
- Missing alt text
- Missing image dimensions
- External link safety attributes where policy requires them

---

# 31. PACKAGE SCRIPTS AND COMMAND CONTRACT

Adapt to the installed current packages. Provide equivalent scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "upload": "opennextjs-cloudflare build && opennextjs-cloudflare upload",
    "deploy": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
    "cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:a11y": "playwright test tests/e2e/accessibility.spec.ts",
    "validate:content": "tsx scripts/content/validate-content.ts",
    "validate:seo": "tsx scripts/seo/generate-seo-report.ts --check",
    "validate:links": "tsx scripts/quality/check-links.ts",
    "validate:worker": "tsx scripts/quality/check-worker-size.ts",
    "check": "npm run lint && npm run typecheck && npm run test && npm run validate:content && npm run validate:seo && npm run build"
  }
}
```

Verify the actual OpenNext CLI command names after installation. Do not preserve an obsolete script merely because it appears above.

Required clean-install path:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test`
5. `npm run validate:content`
6. `npm run validate:seo`
7. `npm run build`
8. `npm run preview`
9. `npm run test:e2e` against the preview
10. Wrangler dry-run/size validation

Document exact PowerShell and WSL commands in the README where they differ.

---

# 32. GITHUB AND CI/CD

## 32.1 GitHub Actions quality workflow

Create a Linux CI workflow that:

- Checks out full required history
- Uses the pinned Node version
- Caches npm safely
- Runs `npm ci`
- Runs lint
- Runs typecheck
- Runs unit/integration tests
- Runs content/SEO validators
- Runs Next.js build
- Runs OpenNext build
- Installs Playwright browsers with dependencies
- Runs E2E/accessibility tests where practical
- Uploads test reports and screenshots on failure
- Reports bundle/Worker size
- Does not expose production secrets to untrusted pull requests

Use concurrency cancellation for superseded branch runs.

## 32.2 Lighthouse workflow

Run Lighthouse on a local/preview build for representative pages. Store reports as artifacts. Do not block production solely on noisy one-run performance variance; use a thoughtful threshold and regression policy.

## 32.3 Dependency/security workflow

- Configure Dependabot or equivalent for npm and GitHub Actions.
- Run a dependency vulnerability check.
- Use CodeQL if available and appropriate.
- Do not auto-merge major framework/adapter updates without build and preview tests.

## 32.4 Cloudflare Workers Builds

Connect the correct GitHub repository to the existing or new Worker.

Requirements:

- Worker project name matches `wrangler.jsonc`.
- Build root is correct.
- Build command uses the current OpenNext build path.
- Deploy command follows the chosen production workflow.
- Build variables and secrets are configured in Cloudflare, not committed.
- Main is the production branch.
- Pull requests create build status/check visibility and preview URLs when supported.
- Avoid double deployment from both GitHub Actions and Workers Builds unless intentionally designed.

Preferred division:

- GitHub Actions: quality gates
- Cloudflare Workers Builds: build/version/deploy after repository events

If branch protection can be configured through authenticated tools, require CI before merge. Otherwise document exact dashboard settings.

---

# 33. CLOUDFLARE DEPLOYMENT CONTRACT

## 33.1 Environments

Use at least:

- Local development
- Local Workers-runtime preview
- Remote preview/staging version
- Production

Do not use production-only secrets in local files.

## 33.2 Custom domain

After preview passes:

- Bind `devexcalculator.org` to the production Worker.
- Configure `www.devexcalculator.org` redirect to apex preserving path/query.
- Confirm SSL mode is appropriate.
- Confirm no conflicting Pages project or older Worker route intercepts the domain.
- Do not delete a conflicting resource until its purpose and rollback implications are understood.

## 33.3 Post-deploy verification

Verify from the public internet:

- Apex returns 200
- HTTPS works
- `www` redirects once and preserves path/query
- Homepage calculator works
- Static assets return correct cache headers
- Major routes return 200
- 404 returns 404
- API health works
- FX graceful behavior works
- Contact behavior is honest
- robots.txt works
- sitemap works
- llms.txt works
- canonical host is correct
- no console errors
- no mixed content
- no leaked secrets
- source dates and rates are correct
- Cloudflare observability shows no new critical errors

Record:

- Git commit
- Worker version/deployment ID
- Deployment time
- Preview URL
- Production URL
- Verification results
- Rollback command or dashboard procedure

## 33.4 Production authority

If no working production deployment exists, deploy after all gates pass and authentication is available.

If a working production deployment exists, deploy a preview first. Request one final concise confirmation before replacing production only when the action cannot be safely rolled back or the new implementation materially changes live behavior.

Never delete the safety tag or previous deployable version.

---

# 34. REQUIRED EXECUTION PHASES

Complete these phases in order. Do not stop between phases unless blocked by authentication, a destructive production action, or a genuinely missing required source.

## PHASE 0 — Repository, environment, and safety audit

### Objectives

Establish the real baseline and protect existing work.

### Tasks

1. Inspect repository and Git state.
2. Identify existing framework and deployment configuration.
3. Detect whether a migration is needed.
4. Inspect Node/npm versions and lockfile integrity.
5. Inspect Cloudflare/`wrangler whoami` state without leaking details.
6. Inspect GitHub CLI authentication and remote.
7. Detect Windows/WSL context.
8. Run existing baseline checks.
9. Record all baseline failures.
10. Create state, audit, plan, and rollback documents.
11. Create a feature branch and safety tag when appropriate.
12. Locate all supplied CSVs, screenshots, and prompt/reference files.
13. Hash and inventory source inputs.

### Deliverables

- `docs/repository-audit.md`
- `docs/environment-audit.md`
- `docs/master-implementation-plan.md`
- `docs/agent-state.md`
- `docs/progress-ledger.md`
- `docs/decision-log.md`
- `docs/blockers.md`
- Source inventory with hashes

### Exit gate

- Existing work is preserved.
- Baseline is documented.
- The implementation branch exists or a documented reason explains why direct-main work is safe.
- The agent knows whether it is scaffolding, migrating, or patching.

Do not proceed by guessing the repository state.

---

## PHASE 1 — Current official research and competitor audit

### Objectives

Establish a verified product and factual baseline before writing rates or content.

### Tasks

1. Audit every supplied competitor.
2. Capture representative desktop/mobile screenshots where tools allow.
3. Record calculator fields, modes, content, sources, metadata, schema, and accessibility.
4. Verify current official Roblox rate, minimum, eligibility, transition rules, and Earned Robux descriptions.
5. Verify current Cloudflare/OpenNext/Next.js deployment requirements.
6. Verify current Google guidance relevant to scaled content, canonicalization, sitemaps, and structured data.
7. Verify an FX provider and supported currency scope.
8. Build the source registry.
9. Create a competitor feature matrix and gap map.
10. Separate observations, inferences, and decisions.

### Deliverables

- `docs/competitor-audit.md`
- `docs/competitor-feature-matrix.md`
- `docs/visual-reference-audit.md`
- `src/data/source-registry.json`
- `seo/generated/competitor-gap-map.json`
- Initial rate registry proposal

### Exit gate

- Every public rate/threshold to be implemented has a current official source.
- Competitor copying boundaries are documented.
- Product differentiation is explicit.
- No stale competitor claim is treated as authoritative.

---

## PHASE 2 — CSV intelligence, topical map, and route ownership

### Objectives

Process all supplied keyword evidence before building the final page architecture.

### Tasks

1. Preserve and validate both CSVs.
2. Recompute row/metric checkpoints.
3. Normalize all keywords.
4. Parse amounts and currencies.
5. Build spelling families.
6. Classify intent.
7. Cluster every meaningful term.
8. Mark irrelevant/ambiguous terms explicitly.
9. Score opportunities.
10. Assign one canonical owner per keyword.
11. Define the P0/P1 launch route set.
12. Define a conservative numeric-page allowlist and deferred queue.
13. Build the topical graph and internal-link plan.
14. Run cannibalization checks.
15. Manually review core route ownership.

### Deliverables

- All `seo/generated/*.json` intelligence files
- `docs/seo/dataset-report.md`
- `docs/seo/keyword-strategy.md`
- `docs/seo/topical-map.md`
- `docs/seo/route-ownership.md`
- `docs/seo/cannibalization-report.md`
- `docs/seo/internal-link-strategy.md`
- `docs/seo/content-roadmap.md`
- `docs/seo/indexation-policy.md`

### Exit gate

- Every source row is accounted for.
- Every included keyword has one canonical route.
- No launch route exists solely because of a keyword variant.
- Numeric-page publication is controlled.
- P0/P1 routes are approved by tests and documented reasoning.

Do not write hundreds of pages before this phase passes.

---

## PHASE 3 — Architecture, scaffold, and Cloudflare foundation

### Objectives

Create or migrate to the locked production architecture.

### Tasks

1. Scaffold or migrate Next.js App Router in the existing root.
2. Configure strict TypeScript.
3. Configure Tailwind CSS v4.
4. Install and configure OpenNext/Cloudflare.
5. Configure Wrangler and Workers Static Assets.
6. Configure `initOpenNextCloudflareForDev` or the current equivalent for local bindings when needed.
7. Add immutable static asset headers.
8. Create typed site configuration and feature flags.
9. Create base layout, metadata utilities, error/404 pages, robots, sitemap, manifest, and llms file.
10. Create calculation, source, content, and SEO data schemas.
11. Create initial tests and CI.
12. Confirm clean install/build/Workers preview.
13. Record Worker bundle size baseline.

### Deliverables

- Working Next.js/React project
- Cloudflare/OpenNext/Wrangler files
- Base route shell
- CI workflows
- Architecture documentation
- Environment examples
- Passing scaffold tests and preview

### Exit gate

- `npm ci` succeeds.
- Lint/typecheck/unit tests pass.
- Next build passes.
- OpenNext build passes.
- Workers-runtime preview starts.
- No Vercel adapter or Cloudflare Pages deployment path remains.
- No secrets are committed.

---

## PHASE 4 — Design system and responsive shell

### Objectives

Build the complete original responsive UI foundation before filling every page.

### Tasks

1. Finalize accessible tokens.
2. Implement typography and numeric styles.
3. Implement header, desktop nav, mobile nav, footer, breadcrumbs, content container, cards, buttons, inputs, tables, disclosures, toasts, badges, and source notes.
4. Implement light mode fully.
5. Add dark mode only if every component and chart/table passes contrast/visual QA.
6. Create original logo, favicon, app icons, and OG visual system.
7. Implement responsive behavior at required viewports.
8. Add skip link, focus management, reduced motion, and safe-area handling.
9. Add disabled analytics/ad components with zero production output.
10. Create Storybook only if it adds clear value and does not burden the stack; otherwise use component test pages excluded from production.
11. Capture shell screenshots.

### Deliverables

- Design system components
- `docs/design-system.md`
- `docs/qa/visual-qa.md` initial report
- Responsive screenshots
- Component accessibility tests

### Exit gate

- No horizontal overflow at 320px.
- Header/mobile menu works by keyboard.
- Color contrast passes.
- Focus is visible.
- No competitor assets or copied identity.
- The shell is visually polished at all target viewports.

---

## PHASE 5 — Calculation engine and core calculator

### Objectives

Implement and prove the calculator's correctness.

### Tasks

1. Build validated rate registry.
2. Build pure calculation engine.
3. Build robust amount parser.
4. Build quick mode.
5. Build advanced split mode.
6. Build reverse target mode.
7. Build comparison mode.
8. Build threshold meter.
9. Build presets.
10. Build copy/share/reset.
11. Build URL-state hydration.
12. Build local history/preferences.
13. Add source and limitation display.
14. Add fee/tax optional controls.
15. Add complete unit/component/E2E tests.
16. Verify large-number and rounding behavior.
17. Verify no duplicate calculation logic in components.

### Deliverables

- Core calculator feature modules
- Calculation methodology documentation
- Rate registry and schema
- Unit, component, integration, and E2E tests
- Homepage tool shell with accurate behavior

### Exit gate

- All formula tests pass.
- Boundary and large-value tests pass.
- Rate bucket totals are accurate.
- Reverse calculations round correctly.
- The numerical threshold is not mislabeled as eligibility.
- Result state is accessible.
- Shared URLs reload accurately.
- No financial calculation uses an undocumented rounding path.

---

## PHASE 6 — FX, APIs, security, and optional integrations

### Objectives

Add resilient edge functionality without compromising the core tool.

### Tasks

1. Implement `/api/health`.
2. Implement public normalized `/api/rates` if useful.
3. Implement `/api/fx/latest` with provider abstraction, cache, timeout, and stale fallback.
4. Add security headers.
5. Add request IDs and safe observability.
6. Implement contact route only if a real provider mode is configured.
7. Add Turnstile with mandatory server validation when contact is enabled.
8. Add rate limiting/honeypot/origin checks for state-changing public endpoints.
9. Generate Cloudflare binding types.
10. Test disabled integration behavior.
11. Confirm no secret/client leaks.
12. Test failure modes under Workers preview.

### Deliverables

- API routes
- Security documentation
- FX methodology and provider documentation
- Contact configuration documentation
- API integration tests

### Exit gate

- USD calculator works during total FX failure.
- FX source timestamp is visible.
- Stale rates are labeled.
- Turnstile is validated server-side when enabled.
- Disabled integrations emit no broken UI or scripts.
- Security-header tests pass.

---

## PHASE 7 — Content, page templates, and internal linking

### Objectives

Create complete original P0/P1 pages around working product utility.

### Tasks

1. Finalize content manifest and source relationships.
2. Write homepage content around the live calculator.
3. Build Robux-to-USD page.
4. Build reverse target page.
5. Build rates page.
6. Build requirements page.
7. Build Earned Robux page.
8. Build cash-out guide.
9. Build rate-history page.
10. Build fees/taxes page.
11. Build Robux tax calculator only with verified formula.
12. Build calculator and guide directories.
13. Build conversion hub.
14. Build only approved amount pages.
15. Build methodology, sources, editorial, corrections, changelog, about, privacy, terms, disclaimer, accessibility, and contact pages.
16. Add direct-answer, comparison, source, methodology, and limitation components.
17. Add internal links from the generated graph.
18. Run plagiarism/similarity review against competitor content.
19. Review every time-sensitive claim.
20. Add real author/organization data only if supplied; otherwise use truthful site-level publisher representation.

### Deliverables

- Complete P0/P1 route set
- Content manifest
- Source-linked content
- Internal-link graph implementation
- Content QA report

### Exit gate

- No empty or thin indexable route.
- No copied competitor prose.
- Every time-sensitive factual claim has a source.
- Every indexable page has a parent and contextual links.
- No orphan pages.
- No fake author credentials.
- Tool pages remain task-first.

---

## PHASE 8 — Technical SEO, metadata, schema, and crawl infrastructure

### Objectives

Make the final route set coherent, crawlable, canonical, and validation-safe.

### Tasks

1. Implement route-specific metadata.
2. Implement canonicals.
3. Implement OG/Twitter assets.
4. Implement structured-data graph.
5. Implement breadcrumbs.
6. Finalize robots.
7. Finalize sitemap with accurate lastmod.
8. Finalize llms.txt.
9. Add redirects and host normalization.
10. Exclude drafts/reviews/query states.
11. Run duplicate metadata checks.
12. Run schema validation.
13. Run link checks.
14. Run canonical/redirect/sitemap agreement checks.
15. Verify no FAQ rich-result dependency or unsupported schema.
16. Generate final SEO report.

### Deliverables

- Complete metadata/schema/canonical system
- Sitemap/robots/llms
- Redirect map
- `docs/seo/metadata-schema-policy.md`
- SEO validation report

### Exit gate

- Every indexable page has unique metadata and one H1.
- Every canonical returns 200.
- Sitemap contains only canonical 200 indexable URLs.
- Redirects are single-hop.
- Structured data matches visible content.
- No unsupported rich-result claims.
- No query-state crawl trap.

---

## PHASE 9 — Full QA, performance, accessibility, and visual acceptance

### Objectives

Prove the product works in the actual target runtime and viewports.

### Tasks

1. Clean install.
2. Run all validators.
3. Run unit/integration/component tests.
4. Run Next build.
5. Run OpenNext build and Workers preview.
6. Run E2E against preview.
7. Run axe/accessibility tests.
8. Run link/metadata/schema checks.
9. Run Lighthouse.
10. Measure Worker and route bundle sizes.
11. Capture all required visual snapshots.
12. Manually inspect screenshots.
13. Test no-JavaScript/degraded behavior.
14. Test Windows/WSL instructions.
15. Test rate/FX failure states.
16. Fix every regression caused by the implementation.
17. Document any baseline limitation that cannot safely be fixed.

### Deliverables

- `docs/qa/test-matrix.md`
- `docs/qa/visual-qa.md`
- `docs/accessibility-report.md`
- `docs/performance-report.md`
- `docs/qa/final-acceptance.md`
- Test and Lighthouse artifacts

### Exit gate

- All critical tests pass.
- No console errors on representative routes.
- No horizontal overflow.
- No critical axe violations.
- Calculator values are verified.
- Visual review is complete.
- Worker size is within current platform/account limits.
- Performance regressions are resolved or explicitly accepted with evidence.

---

## PHASE 10 — GitHub, preview, production, and post-deploy verification

### Objectives

Release safely and leave a maintainable deployment workflow.

### Tasks

1. Review diff and secret scan.
2. Commit logical groups.
3. Push feature branch.
4. Confirm CI.
5. Connect/configure Cloudflare Workers Builds if not already connected.
6. Create remote preview/version.
7. Verify preview.
8. Merge to main after quality gates.
9. Deploy production when authorized and safe.
10. Bind/verify custom domain.
11. Verify `www` redirect.
12. Run public post-deploy tests.
13. Record deployment version and rollback.
14. Update README and final report.
15. Leave the working tree clean.

### Deliverables

- GitHub branch/commits
- Passing CI
- Preview URL
- Production deployment
- `docs/cloudflare-deployment.md`
- `docs/final-implementation-report.md`
- Updated `CHANGELOG.md`

### Exit gate

- Apex and major routes work publicly.
- Production calculator matches tested preview.
- Robots, sitemap, canonical, and assets work.
- No leaked secrets.
- Rollback path is documented.
- Final report distinguishes completed, deferred, excluded, and blocked items.

---

# 35. PAGE-SPECIFIC SEO AND CONTENT ACCEPTANCE

## Homepage

Must own core DevEx calculator intent, include the working tool above the fold, display source/verification, distinguish Earned Robux, and link to rates/requirements/Robux-to-USD.

## Robux-to-USD

Must own generic conversion intent, explicitly distinguish DevEx payout and purchase price, and avoid duplicating homepage copy.

## USD-to-Robux

Must explain reverse payout-goal math and not claim a universal consumer purchase rate without sourceable package data.

## Rates

Must contain current, legacy, and conditional rate data only when verified, with effective dates and examples.

## Requirements

Must use current official requirements and never equate numerical threshold with approval.

## Earned Robux

Must clearly explain qualifying/non-qualifying categories and defer final determination to Roblox.

## Numeric pages

Must pass unique utility, similarity, source, and manual publish gates. Otherwise remain noindex/draft or map to the hub.

## Legal/trust

Must reflect actual configured behavior, not generic copied policy text.

---

# 36. FINAL ACCEPTANCE GATE

Do not say the project is complete unless all applicable statements below are true.

## Repository and architecture

- The project is Next.js App Router + React + strict TypeScript.
- It runs through Cloudflare Workers/OpenNext, not Vercel or Pages.
- Wrangler configuration is valid.
- The repository builds from `npm ci`.
- Package versions and lockfile are committed.
- No destructive unreviewed changes were made.

## Product

- Homepage calculator works.
- Standard current-rate calculation is accurate.
- Legacy calculation is accurate.
- Conditional U.S. 18+ calculation is accurate when supported.
- Advanced split mode does not double count.
- Reverse target mode rounds up correctly.
- Minimum state is accurate and not mislabeled as eligibility.
- Fees/tax controls are optional and honest.
- Share URLs reload state.
- Copy/reset/history behavior works.
- FX failure does not break USD calculations.

## Data and sources

- Current rates have official sources and verification dates.
- Both CSVs were completely processed.
- Every source row is accounted for.
- Route ownership has no unresolved core conflicts.
- Source registry validates.
- No stale competitor claim is published as fact.

## Content and SEO

- P0/P1 routes are complete.
- No thin indexable route exists.
- No doorway-page pattern exists.
- No mass low-value amount pages were published.
- Titles, descriptions, H1s, and canonicals are unique.
- Internal links are crawlable.
- No indexable orphan page exists.
- Sitemap contains only canonical 200 indexable URLs.
- lastmod dates are meaningful.
- Structured data matches visible content.
- FAQ content does not rely on deprecated rich-result behavior.
- No copied competitor prose or assets exist.

## UX and accessibility

- Mobile and desktop layouts are manually reviewed.
- No horizontal overflow at 320px.
- Navigation and calculator are keyboard accessible.
- Focus is visible.
- Error and result updates are announced appropriately.
- No critical axe violations remain.
- 200% zoom remains usable.

## Performance and security

- No critical console errors.
- No secrets in client or Git.
- Security headers are tested.
- Contact is protected and honest when enabled.
- Turnstile is server-validated when enabled.
- Worker bundle is within current limits.
- Core Web Vitals budgets are met in the tested environment or deviations are documented and accepted.
- Disabled analytics/ads do not load.

## Delivery

- CI passes.
- Workers preview passes.
- Public production verification passes when deployment is authorized.
- `www` redirects correctly.
- Rollback is documented.
- Final report records exact commit and deployment.

Any failing item must be fixed, deferred with an explicit reason, or marked blocked. Do not hide it.

---

# 37. FINAL REPORT FORMAT

Create `docs/final-implementation-report.md` with:

1. Executive summary
2. Repository baseline
3. Final architecture
4. Route inventory
5. Calculator features
6. Current rate/source registry
7. CSV processing statistics
8. Keyword cluster and route ownership summary
9. Published/deferred/excluded route counts
10. Internal-link architecture
11. Metadata/schema/sitemap status
12. Accessibility results
13. Performance results
14. Security results
15. Test command results
16. Worker bundle size
17. Git commits
18. Preview URL
19. Production URL and deployment ID
20. Custom-domain verification
21. Remaining external configuration
22. Known limitations
23. Rollback procedure
24. Next 30/60/90-day content and maintenance roadmap

In chat, return only a concise summary and point to the report. Do not paste the entire codebase after writing it to the repository.

---

# 38. 30/60/90-DAY GROWTH ROADMAP TO PREPARE

Do not publish every roadmap item immediately. Prepare a measured growth plan.

## First 30 days

- Launch P0/P1 pages
- Submit sitemap
- Verify Search Console and analytics if configured
- Monitor indexing, crawl, errors, and query impressions
- Validate current rates weekly
- Improve snippets based on impressions/CTR
- Collect anonymous usability feedback only if a compliant mechanism exists

## Days 31–60

- Evaluate numeric amount page candidates from real Search Console data
- Publish only high-value approved pages
- Add one or two distinct calculator tools if demand and utility justify them
- Improve local-currency coverage based on supported provider data
- Build linkable methodology/source assets
- Run accessibility and performance regression review

## Days 61–90

- Expand high-performing clusters
- Consolidate cannibalizing or weak pages
- Add carefully sourced country/currency guidance only where maintainable
- Consider an embeddable calculator only if it remains accurate, secure, and non-manipulative
- Evaluate multilingual demand; do not machine-translate the site without native-quality review and a full hreflang/content plan
- Refresh competitor and rate audit

No roadmap item may bypass the publication quality gate.

---

# 39. REQUIRED START BEHAVIOR

Begin now.

Your first chat update must be concise and must contain:

1. Detected repository state: empty, partial, or functional
2. Current branch and whether uncommitted work exists
3. Detected Node/npm/OS environment
4. Whether the two CSV files and screenshots were found
5. The immediate Phase 0 actions

Then immediately use repository and terminal tools. Do not wait for a response unless an actual blocker exists.

The first repository changes must be the state/audit/plan documents, followed by the safest implementation path.

Do not stop at the plan. Continue automatically through the phases, updating the progress ledger and running acceptance gates.

---

# 40. COMPACT RESEARCH APPENDIX FOR INITIAL ORIENTATION

This appendix is a starting map, not a substitute for current verification.

## Competitor opportunity summary

- Minimal competitors prove that a direct two-way calculator can satisfy immediate intent, but they leave large content, source, trust, and accessibility gaps.
- Stronger competitors demonstrate demand for quick amounts, related tools, source dates, local currencies, and educational sections.
- Some public competitors visibly use stale 0.0035 assumptions or outdated thresholds, creating a clear opportunity for current official-source accuracy.
- The best target product combines simple quick mode with an optional advanced split/target/FX experience rather than overwhelming every user.

## Supplied data opportunity summary

The two supplied exports show several large intent families:

- Core DevEx calculator variants
- Broad Robux-to-USD conversion
- Generic Robux calculator/converter intent
- DevEx rate queries
- Reverse USD-to-Robux queries
- Many normalized numeric amount queries
- Smaller but distinct Roblox tax intent

The route strategy must capture these families without creating separate pages for spelling variants or every number.

## Technical checkpoint

- Current Cloudflare guidance supports deploying Next.js to Workers through OpenNext.
- The Workers runtime preview must be tested in addition to `next dev`.
- Current OpenNext guidance favors the Node.js runtime path and requires Worker-specific configuration, static-asset caching, and compatibility validation.
- GitHub can be connected to Workers Builds for automatic deployment and preview/status workflows.
- Native Windows adapter behavior may be less predictable than Linux; WSL/CI is the safe validation path.

## Search-quality checkpoint

- People-first, task-completing content is required.
- Scaled low-value amount pages are prohibited by this specification.
- Canonicals do not excuse duplicate-page architecture.
- Accurate sitemap `lastmod` values reflect meaningful changes.
- FAQ rich results must not be treated as an SEO deliverable.
- `llms.txt` is transparency infrastructure, not a ranking guarantee.

---

# END OF MASTER SINGLE EXECUTION PROMPT
