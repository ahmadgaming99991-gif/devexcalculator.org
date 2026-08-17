# Visual QA

134 screenshots captured 2026-08-17 with `npm run test:visual`, then reviewed by
eye. Passing an automated check is not visual acceptance — a person has to look
at them, and doing so found two problems the assertions could not.

Output is written to `tests/visual/__screenshots__/`, which is git-ignored.
Regenerate rather than committing 134 binaries.

## Coverage

**Nine viewports**: 1920×1080 · 1440×900 · 1366×768 · 1024×768 · 768×1024 ·
425×887 · 390×844 · 360×800 · 320×568.

**Fourteen scenarios** at each: homepage quick / with result / advanced split /
target / very large number / below minimum, Robux to USD, rates, requirements,
conversion hub, an amount page, the tax calculator, a legal article, and 404.

**Plus state captures**: validation error, FX unavailable, mobile navigation
open, dark mode at two widths, and 200% text zoom.

## Automated within the capture

Every screenshot is accompanied by a horizontal-overflow assertion —
`scrollWidth - clientWidth <= 0`. **126 of 126 pass.** A screenshot cannot show
overflow reliably; the assertion can.

## What the review found

### 1. Rate comparison table clipping at 1024px — fixed

The "what each rate would pay" table sat inside the results column of a
two-column grid. At 1024px that column is roughly 460px, and the four-column
table needs more, so the "vs standard" column was **clipped mid-figure** — a
money value cut off partway through its digits.

No assertion caught it, because the table was scrolling correctly inside its own
container. It was doing exactly what it was told to do and the result was still
wrong.

Moved full-width below the grid, where it has ~960px and does not clip. Also
tidier: the results column is now the result, the threshold and the currency
note, without a wide table crammed beside them.

### 2. Preset chips wrap to three rows at 320px — accepted

The intent was at most two. Eight presets at a 44px minimum target size do not
fit two rows at 320px without shrinking below that minimum.

Three rows of comfortably tappable chips beats two rows of chips too small to
hit. Accepted as-is.

## Reviewed and satisfactory

**Density.** No wall-of-text sections; no cramped controls. The 320px layout
breathes without wasting vertical space.

**Clipping.** After the fix above, nothing is clipped anywhere. The rate select
truncates its own option label at 320px, which is native `<select>` behaviour —
the full text remains available when opened, and the same value is repeated in
the description below it.

**Blank space.** No large empty regions at any width. The two-column grid
collapses cleanly to one below `lg`.

**Focus.** Amber ring visible on every control against every surface, in both
themes.

**Contrast.** Verified by measurement rather than by eye; see
`docs/design-system.md`. The dark palette reads well — the deep navy surfaces
give real elevation without relying on borders.

**Safe areas.** `viewport-fit=cover` with `env(safe-area-inset-bottom)` on the
consent banner. No fixed bottom bar exists to collide with a home indicator,
which was a deliberate choice: a sticky result bar would cover inputs on short
viewports.

**Large numbers.** 99,999,999,999 Robux renders `$379,999,999.99` and wraps
rather than overflowing at 320px. Wrapping was chosen over shrinking or
truncating — a truncated money figure is worse than a tall one.

**Validation error.** Red border, `role="alert"` message below the field, and
the user's original input preserved so they can correct rather than retype.

**FX unavailable.** USD result unchanged and prominent; the failure explained in
a bordered note below it rather than replacing the result.

**Mobile navigation.** Panel below the header with a dimmed backdrop, 44px
targets, and both label and description per item.

**404.** Not a dead end — an explanation, two buttons and five contextual links.

**Dark mode.** Reviewed at 1440 and 390. Not an inversion; surfaces carry a blue
cast so elevation is legible. Badges, meters and table headers all hold up.

**200% zoom.** Layout holds at 640×900 with a 32px root font. Calculator
operable, no content lost, no horizontal scroll.

## Not covered

- Real devices. All captures are Chromium emulation.
- Safari and WebKit. Chromium and Firefox only.
- Print stylesheets. None authored.
- Live screen-reader rendering.

## Reproducing

```bash
npm run build
npx next start --port 3100 &
BASE_URL=http://127.0.0.1:3100 npm run test:visual
```
