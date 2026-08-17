# Design system

## Direction

Creator Finance: calculator-first, trustworthy, quiet. A creator arrives wanting
one number. The design's job is to give it to them immediately and make the
provenance visible without shouting.

Deliberately not: neon gaming clutter, heavy glassmorphism, or finance-app
density that buries the tool.

Nothing imitates Roblox's logo or trade dress. The brand mark is a division
rule — two dots and a bar — with an upward accent stroke: arithmetic, not
gaming.

## Tokens

Defined in `@theme` in `src/app/globals.css`. Every pair below was measured
before use.

### Light

| Token | Value | Contrast on surface |
|---|---|---|
| `--color-background` | `#f6f8fc` | — |
| `--color-surface` | `#ffffff` | — |
| `--color-surface-subtle` | `#eef3fa` | — |
| `--color-text` | `#0b1220` | 18.9:1 |
| `--color-text-muted` | `#526174` | 6.4:1 |
| `--color-primary` | `#2563eb` | 5.2:1 |
| `--color-secondary` | `#7c3aed` | — |
| `--color-accent` | `#0e7490` | 4.6:1 |
| `--color-success` | `#15803d` | 5.0:1 |
| `--color-warning` | `#b45309` | 5.0:1 |
| `--color-danger` | `#b91c1c` | 6.5:1 |
| `--color-border` | `#dce4ef` | — |
| `--color-focus` | `#a16207` | 5.0:1 |

### Dark

Not an inversion. Saturated blues that read well on white become harsh on a dark
ground, so the primary lifts to `#60a5fa` and surfaces carry a slight blue cast
so elevation is legible without borders doing all the work.

| Token | Value | Contrast on surface |
|---|---|---|
| `--color-background` | `#080d17` | — |
| `--color-surface` | `#131c2e` | — |
| `--color-text` | `#e8edf5` | 14.9:1 |
| `--color-text-muted` | `#9aa8bd` | 7.2:1 |
| `--color-primary` | `#60a5fa` | 6.8:1 |
| `--color-success` | `#4ade80` | 10.0:1 |
| `--color-warning` | `#fbbf24` | 10.9:1 |
| `--color-danger` | `#f87171` | 6.6:1 |
| `--color-focus` | `#fbbf24` | — |

### Two deviations from the specification's candidate palette

**`--focus`: `#f59e0b` → `#a16207`.** The candidate amber measures 2.15:1
against white. WCAG 2.2 requires 3:1 of a focus indicator, so the candidate
fails. The darker amber measures 4.96:1 and is still unmistakably amber.

**`--accent`: `#0891b2` → `#0e7490`.** The candidate cyan falls just under
4.5:1 for text use.

### Theme handling

Three states: explicit light, explicit dark, and system. Tokens are defined on
bare `:root`, redefined under `@media (prefers-color-scheme: dark)` guarded by
`:root:not([data-theme="light"])`, and again under `:root[data-theme="dark"]` so
the toggle wins in both directions. `body` gets an explicit token background so
it never borrows a host page's ground.

An inline script in `<head>` applies the stored theme before first paint.
Anything later paints the wrong theme and corrects it, which reads as a flash.

## Type

System font stacks. No web font, so no render-blocking network dependency and no
invisible-text period — for a site whose primary content is a number, waiting on
a font is the wrong trade.

Numeric output uses a monospaced stack with `font-variant-numeric: tabular-nums`,
so digits align in columns and a result does not reflow as it changes.

`.numeric-display` adds `overflow-wrap: anywhere`, which is what lets a ten-digit
payout wrap instead of pushing the layout sideways at 320px.

## Layout

**Desktop.** Sticky header, calculator above the fold, containers at 1024px
(`default`), 1152px (`wide`) or 768px (`prose`). Tool pages use a two-column
grid for input and result.

**Mobile.** One column. Presets wrap to at most two lines at 320px. Advanced
controls collapse into a native `<details>`. Minimum 44px targets throughout.
No sticky result bar — it would cover inputs on short viewports, which is worse
than scrolling.

Any container holding a wide table carries `min-w-0`. Grid and flex items
default to `min-width: auto` and refuse to shrink below their content, which
made the tax calculator overflow by 227px at 320px before this was fixed.

## Components

Layout: `SiteHeader`, `DesktopNavigation`, `MobileNavigation`, `SiteFooter`,
`Breadcrumbs`, `Container`, `Logo`, `Wordmark`, `ThemeToggle`.

UI: `Card`, `Section`, `Button`, `ButtonLink`, `InlineLink`, `SourceLink`,
`Badge`, `Callout`, `Table`, `TableWrapper`, `Th`, `Td`, `Disclosure`, `AdSlot`.

Content: `QuickAnswer`, `TrustStrip`, `LastVerifiedBadge`, `SourceNote`,
`EstimateDisclaimer`, `EarnedRobuxNote`, `MethodologyNote`, `LimitationsNote`,
`DefinitionBlock`, `FAQAccordion`, `TableOfContents`, `RelatedLinks`,
`PageHeader`, `RateTable`, `AmountTable`, `FormulaBlock`, `RequirementsList`.

Calculator: `Calculator`, `ModeTabs`, `AmountInput`, `RateSelector`,
`CurrencySelector`, `QuickPresets`, `PercentInput`, `ResultSummary`,
`ResultBreakdown`, `ThresholdMeter`, `ScenarioComparison`, `TargetBreakdown`,
`FxNote`, `ResultAnnouncer`, `CopyButton`, `ShareButton`, `ResetButton`,
`HistoryPanel`.

Every interactive element is a real `<button>`, `<a>`, `<input>`, `<select>` or
`<details>`. No clickable `div` exists anywhere, so keyboard behaviour and
accessible names come from the platform rather than from ARIA patched on
afterwards.

## Focus

One style sitewide: `outline: 3px solid var(--color-focus)` with
`outline-offset: 2px`, on `:focus-visible` so it stays off mouse clicks and is
guaranteed for keyboard users. The offset keeps the ring clear of the control's
own border so it stays legible on every surface.

## Motion

Colour transitions only. No animation library, no entrance animations, no
animated result — an animated number on a financial estimate reads as
theatrical. `prefers-reduced-motion: reduce` disables transitions and smooth
scrolling.

## Colour is never the only signal

The threshold meter carries "Meets the stated minimum" or "Below the stated
minimum" as text. Rate comparisons carry signed values. Stale FX carries the
word "Stale". `Callout` carries a title stating its tone.

Under `forced-colors: active`, cards and controls keep explicit borders so
structure survives when author colours are stripped.
