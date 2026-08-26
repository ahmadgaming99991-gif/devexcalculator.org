# How the languages work

The decisions behind the translation layer, and what each one is protecting
against. Written for whoever changes this next.

---

## English has no prefix

`/devex-rates/`, not `/en/devex-rates/`. A prefixed English would be a second
indexable copy of the site competing with itself, which is the most common way
a multilingual rollout damages the site it was meant to grow. The path helpers
never produce `/en/…` and `getLocaleFromPath` returns English for anything
unprefixed, because an English URL carries no marker.

Two top-level route groups give the two shapes their own root layout:

```
src/app/(en)/…              /devex-rates/
src/app/(intl)/[locale]/…   /de/devex-rates/
```

`dynamicParams = false` with `generateStaticParams` means a locale segment that
is not in the registry is a real 404, not a page rendered in a language that
does not exist.

The BCP 47 tag and the URL segment are not the same string: `pt-BR` is the tag,
`/pt-br` is the prefix. `localeSegment` converts one to the other and
`parseLocaleSegment` matches prefixes longest-first, so `/zh-hans` is not
shadowed by a shorter match and `/pt-BR/` does not become a second URL for a
page that already has one.

---

## One flag decides whether a language is public

`status` in `src/i18n/config.ts`. Routing, the language selector, `hreflang`,
the sitemap and IndexNow all read it. One flag rather than five exclusion
lists, because five lists is four chances to forget one.

`ENABLE_REVIEW_LOCALES` is a separate, weaker thing: it decides whether a
`review` locale *renders at all*, for local review and for the test suite. It
never decides whether a page may be indexed — a review locale carries
`noindex` whatever the flag says, and an end-to-end test asserts it.

---

## No dictionary reaches the browser

This is the constraint that shapes everything else, and it has been broken
once: `client-words.ts` imported `getTranslator` as a *value*, the bundler
followed the edge, and all seven languages of every namespace shipped to every
reader — 667 kB against a 125 kB budget. A German dictionary was being
downloaded by English readers.

The rules that came out of it:

- Every export in `get-dictionary.ts` is `async`, so a Client Component cannot
  reach one without an `await` it cannot perform.
- `interpolate` lives in its own module. Both sides need it; only the server
  may reach a dictionary.
- `client-words.ts` imports `Translate` as a **type**, which the compiler
  erases. `server-words.ts` exists so that `pickWords` and `loadWords` — which
  do touch a dictionary — are somewhere a client module will not import them.
- The bundle validator measures the real thing rather than asserting it: it
  fails the build if locale JSON appears in a client chunk.

A Client Component is handed the strings it renders, by key, as a prop. The
keys stay the dictionary's own dotted keys rather than being renamed on the way
across, so a sentence is greppable from either side.

The list of keys lives in a `.words.ts` beside the component, and
`validate-client-words` compares it against what the component actually asks
for. That check exists because the drift is invisible otherwise: a missing key
throws inside the island, React unmounts it, and the page still returns 200
with correct-looking server markup. The homepage calculator shipped in that
state — in English too.

---

## Namespaces

Split by what a page renders, not by which file the strings came from, so a
rate page loads rates and the shell rather than the legal pages, the platform
charts and the contact form as well. A closed union, because the value reaches
a module import and an open `string` there would be a path-traversal primitive.

Three namespaces are loaded for every page: `common`, `accessibility` and
`data`. All three are read by components that appear almost everywhere, and
leaving them to each page to remember produced a recognisable failure — a
prerender error naming a key the page never mentions.

---

## Registry prose

`src/data/*.json` holds figures and prose in the same objects: a rate's value,
its source id and its verification date sit beside the sentence explaining what
it means. The figures cannot move — the build validates them together — and the
prose has to be translatable.

So English stays in `src/data/` as the record, and
`scripts/i18n/sync-data-dictionary.ts` mirrors the reader-facing strings into
`src/i18n/locales/en/data.json` under keys derived from the ids already there.
`--check` fails when the two drift, which is what stops an edited
`eligibilitySummary` from silently keeping its old six translations.

Deliberately not mirrored: a source's `publisher` and `title` (the name of an
English document — translating it would label a link with a title that does not
exist on the page it opens), period labels like `FY 2024`, and magnitudes
quoted verbatim from a filing.

---

## No English fallback

A missing key throws. It does not return the key and it does not fall back to
English.

Returning the key puts `rates.devexRates.body.changes.p1` in front of a reader.
Falling back puts an English sentence inside a Portuguese paragraph, where no
test would ever see it — the exact "translated navigation around an English
article" failure the whole system exists to prevent. Throwing fails the build,
where somebody is looking.

---

## Interpolation

By name, never by position. Word order differs between languages — a German
sentence puts the verb where an English one puts the object — and a positional
`%s` would silently swap two values.

An unknown token is left visible rather than blanked: a sentence with
`{amount}` still in it is a bug report; a sentence with the amount silently
missing is a wrong figure that reads perfectly.

Three checks stand behind that:

- the dictionary validator compares tokens between English and each translation
- `validate-interpolation` compares the tokens a sentence declares against the
  values its call site passes — a different pair, and the one that was wrong on
  `/platform/`, where all seven languages agreed with each other and none of
  them agreed with the code
- `rich()` fills a token with a React element rather than a string, so a link
  can sit where the sentence needs it rather than where English put it

Plurals are explicit `.one` / `.other` keys chosen by the call site. Turkish and
Indonesian have one form; French counts zero as singular.

---

## Numbers, dates and currency

Formatted from the page's own locale through `Intl`. That includes the
placeholders on numeric inputs: a placeholder is the site telling the reader
whether a comma groups thousands or marks the decimal, and an English literal
there told six languages the wrong one.

Parsing is locale-aware to match. French really does group with U+202F, a
narrow no-break space, which is what `Intl` emits — a plain space in the
registry would make the parser reject numbers the site itself formatted.

Currency names come from `Intl.DisplayNames`, with the English name from
`currencies.json` as the fallback.

---

## What each check is for

| Check | Reads | Catches |
| --- | --- | --- |
| `validate:i18n` | dictionaries | missing keys, orphans, token mismatches, values left in English |
| `validate:data-dictionary` | `src/data/` vs `data.json` | registry prose edited without its translations |
| `validate:client-words` | source | a key an island asks for and is never handed |
| `validate:interpolation` | source vs dictionary | `{token}` a sentence declares and the code does not pass |
| `validate:localized-og` | generated cards | a locale with no social card |
| `validate:localized-html` | served HTML | parity, canonical, hreflang, links leaving the language, schema, `noindex` |
| `validate:leakage` | served HTML | English words in a page that is not in English |
| `test:e2e` | a browser | the calculator working in each language |

The first five run offline in `npm run check`. The last three need a server
built with `ENABLE_REVIEW_LOCALES=true`; `docs/i18n/publishing-a-locale.md` has
the commands.

They are layered on purpose. Every one of the last three found something the
ones above it could not see, because reading source proves what the code says
and only running it proves what the reader gets.
