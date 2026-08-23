# Brand assets

`devexcalculator-logo.png` is the supplied artwork, unmodified: 1448×1086, with
a transparent background already. It is kept here rather than in `public/`
because it is a source file, not something served — at 494 kB it is seventy
times the size of the asset the site actually ships.

## What is derived from it, and why each is different

| Where | File | What it is |
|---|---|---|
| Header, footer | `public/brand/devex-mark.png` | The hexagon mark cropped out of the artwork, 104×120, palette-quantised. 7 kB. |
| Browser tab | `src/app/icon.svg` | Hexagon and dollar sign, drawn. |
| Home screen, PWA | `public/icons/icon.svg`, `public/icons/maskable.svg` | The same drawing at 512, plus a full-bleed variant for platforms that mask. |
| iOS | `src/app/apple-icon.tsx` | Generated PNG. The hexagon is dropped because iOS masks the corners. |
| Social cards | `src/lib/og/template.tsx` | The same drawing at 76px. |

Two decisions are worth keeping, because both look like oversights otherwise.

**The wordmark in the artwork is not used.** The lockup sets "Calculator" in
white at low opacity, which is invisible on this site's light theme and faint on
the dark one. Text baked into an image also cannot be selected, translated or
read aloud. So only the mark is taken from the artwork, and the name beside it
is real text — `Wordmark` in `src/components/layout/logo.tsx` — which follows
the theme.

**The icons are drawn, not downscaled.** The mark holds a calculator with six
keys, circled by two arrows. Below roughly 40px those merge into a green blob.
Every icon smaller than that therefore keeps the two features that survive — the
hexagon silhouette and the dollar sign — rather than shipping a smudge that
happens to be derived from the right file.

## Regenerating the header mark

```
node -e "require('sharp')('brand/devexcalculator-logo.png')
  .extract({ left: 57, top: 261, width: 472, height: 544 })
  .resize({ height: 120 })
  .png({ compressionLevel: 9, palette: true })
  .toFile('public/brand/devex-mark.png')"
```

The crop is the mark's bounding box in the supplied file. Palette quantisation
is visually identical here and cuts 26.6 kB to 7 kB — worth checking again if
the artwork is ever replaced with one that has smoother gradients.
