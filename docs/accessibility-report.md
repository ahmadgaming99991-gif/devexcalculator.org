# Accessibility report

Target: **WCAG 2.2 level AA**. Tested 2026-08-17.

This is a self-assessment, not a certification. No external audit has been
carried out and no live screen-reader testing by a daily user has been done —
both are stated as limitations rather than left implied.

## Automated

`@axe-core/playwright` against `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and
`wcag22aa`, on 15 representative routes plus the calculator in a result state
and the site in dark mode.

**0 violations.**

Lighthouse accessibility: **100** on every page tested, desktop and mobile.

Automated checks catch a minority of real barriers, so the manual work below
matters more than these numbers do.

## What automation found that mattered

The axe run caught a genuine, site-wide failure that no unit test could have:
every `[--color-*]` utility class was emitting invalid CSS. Tailwind v4 replaced
the v3 shorthand with `(--color-*)`, so `bg-[--color-primary]` compiled to
`background-color: --color-primary` and was silently discarded.

The visible result was white text on a white background at **1.06:1** — 608
utilities across 43 files doing nothing. It is exactly the class of bug that
looks fine in a screenshot taken on a light background and is unreadable in
practice.

## Manual verification

### Keyboard

- The skip link is the first tab stop and moves focus to `#main`.
- The calculator is fully operable: amount input, rate select, currency select,
  presets, mode tabs, the fee and tax disclosure, and every action button.
- Mode tabs implement the tab pattern — arrow keys move between tabs, Home and
  End jump to the ends, and only the active tab is in the tab order.
- The mobile menu traps focus while open, closes on Escape, and returns focus to
  the button that opened it.
- Wide tables sit in focusable, labelled scroll containers, so a keyboard user
  can reach and scroll them without a mouse.
- No keyboard trap anywhere.

### Focus

`outline: 3px solid var(--color-focus)` with `outline-offset: 2px`, on
`:focus-visible`.

The specification's candidate focus colour `#f59e0b` measures **2.15:1** against
white, below the 3:1 WCAG 2.2 requires of a focus indicator. It was darkened to
`#a16207`, which measures **4.96:1**. An E2E test asserts the computed outline
width is at least 2px and the style is not `none`.

### Contrast

Every text and interface pair measured in both themes before use; the table is
in `docs/design-system.md`. Lowest ratios: `--color-accent` at 4.6:1 light and
`--color-danger` at 6.6:1 dark. All pass AA.

### Zoom and reflow

- **320px**: no horizontal overflow on any route. Verified by an E2E test that
  measures `scrollWidth - clientWidth` per route.
- **A ten-digit result at 320px**: wraps rather than overflowing, via
  `overflow-wrap: anywhere` on `.numeric-display`. Wrapping was chosen over
  shrinking or truncating — a truncated money figure is worse than a tall one.
- **200% text zoom**: layout holds, calculator remains operable, no content or
  function lost.
- The viewport sets no `maximum-scale` and no `user-scalable=no`, asserted by a
  test.

This surfaced a real bug: tables inside grid columns pushed the page sideways by
227px at 320px, because grid items default to `min-width: auto` and refuse to
shrink below their content. Fixed with `min-w-0` on the scroll containers and
their parents.

### Announcements

- Results, copy confirmations and status changes go through a polite,
  atomic live region. The announcement is a summary sentence, not the full
  breakdown, so a screen-reader user is not flooded on every keystroke.
- Validation errors use `role="alert"`, are linked with `aria-describedby`, and
  the field carries `aria-invalid`.
- Progress meters expose `role="progressbar"` with value, min, max and a label.

### Colour independence

No result is conveyed by colour alone. The threshold meter says "Meets the
stated minimum" or "Below the stated minimum" in words. Rate comparisons show
signed values. A stale FX rate is labelled "Stale". Callouts carry a title
stating their tone.

Under `forced-colors: active`, cards and controls keep explicit borders so
structure survives when author colours are stripped.

### Semantics

- One `<h1>` per page, asserted by a route check.
- Landmarks: `<header>`, `<nav>` with labels, `<main id="main">`, `<footer>`.
- Every interactive element is a real `<button>`, `<a>`, `<input>`, `<select>` or
  `<details>`. **No clickable `div` exists anywhere.**
- Tables have captions and scoped headers.
- Decorative SVG is `aria-hidden`; the logo has a label.
- External links opening in a new tab announce "(opens in a new tab)".

### Without JavaScript

Every page renders its full content: headings, rates, formulas, worked examples,
tables, FAQs and every link. A test asserts each route renders over 800
characters of body text with scripting off.

This found a real gap: below the `md` breakpoint the desktop navigation is
hidden and the mobile menu needs JavaScript to open, leaving a small-screen
no-script reader with no header navigation. A `<noscript>` list now renders in
that case.

### Reduced motion

`prefers-reduced-motion: reduce` disables transitions, animations and smooth
scrolling. Verified by a test asserting computed `scroll-behavior` is `auto`.

### Dark mode

Full axe pass. Tokens are separately measured rather than inverted — saturated
blues that read well on white become harsh on a dark ground.

## Known limitations

1. **No live screen-reader testing** by someone who uses one daily. Semantics
   were built and inspected carefully, which is not the same thing.
2. **No external audit.** This is a self-assessment.
3. **A very long result wraps to three lines** at 320px with 200% zoom.
   Deliberate: truncating a money figure would be worse.
4. **Wide tables scroll horizontally** on narrow screens. The container is
   keyboard reachable and labelled, but a table is still harder to read that way.
5. **Cloudflare Turnstile**, where a deployment enables it, is a third-party
   widget whose internal accessibility is outside this site's control.

All five are published on `/accessibility/` rather than kept internal.

## Regression protection

`npm run test:e2e` runs axe on 15 routes plus the calculator-with-result and
dark-mode states, and covers keyboard operation, focus visibility, the mobile
menu, 320px reflow, 200% zoom, viewport scalability and reduced motion. It runs
on every pull request.
