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

## Turning it on

Changing `status` to `published` is the whole switch. One field controls
routing, the language selector, `hreflang`, the sitemap and IndexNow
eligibility — one flag rather than five exclusion lists, so a half-finished
language cannot leak out through the one list somebody forgot.

Once a locale is published, `ENABLE_REVIEW_LOCALES` no longer applies to it. It
renders in production, appears in the selector, joins the hreflang cluster and
enters the sitemap on the next deploy.

Deploy, then submit the new URLs:

```
npm run deploy
npm run seo:indexnow
```

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
