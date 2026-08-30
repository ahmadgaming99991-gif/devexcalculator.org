# Falsification

How a check is proved to be a check.

A gate that has never failed is not known to be a gate. This repository has
produced five instances of correct-looking code that did nothing —
`parseRobuxAmount` never called, the hreflang builder never executed,
`detect-hardcoded` running against an empty input, three publication surfaces
never asking the visibility question, and a bundle check that did not exist at
all but was cited in a comment as the reason for declining a dependency. Every
one of them passed. Four of them passed for months.

So: **plant the defect the check claims to catch, watch it go red, and revert.**
A check is not accepted until that has been done and the output recorded.

---

## The procedure

### 1. Make the working tree recoverable *before* you plant anything

This is the step that is easy to skip and expensive to skip.

```
git status --short          # know exactly what is uncommitted
git add -A && git commit    # or: git stash push -u
```

Falsification deliberately creates state whose whole purpose is to be thrown
away, and that is exactly when a wide `git checkout` is most tempting. Uncommitted
work that is not the planted defect is the thing it destroys.

> This has happened here. An hour of uncommitted documentation was wiped by a
> `git checkout docs/i18n/critical-claims.md` used to revert a one-word planted
> edit in that same file. It was recovered from a scratch copy, by luck.

### 2. Record the clean result first

Run the check and record that it passes, with its exit code. A check that was
already failing tells you nothing when it fails again.

```
npm run <check>; echo "exit=$?"
```

Beware pipes: `npm run x | tail -5` reports the exit code of `tail`. If the exit
code matters, capture it before piping, or write to a file and read it back.

### 3. Plant the smallest defect the check exists to catch

One character where possible. `2. Quartal` → `3. Quartal`. `segundo` →
`tercer`. Not a defect the check obviously catches — the defect a reader would
actually be harmed by.

Plant it with a **targeted edit**: `sed -i '148s/…/…/'` on one line, a `python`
replace with an asserted anchor, or the Edit tool. Never a rewrite of the file.

### 4. Confirm it goes red, and read what it says

The exit code and the message both matter. A check that fails with the wrong
explanation sends the next person to the wrong place.

### 5. Revert by the narrowest means available

In order of preference:

1. **Invert the planted edit.** You know exactly what you changed; change it
   back. No blast radius at all.
2. **Restore from a scratch copy you made yourself**, before planting, outside
   the repository.
3. **`git checkout -- <exact file>`** — only when that file is committed and
   clean apart from the plant, which you established in step 1.

Never `git checkout .`, `git checkout <directory>`, or `git restore` without a
path. Never `git reset --hard`.

For a planted **file** rather than a planted edit — a fake chunk, a fake
export — delete it by its exact path and confirm it is gone:

```
rm -f .next/static/chunks/zz-planted-leak-test.js
ls .next/static/chunks/zz-planted-leak-test.js   # expect: No such file
```

### 6. Confirm the tree is back where it started

```
git status --short          # expect the same output as step 1
npm run <check>; echo "exit=$?"   # expect the clean result from step 2
```

### 7. Record it

In the commit message, and in `docs/invariant-register.md` if the check is
enforcing a claim made in a comment. What was planted, what it printed, that it
was reverted. A falsification nobody wrote down has to be redone.

---

## Two failure modes worth naming

### A check that reads one side of a comparison is not a comparison

Teaching the quarter checker to read `segundo trimestre` produced six *new*
critical findings on the first run — one per language, all against correct
translations. English spells them out too ("in the second quarter of 2026"), so
reading only the translated side made every language that correctly said the
same thing look as though it had invented a quarter out of nothing.

The near-miss is the point. Had those six been trusted, the "fix" would have
been to break correct Spanish, Portuguese, French, German, Indonesian and
Turkish to satisfy a broken check.

**So: when a check compares two things, falsify it in both directions.** Plant
the defect on the target side *and* confirm the check stays quiet when both
sides legitimately say the same thing in the same unusual way.

### A check that cannot fail because it was given nothing

`detect-hardcoded` ran on every CI run against an input that had become empty,
and reported zero for months. The per-route bundle budget iterated a manifest
key that holds exactly one entry under the App Router, so every route loop body
was unreachable.

**So: every check asserts that it found something to check.** The bundle budget
fails if no application chunks were found. The API contract test asserts it
located the route-handler directory. The register test asserts there is at least
one approval claim and six translated locales. The dictionary-leak check fails
if no needles could be derived. That assertion is not ceremony; it is the
difference between a pass and a silence.

---

## Worked examples in this repository

| Check | Planted | Result |
| --- | --- | --- |
| `label-quarter` (de) | `2. Quartal` → `3. Quartal` | `critical 2 … FAIL`, exit 1 |
| `label-quarter` (es, word form) | `segundo` → `tercer` | `critical 1 … FAIL`, exit 1 |
| `label-quarter` (dropped) | `segundo trimestre` → `periodo` | reported at the severity that blocks a published locale |
| approval-claim register | a new approval claim added to `en/trust.json` | coverage assertion and the `31 × 6 = 186` arithmetic both fail, naming the key |
| register disclaimer | "It is not a native review" → "It is a review" | fails |
| visibility surfaces | `navigation.ts` added to the choosing list | fails, naming the file |
| `data.` key uniqueness | one `dataKeys.rateLabel(rate)` → the raw template | fails, naming `data-words.ts` |
| locale dictionary leak | a chunk containing a pt-BR sentence | exit 1, naming the locale and the file |
| `server-only` | a value import of the loader in `controls.tsx` | `next build` exit 1, two errors naming the module |
