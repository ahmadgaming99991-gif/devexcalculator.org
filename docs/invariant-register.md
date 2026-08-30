# Invariant register

Every comment in this codebase that asserts an invariant, and what actually
enforces it.

This exists because a comment in `visibility.ts` said "every surface asks the
same two questions, so there is no sixth place somebody forgets" while three of
the eight surfaces it listed were not asking. Nothing failed. The sentence was
the reason nobody checked.

**A claim in prose is not a mechanism.** The point of this file is that a reader
can tell, without re-deriving it, which kind of claim they are looking at:

| Label | Meaning |
| --- | --- |
| **GUARDED** | Something fails — a test, a validator, the compiler — if this stops being true. The mechanism is named. |
| **STRUCTURAL** | True by construction: there is no second copy that could drift, because the value is derived. No separate check, and none needed. |
| **UNGUARDED** | True today, and nothing would notice if it stopped being true. Not a defect; a known gap, recorded so it is a decision rather than an assumption. |
| **CORRECTED** | The claim was false. The comment has been changed to say what is true. |

A sweep produced 66 comments of this shape. Most are GUARDED or STRUCTURAL and
are not all listed — the ones below are those where somebody could reasonably
have believed a mechanism existed. **Add a row here when you write a comment
that asserts an invariant.** If the honest label is UNGUARDED, that is an
acceptable answer and a useful one; writing GUARDED without naming the
mechanism is the failure this file exists to prevent.

---

## The five that were false

Four found in the sweep, and the one that started it.

### `src/i18n/visibility.ts` — "there is no sixth place somebody forgets"

**Was:** eight surfaces listed as asking the two visibility questions.
**Reality:** `sitemap.ts`, `indexnow.ts` and `llms.ts` each imported
`indexableRoutes` and emitted the bare English path. A published language would
have rendered, been indexable, carried a correct canonical and hreflang cluster,
and appeared in none of the three files that tell a crawler it exists.

**Now GUARDED**, twice and at two levels:

- `tests/unit/seo/publication-surfaces.test.ts` — what the three *emit*, both
  while English is the only published locale and when a second one is published.
- `tests/unit/i18n/visibility-surfaces.test.ts` — the *wiring*, one file at a
  time. This would have caught the gap on the day `sitemap.ts` was written.

Also **CORRECTED**: the list is six, not eight. Navigation and internal links do
not choose a locale set — they are handed the locale of the page being rendered,
and that page exists only because route generation asked. Listing them implied a
check they cannot have.

### `src/i18n/get-dictionary.ts` — "the bundle validator already fails the build if locale JSON appears in a client chunk"

**Was:** the stated reason for declining the `server-only` dependency, phrased
as "a check that measures the real thing rather than asserting it".
**Reality:** the bundle validator measured sizes and searched for analytics
beacons. Nothing anywhere looked for a dictionary.

This is the sharpest instance in the sweep, and worth reading twice: the comment
did not merely assert an invariant, it *performed rigor* — it named the
empirical/assertive distinction and placed itself on the right side of it — and
used that performance to justify a decision. **A comment that congratulates
itself on being empirical deserves more scrutiny than a plain one, not less.**

**Now GUARDED**, twice, on purpose (see D-045 in `docs/decision-log.md`):

- `import "server-only"` fails `next build` at the moment a client module
  imports the loader, naming the chain. Falsified: planting a value import in
  `controls.tsx` gives exit 1 and two errors naming the module.
- `scripts/quality/check-bundle-budget.ts` searches every emitted chunk for a
  long ASCII run taken from a non-English catalog at run time. Falsified:
  a planted chunk containing a pt-BR sentence gives exit 1 naming the locale
  and the file.

### `src/i18n/data-text.ts` — "the only place that knows how a registry row maps to its key"

**Was:** true of the helpers; false of the codebase.
**Reality:** `src/i18n/data-words.ts` built the same six templates
independently — in the one file whose job is listing keys that cannot be found
by scanning the source. Both were correct, so nothing failed, until a rename
moved one.

**Now GUARDED:** the templates live in `dataKeys` and both callers read them.
`tests/unit/i18n/data-keys.test.ts` fails on any third place interpolating an id
into a `data.` key, and asserts the word lists and the read helpers name the
same keys. Comments are masked before that search — a file should be able to
explain itself by quoting a template it no longer writes.

### `src/lib/seo/graphs.ts` — "the validator checks the rendered pages against this graph"

**Reality:** no validator does. `check-links.ts` crawls the rendered pages and
reports broken links, redirects and nofollow; it never compares an href to this
graph.

**CORRECTED**, not invented. The derivation is the real guarantee and it holds —
`ContextualLinks` and the JSON-LD both render from `record.internalLinks`, the
same array the graph reads, so there is no second list to drift. The removed
sentence described a check worth having as though it were there, which is worse
than not having it.

*Open, if anyone wants it:* the crawler already fetches every page and extracts
every href. Comparing those against the graph would be a genuine gate. Not
built, and not claimed.

---

## True and unguarded

Accurate today. Nothing would fail if they stopped being true. Listed so the
next reader knows which kind of claim they are reading.

### `src/components/layout/site-document.tsx` — "this is the only place the shell exists"

**UNGUARDED.** There is exactly one `<html>` element in `src/` today, and the
two root layouts both delegate to it. Nothing stops a third being added.

*Cost if it breaks:* the drift the comment describes — a skip link fixed in one
document, a script added to the other, and the two languages become different
sites. Slow and quiet rather than sudden.

*What a guard would look like:* a test counting `<html` occurrences under
`src/`. Cheap. Not built, because the failure is gradual and visible in review,
and a count is a check somebody will fight when a legitimate second document
appears.

### `src/i18n/get-dictionary.ts` — "a barrel file re-exporting every locale would defeat this silently, which is why there isn't one"

**UNGUARDED.** There is no such barrel file. Nothing prevents one.

*Cost if it breaks:* rendering one page would load seven languages of every
namespace it touches. The per-namespace dynamic imports are the whole reason a
reader on the rate page downloads the rates namespace in one language.

*Partial cover:* `server-only` now stops the loader reaching client code, and
the bundle check would catch translated text in a chunk — but a server-side
barrel file hurts the Worker rather than the browser, and neither guard sees it.

### `src/lib/calculations/format.ts` — "the only place precision is intentionally dropped"

**UNGUARDED, and slightly loose.** The rounding *policy* holds: arithmetic stays
exact, a value is rounded once, money rounds half-up to the currency's minor
units, Robux requirements round up. But `src/app/opengraph-image.tsx` calls
`Rational.toFixed(2)` directly rather than going through `formatMoney`.

*Not a defect:* the value is a `Rational`, so the rounding is exact and the
output is correct. It is a second formatting path — hardcoded `$`, two digits,
no locale grouping — which is fine for an English social card and would be
wrong if it spread.

*What a guard would look like:* the same source scan `data-keys.test.ts` uses,
for `Rational.toFixed` outside `format.ts` and `rational.ts`. Not built.

---

## Related

- `docs/qa/falsification.md` — how a claimed mechanism is proved to be one.
- `docs/decision-log.md` D-045 — why `server-only` was taken after the check it
  was declined in favour of turned out not to exist.
