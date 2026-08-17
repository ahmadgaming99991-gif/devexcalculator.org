# Repository audit

Performed 2026-08-17, before any file was written.

## Baseline

**Repository state: empty.**

```
c:\Users\ic\Desktop\Websites\devexcalculator.org
├── DEVEXCALCULATOR_ORG_MASTER_SINGLE_PROMPT.md   122,900 bytes
├── rbxtax.com-devex.html-organic-keywords-path_2026-08-17_14-15-54.csv    4,898 bytes
└── romonitorstats.com-devex-calculator-organic_2026-08-17_14-15-10.csv   21,801 bytes
```

`git status` returned *"fatal: not a git repository"*. No `.git`, no
`package.json`, no lockfile, no source, no configuration, no tests, no CI.

**Conclusion: scaffolding, not migrating or patching.** Nothing existed to
preserve beyond the three supplied files, all of which are retained — the CSVs
copied byte-identically into `seo/source/` and the specification left in place.

No baseline checks could be run because there was no runnable project. No
baseline failures exist to distinguish from regressions.

## Supplied inputs

| File | Bytes | SHA-256 |
|---|---:|---|
| `rbxtax.com-devex.html-organic-keywords-path_2026-08-17_14-15-54.csv` | 4,898 | `510A080DD7845E2B367317DE20CB26BC23921D26622A1DC27DA37A07ADB9A90B` |
| `romonitorstats.com-devex-calculator-organic_2026-08-17_14-15-10.csv` | 21,801 | `1A794DA07900A1F8EAA7EEAD84F3DA82D4DDE298D8F6D39200F553EFBAF16750` |
| `DEVEXCALCULATOR_ORG_MASTER_SINGLE_PROMPT.md` | 122,900 | — |

Hashes recorded before copying and verified after, so the preserved copies are
provably identical to the originals. `.gitattributes` marks
`seo/source/*.csv` as `-text` so line-ending normalisation can never invalidate
them.

**Screenshots**: the specification references a technology-stack screenshot and
a VS Code screenshot. Neither is present in the workspace. Their absence is not
blocking — the stack is locked by the specification text and the environment was
detected directly rather than inferred from an image.

## Git

Initialised on `main` with `user.name = "DevExCalculator Build"` and
`user.email = ahmadraza99991@gmail.com`.

No feature branch was created. The specification requires one when existing
production code is at risk; there was none, so committing directly to `main`
carried nothing to lose. Six reviewable commits, each a coherent unit:

```
f8fdbe9  Add E2E and schema tests; fix a site-wide CSS bug and three real defects
efe6188  Add validation tooling; move headers to next.config and fix Workers routing
92ee6b8  Add all content pages, trust and legal set, and marketplace calculator
e95762b  Add design system, layout, calculator island, APIs and homepage
d5cf335  Add keyword intelligence pipeline and content manifest
fb5f002  Scaffold Next.js 16 + Cloudflare Workers project and exact-arithmetic engine
```

No safety tag was created, for the same reason: nothing existed to roll back to.

**No remote is configured.** The specification forbids inventing a GitHub owner,
so none was assumed. See blocker B-002.

## Scaffolding approach

`create-next-app` was not used. The directory already contained files it would
have refused or moved, and the project needed exact pinned versions, a specific
`src/` layout and a particular test configuration from the first commit rather
than a generated default to be edited afterwards.

`package.json` was written directly with exact versions, then `npm install`
produced the lockfile. Everything else was authored to fit the target
architecture.

Four version corrections were needed because npm's `latest` did not match what
actually resolves:

| Package | Assumed | Actual |
|---|---|---|
| `eslint` | 9.42.0 | 9.39.5 — 9.42.0 does not exist |
| `@eslint/eslintrc` | 3.3.1 | 3.3.6 |
| `@types/node` | 24.9.2 | 24.13.3 |
| `@types/react` | 19.2.7 | 19.2.18 |

Each was verified against the registry rather than guessed at a second time.

## Structure conformance

The specification's target structure was followed, with three deliberate
departures, each recorded in the decision log:

| Departure | Reason |
|---|---|
| No `src/app/guides/[slug]/` | The six pillars already cover those topics; duplicating them under a second prefix is cannibalisation (D-007) |
| No `src/middleware.ts` | Unsupported by the Cloudflare adapter; moved to `next.config.ts` (D-003) |
| `src/lib/seo/` holds pipeline logic, `scripts/seo/` orchestrates | Keeps the logic unit-testable and out of any browser bundle |

`src/content/` was not created as a separate directory. Structured content lives
in the typed manifest at `src/lib/content/route-registry.ts`, which is validated
at build time — the requirement was a validated content model, and a second
loosely-typed directory alongside it would have been a second source of truth.

## Final shape

| | Count |
|---|---:|
| Routes | 32, all indexable |
| API handlers | 4 |
| Unit and integration tests | 363 |
| E2E tests | 248 across three browsers |
| Validator scripts | 5 |
| Generated SEO artefacts | 11 |
| JSON Schemas | 3 |
| Documentation files | 25 |
| Runtime dependencies | 3 |
