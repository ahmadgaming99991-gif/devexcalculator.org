# Publishing a locale

Everything a language needs before it may be served to the public, and the
order to do it in.

Six languages — Brazilian Portuguese, Spanish, Indonesian, French, German and
Turkish — are complete and sit at `status: "review"`. They render only when
`ENABLE_REVIEW_LOCALES=true` and are invisible in production: the URLs 404, the
sitemap lists 36 English pages, there is no `hreflang`, and no language name
appears in the HTML. That is deliberate and it is where they stay until a
person who reads the language has read it.

---

## The two fields, and why they are separate

```ts
status:        "planned" | "draft" | "review" | "published" | "retired"
qualityReview: "source" | "none" | "machine-drafted" | "self-reviewed" | "native-reviewed"
```

`status` decides whether the locale is public. `qualityReview` records who has
actually read the translation. They are not the same question and conflating
them is how a machine-drafted language ends up described as reviewed.

A locale may be `published` while its `qualityReview` is `machine-drafted` —
that is a choice someone can make with their eyes open. What is forbidden is
claiming `native-reviewed` when no native speaker read it. This site publishes
figures about people's income; a fabricated review claim is the same class of
lie as a fabricated verification date, and `assertRegistry` fails the build
when the claim is made without a `reviewerName` and a `reviewedAt`.

---

## What a reviewer receives

Run the dictionary validator; it writes one report per language:

```
npm run validate:i18n
→ dist/reports/i18n/coverage-<locale>.json
```

The report is deterministic — no timestamp — so a diff between two runs means
the content changed, not that the clock moved. Each holds roughly 30,000
words across 36 routes, and lists per namespace: key counts, word counts, and
anything the validator could not confirm.

Reviewing means reading the rendered pages, not the JSON. Build and serve them:

```
ENABLE_REVIEW_LOCALES=true npm run build
ENABLE_REVIEW_LOCALES=true npx next start --port 3210
```

Then read `http://127.0.0.1:3210/<prefix>/` — `/de/`, `/pt-br/`, and so on.

### What to look for, in order of how much damage it does

1. **A figure that changed meaning.** A rate, a minimum, an eligibility
   condition. These are the sentences people act on. If a translated sentence
   says something the English one does not, that is the finding that matters
   most and everything else can wait.
2. **A term that should not have been translated.** Roblox, Robux, DevEx,
   Earned Robux, Developer Exchange, Creator Hub. Product names, not words.
3. **A term that should have been.** Anything on the `$identical` list of the
   namespace you are reading: those are keys where the translation legitimately
   matches the English, each one listed deliberately so it sits next to the
   value it excuses. If one is wrong, say so.
4. **Register.** This site talks to creators about their income. It is plain
   and direct in English and should be plain and direct in your language, not
   more formal because translation drifts formal.
5. **Numbers and dates.** They are formatted by `Intl` from the page's locale,
   so they should already look native. If one does not, it is a bug in the
   code, not in the translation — report it as such.

---

## Recording a review

Only when a named person has actually done it. In `src/i18n/config.ts`:

```ts
{
  locale: "de",
  status: "published",
  qualityReview: "native-reviewed",
  reviewerName: "<the person's name>",
  reviewedAt: "2026-09-01",
  …
}
```

All four move together. `assertRegistry` rejects:

- `native-reviewed` with no `reviewerName` or no valid `reviewedAt`
- a `reviewerName` or `reviewedAt` without the matching claim
- `published` with a `qualityReview` that is not a real review

There is no flag that skips this and there should not be one.

---

## The gate a locale passes before it goes public

Offline — everything `npm run check` already runs, plus:

| Command | What it proves |
| --- | --- |
| `npm run validate:i18n` | Every key present, tokens match, nothing left in English by accident |
| `npm run validate:data-dictionary` | The registry prose in `src/data/` and its mirror in `data.json` have not drifted |
| `npm run validate:client-words` | Every key a Client Component asks for is one it is handed |
| `npm run validate:interpolation` | Every `{token}` a sentence declares is a value its call site passes |
| `npm run validate:localized-og` | A social card exists for the locale |

Against a running server built with `ENABLE_REVIEW_LOCALES=true`:

```
ENABLE_REVIEW_LOCALES=true npm run validate:localized-html -- http://127.0.0.1:3210
ENABLE_REVIEW_LOCALES=true npm run validate:leakage        -- http://127.0.0.1:3210
ENABLE_REVIEW_LOCALES=true BASE_URL=http://127.0.0.1:3210 npm run test:e2e
```

The flag is needed by the checking process as well as by the server. Without
it these read the registry as English-only and report "0 locales" — a pass that
proves nothing, which is the worst kind.

| Command | What it proves |
| --- | --- |
| `validate:localized-html` | Route parity, `<html lang>`, canonical, hreflang, internal links stay in the language, schema `@id`s and `inLanguage`, and `noindex` while under review |
| `validate:leakage` | English words left in the rendered HTML, listed as fragments so each is something to go and fix |
| `test:e2e` | The calculator works in that language: the amount types the way the locale writes it, the payout formats the way the locale formats it, no console error, links stay in the language |

`validate:leakage` is a budget, not a target of nought. A translated page
legitimately contains Roblox experience names — real titles, in English,
belonging to somebody else — and the names of the English documents this site
cites. Current figures are 22–31 words per locale across 36 routes, against 60
budgeted. What matters is the fragment list, not the number.

---

## The publish runbook

Changing `status` to `published` is one field, and eight things move. Six of
them decide which locales to emit and each asks `visibility.ts` to do it; two
inherit the locale of the page being rendered. Three of the six did not exist a
week before this was written, so nothing about "it worked last time" applies.
Which of those surfaces is guarded, and by what, is in
`docs/invariant-register.md`.

| # | Surface | Asks or inherits | What changes when a locale publishes |
| --- | --- | --- | --- |
| 1 | Route generation | asks (`renderableLocales`) | The locale's 36 routes are prerendered in a production build. Until then they exist only behind `ENABLE_REVIEW_LOCALES=true`; in production the URLs are a 404 from the router, before the layout runs |
| 2 | Language selector | asks (`publicLocales`) | The language appears in the header control on every page |
| 3 | hreflang | asks (`publicLocales`) | Every page in every published language gains a reciprocal link to it |
| 4 | Sitemap | asks (`publicLocales`) | 36 more `<loc>` entries |
| 5 | IndexNow | asks (`publicLocales`) | 36 more URLs become submittable |
| 6 | `llms.txt` | asks (`publicLocales`) | A `## Languages` section naming it |
| 7 | Navigation | inherits | Header links resolve to that language's prefixed paths |
| 8 | Internal links | inherits | Contextual links and JSON-LD stay inside the language |

Indexability is the strictest of the three: a page is `index, follow` only when
the route is `indexation: "index"`, the route's `status` is `published`, **and**
`isPubliclyVisible(locale)`. A locale at `review` is `noindex` whatever else is
true, and in production it does not render at all.

---

### Before you start

- [ ] The gate above has passed for every locale being published.
- [ ] A named person has read the language, and `reviewerName` / `reviewedAt`
      are real. `assertRegistry` fails the build otherwise, and that check is
      not the point — the point is that the claim is true.
- [ ] `docs/i18n/critical-claims.md` §1 has no unresolved item for that locale.
      The four Turkish morphological negations were accepted by the maintainer
      on 2026-08-31 and are recorded as a non-native reading, not as confirmed.
- [ ] The working tree is committed. Every step below is reversible; step 5 is
      reversible in a way that depends on how fast you notice.

---

### Step 1 — Flip the field

`src/i18n/config.ts`, for each locale being published, all four together:

```ts
{
  locale: "de",
  status: "published",
  qualityReview: "native-reviewed",
  reviewerName: "<the person who read it>",
  reviewedAt: "2026-09-01",
  …
}
```

Nothing else changes. There is no second list.

**Verify — offline, before any build:**

```
npm run test
```

Expected: everything passes, **including** `tests/unit/seo/publication-surfaces.test.ts`.
That file asserts one thing that will now be false — "has exactly one published
locale to reason about", and the three "only English" assertions beside it.
**Those failures are correct and expected.** They exist so that publishing a
language cannot happen without somebody looking at what publishing changes.
Update them in the same commit as the flip: the "while English is the only
published language" block becomes the set you are actually publishing.

If any *other* test fails, stop. That is not this change.

---

### Step 2 — Build and read the counts

```
npm run build
```

Expected, with `n` published locales including English:

| Signal | Value | Where |
| --- | --- | --- |
| Prerendered pages | 36 × `n` | build output. **Publishing is what makes a locale render in production.** `generateStaticParams` returns `renderableLocales()`, which without `ENABLE_REVIEW_LOCALES` is the published set alone — so a production build today emits 36, and one with five more locales published emits 216. 252 appears only with all seven published, or in a review build with the flag. |
| Sitemap `<loc>` count | 36 × `n` | see below |
| hreflang links per page | `n` + `x-default` | see below |

```
npm run cf-build && npm run cf-populate
npx next start --port 3210     # or: npm run preview
curl -s http://127.0.0.1:3210/sitemap.xml | grep -c "<loc>"
```

- English only: **36**
- English + five: **216**
- All seven: **252**

If the number is 36 after a publish, surface 4 is not asking — which is the
exact defect `publication-surfaces.test.ts` exists to catch, so check that the
test was updated rather than deleted.

```
curl -s http://127.0.0.1:3210/de/devex-rates/ | grep -o 'hreflang="[^"]*"' | sort
```

Expected: one line per published locale plus `x-default`, and the same set on
every language's copy of the page — a cluster that is not reciprocal is worse
than no cluster.

```
curl -s http://127.0.0.1:3210/llms.txt | grep -A 8 "## Languages"
```

Expected: the section exists and names each published language and its prefix.
Absent while English is the only one, which is deliberate — there is nothing
true to say.

---

### Step 3 — The rendered checks, against the local server

```
ENABLE_REVIEW_LOCALES=true npm run validate:localized-html -- http://127.0.0.1:3210
ENABLE_REVIEW_LOCALES=true npm run validate:leakage        -- http://127.0.0.1:3210
ENABLE_REVIEW_LOCALES=true npm run validate:rendered-tokens -- http://127.0.0.1:3210
ENABLE_REVIEW_LOCALES=true BASE_URL=http://127.0.0.1:3210 npm run test:e2e
```

The flag is for the *checking process* as much as the server: without it these
read the registry as English-only and report "0 locales", a pass that proves
nothing.

| Check | Expected |
| --- | --- |
| `validate:localized-html` | Route parity, `<html lang>`, canonical, hreflang, internal links stay in the language — and **`index, follow` rather than `noindex`** on the locales you just published. That flip is the single most important line of this output. |
| `validate:leakage` | 0 against a budget of 0. The budget was lowered from 60 once `<span lang="en">` marked the legitimately-English fragments. |
| `validate:rendered-tokens` | 0 unfilled `{tokens}` across every page the server renders — 252 with the flag set, which is why it is set here even for locales you are not publishing. This catches a brace a reader can see, which has happened twice. |
| `test:e2e` | The calculator works in the language: the amount types the way the locale writes it, the payout formats the way it formats it, no console error. |

---

### Step 4 — The full gate

```
npm run check
```

Expected: clean, end to end. `i18n:audit` reports PASS for every locale — and
note that a `published` locale escalates every `review` finding to `blocking`,
so a locale that passed yesterday at `review` can fail today at `published`.
**That is the escalation working, not a regression.** Read the findings; do not
route around them.

---

### Step 5 — Deploy

```
npm run deploy
```

That is `opennextjs-cloudflare build && … deploy && npm run purge:cache`. The
purge is targeted at the rate-sensitive routes; a missing Cloudflare token
skips it with a note and exit 0, because purging makes a correction visible
sooner than the cache header already guarantees — it is not what makes the site
correct.

**Verify against the live host, not the local one:**

```
npm run verify:deployment
```

Runs `validate:routes`, `validate:links` and `validate:duplicates` against
`https://devexcalculator.org`. Every defect it exists for was found this way and
none of them locally — a Worker CPU limit, a redirect emitting a literal
`:path*`, an analytics beacon injected after the Worker replied.

Then, by hand, on the live site:

```
curl -s https://devexcalculator.org/sitemap.xml | grep -c "<loc>"
curl -sI https://devexcalculator.org/de/ | head -1
curl -s https://devexcalculator.org/de/devex-rates/ | grep -o '<meta name="robots"[^>]*>'
```

Expected: the count from step 2; `HTTP/2 200`; and `index, follow`. A `noindex`
here after a publish means the deploy did not carry the config change.

---

### Step 6 — Tell the crawlers, and confirm they came

```
INDEXNOW_KEY=<key> npm run seo:indexnow -- --all
```

`--all` has to be said out loud; the default submits only what this release
touched. Expected: 36 × `n` URLs accepted. The key is never committed — a key in
a public repository lets anyone submit URLs on the site's behalf.

**Confirming indexation actually begins** is not the same as confirming
submission succeeded, and the second is the only one that happens the same day.

| When | What to check | What good looks like |
| --- | --- | --- |
| Immediately | IndexNow response | `200` or `202` from the endpoint |
| Immediately | `https://devexcalculator.org/sitemap.xml` fetched by hand | new URLs present, `<lastmod>` moved |
| Within hours | Search Console → Sitemaps | the sitemap re-read, discovered-URL count risen by 36 per locale |
| 1–3 days | Search Console → URL Inspection on one URL per new locale, e.g. `/de/devex-rates/` | "URL is on Google", or "Discovered – currently not indexed" which is normal early |
| 3–14 days | Search Console → Pages, filtered by the locale prefix | indexed count climbing; **not** a rise in "Alternate page with proper canonical tag", which would mean the hreflang cluster is pointing the wrong way |
| 7–30 days | Search Console → International Targeting, or the Performance report split by country | impressions appearing for the language |

Search Console exports are private: `/private/` is git-ignored and neither the
export nor any generated report is ever committed.

**The one signal that means stop:** new URLs appearing under "Duplicate,
Google chose different canonical". That is a canonical or hreflang defect and it
gets worse with time, not better.

---

### Publishing five and holding one

This is the expected shape of the first publish: `pt-BR`, `es`, `id`, `fr` and
`de` go out; `tr` waits for a Turkish reader to confirm four sentences whose
negation is carried by a verb suffix.

Nothing special is required. `status` is per locale, and the six asking surfaces
each filter on it independently.

| | published five + English | `tr` |
| --- | --- | --- |
| Renders in production | yes | **no** — 404, because `review` is not renderable without the flag |
| In the language selector | yes | no |
| In the hreflang cluster | yes, six links + `x-default` | **not present in any cluster** |
| In the sitemap | 216 `<loc>` | absent |
| Submitted to IndexNow | yes | absent |
| Named in `llms.txt` | yes | absent |
| Audit severity | `review` findings escalate to `blocking` | stays `review`, so its four open findings do not gate the other five |

Two things to check specifically in this case:

```
curl -s https://devexcalculator.org/de/devex-rates/ | grep -o 'hreflang="[^"]*"' | sort
```

Expected: `de`, `en`, `es`, `fr`, `id`, `pt-BR`, `x-default` — **seven lines,
no `tr`.** A `tr` entry here would be an hreflang pointing at a 404, which is a
worse error than omitting the language.

```
curl -sI https://devexcalculator.org/tr/devex-rates/ | head -1
```

Expected: `HTTP/2 404`. Turkish is not half-published; it is not published.

When the Turkish reader comes back, `tr` is its own pass through this runbook
from step 1. The sitemap goes 216 → 252 and every existing page's cluster gains
an eighth link, so steps 2, 5 and 6 are re-run for all of them, not only for
Turkish.

---

### Rolling back a locale

**Which rollback you need depends entirely on whether a crawler has fetched the
URLs yet.** Establish that first, from the live logs or Search Console, before
touching anything.

#### A. Nothing has been indexed yet — supported, minutes

Revert `status` to `review` (keep `reviewerName`/`reviewedAt` if the review
genuinely happened; the reason for withdrawing is usually not the review).

```
npm run test          # publication-surfaces assertions flip back
npm run check
npm run deploy
npm run verify:deployment
```

Expected afterwards: the locale's URLs return 404, the sitemap loses its 36
entries, the cluster loses a link on every page, the selector loses the
language. `curl -sI https://devexcalculator.org/de/` → `HTTP/2 404`.

This is clean precisely because nothing external knew the URLs existed.

#### B. The URLs are already indexed — **not supported today**

Flipping back to `review` turns every indexed URL into a 404 at once, and 36
simultaneous 404s on URLs a crawler was told about through a sitemap and
IndexNow is close to the worst signal this site could send.

The correct withdrawal is: keep the pages rendering, serve `noindex`, remove
them from the sitemap, hreflang and IndexNow, wait for them to drop out of the
index, and only then stop rendering them. **That state does not exist.**
`isRenderable` and `isPubliclyVisible` read the same field, so "renders but is
not advertised" is expressible in a review build (`ENABLE_REVIEW_LOCALES=true`)
and not in production. `retired` does not help: it is in `NON_PUBLIC_STATUSES`,
so it 404s exactly like `review`.

What is missing is small and specific — a status that `isRenderable` accepts and
`isPubliclyVisible` rejects:

```ts
// src/i18n/types.ts
export type LocaleStatus =
  | "planned" | "draft" | "review" | "published" | "withdrawn" | "retired";

// src/i18n/visibility.ts
export function isRenderable(locale: Locale): boolean {
  const { status } = getLocaleMeta(locale);
  if (status === "published" || status === "withdrawn") return true;
  return status === "review" && reviewLocalesEnabled();
}
```

`isPubliclyVisible` stays `status === "published"`, so a `withdrawn` locale
renders, is `noindex` through the existing indexability rule, and leaves the
sitemap, the cluster, IndexNow, the selector and `llms.txt` on the same deploy.
`visibility-surfaces.test.ts` and `publication-surfaces.test.ts` both need a
case for it, and `assertRegistry` needs to accept the status.

**Recommendation: build this before the first publish, not after.** It is the
one part of publishing that cannot be done in a hurry after something has gone
wrong, and the window in which rollback A is sufficient is measured in hours.

Until it exists, the honest fallback if something is badly wrong post-indexation
is to leave the pages up and fix them forward — a wrong sentence corrected in
the next deploy costs less than 36 URLs disappearing.

---
## When English changes afterwards

English is the source and it moves. A rate changes, a paragraph is corrected, a
page is rewritten — and a translation that still reads fluently while
describing a page that no longer exists is the failure nobody notices.

`SOURCE_CONTENT_VERSION` in `src/i18n/config.ts` is the stamp. Bump it by hand
when English prose changes materially; each locale carries the version it was
drafted from, and the coverage report lists what has moved since.

For registry prose specifically — a rate's summary, what a citation supports, a
metric's label — the English lives in `src/data/` and is mirrored into the
`data` namespace:

```
npm run i18n:sync-data          # after editing src/data/*.json
npm run validate:data-dictionary  # fails when the two have drifted
```

Then translate whatever changed, in all six languages, before the next deploy.
A changed `eligibilitySummary` that keeps its old translations is a page
telling six audiences something that is no longer true.
